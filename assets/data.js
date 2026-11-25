/* ============================================================
   UBS-PROFPORT — DEMO data layer (Supabase REST + Auth)
   ------------------------------------------------------------
   This is a UI/UX prototype. Every row it reads or writes is
   demo data. No real money, no real cards, no fee gating.

   Exposes window.UBSData. Loaded BEFORE assets/core.js.
   ============================================================ */
(function (global) {
  "use strict";

  var CFG = global.UBS_CONFIG || {};
  var BASE = String(CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  var ANON = CFG.SUPABASE_ANON_KEY || "";
  var SKEY = "ubs_sb_session_v1";

  var cache = { users: [], rates: null, profile: null, isAdmin: false, ready: false };

  /* ---------------- session ---------------- */
  function readSession() {
    try { return JSON.parse(localStorage.getItem(SKEY)) || null; } catch (e) { return null; }
  }
  function writeSession(s) {
    try {
      if (s) localStorage.setItem(SKEY, JSON.stringify(s));
      else localStorage.removeItem(SKEY);
    } catch (e) {}
  }
  function session() { return readSession(); }
  function accessToken() {
    var s = readSession();
    return s && s.access_token ? s.access_token : null;
  }
  function authUserId() {
    var s = readSession();
    return s && s.user && s.user.id ? s.user.id : null;
  }

  function authHeaders(extra) {
    var h = { apikey: ANON, "Content-Type": "application/json" };
    var tok = accessToken();
    if (tok) h.Authorization = "Bearer " + tok;
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  function rest(path, opts) {
    opts = opts || {};
    return fetch(BASE + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: authHeaders(opts.headers),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store"
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
        if (!res.ok) {
          var msg = (data && (data.message || data.error_description || data.msg)) || ("HTTP " + res.status);
          var err = new Error(msg);
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------------- auth ---------------- */
  function signIn(email, password) {
    return fetch(BASE + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email).trim(), password: password })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error_description || data.msg || "Sign-in failed");
          err.code = data.error_code || data.error || "invalid";
          throw err;
        }
        writeSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
          user: data.user
        });
        return data.user;
      });
    });
  }

  function refresh() {
    var s = readSession();
    if (!s || !s.refresh_token) return Promise.reject(new Error("no session"));
    return fetch(BASE + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) { writeSession(null); throw new Error("session expired"); }
        writeSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
          user: data.user
        });
        return data.user;
      });
    });
  }

  function signOut() {
    var tok = accessToken();
    writeSession(null);
    cache = { users: [], rates: null, profile: null, isAdmin: false, ready: false };
    if (!tok) return Promise.resolve();
    return fetch(BASE + "/auth/v1/logout", {
      method: "POST",
      headers: { apikey: ANON, Authorization: "Bearer " + tok }
    }).catch(function () {}).then(function () {});
  }

  /* ---------------- load ---------------- */
  function q(table, params) {
    var qs = params ? "?" + params : "";
    return rest(table + qs);
  }

  function loadAll() {
    var uid = authUserId();
    if (!uid) return Promise.reject(new Error("not signed in"));

    var s = readSession();
    var stale = s && s.expires_at && Date.now() > s.expires_at - 60000;
    var pre = stale ? refresh().catch(function () {}) : Promise.resolve();

    return pre.then(function () {
      return Promise.all([
        q("profiles", "select=*&order=created_at.asc"),
        q("accounts", "select=*"),
        q("cards", "select=*"),
        q("transactions", "select=*&order=created_at.desc"),
        q("loans", "select=*&order=created_at.desc"),
        q("requests", "select=*&order=created_at.desc"),
        q("support_messages", "select=*&order=created_at.asc")
      ]);
    }).then(function (r) {
      var profiles = r[0] || [], accounts = r[1] || [], cards = r[2] || [];
      var txs = r[3] || [], loans = r[4] || [], reqs = r[5] || [], msgs = r[6] || [];

      var me = profiles.filter(function (p) { return p.auth_user_id === uid; })[0] || null;
      cache.profile = me;
      cache.isAdmin = !!(me && me.role === "admin");
      cache.users = assemble(profiles, accounts, cards, txs, loans, reqs, msgs);
      cache.ready = true;
      return cache;
    });
  }

  function assemble(profiles, accounts, cards, txs, loans, reqs, msgs) {
    return profiles.map(function (p) {
      var accs = accounts.filter(function (a) { return a.profile_id === p.id; });
      var checking = accs.filter(function (a) { return a.account_type === "checking"; })[0] || accs[0] || null;
      var accIds = accs.map(function (a) { return a.id; });
      return {
        id: p.id,
        auth_user_id: p.auth_user_id,
        name: p.full_name,
        email: p.email,
        role: p.role,
        status: p.status,
        accountNumber: checking ? checking.account_number : "\u2014",
        balance: checking ? Number(checking.balance) : 0,
        currency: checking ? checking.currency : "USD",
        accounts: accs.map(function (a) {
          return { id: a.id, type: a.account_type, number: a.account_number, currency: a.currency, balance: Number(a.balance) };
        }),
        cards: cards.filter(function (c) { return c.profile_id === p.id; }).map(function (c) {
          return { id: c.id, type: c.card_type, brand: c.brand, number: c.card_number, expiry: c.expiry, cvv: c.cvv, status: c.status };
        }),
        transactions: txs.filter(function (t) { return accIds.indexOf(t.account_id) >= 0; }).map(function (t) {
          return {
            id: t.id, type: t.direction, desc: t.description, amount: Number(t.amount),
            currency: t.currency, date: new Date(t.created_at).getTime(), status: t.status
          };
        }).sort(function (a, b) { return b.date - a.date; }),
        loans: loans.filter(function (l) { return l.profile_id === p.id; }).map(function (l) {
          return {
            id: l.id, amount: Number(l.amount), term: l.term_months, purpose: l.purpose,
            status: l.status, date: new Date(l.created_at).getTime()
          };
        }),
        requests: reqs.filter(function (r) { return r.profile_id === p.id; }).map(function (r) {
          return {
            id: r.id, kind: r.kind, amount: Number(r.amount), note: r.note,
            status: r.status, date: new Date(r.created_at).getTime()
          };
        }),
        messages: msgs.filter(function (m) { return m.profile_id === p.id; }).map(function (m) {
          return { id: m.id, from: m.sender, text: m.body, date: new Date(m.created_at).getTime() };
        }).sort(function (a, b) { return a.date - b.date; })
      };
    });
  }

  /* ---------------- mutations ---------------- */
  function checkingAccountId(profileId) {
    var u = cache.users.filter(function (x) { return x.id === profileId; })[0];
    if (!u) return null;
    var c = (u.accounts || []).filter(function (a) { return a.type === "checking"; })[0];
    return c ? c.id : (u.accounts && u.accounts[0] ? u.accounts[0].id : null);
  }

  function updateProfile(id, patch) {
    var body = {};
    if (patch.status != null) body.status = patch.status;
    if (patch.name != null) body.full_name = patch.name;
    if (patch.role != null) body.role = patch.role;
    return rest("profiles?id=eq." + encodeURIComponent(id), {
      method: "PATCH", body: body, headers: { Prefer: "return=minimal" }
    });
  }

  function setBalance(profileId, balance) {
    var accId = checkingAccountId(profileId);
    if (!accId) return Promise.reject(new Error("no account"));
    return rest("accounts?id=eq." + encodeURIComponent(accId), {
      method: "PATCH", body: { balance: Number(balance) }, headers: { Prefer: "return=minimal" }
    });
  }

  function addTransaction(profileId, tx) {
    var accId = checkingAccountId(profileId);
    if (!accId) return Promise.reject(new Error("no account"));
    return rest("transactions", {
      method: "POST",
      body: {
        account_id: accId,
        direction: tx.type === "credit" ? "credit" : "debit",
        description: tx.desc || "Transaction",
        amount: Math.abs(Number(tx.amount) || 0),
        currency: tx.currency || "USD",
        status: tx.status || "completed"
      },
      headers: { Prefer: "return=minimal" }
    });
  }

  function addRequest(profileId, req) {
    return rest("requests", {
      method: "POST",
      body: {
        profile_id: profileId,
        kind: req.kind,
        amount: Number(req.amount) || 0,
        note: req.note || null,
        status: "pending"
      },
      headers: { Prefer: "return=minimal" }
    });
  }

  function addMessage(profileId, from, text) {
    return rest("support_messages", {
      method: "POST",
      body: { profile_id: profileId, sender: from === "admin" ? "admin" : "user", body: text },
      headers: { Prefer: "return=minimal" }
    });
  }

  function updateCard(id, patch) {
    var body = {};
    if (patch.status != null) body.status = patch.status;
    return rest("cards?id=eq." + encodeURIComponent(id), {
      method: "PATCH", body: body, headers: { Prefer: "return=minimal" }
    });
  }

  function updateRequest(id, status) {
    return rest("requests?id=eq." + encodeURIComponent(id), {
      method: "PATCH", body: { status: status }, headers: { Prefer: "return=minimal" }
    });
  }

  function updateLoan(id, status) {
    return rest("loans?id=eq." + encodeURIComponent(id), {
      method: "PATCH", body: { status: status }, headers: { Prefer: "return=minimal" }
    });
  }

  function createProfile(opts) {
    var acct = String(Math.floor(1000 + Math.random() * 9000)) + " " +
      String(Math.floor(1000 + Math.random() * 9000)) + " " +
      String(Math.floor(1000 + Math.random() * 9000));
    return rest("profiles", {
      method: "POST",
      body: { full_name: opts.name, email: opts.email, role: "customer", status: "active" },
      headers: { Prefer: "return=representation" }
    }).then(function (rows) {
      var p = rows && rows[0];
      if (!p) throw new Error("profile not created");
      return rest("accounts", {
        method: "POST",
        body: {
          profile_id: p.id, account_number: acct, account_type: "checking",
          currency: opts.currency || "USD", balance: Number(opts.balance) || 0
        },
        headers: { Prefer: "return=minimal" }
      }).then(function () {
        return rest("cards", {
          method: "POST",
          body: {
            profile_id: p.id, card_type: "debit", brand: "UBS-PROFPORT DEBIT",
            card_number: "4000 0000 0000 0000", expiry: "12/29", cvv: "123", status: "active"
          },
          headers: { Prefer: "return=minimal" }
        });
      }).then(function () { return p; });
    });
  }

  /* ---------------- fx ---------------- */
  function getRates() { return cache.rates; }
  function setRates(r) { cache.rates = r; return r; }

  function loadFxCache() {
    return q("fx_rates", "select=*&limit=1").then(function (rows) {
      var r = rows && rows[0];
      if (!r) return null;
      return {
        USD: 1, EUR: Number(r.eur), JPY: Number(r.jpy), KRW: Number(r.krw),
        base: "USD", source: "supabase cache", fetchedAt: new Date(r.fetched_at).getTime()
      };
    }).catch(function () { return null; });
  }

  /* ---------------- public ---------------- */
  global.UBSData = {
    configured: !!(BASE && ANON),
    session: session,
    authUserId: authUserId,
    signIn: signIn,
    signOut: signOut,
    refresh: refresh,
    loadAll: loadAll,
    cache: function () { return cache; },
    currentUser: function () {
      var uid = authUserId();
      if (!uid) return null;
      return cache.users.filter(function (u) { return u.auth_user_id === uid; })[0] ||
        cache.users.filter(function (u) { return u.id === (cache.profile && cache.profile.id); })[0] || null;
    },
    me: function () { return cache.profile; },
    isAdmin: function () { return cache.isAdmin; },
    updateProfile: updateProfile,
    setBalance: setBalance,
    addTransaction: addTransaction,
    addRequest: addRequest,
    addMessage: addMessage,
    updateCard: updateCard,
    updateRequest: updateRequest,
    updateLoan: updateLoan,
    createProfile: createProfile,
    getRates: getRates,
    setRates: setRates,
    loadFxCache: loadFxCache
  };
})(window);
