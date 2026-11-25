/* ============================================================
   UBS-PROFPORT — DEMO Supabase bridge
   ------------------------------------------------------------
   Loaded AFTER assets/core.js. Re-points the store functions
   that core.js defines (db / currentUser / login / mutations /
   FX) at the Supabase layer in assets/data.js, so every screen
   reads and writes live rows instead of localStorage.

   This is a UI/UX prototype. All rows are demo data.
   No real money, no real cards, no fee gating.
   ============================================================ */
(function (global) {
  "use strict";

  var UBS = global.UBS;
  var D = global.UBSData;
  if (!UBS || !D) return;

  /* ---- read side ---- */
  UBS.db = function () {
    var c = D.cache();
    return { users: (c && c.users) || [], rates: (c && c.rates) || null };
  };

  UBS.currentUser = function () {
    var uid = D.authUserId();
    if (!uid) return null;
    var users = (D.cache() && D.cache().users) || [];
    return users.filter(function (u) { return u.auth_user_id === uid; })[0] || null;
  };

  UBS.isAdmin = function () { return !!D.isAdmin(); };

  /* ---- auth ---- */
  UBS.login = function (email, password) {
    return D.signIn(email, password)
      .then(function () { return D.loadAll(); })
      .then(function () {
        var u = UBS.currentUser();
        if (!u) return { ok: false, error: "invalid" };
        if (u.status === "blocked") return { ok: false, error: "blocked" };
        return { ok: true, user: u };
      })
      .catch(function (err) {
        var code = (err && err.code) || "";
        if (code === "invalid_credentials" || code === "invalid_grant") {
          return { ok: false, error: "invalid" };
        }
        return { ok: false, error: "invalid", message: err && err.message };
      });
  };

  UBS.logout = function () { return D.signOut(); };
  UBS.reload = function () { return D.loadAll(); };

  /* ---- mutations ---- */
  UBS.updateUser = function (id, patch) {
    var jobs = [];
    if (patch.status != null || patch.name != null || patch.role != null) {
      jobs.push(D.updateProfile(id, patch));
    }
    if (patch.balance != null) jobs.push(D.setBalance(id, patch.balance));
    if (patch.cards) {
      var u = UBS.db().users.filter(function (x) { return x.id === id; })[0];
      var before = (u && u.cards) || [];
      patch.cards.forEach(function (c) {
        var old = before.filter(function (b) { return b.id === c.id; })[0];
        if (old && old.status !== c.status) jobs.push(D.updateCard(c.id, { status: c.status }));
      });
    }
    return Promise.all(jobs).then(function () { return D.loadAll(); });
  };

  UBS.addTransaction = function (userId, tx) {
    return D.addTransaction(userId, tx).then(function () { return D.loadAll(); });
  };
  UBS.addRequest = function (userId, req) {
    return D.addRequest(userId, req).then(function () { return D.loadAll(); });
  };
  UBS.addMessage = function (userId, from, text) {
    return D.addMessage(userId, from, text).then(function () { return D.loadAll(); });
  };

  /* ---- FX: live API, then Supabase cache, then constants ---- */
  UBS.fetchRates = function () {
    var cached = D.getRates();
    if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < 1000 * 60 * 30) {
      return Promise.resolve(cached);
    }
    var ENDPOINTS = [
      ["https://open.er-api.com/v6/latest/USD", "open.er-api.com"],
      ["https://api.frankfurter.app/latest?from=USD&to=EUR,JPY,KRW", "frankfurter.app"]
    ];
    var chain = ENDPOINTS.reduce(function (p, pair) {
      return p.catch(function () {
        return fetch(pair[0], { cache: "no-store" })
          .then(function (res) {
            if (!res.ok) throw new Error("http " + res.status);
            return res.json();
          })
          .then(function (json) {
            var r = json && (json.rates || json);
            if (!r || typeof r.EUR !== "number") throw new Error("bad payload");
            return {
              USD: 1, EUR: r.EUR, JPY: r.JPY, KRW: r.KRW,
              base: "USD", source: pair[1], fetchedAt: Date.now()
            };
          });
      });
    }, Promise.reject(new Error("start")));

    return chain.then(function (rates) {
      D.setRates(rates);
      return rates;
    }).catch(function () {
      var fb = Object.assign({}, UBS.FALLBACK, { fetchedAt: Date.now() });
      return D.loadFxCache().then(function (r) {
        var out = r || fb;
        D.setRates(out);
        return out;
      }).catch(function () {
        D.setRates(fb);
        return fb;
      });
    });
  };

  UBS.convert = function (amount, from, to, rates) {
    rates = rates || D.getRates() || UBS.FALLBACK;
    var usd = Number(amount) / (rates[from] || 1);
    return usd * (rates[to] || 1);
  };
})(window);
