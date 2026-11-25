/* ============================================================
   UBS-PROFPORT — DEMO core (store, i18n, FX, UI helpers)
   Everything is client-side demo data. No real banking.
   ============================================================ */
(function (global) {
  "use strict";

  var KEY = "ubs_profport_demo_v1"; /* demo store key */
  var THEME_KEY = "ubs_theme";
  var LANG_KEY = "ubs_lang";

  /* ---------------- storage ---------------- */
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }
  function write(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
    return db;
  }
  function uid(p) { return (p || "id") + "_" + Math.random().toString(36).slice(2, 9); }

  function seed() {
    var now = Date.now();
    var day = 86400000;
    var db = {
      version: 1,
      users: [
        {
          id: "u_demo",
          name: "Alex Morgan",
          email: "alex@demo.local",
          password: "demo1234",
          accountNumber: "5818 2044 7710",
          balance: 24850.75,
          currency: "USD",
          status: "active",
          createdAt: now - day * 210,
          cards: [
            { id: "c1", type: "debit", brand: "UBS-PROFPORT DEBIT", number: "4000 0000 0000 0000", expiry: "12/29", cvv: "123", status: "active" },
            { id: "c2", type: "credit", brand: "UBS-PROFPORT CREDIT", number: "5555 5555 5555 4444", expiry: "08/28", cvv: "456", status: "active" }
          ],
          transactions: [
            { id: uid("t"), type: "credit", desc: "Salary — Northwind Studio", amount: 5200, currency: "USD", date: now - day * 2, status: "completed" },
            { id: uid("t"), type: "debit", desc: "Rent — Apartment 4B", amount: 1450, currency: "USD", date: now - day * 3, status: "completed" },
            { id: uid("t"), type: "debit", desc: "Groceries — Market", amount: 96.4, currency: "USD", date: now - day * 4, status: "completed" },
            { id: uid("t"), type: "debit", desc: "Electricity bill", amount: 78.2, currency: "USD", date: now - day * 6, status: "completed" },
            { id: uid("t"), type: "credit", desc: "Refund — Online store", amount: 42.5, currency: "USD", date: now - day * 8, status: "completed" },
            { id: uid("t"), type: "debit", desc: "Transfer to Savings", amount: 500, currency: "USD", date: now - day * 11, status: "completed" }
          ],
          loans: [
            { id: uid("l"), amount: 8000, term: 24, purpose: "Home renovation", status: "approved", date: now - day * 40 }
          ],
          requests: [
            { id: uid("r"), kind: "deposit", amount: 1200, note: "Payroll deposit", status: "pending", date: now - day * 1 },
            { id: uid("r"), kind: "withdrawal", amount: 300, note: "ATM withdrawal", status: "pending", date: now - day * 1 }
          ],
          messages: [
            { id: uid("m"), from: "user", text: "Hi, my card was declined at a store today. Could you check?", date: now - day * 2 },
            { id: uid("m"), from: "admin", text: "Thanks for reaching out — this is a demo environment, so no real card exists. In a live system we would review the merchant and unblock it.", date: now - day * 2 + 3600000 }
          ]
        },
        {
          id: "u_2",
          name: "Priya Raman",
          email: "priya@demo.local",
          password: "demo1234",
          accountNumber: "7742 1180 3391",
          balance: 6120.4,
          currency: "EUR",
          status: "active",
          createdAt: now - day * 95,
          cards: [{ id: uid("c"), type: "debit", brand: "UBS-PROFPORT DEBIT", number: "4000 0000 0000 0000", expiry: "03/30", cvv: "321", status: "active" }],
          transactions: [
            { id: uid("t"), type: "credit", desc: "Freelance invoice #204", amount: 2400, currency: "EUR", date: now - day * 5, status: "completed" },
            { id: uid("t"), type: "debit", desc: "Train tickets", amount: 88, currency: "EUR", date: now - day * 7, status: "completed" }
          ],
          loans: [],
          requests: [{ id: uid("r"), kind: "loan", amount: 5000, note: "Equipment purchase", status: "pending", date: now - day * 2 }],
          messages: []
        },
        {
          id: "u_3",
          name: "Tomás Silva",
          email: "tomas@demo.local",
          password: "demo1234",
          accountNumber: "3390 5521 8842",
          balance: 980.15,
          currency: "USD",
          status: "suspended",
          createdAt: now - day * 30,
          cards: [],
          transactions: [{ id: uid("t"), type: "credit", desc: "Opening deposit", amount: 1000, currency: "USD", date: now - day * 30, status: "completed" }],
          loans: [],
          requests: [],
          messages: [{ id: uid("m"), from: "user", text: "Why is my account suspended?", date: now - day * 1 }]
        }
      ],
      rates: null,
      ratesUpdated: null
    };
    return write(db);
  }

  function db() {
    var d = read();
    if (!d || !d.users) d = seed();
    return d;
  }
  function save(d) { return write(d); }
  function reset() { localStorage.removeItem(KEY); return seed(); }

  function currentUser() {
    var d = db();
    var sid = localStorage.getItem("ubs_session");
    if (!sid) return null;
    return d.users.filter(function (u) { return u.id === sid; })[0] || null;
  }
  function login(email, password) {
    var d = db();
    var u = d.users.filter(function (x) {
      return x.email.toLowerCase() === String(email).toLowerCase().trim() && x.password === password;
    })[0];
    if (!u) return { ok: false, error: "invalid" };
    if (u.status === "blocked") return { ok: false, error: "blocked" };
    localStorage.setItem("ubs_session", u.id);
    return { ok: true, user: u };
  }
  function logout() { localStorage.removeItem("ubs_session"); }
  function updateUser(id, patch) {
    var d = db();
    d.users = d.users.map(function (u) { return u.id === id ? Object.assign({}, u, patch) : u; });
    save(d);
    return d.users.filter(function (u) { return u.id === id; })[0];
  }
  function addTransaction(userId, tx) {
    var d = db();
    d.users = d.users.map(function (u) {
      if (u.id !== userId) return u;
      var t = Object.assign({ id: uid("t"), date: Date.now(), status: "completed" }, tx);
      u.transactions = [t].concat(u.transactions || []);
      return u;
    });
    save(d);
  }
  function addRequest(userId, req) {
    var d = db();
    d.users = d.users.map(function (u) {
      if (u.id !== userId) return u;
      u.requests = [Object.assign({ id: uid("r"), date: Date.now(), status: "pending" }, req)].concat(u.requests || []);
      return u;
    });
    save(d);
  }
  function addMessage(userId, from, text) {
    var d = db();
    d.users = d.users.map(function (u) {
      if (u.id !== userId) return u;
      u.messages = (u.messages || []).concat([{ id: uid("m"), from: from, text: text, date: Date.now() }]);
      return u;
    });
    save(d);
  }

  /* ---------------- formatting ---------------- */
  var SYMBOLS = { USD: "$", EUR: "€", JPY: "¥", KRW: "₩" };
  function fmtMoney(n, cur) {
    cur = cur || "USD";
    var v = Number(n) || 0;
    var dec = cur === "JPY" || cur === "KRW" ? 0 : 2;
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
    } catch (e) {
      return (SYMBOLS[cur] || "") + v.toFixed(dec);
    }
  }
  function fmtNum(n, dec) {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: dec == null ? 2 : dec, maximumFractionDigits: dec == null ? 2 : dec }).format(Number(n) || 0);
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
    catch (e) { return ""; }
  }
  function fmtDateTime(ts) {
    try { return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }
  function initials(name) {
    return String(name || "?").split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
  }

  /* ---------------- FX rates ---------------- */
  var FALLBACK = { USD: 1, EUR: 0.921, JPY: 151.4, KRW: 1342.5, base: "USD", source: "fallback" };
  var FX_ENDPOINTS = [
    "https://open.er-api.com/v6/latest/USD",
    "https://api.frankfurter.app/latest?from=USD&to=EUR,JPY,KRW"
  ];

  function normalizeRates(payload, src) {
    var r = payload && (payload.rates || payload);
    if (!r || typeof r.EUR || typeof r.EUR !== "number") return null;
    return {
      USD: 1,
      EUR: r.EUR, 
      JPY: r.JPY,
      KRW: r.KRW,
      base: "USD",
      source: src,
      fetchedAt: Date.now()
    };
  }

  function fetchRates() {
    var d = db();
    if (d.rates && d.ratesUpdated && Date.now() - d.ratesUpdated < 1000 * 60 * 30) {
      return Promise.resolve(d.rates);
    }
    var chain = FX_ENDPOINTS.reduce(function (p, url, i) {
      return p.catch(function () {
        return fetch(url, { cache: "no-store" }).then(function (res) {
          if (!res.ok) throw new Error("http " + res.status);
          return res.json();
        }).then(function (json) {
          var n = normalizeRates(json, i === 0 ? "open.er-api.com" : "frankfurter.app");
          if (!n) throw new Error("bad payload");
          return n;
        });
      });
    }, Promise.reject(new Error("start")));

    return chain.then(function (rates) {
      var dd = db();
      dd.rates = rates; dd.ratesUpdated = Date.now(); save(dd);
      return rates;
    }).catch(function () {
      var dd = db();
      var fb = Object.assign({}, FALLBACK, { fetchedAt: Date.now() });
      dd.rates = fb; dd.ratesUpdated = Date.now(); save(dd);
      return fb;
    });
  }

  function convert(amount, from, to, rates) {
    rates = rates || (db().rates || FALLBACK);
    var usd = Number(amount) / (rates[from] || 1);
    return usd * (rates[to] || 1);
  }

  /* ---------------- i18n ---------------- */
  var LANGS = [
    { code: "en", label: "English", short: "EN" },
    { code: "es", label: "Español", short: "ES" },
    { code: "it", label: "Italiano", short: "IT" },
    { code: "pt", label: "Português", short: "PT" },
    { code: "nl", label: "Nederlands", short: "NL" },
    { code: "fr", label: "Français", short: "FR" },
    { code: "ja", label: "日本語", short: "JA" },
    { code: "ko", label: "한국어", short: "KO" }
  ];

  var I18N = {
    en: {
      "banner": "DEMO — not a real bank. No real money, no real cards.",
      "nav.home": "Home", "nav.features": "Features", "nav.rates": "Rates", "nav.open": "Open demo",
      "nav.signin": "Sign in", "nav.admin": "Admin",
      "hero.eyebrow": "UI/UX prototype",
      "hero.title": "Banking, designed with clarity.",
      "hero.lede": "A complete online-banking interface prototype — accounts, cards, transfers, statements, loans and a full admin console. Built to be explored, not to hold money.",
      "hero.cta1": "Explore the demo", "hero.cta2": "View admin console",
      "hero.badge": "Demo data only",
      "feat.eyebrow": "What's inside", "feat.title": "Every screen a modern bank needs",
      "feat.lede": "Two separate experiences — a customer app and an operations console — sharing one clean design system.",
      "rates.eyebrow": "Live market rates", "rates.title": "Multi-currency, updated live",
      "rates.lede": "Indicative FX rates pulled from a public rates API, with a built-in fallback if the network is unavailable.",
      "rates.source": "Source", "rates.updated": "Updated",
      "cta.title": "Try the full prototype", "cta.lede": "Sign in with the demo account and walk through every flow. Nothing you do here moves real money.",
      "cta.btn": "Open the demo app",
      "footer.note": "UBS-PROFPORT is a fictional product built as a UI/UX prototype. It is not affiliated with any bank. All names, account numbers, card numbers, balances and transactions are sample data. No real money is held, moved or insured.",
      "common.signin": "Sign in", "common.email": "Email", "common.password": "Password",
      "common.cancel": "Cancel", "common.save": "Save", "common.submit": "Submit", "common.close": "Close",
      "common.amount": "Amount", "common.note": "Note", "common.status": "Status", "common.date": "Date",
      "common.actions": "Actions", "common.search": "Search", "common.all": "All", "common.back": "Back",
      "common.confirm": "Confirm", "common.approve": "Approve", "common.reject": "Reject",
      "common.pending": "Pending", "common.approved": "Approved", "common.rejected": "Rejected",
      "common.completed": "Completed", "common.active": "Active", "common.blocked": "Blocked", "common.suspended": "Suspended",
      "nav.overview": "Overview", "nav.cards": "Cards", "nav.transfer": "Transfer", "nav.statement": "Statement",
      "nav.loans": "Loans", "nav.bills": "Pay bills", "nav.atm": "ATM card", "nav.invest": "Invest",
      "nav.support": "Support", "nav.settings": "Settings", "nav.logout": "Log out",
      "dash.hello": "Welcome back", "dash.balance": "Total balance", "dash.income": "Income (30d)", "dash.expense": "Expenses (30d)",
      "dash.quick": "Quick actions", "dash.recent": "Recent activity", "dash.viewall": "View all",
      "dash.accounts": "Your accounts", "dash.rates": "Market rates",
      "act.wire": "Wire transfer", "act.internal": "Internal transfer", "act.statement": "Statement",
      "act.loan": "Loan request", "act.bill": "Pay bill", "act.atm": "ATM card", "act.invest": "Invest", "act.support": "Support",
      "cards.title": "Your cards", "cards.sub": "Sample card data — these numbers are not real and cannot be charged.",
      "cards.sample": "Sample data", "cards.freeze": "Freeze", "cards.unfreeze": "Unfreeze", "cards.frozen": "Frozen",
      "cards.number": "Card number", "cards.expiry": "Expiry", "cards.cvv": "CVV",
      "wire.title": "Wire transfer", "wire.sub": "Send funds to an external bank account.",
      "wire.beneficiary": "Beneficiary name", "wire.iban": "IBAN / Account number", "wire.bank": "Bank name", "wire.swift": "SWIFT / BIC",
      "internal.title": "Internal transfer", "internal.sub": "Move money between your own accounts instantly.",
      "internal.from": "From", "internal.to": "To", "internal.savings": "Savings account", "internal.checking": "Checking account",
      "stmt.title": "Account statement", "stmt.sub": "Download or print a statement for any period.",
      "stmt.export": "Export CSV", "stmt.print": "Print",
      "loan.title": "Loan request", "loan.sub": "Apply for a demo loan. Applications go to the admin console for review.",
      "loan.term": "Term (months)", "loan.purpose": "Purpose", "loan.apply": "Submit application",
      "bill.title": "Pay a bill", "bill.sub": "Pay a utility or service bill from your balance.",
      "bill.payee": "Payee", "bill.account": "Biller account", "bill.pay": "Pay bill",
      "atm.title": "ATM card request", "atm.sub": "Request a physical ATM card. Demo only — nothing is issued.",
      "atm.deliver": "Delivery address", "atm.request": "Request card",
      "invest.title": "Investments", "invest.sub": "A demo portfolio view. No real securities are traded.",
      "invest.portfolio": "Portfolio value", "invest.holdings": "Holdings", "invest.return": "Return",
      "support.title": "Support", "support.sub": "Message the operations team. Replies appear here.",
      "support.placeholder": "Write a message…", "support.send": "Send",
      "settings.title": "Settings", "settings.sub": "Appearance and preferences.",
      "settings.theme": "Dark mode", "settings.language": "Language", "settings.reset": "Reset demo data",
      "settings.resetnote": "Clears all demo data in this browser and restores the seed.",
      "login.title": "Sign in to the demo", "login.sub": "Use the demo account below. No real credentials are needed.",
      "login.demo": "Demo account", "login.fill": "Fill demo credentials", "login.error": "Email or password is incorrect.",
      "login.blocked": "This demo account is blocked. Try the admin console to unblock it.",
      "admin.title": "Operations console", "admin.sub": "Manage demo users, requests and support.",
      "admin.users": "Users", "admin.requests": "Requests", "admin.loans": "Loans", "admin.inbox": "Support inbox",
      "admin.overview": "Overview", "admin.totalusers": "Total users", "admin.totalbal": "Total balances",
      "admin.pendingreq": "Pending requests", "admin.openmsgs": "Open messages",
      "admin.createuser": "Create user", "admin.fund": "Fund", "admin.withdraw": "Withdraw",
      "admin.block": "Block", "admin.suspend": "Suspend", "admin.activate": "Activate",
      "admin.newuser": "New demo user", "admin.name": "Full name", "admin.opening": "Opening balance",
      "admin.currency": "Currency", "admin.reply": "Reply", "admin.sendreply": "Send reply",
      "admin.norequests": "No requests in this view.", "admin.nomessages": "No messages yet.",
      "admin.amount": "Amount", "admin.user": "User", "admin.kind": "Type", "admin.balance": "Balance",
      "admin.deposit": "Deposit", "admin.withdrawal": "Withdrawal", "admin.atm": "ATM card", "admin.loan": "Loan",
      "admin.acct": "Account", "admin.created": "Created", "admin.youradmin": "Admin console",
      "admin.separate": "This console is a separate route from the customer app.",
      "toast.saved": "Saved", "toast.sent": "Sent", "toast.submitted": "Submitted for review",
      "toast.copied": "Copied", "toast.reset": "Demo data reset", "toast.insufficient": "Insufficient demo balance",
      "toast.filled": "Demo credentials filled", "toast.frozen": "Card frozen", "toast.unfrozen": "Card unfrozen",
      "toast.created": "User created", "toast.updated": "Updated", "toast.replied": "Reply sent"
    }
  };

  function lang() {
    var l = localStorage.getItem(LANG_KEY);
    if (l && I18N[l]) return l;
    return "en";
  }
  function setLang(code) {
    if (!I18N[code]) return;
    localStorage.setItem(LANG_KEY, code);
    document.documentElement.setAttribute("lang", code);
    applyI18n();
    document.dispatchEvent(new CustomEvent("ubs:lang", { detail: code }));
  }
  function t(key) {
    var l = lang();
    return (I18N[l] && I18N[l][key]) || I18N.en[key] || key;
  }
  function applyI18n(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      var v = t(k);
      if (el.hasAttribute("data-i18n-attr")) {
        el.setAttribute(el.getAttribute("data-i18n-attr"), v);
      } else {
        el.textContent = v;
      }
    });
    root.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
  }

  /* ---------------- theme ---------------- */
  function theme() { return localStorage.getItem(THEME_KEY) || "light"; }
  function setTheme(v) {
    localStorage.setItem(THEME_KEY, v);
    document.documentElement.setAttribute("data-theme", v);
    document.dispatchEvent(new CustomEvent("ubs:theme", { detail: v }));
  }
  function toggleTheme() { setTheme(theme() === "dark" ? "light" : "dark"); }

  /* ---------------- icons ---------------- */
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/>',
    send: '<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-8-8-4L21 3z"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    loan: '<path d="M12 2v20"/><path d="M17 6.5c0-2-2.2-3-5-3s-5 1-5 3 2.2 2.8 5 3.4 5 1.4 5 3.6-2.2 3-5 3-5-1-5-3"/>',
    bill: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    atm: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M6 9h5M6 13h3"/><circle cx="16.5" cy="12" r="2.5"/>',
    invest: '<path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/>',
    support: '<path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a1.7 1.7 0 0 0-1.6-1H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3a1.7 1.7 0 0 0 1-1.6V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 3a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 9v.1a1.7 1.7 0 0 0 1.6 1H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0"/><path d="M17 5.5a3 3 0 0 1 0 5.8"/><path d="M18.5 21a6 6 0 0 0-2-4.5"/>',
    inbox: '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14l2 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2-7z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    arrowUp: '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/>',
    shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M16 12h3"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 17h12v4H6z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
  };
  function icon(name, cls) {
    var p = P[name] || P.info;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : "") + ">" + p + "</svg>";
  }

  /* ---------------- UI helpers ---------------- */
  function toast(msg, kind) {
    var host = document.getElementById("toasts");
    if (!host) { host = document.createElement("div"); host.id = "toasts"; document.body.appendChild(host); }
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = '<span style="flex:none;margin-top:1px">' + icon(kind === "error" ? "info" : "check") + "</span><span>" + msg + "</span>";
    host.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transform = "translateY(6px)"; el.style.transition = "all .25s"; }, 2600);
    setTimeout(function () { el.remove(); }, 3000);
  }

  function modal(opts) {
    var back = document.createElement("div");
    back.className = "modal-backdrop";
    back.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      "<h3>" + (opts.title || "") + "</h3>" +
      (opts.sub ? '<p class="modal-sub">' + opts.sub + "</p>" : "") +
      '<div class="modal-body">' + (opts.body || "") + "</div>" +
      '<div class="modal-actions">' +
      '<button class="btn ghost" data-close>' + t("common.cancel") + "</button>" +
      (opts.confirmText ? '<button class="btn ' + (opts.danger ? "danger" : "") + '" data-confirm>' + opts.confirmText + "</button>" : "") +
      "</div></div>";
    document.body.appendChild(back);
    function close() { back.remove(); }
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    back.querySelector("[data-close]").addEventListener("click", close);
    var cf = back.querySelector("[data-confirm]");
    if (cf) cf.addEventListener("click", function () {
      var ok = opts.onConfirm ? opts.onConfirm(back) : true;
      if (ok !== false) close();
    });
    if (opts.onOpen) opts.onOpen(back);
    return { el: back, close: close };
  }

  function statusPill(status) {
    var map = {
      active: "ok", completed: "ok", approved: "ok",
      pending: "warn", suspended: "warn",
      blocked: "danger", rejected: "danger", frozen: "danger"
    };
    var cls = map[status] || "";
    return '<span class="pill ' + cls + '"><span class="dot"></span>' + t("common." + status) + "</span>";
  }

  function langSelectHTML() {
    var cur = lang();
    return '<label class="lang-select" title="' + t("settings.language") + '">' + icon("globe") +
      '<select id="langSelect" aria-label="' + t("settings.language") + '">' +
      LANGS.map(function (l) { return '<option value="' + l.code + '"' + (l.code === cur ? " selected" : "") + ">" + l.label + "</option>"; }).join("") +
      "</select></label>";
  }
  function wireLangSelect(root) {
    var sel = (root || document).querySelector("#langSelect");
    if (sel) sel.addEventListener("change", function () { setLang(sel.value); });
  }

  function themeBtnHTML() {
    return '<button class="icon-btn" id="themeBtn" aria-label="Toggle dark mode" title="' + t("settings.theme") + '">' + icon(theme() === "dark" ? "sun" : "moon") + "</button>";
  }
  function wireThemeBtn(root) {
    var b = (root || document).querySelector("#themeBtn");
    if (b) b.addEventListener("click", function () {
      toggleTheme();
      b.innerHTML = icon(theme() === "dark" ? "sun" : "moon");
    });
  }

  function csvDownload(filename, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c == null ? "" : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",");
    }).join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function initChrome() {
    document.documentElement.setAttribute("data-theme", theme());
    document.documentElement.setAttribute("lang", lang());
    applyI18n();
  }

  global.UBS = {
    db: db, save: save, seed: seed, reset: reset, uid: uid,
    currentUser: currentUser, login: login, logout: logout,
    updateUser: updateUser, addTransaction: addTransaction, addRequest: addRequest, addMessage: addMessage,
    fmtVoney: fmtMoney, fmtNum: fmtNum, fmtDate: fmtDate, fmtDateTime: fmtDateTime, initials: initials,
    fetchRates: fetchRates, convert: convert, FALLBACK: FALLBACK,
    t: t, lang: lang, setLang: setLang, applyI18n: applyI18n, LANGS: LANGS, I18N: I18N,
    langSelectHTML: langSelectHTML, wireLangSelect: wireLangSelect,
    theme: theme, setTheme: setTheme, toggleTheme: toggleTheme, themeBtnHTML: themeBtnHTML, wireThemeBtn: wireThemeBtn,
    icon: icon, toast: toast, modal: modal, statusPill: statusPill, csvDownload: csvDownload,
    initChrome: initChrome
  };
})(window);
