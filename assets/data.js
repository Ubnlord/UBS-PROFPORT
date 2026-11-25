/* ============================================================
   UBS-PROFPORT — DEMO Supabase data layer
   ------------------------------------------------------------
   Plain fetch() against the Supabase REST + Auth APIs.
   No SDK, no build step. Uses the public anon key only.

   This is a UI/UX prototype. All rows are demo data.
   No real money, no real cards, no fee gating.
   ============================================================ */
(function (global) {
  "use strict";

  var CFG = global.UBS_CONFIG || {};
  var URL_BASE = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  var ANON = CFG.SUPABASE_ANON_KEY || "";

  var SESSION_KEY = "ubs.session";
  var CACHE = { users: [], rates: null };

  /* ---------- session ---------- */
  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch (e) { return null; }
  }
  function setSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }
  function authUserId() {
    var s = session();
    return s && s.user && s.user.id ? s.user.id : null;
  }
  function accessToken() {
    var s = session();
    return s && s.access_token ? s.access_token : ANON;
  }

  function authHeaders(extra) {
    return Object.assign({
      "apikey": ANON,
      "Authorization": "Bearer " + accessToken(),
      "Content-Type": "application/json"
    }, extra || {});
  }

  /* ---------- auth ---------- */
  function signIn(email, password) {
    return fetch(URL_BASE + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "apikey": ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) {
          var err = new Error(json.error_description || json.msg || "Sign-in failed");
          err.code = json.error_code || json.error || "invalid_credentials";
          throw err;
        }
        setSession(json);
        return json;
      });
    });
  }

  function signOut() {
    var s = session();
    setSession(null);
    CACHE = { users: [], rates: null };
    if (!s || !s.access_token) return Promise.resolve();
    return fetch(URL_BASE + "/auth/v1/logout", {
      method: "POST",
      headers: { "apikey": ANON, "Authorization": "Bearer " + s.access_token }
    }).catch(function () { /* local sign-out already done */ });
  }

  /* ---------- REST helpers ---------- */
  function rest(path, opts) {
    opts = opts || {};
    return fetch(URL_BASE + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: authHeaders(opts.headers),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.text().then(function (t) {
        var data = t ? JSON.parse(t) : null;
        if (!res.ok) {
          var err = new Error((data && (data.message || data.hint)) || ("HTTP " + res.status));
          err.status = res.status;
          err.detail = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------- load everything the UI needs ---------- */
  function loadAll() {
    var uid = authUserId();
    if (!uid) return Promise.resolve(CACHE);

    return Promise.all([
      rest("profiles?select=*"),
      rest("accounts?select=*"),
      rest("cards?select=*"),
      rest("transactions?select=*&order=created_at.desc"),
      rest("loans?select=*&order=created_at.desc"),
      rest("requests?select=*&order=created_at.desc"),
      rest("support_messages?select=*&order=created_at.asc")
    ]).then(function (r) {
      var profiles = r[0] || [], accounts = r[1] || [], cards = r[2] || [];
      var txs = r[3] || [], loans = r[4] || [], reqs = r[5] || [], msgs = r[6] || [];

      var users = profiles.map(function (p) {
        var acct = accounts.filter(function (a) { return a.profile_id === p.id; })[0] || {};
        return {
          id: p.id,
          auth_user_id: p.auth_user_id,
          name: p.full_name,
          email: p.email,
          role: p.role,
          status: p.status,
          accountNumber: acct.account_number || "—",
          balance: acct.balance != null ? Number(acct.balance) : 0,
          currency: acct.currency || "USD",
          createdAt: p.created_at ? Date.parse(p.created_at) : Date.now(),
          cards: cards.filter(function (c) { return c.profile_id === p.id; }).map(function (c) {
            return { id: c.id, type: c.card_type, brand: c.brand, number: c.card_number, expiry: c.expiry, cvv: c.cvv, status: c.status };
          }),
          transactions: txs.filter(function (t) { return t.profile_id === p.id; }).map(function (t) {
            return {
              id: t.id, type: t.type, desc: t.description,
              amount: Number(t.amount), currency: t.currency,
              status: t.status, date: t.created_at ? Date.parse(t.created_at) : Date.now()
            };
          }),
          loans: loans.filter(function (l) { return l.profile_id === p.id; }).map(function (l) {
            return {
              id: l.id, amount: Number(l.amount), purpose: l.purpose,
              term: l.term_months, status: l.status,
              date: l.created_at ? Date.parse(l.created_at) : Date.now()
            };
          }),
          requests: reqs.filter(function (q) { return q.profile_id === p.id; }).map(function (q) {
            return {
              id: q.id, kind: q.kind, amount: Number(q.amount || 0),
              note: q.note, status: q.status,
              date: q.created_at ? Date.parse(q.created_at) : Date.now()
            };
          }),
          messages: msgs.filter(function (m) { return m.profile_id === p.id; }).map(function (m) {
            return {
              id: m.id, from: m.sender, text: m.body,
              date: m.created_at ? Date.parse(m.created_at) : Date.now()
            };
          })
        };
      });

      CACHE.users = users;
      return CACHE;
    });
  }

  /* ---------- mutations ---------- */
  function updateProfile(id, patch) {
    var body = {};
    if (patch.name != null) body.full_name = patch.name;
    if (patch.status != null) body.status = patch.status;
    if (patch.role != null) body.role = patch.role;
    if (!Object.keys(body).length) return Promise.resolve();
    return rest("profiles?id=eq." + encodeURIComponent(id), { method: "PATCH", body: body });
  }

  function setBalance(profileId, balance) {
    return rest("accounts?profile_id=eq." + encodeURIComponent(profileId), {
      method: "PATCH", body: { balance: balance }
    });
  }

  function updateCard(cardId, patch) {
    return rest("cards?id=eq." + encodeURIComponent(cardId), { method: "PATCH", body: patch });
  }

  function addTransaction(profileId, tx) {
    return rest("transactions", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: {
        profile_id: profileId,
        type: tx.type,
        description: tx.desc,
        amount: tx.amount,
        currency: tx.currency || "USD",
        status: tx.status || "completed"
      }
    });
  }

  function addRequest(profileId, req) {
    return rest("requests", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: {
        profile_id: profileId,
        kind: req.kind,
        amount: req.amount || 0,
        note: req.note || "",
        status: "pending"
      }
    });
  }

  function updateRequest(id, status) {
    return rest("requests?id=eq." + encodeURIComponent(id), { method: "PATCH", body: { status: status } });
  }

  function updateLoan(id, status) {
    return rest("loans?id=eq." + encodeURIComponent(id), { method: "PATCH", body: { status: status } });
  }

  function addMessage(profileId, from, text) {
    return rest("support_messages", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: { profile_id: profileId, sender: from, body: text }
    });
  }

  function createProfile(opts) {
    var acct = String(Math.floor(1000 + Math.random() * 9000)) + " " +
               String(Math.floor(1000 + Math.random() * 9000)) + " " +
               String(Math.floor(1000 + Math.random() * 9000));
    return rest("profiles", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: { full_name: opts.name, email: opts.email, role: "customer", status: "active" }
    }).then(function (rows) {
      var p = rows && rows[0];
      if (!p) throw new Error("Profile was not created");
      return rest("accounts", {
        method: "POST",
        headers: { "Prefer": "return=representation" },
        body: {
          profile_id: p.id, account_number: acct,
          balance: opts.balance || 0, currency: opts.currency || "USD"
        }
      }).then(function () {
        return rest("cards", {
          method: "POST",
          body: {
            profile_id: p.id, card_type: "debit", brand: "UBS-PROFPORT DEBIT",
            card_number: "4000 0000 0000 0000", expiry: "12/29", cvv: "123", status: "active"
          }
        });
      }).then(function () { return p; });
    });
  }

  /* ---------- FX cache ---------- */
  function getRates() { return CACHE.rates; }
  function setRates(r) { CACHE.rates = r; }

  function loadFxCache() {
    return rest("fx_rates?select=*&order=fetched_at.desc&limit=1").then(function (rows) {
      var r = rows && rows[0];
      if (!r) return null;
      return {
        USD: 1, EUR: Number(r.eur), JPY: Number(r.jpy), KRW: Number(r.krw),
        base: "USD", source: r.source || "supabase",
        fetchedAt: r.fetched_at ? Date.parse(r.fetched_at) : Date.now()
      };
    }).catch(function () { return null; });
  }

  function isAdmin() {
    var uid = authUserId();
    if (!uid) return false;
    var me = CACHE.users.filter(function (u) { return u.auth_user_id === uid; })[0];
    return !!(me && me.role === "admin");
  }

  global.UBSData = {
    session: session, authUserId: authUserId,
    signIn: signIn, signOut: signOut,
    loadAll: loadAll, cache: function () { return CACHE; },
    updateProfile: updateProfile, setBalance: setBalance, updateCard: updateCard,
    addTransaction: addTransaction, addRequest: addRequest,
    updateRequest: updateRequest, updateLoan: updateLoan,
    addMessage: addMessage, createProfile: createProfile,
    getRates: getRates, setRates: setRates, loadFxCache: loadFxCache,
    isAdmin: isAdmin
  };
})(window);
