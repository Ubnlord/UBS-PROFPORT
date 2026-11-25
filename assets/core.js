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
    if (!r || typeof r.EUR !== "number") return null;
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
    },
    es: {
      "banner": "DEMO — no es un banco real. Sin dinero real, sin tarjetas reales.",
      "nav.home": "Inicio", "nav.features": "Funciones", "nav.rates": "Tipos", "nav.open": "Abrir demo",
      "nav.signin": "Entrar", "nav.admin": "Admin",
      "hero.eyebrow": "Prototipo UI/UX",
      "hero.title": "Banca, diseñada con claridad.",
      "hero.lede": "Un prototipo completo de banca en línea: cuentas, tarjetas, transferencias, extractos, préstamos y una consola de administración. Hecho para explorarse, no para guardar dinero.",
      "hero.cta1": "Explorar la demo", "hero.cta2": "Ver consola admin",
      "hero.badge": "Solo datos de demo",
      "feat.eyebrow": "Qué incluye", "feat.title": "Todas las pantallas de un banco moderno",
      "feat.lede": "Dos experiencias separadas — una app de cliente y una consola de operaciones — con un mismo sistema de diseño.",
      "rates.eyebrow": "Tipos de mercado", "rates.title": "Multidivisa, en vivo",
      "rates.lede": "Tipos de cambio indicativos obtenidos de una API pública, con respaldo integrado si no hay red.",
      "rates.source": "Fuente", "rates.updated": "Actualizado",
      "cta.title": "Prueba el prototipo completo", "cta.lede": "Entra con la cuenta demo y recorre todos los flujos. Nada aquí mueve dinero real.",
      "cta.btn": "Abrir la app demo",
      "footer.note": "UBS-PROFPORT es un producto ficticio creado como prototipo UI/UX. No está afiliado a ningún banco. Nombres, cuentas, tarjetas, saldos y transacciones son datos de ejemplo. No se guarda, mueve ni asegura dinero real.",
      "common.signin": "Entrar", "common.email": "Correo", "common.password": "Contraseña",
      "common.cancel": "Cancelar", "common.save": "Guardar", "common.submit": "Enviar", "common.close": "Cerrar",
      "common.amount": "Importe", "common.note": "Nota", "common.status": "Estado", "common.date": "Fecha",
      "common.actions": "Acciones", "common.search": "Buscar", "common.all": "Todos", "common.back": "Volver",
      "common.confirm": "Confirmar", "common.approve": "Aprobar", "common.reject": "Rechazar",
      "common.pending": "Pendiente", "common.approved": "Aprobado", "common.rejected": "Rechazado",
      "common.completed": "Completado", "common.active": "Activo", "common.blocked": "Bloqueado", "common.suspended": "Suspendido",
      "nav.overview": "Resumen", "nav.cards": "Tarjetas", "nav.transfer": "Transferir", "nav.statement": "Extracto",
      "nav.loans": "Préstamos", "nav.bills": "Pagar facturas", "nav.atm": "Tarjeta ATM", "nav.invest": "Invertir",
      "nav.support": "Soporte", "nav.settings": "Ajustes", "nav.logout": "Salir",
      "dash.hello": "Bienvenido de nuevo", "dash.balance": "Saldo total", "dash.income": "Ingresos (30d)", "dash.expense": "Gastos (30d)",
      "dash.quick": "Acciones rápidas", "dash.recent": "Actividad reciente", "dash.viewall": "Ver todo",
      "dash.accounts": "Tus cuentas", "dash.rates": "Tipos de mercado",
      "act.wire": "Transferencia", "act.internal": "Interna", "act.statement": "Extracto",
      "act.loan": "Préstamo", "act.bill": "Factura", "act.atm": "Tarjeta ATM", "act.invest": "Invertir", "act.support": "Soporte",
      "cards.title": "Tus tarjetas", "cards.sub": "Datos de tarjeta de ejemplo: estos números no son reales.",
      "cards.sample": "Datos de ejemplo", "cards.freeze": "Congelar", "cards.unfreeze": "Descongelar", "cards.frozen": "Congelada",
      "cards.number": "Número", "cards.expiry": "Caducidad", "cards.cvv": "CVV",
      "wire.title": "Transferencia bancaria", "wire.sub": "Envía fondos a una cuenta externa.",
      "wire.beneficiary": "Beneficiario", "wire.iban": "IBAN / Cuenta", "wire.bank": "Banco", "wire.swift": "SWIFT / BIC",
      "internal.title": "Transferencia interna", "internal.sub": "Mueve dinero entre tus cuentas al instante.",
      "internal.from": "Desde", "internal.to": "Hacia", "internal.savings": "Cuenta de ahorro", "internal.checking": "Cuenta corriente",
      "stmt.title": "Extracto de cuenta", "stmt.sub": "Descarga o imprime un extracto de cualquier periodo.",
      "stmt.export": "Exportar CSV", "stmt.print": "Imprimir",
      "loan.title": "Solicitud de préstamo", "loan.sub": "Solicita un préstamo demo. Las solicitudes van a la consola admin.",
      "loan.term": "Plazo (meses)", "loan.purpose": "Motivo", "loan.apply": "Enviar solicitud",
      "bill.title": "Pagar una factura", "bill.sub": "Paga una factura de servicios desde tu saldo.",
      "bill.payee": "Beneficiario", "bill.account": "Cuenta del recibo", "bill.pay": "Pagar",
      "atm.title": "Solicitar tarjeta ATM", "atm.sub": "Solicita una tarjeta física. Solo demo: no se emite nada.",
      "atm.deliver": "Dirección de envío", "atm.request": "Solicitar tarjeta",
      "invest.title": "Inversiones", "invest.sub": "Vista de cartera demo. No se negocian valores reales.",
      "invest.portfolio": "Valor de cartera", "invest.holdings": "Posiciones", "invest.return": "Rentabilidad",
      "support.title": "Soporte", "support.sub": "Escribe al equipo de operaciones. Las respuestas aparecen aquí.",
      "support.placeholder": "Escribe un mensaje…", "support.send": "Enviar",
      "settings.title": "Ajustes", "settings.sub": "Apariencia y preferencias.",
      "settings.theme": "Modo oscuro", "settings.language": "Idioma", "settings.reset": "Restablecer datos demo",
      "settings.resetnote": "Borra todos los datos demo de este navegador y restaura el ejemplo.",
      "login.title": "Entrar a la demo", "login.sub": "Usa la cuenta demo. No se necesitan credenciales reales.",
      "login.demo": "Cuenta demo", "login.fill": "Rellenar credenciales", "login.error": "Correo o contraseña incorrectos.",
      "login.blocked": "Esta cuenta demo está bloqueada. Usa la consola admin para desbloquearla.",
      "admin.title": "Consola de operaciones", "admin.sub": "Gestiona usuarios, solicitudes y soporte demo.",
      "admin.users": "Usuarios", "admin.requests": "Solicitudes", "admin.loans": "Préstamos", "admin.inbox": "Bandeja de soporte",
      "admin.overview": "Resumen", "admin.totalusers": "Usuarios totales", "admin.totalbal": "Saldos totales",
      "admin.pendingreq": "Solicitudes pendientes", "admin.openmsgs": "Mensajes abiertos",
      "admin.createuser": "Crear usuario", "admin.fund": "Ingresar", "admin.withdraw": "Retirar",
      "admin.block": "Bloquear", "admin.suspend": "Suspender", "admin.activate": "Activar",
      "admin.newuser": "Nuevo usuario demo", "admin.name": "Nombre completo", "admin.opening": "Saldo inicial",
      "admin.currency": "Divisa", "admin.reply": "Responder", "admin.sendreply": "Enviar respuesta",
      "admin.norequests": "No hay solicitudes en esta vista.", "admin.nomessages": "Aún no hay mensajes.",
      "admin.amount": "Importe", "admin.user": "Usuario", "admin.kind": "Tipo", "admin.balance": "Saldo",
      "admin.deposit": "Depósito", "admin.withdrawal": "Retiro", "admin.atm": "Tarjeta ATM", "admin.loan": "Préstamo",
      "admin.acct": "Cuenta", "admin.created": "Creado", "admin.youradmin": "Consola admin",
      "admin.separate": "Esta consola es una ruta separada de la app del cliente.",
      "toast.saved": "Guardado", "toast.sent": "Enviado", "toast.submitted": "Enviado a revisión",
      "toast.copied": "Copiado", "toast.reset": "Datos demo restablecidos", "toast.insufficient": "Saldo demo insuficiente",
      "toast.filled": "Credenciales demo rellenadas", "toast.frozen": "Tarjeta congelada", "toast.unfrozen": "Tarjeta descongelada",
      "toast.created": "Usuario creado", "toast.updated": "Actualizado", "toast.replied": "Respuesta enviada"
    },
    it: {
      "banner": "DEMO — non è una banca reale. Nessun denaro reale, nessuna carta reale.",
      "nav.home": "Home", "nav.features": "Funzioni", "nav.rates": "Cambi", "nav.open": "Apri demo",
      "nav.signin": "Accedi", "nav.admin": "Admin",
      "hero.eyebrow": "Prototipo UI/UX",
      "hero.title": "Il banking, progettato con chiarezza.",
      "hero.lede": "Un prototipo completo di home banking: conti, carte, bonifici, estratti conto, prestiti e una console di amministrazione. Da esplorare, non per custodire denaro.",
      "hero.cta1": "Esplora la demo", "hero.cta2": "Vedi console admin",
      "hero.badge": "Solo dati demo",
      "feat.eyebrow": "Cosa include", "feat.title": "Tutte le schermate di una banca moderna",
      "feat.lede": "Due esperienze separate — app cliente e console operativa — con un unico design system.",
      "rates.eyebrow": "Cambi di mercato", "rates.title": "Multivaluta, in tempo reale",
      "rates.lede": "Tassi indicativi da un'API pubblica, con fallback integrato se la rete non è disponibile.",
      "rates.source": "Fonte", "rates.updated": "Aggiornato",
      "cta.title": "Prova il prototipo completo", "cta.lede": "Accedi con l'account demo e percorri tutti i flussi. Qui non si muove denaro reale.",
      "cta.btn": "Apri l'app demo",
      "footer.note": "UBS-PROFPORT è un prodotto immaginario creato come prototipo UI/UX. Non è affiliato ad alcuna banca. Nomi, conti, carte, saldi e transazioni sono dati di esempio. Nessun denaro reale è custodito, trasferito o assicurato.",
      "common.signin": "Accedi", "common.email": "Email", "common.password": "Password",
      "common.cancel": "Annulla", "common.save": "Salva", "common.submit": "Invia", "common.close": "Chiudi",
      "common.amount": "Importo", "common.note": "Nota", "common.status": "Stato", "common.date": "Data",
      "common.actions": "Azioni", "common.search": "Cerca", "common.all": "Tutti", "common.back": "Indietro",
      "common.confirm": "Conferma", "common.approve": "Approva", "common.reject": "Rifiuta",
      "common.pending": "In attesa", "common.approved": "Approvato", "common.rejected": "Rifiutato",
      "common.completed": "Completato", "common.active": "Attivo", "common.blocked": "Bloccato", "common.suspended": "Sospeso",
      "nav.overview": "Panoramica", "nav.cards": "Carte", "nav.transfer": "Bonifico", "nav.statement": "Estratto",
      "nav.loans": "Prestiti", "nav.bills": "Bollette", "nav.atm": "Carta ATM", "nav.invest": "Investi",
      "nav.support": "Supporto", "nav.settings": "Impostazioni", "nav.logout": "Esci",
      "dash.hello": "Bentornato", "dash.balance": "Saldo totale", "dash.income": "Entrate (30g)", "dash.expense": "Uscite (30g)",
      "dash.quick": "Azioni rapide", "dash.recent": "Attività recente", "dash.viewall": "Vedi tutto",
      "dash.accounts": "I tuoi conti", "dash.rates": "Cambi di mercato",
      "act.wire": "Bonifico", "act.internal": "Interno", "act.statement": "Estratto",
      "act.loan": "Prestito", "act.bill": "Bolletta", "act.atm": "Carta ATM", "act.invest": "Investi", "act.support": "Supporto",
      "cards.title": "Le tue carte", "cards.sub": "Dati di esempio: questi numeri non sono reali.",
      "cards.sample": "Dati di esempio", "cards.freeze": "Blocca", "cards.unfreeze": "Sblocca", "cards.frozen": "Bloccata",
      "cards.number": "Numero", "cards.expiry": "Scadenza", "cards.cvv": "CVV",
      "wire.title": "Bonifico bancario", "wire.sub": "Invia fondi a un conto esterno.",
      "wire.beneficiary": "Beneficiario", "wire.iban": "IBAN / Conto", "wire.bank": "Banca", "wire.swift": "SWIFT / BIC",
      "internal.title": "Trasferimento interno", "internal.sub": "Sposta denaro tra i tuoi conti subito.",
      "internal.from": "Da", "internal.to": "A", "internal.savings": "Conto risparmio", "internal.checking": "Conto corrente",
      "stmt.title": "Estratto conto", "stmt.sub": "Scarica o stampa un estratto per qualsiasi periodo.",
      "stmt.export": "Esporta CSV", "stmt.print": "Stampa",
      "loan.title": "Richiesta prestito", "loan.sub": "Richiedi un prestito demo. Le richieste vanno alla console admin.",
      "loan.term": "Durata (mesi)", "loan.purpose": "Motivo", "loan.apply": "Invia richiesta",
      "bill.title": "Paga una bolletta", "bill.sub": "Paga una bolletta dal tuo saldo.",
      "bill.payee": "Beneficiario", "bill.account": "Conto bolletta", "bill.pay": "Paga",
      "atm.title": "Richiesta carta ATM", "atm.sub": "Richiedi una carta fisica. Solo demo: non viene emessa.",
      "atm.deliver": "Indirizzo di consegna", "atm.request": "Richiedi carta",
      "invest.title": "Investimenti", "invest.sub": "Vista portafoglio demo. Nessun titolo reale è negoziato.",
      "invest.portfolio": "Valore portafoglio", "invest.holdings": "Posizioni", "invest.return": "Rendimento",
      "support.title": "Supporto", "support.sub": "Scrivi al team operativo. Le risposte appaiono qui.",
      "support.placeholder": "Scrivi un messaggio…", "support.send": "Invia",
      "settings.title": "Impostazioni", "settings.sub": "Aspetto e preferenze.",
      "settings.theme": "Modalità scura", "settings.language": "Lingua", "settings.reset": "Ripristina dati demo",
      "settings.resetnote": "Cancella tutti i dati demo in questo browser e ripristina l'esempio.",
      "login.title": "Accedi alla demo", "login.sub": "Usa l'account demo. Nessuna credenziale reale necessaria.",
      "login.demo": "Account demo", "login.fill": "Compila credenziali", "login.error": "Email o password errati.",
      "login.blocked": "Questo account demo è bloccato. Usa la console admin per sbloccarlo.",
      "admin.title": "Console operativa", "admin.sub": "Gestisci utenti, richieste e supporto demo.",
      "admin.users": "Utenti", "admin.requests": "Richieste", "admin.loans": "Prestiti", "admin.inbox": "Posta supporto",
      "admin.overview": "Panoramica", "admin.totalusers": "Utenti totali", "admin.totalbal": "Saldi totali",
      "admin.pendingreq": "Richieste in attesa", "admin.openmsgs": "Messaggi aperti",
      "admin.createuser": "Crea utente", "admin.fund": "Accredita", "admin.withdraw": "Preleva",
      "admin.block": "Blocca", "admin.suspend": "Sospendi", "admin.activate": "Attiva",
      "admin.newuser": "Nuovo utente demo", "admin.name": "Nome completo", "admin.opening": "Saldo iniziale",
      "admin.currency": "Valuta", "admin.reply": "Rispondi", "admin.sendreply": "Invia risposta",
      "admin.norequests": "Nessuna richiesta in questa vista.", "admin.nomessages": "Ancora nessun messaggio.",
      "admin.amount": "Importo", "admin.user": "Utente", "admin.kind": "Tipo", "admin.balance": "Saldo",
      "admin.deposit": "Deposito", "admin.withdrawal": "Prelievo", "admin.atm": "Carta ATM", "admin.loan": "Prestito",
      "admin.acct": "Conto", "admin.created": "Creato", "admin.youradmin": "Console admin",
      "admin.separate": "Questa console è una rotta separata dall'app cliente.",
      "toast.saved": "Salvato", "toast.sent": "Inviato", "toast.submitted": "Inviato per revisione",
      "toast.copied": "Copiato", "toast.reset": "Dati demo ripristinati", "toast.insufficient": "Saldo demo insufficiente",
      "toast.filled": "Credenziali demo compilate", "toast.frozen": "Carta bloccata", "toast.unfrozen": "Carta sbloccata",
      "toast.created": "Utente creato", "toast.updated": "Aggiornato", "toast.replied": "Risposta inviata"
    },
    pt: {
      "banner": "DEMO — não é um banco real. Sem dinheiro real, sem cartões reais.",
      "nav.home": "Início", "nav.features": "Recursos", "nav.rates": "Câmbio", "nav.open": "Abrir demo",
      "nav.signin": "Entrar", "nav.admin": "Admin",
      "hero.eyebrow": "Protótipo UI/UX",
      "hero.title": "Banking, desenhado com clareza.",
      "hero.lede": "Um protótipo completo de banco online: contas, cartões, transferências, extratos, empréstimos e um console de administração. Feito para explorar, não para guardar dinheiro.",
      "hero.cta1": "Explorar a demo", "hero.cta2": "Ver console admin",
      "hero.badge": "Apenas dados de demo",
      "feat.eyebrow": "O que inclui", "feat.title": "Todas as telas de um banco moderno",
      "feat.lede": "Duas experiências separadas — app do cliente e console de operações — com um único design system.",
      "rates.eyebrow": "Câmbio de mercado", "rates.title": "Multimoeda, ao vivo",
      "rates.lede": "Taxas indicativas de uma API pública, com fallback integrado se a rede falhar.",
      "rates.source": "Fonte", "rates.updated": "Atualizado",
      "cta.title": "Experimente o protótipo completo", "cta.lede": "Entre com a conta demo e percorra todos os fluxos. Nada aqui move dinheiro real.",
      "cta.btn": "Abrir o app demo",
      "footer.note": "UBS-PROFPORT é um produto fictício criado como protótipo UI/UX. Não é afiliado a nenhum banco. Nomes, contas, cartões, saldos e transações são dados de exemplo. Nenhum dinheiro real é guardado, movido ou segurado.",
      "common.signin": "Entrar", "common.email": "E-mail", "common.password": "Senha",
      "common.cancel": "Cancelar", "common.save": "Salvar", "common.submit": "Enviar", "common.close": "Fechar",
      "common.amount": "Valor", "common.note": "Nota", "common.status": "Status", "common.date": "Data",
      "common.actions": "Ações", "common.search": "Buscar", "common.all": "Todos", "common.back": "Voltar",
      "common.confirm": "Confirmar", "common.approve": "Aprovar", "common.reject": "Rejeitar",
      "common.pending": "Pendente", "common.approved": "Aprovado", "common.rejected": "Rejeitado",
      "common.completed": "Concluído", "common.active": "Ativo", "common.blocked": "Bloqueado", "common.suspended": "Suspenso",
      "nav.overview": "Visão geral", "nav.cards": "Cartões", "nav.transfer": "Transferir", "nav.statement": "Extrato",
      "nav.loans": "Empréstimos", "nav.bills": "Pagar contas", "nav.atm": "Cartão ATM", "nav.invest": "Investir",
      "nav.support": "Suporte", "nav.settings": "Ajustes", "nav.logout": "Sair",
      "dash.hello": "Bem-vindo de volta", "dash.balance": "Saldo total", "dash.income": "Entradas (30d)", "dash.expense": "Saídas (30d)",
      "dash.quick": "Ações rápidas", "dash.recent": "Atividade recente", "dash.viewall": "Ver tudo",
      "dash.accounts": "Suas contas", "dash.rates": "Câmbio de mercado",
      "act.wire": "Transferência", "act.internal": "Interna", "act.statement": "Extrato",
      "act.loan": "Empréstimo", "act.bill": "Conta", "act.atm": "Cartão ATM", "act.invest": "Investir", "act.support": "Suporte",
      "cards.title": "Seus cartões", "cards.sub": "Dados de exemplo: estes números não são reais.",
      "cards.sample": "Dados de exemplo", "cards.freeze": "Congelar", "cards.unfreeze": "Descongelar", "cards.frozen": "Congelado",
      "cards.number": "Número", "cards.expiry": "Validade", "cards.cvv": "CVV",
      "wire.title": "Transferência bancária", "wire.sub": "Envie fundos para uma conta externa.",
      "wire.beneficiary": "Beneficiário", "wire.iban": "IBAN / Conta", "wire.bank": "Banco", "wire.swift": "SWIFT / BIC",
      "internal.title": "Transferência interna", "internal.sub": "Mova dinheiro entre suas contas na hora.",
      "internal.from": "De", "internal.to": "Para", "internal.savings": "Conta poupança", "internal.checking": "Conta corrente",
      "stmt.title": "Extrato da conta", "stmt.sub": "Baixe ou imprima um extrato de qualquer período.",
      "stmt.export": "Exportar CSV", "stmt.print": "Imprimir",
      "loan.title": "Pedido de empréstimo", "loan.sub": "Peça um empréstimo demo. Os pedidos vão ao console admin.",
      "loan.term": "Prazo (meses)", "loan.purpose": "Finalidade", "loan.apply": "Enviar pedido",
      "bill.title": "Pagar uma conta", "bill.sub": "Pague uma conta de serviço com seu saldo.",
      "bill.payee": "Beneficiário", "bill.account": "Conta da fatura", "bill.pay": "Pagar",
      "atm.title": "Pedido de cartão ATM", "atm.sub": "Peça um cartão físico. Só demo: nada é emitido.",
      "atm.deliver": "Endereço de entrega", "atm.request": "Pedir cartão",
      "invest.title": "Investimentos", "invest.sub": "Visão de carteira demo. Nenhum título real é negociado.",
      "invest.portfolio": "Valor da carteira", "invest.holdings": "Posições", "invest.return": "Retorno",
      "support.title": "Suporte", "support.sub": "Envie mensagem à equipe. As respostas aparecem aqui.",
      "support.placeholder": "Escreva uma mensagem…", "support.send": "Enviar",
      "settings.title": "Ajustes", "settings.sub": "Aparência e preferências.",
      "settings.theme": "Modo escuro", "settings.language": "Idioma", "settings.reset": "Redefinir dados demo",
      "settings.resetnote": "Apaga todos os dados demo deste navegador e restaura o exemplo.",
      "login.title": "Entrar na demo", "login.sub": "Use a conta demo. Nenhuma credencial real é necessária.",
      "login.demo": "Conta demo", "login.fill": "Preencher credenciais", "login.error": "E-mail ou senha incorretos.",
      "login.blocked": "Esta conta demo está bloqueada. Use o console admin para desbloquear.",
      "admin.title": "Console de operações", "admin.sub": "Gerencie usuários, pedidos e suporte demo.",
      "admin.users": "Usuários", "admin.requests": "Pedidos", "admin.loans": "Empréstimos", "admin.inbox": "Caixa de suporte",
      "admin.overview": "Visão geral", "admin.totalusers": "Total de usuários", "admin.totalbal": "Saldos totais",
      "admin.pendingreq": "Pedidos pendentes", "admin.openmsgs": "Mensagens abertas",
      "admin.createuser": "Criar usuário", "admin.fund": "Creditar", "admin.withdraw": "Debitar",
      "admin.block": "Bloquear", "admin.suspend": "Suspender", "admin.activate": "Ativar",
      "admin.newuser": "Novo usuário demo", "admin.name": "Nome completo", "admin.opening": "Saldo inicial",
      "admin.currency": "Moeda", "admin.reply": "Responder", "admin.sendreply": "Enviar resposta",
      "admin.norequests": "Nenhum pedido nesta visão.", "admin.nomessages": "Ainda sem mensagens.",
      "admin.amount": "Valor", "admin.user": "Usuário", "admin.kind": "Tipo", "admin.balance": "Saldo",
      "admin.deposit": "Depósito", "admin.withdrawal": "Saque", "admin.atm": "Cartão ATM", "admin.loan": "Empréstimo",
      "admin.acct": "Conta", "admin.created": "Criado", "admin.youradmin": "Console admin",
      "admin.separate": "Este console é uma rota separada do app do cliente.",
      "toast.saved": "Salvo", "toast.sent": "Enviado", "toast.submitted": "Enviado para revisão",
      "toast.copied": "Copiado", "toast.reset": "Dados demo redefinidos", "toast.insufficient": "Saldo demo insuficiente",
      "toast.filled": "Credenciais demo preenchidas", "toast.frozen": "Cartão congelado", "toast.unfrozen": "Cartão descongelado",
      "toast.created": "Usuário criado", "toast.updated": "Atualizado", "toast.replied": "Resposta enviada"
    },
    nl: {
      "banner": "DEMO — geen echte bank. Geen echt geld, geen echte kaarten.",
      "nav.home": "Home", "nav.features": "Functies", "nav.rates": "Koersen", "nav.open": "Demo openen",
      "nav.signin": "Inloggen", "nav.admin": "Beheer",
      "hero.eyebrow": "UI/UX-prototype",
      "hero.title": "Bankieren, ontworpen met helderheid.",
      "hero.lede": "Een compleet prototype van online bankieren: rekeningen, kaarten, overschrijvingen, afschriften, leningen en een beheerconsole. Om te verkennen, niet om geld te bewaren.",
      "hero.cta1": "Verken de demo", "hero.cta2": "Bekijk beheerconsole",
      "hero.badge": "Alleen demodata",
      "feat.eyebrow": "Wat erin zit", "feat.title": "Elk scherm dat een moderne bank nodig heeft",
      "feat.lede": "Twee aparte ervaringen — een klantapp en een operatieconsole — met één designsysteem.",
      "rates.eyebrow": "Marktkoersen", "rates.title": "Meerdere valuta's, live",
      "rates.lede": "Indicatieve koersen van een publieke API, met ingebouwde fallback zonder netwerk.",
      "rates.source": "Bron", "rates.updated": "Bijgewerkt",
      "cta.title": "Probeer het volledige prototype", "cta.lede": "Log in met het demo-account en doorloop alle flows. Niets hier verplaatst echt geld.",
      "cta.btn": "Open de demo-app",
      "footer.note": "UBS-PROFPORT is een fictief product, gemaakt als UI/UX-prototype. Het is niet verbonden aan een bank. Alle namen, rekeningen, kaarten, saldo's en transacties zijn voorbeelddata. Er wordt geen echt geld bewaard, verplaatst of verzekerd.",
      "common.signin": "Inloggen", "common.email": "E-mail", "common.password": "Wachtwoord",
      "common.cancel": "Annuleren", "common.save": "Opslaan", "common.submit": "Verzenden", "common.close": "Sluiten",
      "common.amount": "Bedrag", "common.note": "Notitie", "common.status": "Status", "common.date": "Datum",
      "common.actions": "Acties", "common.search": "Zoeken", "common.all": "Alle", "common.back": "Terug",
      "common.confirm": "Bevestigen", "common.approve": "Goedkeuren", "common.reject": "Afwijzen",
      "common.pending": "In behandeling", "common.approved": "Goedgekeurd", "common.rejected": "Afgewezen",
      "common.completed": "Voltooid", "common.active": "Actief", "common.blocked": "Geblokkeerd", "common.suspended": "Opgeschort",
      "nav.overview": "Overzicht", "nav.cards": "Kaarten", "nav.transfer": "Overschrijven", "nav.statement": "Afschrift",
      "nav.loans": "Leningen", "nav.bills": "Rekeningen", "nav.atm": "ATM-kaart", "nav.invest": "Beleggen",
      "nav.support": "Support", "nav.settings": "Instellingen", "nav.logout": "Uitloggen",
      "dash.hello": "Welkom terug", "dash.balance": "Totaal saldo", "dash.income": "Inkomsten (30d)", "dash.expense": "Uitgaven (30d)",
      "dash.quick": "Snelle acties", "dash.recent": "Recente activiteit", "dash.viewall": "Alles bekijken",
      "dash.accounts": "Jouw rekeningen", "dash.rates": "Marktkoersen",
      "act.wire": "Overschrijving", "act.internal": "Intern", "act.statement": "Afschrift",
      "act.loan": "Lening", "act.bill": "Rekening", "act.atm": "ATM-kaart", "act.invest": "Beleggen", "act.support": "Support",
      "cards.title": "Jouw kaarten", "cards.sub": "Voorbeeldkaartgegevens: deze nummers zijn niet echt.",
      "cards.sample": "Voorbeelddata", "cards.freeze": "Blokkeren", "cards.unfreeze": "Deblokkeren", "cards.frozen": "Geblokkeerd",
      "cards.number": "Kaartnummer", "cards.expiry": "Vervaldatum", "cards.cvv": "CVV",
      "wire.title": "Bankoverschrijving", "wire.sub": "Stuur geld naar een externe rekening.",
      "wire.beneficiary": "Begunstigde", "wire.iban": "IBAN / Rekening", "wire.bank": "Bank", "wire.swift": "SWIFT / BIC",
      "internal.title": "Interne overschrijving", "internal.sub": "Verplaats direct geld tussen je rekeningen.",
      "internal.from": "Van", "internal.to": "Naar", "internal.savings": "Spaarrekening", "internal.checking": "Betaalrekening",
      "stmt.title": "Rekeningafschrift", "stmt.sub": "Download of print een afschrift voor elke periode.",
      "stmt.export": "CSV exporteren", "stmt.print": "Printen",
      "loan.title": "Leningaanvraag", "loan.sub": "Vraag een demolening aan. Aanvragen gaan naar de beheerconsole.",
      "loan.term": "Looptijd (maanden)", "loan.purpose": "Doel", "loan.apply": "Aanvraag versturen",
      "bill.title": "Rekening betalen", "bill.sub": "Betaal een energierekening of dienst vanaf je saldo.",
      "bill.payee": "Begunstigde", "bill.account": "Rekeningnummer", "bill.pay": "Betalen",
      "atm.title": "ATM-kaart aanvragen", "atm.sub": "Vraag een fysieke kaart aan. Alleen demo: er wordt niets uitgegeven.",
      "atm.deliver": "Bezorgadres", "atm.request": "Kaart aanvragen",
      "invest.title": "Beleggingen", "invest.sub": "Demoportefeuille. Er worden geen echte effecten verhandeld.",
      "invest.portfolio": "Portefeuillewaarde", "invest.holdings": "Posities", "invest.return": "Rendement",
      "support.title": "Support", "support.sub": "Stuur een bericht naar het team. Antwoorden verschijnen hier.",
      "support.placeholder": "Schrijf een bericht…", "support.send": "Verzenden",
      "settings.title": "Instellingen", "settings.sub": "Weergave en voorkeuren.",
      "settings.theme": "Donkere modus", "settings.language": "Taal", "settings.reset": "Demodata resetten",
      "settings.resetnote": "Wist alle demodata in deze browser en herstelt de voorbeelddata.",
      "login.title": "Inloggen op de demo", "login.sub": "Gebruik het demo-account. Geen echte inloggegevens nodig.",
      "login.demo": "Demo-account", "login.fill": "Demo-gegevens invullen", "login.error": "E-mail of wachtwoord onjuist.",
      "login.blocked": "Dit demo-account is geblokkeerd. Gebruik de beheerconsole om het te deblokkeren.",
      "admin.title": "Operatieconsole", "admin.sub": "Beheer demogebruikers, aanvragen en support.",
      "admin.users": "Gebruikers", "admin.requests": "Aanvragen", "admin.loans": "Leningen", "admin.inbox": "Supportinbox",
      "admin.overview": "Overzicht", "admin.totalusers": "Totaal gebruikers", "admin.totalbal": "Totale saldo's",
      "admin.pendingreq": "Openstaande aanvragen", "admin.openmsgs": "Open berichten",
      "admin.createuser": "Gebruiker aanmaken", "admin.fund": "Storten", "admin.withdraw": "Opnemen",
      "admin.block": "Blokkeren", "admin.suspend": "Opschorten", "admin.activate": "Activeren",
      "admin.newuser": "Nieuwe demogebruiker", "admin.name": "Volledige naam", "admin.opening": "Beginsaldo",
      "admin.currency": "Valuta", "admin.reply": "Antwoorden", "admin.sendreply": "Antwoord sturen",
      "admin.norequests": "Geen aanvragen in deze weergave.", "admin.nomessages": "Nog geen berichten.",
      "admin.amount": "Bedrag", "admin.user": "Gebruiker", "admin.kind": "Type", "admin.balance": "Saldo",
      "admin.deposit": "Storting", "admin.withdrawal": "Opname", "admin.atm": "ATM-kaart", "admin.loan": "Lening",
      "admin.acct": "Rekening", "admin.created": "Aangemaakt", "admin.youradmin": "Beheerconsole",
      "admin.separate": "Deze console is een aparte route van de klantapp.",
      "toast.saved": "Opgeslagen", "toast.sent": "Verzonden", "toast.submitted": "Verzonden ter beoordeling",
      "toast.copied": "Gekopieerd", "toast.reset": "Demodata gereset", "toast.insufficient": "Onvoldoende demosaldo",
      "toast.filled": "Demo-gegevens ingevuld", "toast.frozen": "Kaart geblokkeerd", "toast.unfrozen": "Kaart gedeblokkeerd",
      "toast.created": "Gebruiker aangemaakt", "toast.updated": "Bijgewerkt", "toast.replied": "Antwoord verzonden"
    },
    fr: {
      "banner": "DÉMO — pas une vraie banque. Pas d'argent réel, pas de vraies cartes.",
      "nav.home": "Accueil", "nav.features": "Fonctions", "nav.rates": "Taux", "nav.open": "Ouvrir la démo",
      "nav.signin": "Connexion", "nav.admin": "Admin",
      "hero.eyebrow": "Prototype UI/UX",
      "hero.title": "La banque, conçue avec clarté.",
      "hero.lede": "Un prototype complet de banque en ligne : comptes, cartes, virements, relevés, prêts et une console d'administration. À explorer, pas à conserver de l'argent.",
      "hero.cta1": "Explorer la démo", "hero.cta2": "Voir la console admin",
      "hero.badge": "Données de démo uniquement",
      "feat.eyebrow": "Ce qu'elle contient", "feat.title": "Tous les écrans d'une banque moderne",
      "feat.lede": "Deux expériences distinctes — une app client et une console d'opérations — avec un seul design system.",
      "rates.eyebrow": "Taux du marché", "rates.title": "Multidevise, en direct",
      "rates.lede": "Taux indicatifs issus d'une API publique, avec un repli intégré si le réseau est indisponible.",
      "rates.source": "Source", "rates.updated": "Mis à jour",
      "cta.title": "Essayez le prototype complet", "cta.lede": "Connectez-vous avec le compte démo et parcourez tous les parcours. Rien ici ne déplace d'argent réel.",
      "cta.btn": "Ouvrir l'app démo",
      "footer.note": "UBS-PROFPORT est un produit fictif créé comme prototype UI/UX. Il n'est affilié à aucune banque. Noms, comptes, cartes, soldes et transactions sont des données d'exemple. Aucun argent réel n'est détenu, déplacé ou assuré.",
      "common.signin": "Connexion", "common.email": "E-mail", "common.password": "Mot de passe",
      "common.cancel": "Annuler", "common.save": "Enregistrer", "common.submit": "Envoyer", "common.close": "Fermer",
      "common.amount": "Montant", "common.note": "Note", "common.status": "Statut", "common.date": "Date",
      "common.actions": "Actions", "common.search": "Rechercher", "common.all": "Tous", "common.back": "Retour",
      "common.confirm": "Confirmer", "common.approve": "Approuver", "common.reject": "Rejeter",
      "common.pending": "En attente", "common.approved": "Approuvé", "common.rejected": "Rejeté",
      "common.completed": "Terminé", "common.active": "Actif", "common.blocked": "Bloqué", "common.suspended": "Suspendu",
      "nav.overview": "Aperçu", "nav.cards": "Cartes", "nav.transfer": "Virement", "nav.statement": "Relevé",
      "nav.loans": "Prêts", "nav.bills": "Factures", "nav.atm": "Carte ATM", "nav.invest": "Investir",
      "nav.support": "Support", "nav.settings": "Réglages", "nav.logout": "Déconnexion",
      "dash.hello": "Bon retour", "dash.balance": "Solde total", "dash.income": "Entrées (30j)", "dash.expense": "Sorties (30j)",
      "dash.quick": "Actions rapides", "dash.recent": "Activité récente", "dash.viewall": "Tout voir",
      "dash.accounts": "Vos comptes", "dash.rates": "Taux du marché",
      "act.wire": "Virement", "act.internal": "Interne", "act.statement": "Relevé",
      "act.loan": "Prêt", "act.bill": "Facture", "act.atm": "Carte ATM", "act.invest": "Investir", "act.support": "Support",
      "cards.title": "Vos cartes", "cards.sub": "Données d'exemple : ces numéros ne sont pas réels.",
      "cards.sample": "Données d'exemple", "cards.freeze": "Geler", "cards.unfreeze": "Dégeler", "cards.frozen": "Gelée",
      "cards.number": "Numéro", "cards.expiry": "Expiration", "cards.cvv": "CVV",
      "wire.title": "Virement bancaire", "wire.sub": "Envoyez des fonds vers un compte externe.",
      "wire.beneficiary": "Bénéficiaire", "wire.iban": "IBAN / Compte", "wire.bank": "Banque", "wire.swift": "SWIFT / BIC",
      "internal.title": "Virement interne", "internal.sub": "Déplacez de l'argent entre vos comptes instantanément.",
      "internal.from": "Depuis", "internal.to": "Vers", "internal.savings": "Compte épargne", "internal.checking": "Compte courant",
      "stmt.title": "Relevé de compte", "stmt.sub": "Téléchargez ou imprimez un relevé pour toute période.",
      "stmt.export": "Exporter CSV", "stmt.print": "Imprimer",
      "loan.title": "Demande de prêt", "loan.sub": "Demandez un prêt démo. Les demandes vont à la console admin.",
      "loan.term": "Durée (mois)", "loan.purpose": "Objet", "loan.apply": "Envoyer la demande",
      "bill.title": "Payer une facture", "bill.sub": "Payez une facture de service depuis votre solde.",
      "bill.payee": "Bénéficiaire", "bill.account": "Compte facturé", "bill.pay": "Payer",
      "atm.title": "Demande de carte ATM", "atm.sub": "Demandez une carte physique. Démo seulement : rien n'est émis.",
      "atm.deliver": "Adresse de livraison", "atm.request": "Demander la carte",
      "invest.title": "Investissements", "invest.sub": "Vue de portefeuille démo. Aucun titre réel n'est négocié.",
      "invest.portfolio": "Valeur du portefeuille", "invest.holdings": "Positions", "invest.return": "Rendement",
      "support.title": "Support", "support.sub": "Écrivez à l'équipe. Les réponses apparaissent ici.",
      "support.placeholder": "Écrire un message…", "support.send": "Envoyer",
      "settings.title": "Réglages", "settings.sub": "Apparence et préférences.",
      "settings.theme": "Mode sombre", "settings.language": "Langue", "settings.reset": "Réinitialiser les données démo",
      "settings.resetnote": "Efface toutes les données démo de ce navigateur et restaure l'exemple.",
      "login.title": "Connexion à la démo", "login.sub": "Utilisez le compte démo. Aucun identifiant réel n'est requis.",
      "login.demo": "Compte démo", "login.fill": "Remplir les identifiants", "login.error": "E-mail ou mot de passe incorrect.",
      "login.blocked": "Ce compte démo est bloqué. Utilisez la console admin pour le débloquer.",
      "admin.title": "Console d'opérations", "admin.sub": "Gérez les utilisateurs, demandes et support démo.",
      "admin.users": "Utilisateurs", "admin.requests": "Demandes", "admin.loans": "Prêts", "admin.inbox": "Boîte support",
      "admin.overview": "Aperçu", "admin.totalusers": "Utilisateurs totaux", "admin.totalbal": "Soldes totaux",
      "admin.pendingreq": "Demandes en attente", "admin.openmsgs": "Messages ouverts",
      "admin.createuser": "Créer un utilisateur", "admin.fund": "Créditer", "admin.withdraw": "Débiter",
      "admin.block": "Bloquer", "admin.suspend": "Suspendre", "admin.activate": "Activer",
      "admin.newuser": "Nouvel utilisateur démo", "admin.name": "Nom complet", "admin.opening": "Solde initial",
      "admin.currency": "Devise", "admin.reply": "Répondre", "admin.sendreply": "Envoyer la réponse",
      "admin.norequests": "Aucune demande dans cette vue.", "admin.nomessages": "Pas encore de messages.",
      "admin.amount": "Montant", "admin.user": "Utilisateur", "admin.kind": "Type", "admin.balance": "Solde",
      "admin.deposit": "Dépôt", "admin.withdrawal": "Retrait", "admin.atm": "Carte ATM", "admin.loan": "Prêt",
      "admin.acct": "Compte", "admin.created": "Créé", "admin.youradmin": "Console admin",
      "admin.separate": "Cette console est une route séparée de l'app client.",
      "toast.saved": "Enregistré", "toast.sent": "Envoyé", "toast.submitted": "Envoyé pour examen",
      "toast.copied": "Copié", "toast.reset": "Données démo réinitialisées", "toast.insufficient": "Solde démo insuffisant",
      "toast.filled": "Identifiants démo remplis", "toast.frozen": "Carte gelée", "toast.unfrozen": "Carte dégelée",
      "toast.created": "Utilisateur créé", "toast.updated": "Mis à jour", "toast.replied": "Réponse envoyée"
    },
    ja: {
      "banner": "デモ — 実際の銀行ではありません。実際のお金・カードはありません。",
      "nav.home": "ホーム", "nav.features": "機能", "nav.rates": "為替", "nav.open": "デモを開く",
      "nav.signin": "ログイン", "nav.admin": "管理",
      "hero.eyebrow": "UI/UX プロトタイプ",
      "hero.title": "明快さで設計されたバンキング。",
      "hero.lede": "口座・カード・振込・明細・ローン・管理コンソールを備えたオンラインバンキングの完全なプロトタイプ。お金を保管するためではなく、体験するためのものです。",
      "hero.cta1": "デモを試す", "hero.cta2": "管理コンソールを見る",
      "hero.badge": "デモデータのみ",
      "feat.eyebrow": "収録内容", "feat.title": "現代の銀行に必要なすべての画面",
      "feat.lede": "顧客アプリと運用コンソールという2つの体験を、1つのデザインシステムで。",
      "rates.eyebrow": "市場レート", "rates.title": "多通貨、リアルタイム更新",
      "rates.lede": "公開レートAPIから取得した参考レート。通信できない場合はフォールバックします。",
      "rates.source": "取得元", "rates.updated": "更新",
      "cta.title": "プロトタイプを試す", "cta.lede": "デモアカウントでログインし、すべての流れを体験してください。実際のお金は動きません。",
      "cta.btn": "デモアプリを開く",
      "footer.note": "UBS-PROFPORT は UI/UX プロトタイプとして作られた架空の製品です。いかなる銀行とも関係ありません。名前・口座・カード・残高・取引はすべてサンプルデータです。実際のお金の保管・移動・保証は行いません。",
      "common.signin": "ログイン", "common.email": "メール", "common.password": "パスワード",
      "common.cancel": "キャンセル", "common.save": "保存", "common.submit": "送信", "common.close": "閉じる",
      "common.amount": "金額", "common.note": "メモ", "common.status": "状態", "common.date": "日付",
      "common.actions": "操作", "common.search": "検索", "common.all": "すべて", "common.back": "戻る",
      "common.confirm": "確認", "common.approve": "承認", "common.reject": "却下",
      "common.pending": "保留中", "common.approved": "承認済み", "common.rejected": "却下済み",
      "common.completed": "完了", "common.active": "有効", "common.blocked": "ブロック", "common.suspended": "停止",
      "nav.overview": "概要", "nav.cards": "カード", "nav.transfer": "振込", "nav.statement": "明細",
      "nav.loans": "ローン", "nav.bills": "請求書払い", "nav.atm": "ATMカード", "nav.invest": "投資",
      "nav.support": "サポート", "nav.settings": "設定", "nav.logout": "ログアウト",
      "dash.hello": "おかえりなさい", "dash.balance": "総残高", "dash.income": "収入（30日）", "dash.expense": "支出（30日）",
      "dash.quick": "クイック操作", "dash.recent": "最近の取引", "dash.viewall": "すべて見る",
      "dash.accounts": "あなたの口座", "dash.rates": "市場レート",
      "act.wire": "電信送金", "act.internal": "内部振替", "act.statement": "明細",
      "act.loan": "ローン申請", "act.bill": "請求書払い", "act.atm": "ATMカード", "act.invest": "投資", "act.support": "サポート",
      "cards.title": "あなたのカード", "cards.sub": "サンプルデータです。この番号は実在せず、決済できません。",
      "cards.sample": "サンプルデータ", "cards.freeze": "凍結", "cards.unfreeze": "解除", "cards.frozen": "凍結中",
      "cards.number": "カード番号", "cards.expiry": "有効期限", "cards.cvv": "CVV",
      "wire.title": "電信送金", "wire.sub": "外部の銀行口座へ送金します。",
      "wire.beneficiary": "受取人名", "wire.iban": "IBAN / 口座番号", "wire.bank": "銀行名", "wire.swift": "SWIFT / BIC",
      "internal.title": "内部振替", "internal.sub": "自分の口座間で即時に資金を移動します。",
      "internal.from": "振替元", "internal.to": "振替先", "internal.savings": "普通預金", "internal.checking": "当座預金",
      "stmt.title": "口座明細", "stmt.sub": "任意の期間の明細をダウンロードまたは印刷できます。",
      "stmt.export": "CSV出力", "stmt.print": "印刷",
      "loan.title": "ローン申請", "loan.sub": "デモローンを申請します。申請は管理コンソールに送られます。",
      "loan.term": "期間（月）", "loan.purpose": "用途", "loan.apply": "申請する",
      "bill.title": "請求書を支払う", "bill.sub": "残高から公共料金などを支払います。",
      "bill.payee": "支払先", "bill.account": "請求先口座", "bill.pay": "支払う",
      "atm.title": "ATMカード申請", "atm.sub": "実物カードを申請します。デモのみで発行はされません。",
      "atm.deliver": "配送先住所", "atm.request": "カードを申請",
      "invest.title": "投資", "invest.sub": "デモのポートフォリオ表示です。実際の証券取引は行いません。",
      "invest.portfolio": "ポートフォリオ評価額", "invest.holdings": "保有銘柄", "invest.return": "リターン",
      "support.title": "サポート", "support.sub": "運用チームへメッセージを送ります。返信はここに表示されます。",
      "support.placeholder": "メッセージを入力…", "support.send": "送信",
      "settings.title": "設定", "settings.sub": "外観と環境設定。",
      "settings.theme": "ダークモード", "settings.language": "言語", "settings.reset": "デモデータをリセット",
      "settings.resetnote": "このブラウザのデモデータをすべて消去し、初期状態に戻します。",
      "login.title": "デモにログイン", "login.sub": "下のデモアカウントを使用してください。実際の認証情報は不要です。",
      "login.demo": "デモアカウント", "login.fill": "デモ情報を入力", "login.error": "メールまたはパスワードが違います。",
      "login.blocked": "このデモアカウントはブロックされています。管理コンソールで解除してください。",
      "admin.title": "運用コンソール", "admin.sub": "デモユーザー・申請・サポートを管理します。",
      "admin.users": "ユーザー", "admin.requests": "申請", "admin.loans": "ローン", "admin.inbox": "サポート受信箱",
      "admin.overview": "概要", "admin.totalusers": "総ユーザー数", "admin.totalbal": "総残高",
      "admin.pendingreq": "保留中の申請", "admin.openmsgs": "未対応メッセージ",
      "admin.createuser": "ユーザー作成", "admin.fund": "入金", "admin.withdraw": "出金",
      "admin.block": "ブロック", "admin.suspend": "停止", "admin.activate": "有効化",
      "admin.newuser": "新しいデモユーザー", "admin.name": "氏名", "admin.opening": "初期残高",
      "admin.currency": "通貨", "admin.reply": "返信", "admin.sendreply": "返信を送信",
      "admin.norequests": "この表示に申請はありません。", "admin.nomessages": "まだメッセージはありません。",
      "admin.amount": "金額", "admin.user": "ユーザー", "admin.kind": "種類", "admin.balance": "残高",
      "admin.deposit": "入金", "admin.withdrawal": "出金", "admin.atm": "ATMカード", "admin.loan": "ローン",
      "admin.acct": "口座", "admin.created": "作成日", "admin.youradmin": "管理コンソール",
      "admin.separate": "このコンソールは顧客アプリとは別のルートです。",
      "toast.saved": "保存しました", "toast.sent": "送信しました", "toast.submitted": "審査に送信しました",
      "toast.copied": "コピーしました", "toast.reset": "デモデータをリセットしました", "toast.insufficient": "デモ残高が不足しています",
      "toast.filled": "デモ情報を入力しました", "toast.frozen": "カードを凍結しました", "toast.unfrozen": "カードの凍結を解除しました",
      "toast.created": "ユーザーを作成しました", "toast.updated": "更新しました", "toast.replied": "返信を送信しました"
    },
    ko: {
      "banner": "데모 — 실제 은행이 아닙니다. 실제 돈과 카드가 없습니다.",
      "nav.home": "홈", "nav.features": "기능", "nav.rates": "환율", "nav.open": "데모 열기",
      "nav.signin": "로그인", "nav.admin": "관리자",
      "hero.eyebrow": "UI/UX 프로토타입",
      "hero.title": "명료함으로 설계된 뱅킹.",
      "hero.lede": "계좌, 카드, 송금, 명세서, 대출, 관리자 콘솔을 갖춘 온라인 뱅킹 인터페이스 프로토타입입니다. 돈을 보관하는 용도가 아니라 둘러보기 위한 것입니다.",
      "hero.cta1": "데모 둘러보기", "hero.cta2": "관리자 콘솔 보기",
      "hero.badge": "데모 데이터만",
      "feat.eyebrow": "포함 내용", "feat.title": "현대 은행에 필요한 모든 화면",
      "feat.lede": "고객 앱과 운영 콘솔, 두 가지 경험을 하나의 디자인 시스템으로.",
      "rates.eyebrow": "시장 환율", "rates.title": "다중 통화, 실시간 갱신",
      "rates.lede": "공개 환율 API에서 가져온 참고 환율이며, 네트워크가 없으면 대체 값을 사용합니다.",
      "rates.source": "출처", "rates.updated": "업데이트",
      "cta.title": "전체 프로토타입 체험", "cta.lede": "데모 계정으로 로그인해 모든 흐름을 살펴보세요. 실제 돈은 움직이지 않습니다.",
      "cta.btn": "데모 앱 열기",
      "footer.note": "UBS-PROFPORT는 UI/UX 프로토타입으로 제작된 가상의 제품입니다. 어떤 은행과도 관련이 없습니다. 이름, 계좌, 카드, 잔액, 거래는 모두 샘플 데이터입니다. 실제 돈을 보관·이동·보증하지 않습니다.",
      "common.signin": "로그인", "common.email": "이메일", "common.password": "비밀번호",
      "common.cancel": "취소", "common.save": "저장", "common.submit": "제출", "common.close": "닫기",
      "common.amount": "금액", "common.note": "메모", "common.status": "상태", "common.date": "날짜",
      "common.actions": "작업", "common.search": "검색", "common.all": "전체", "common.back": "뒤로",
      "common.confirm": "확인", "common.approve": "승인", "common.reject": "거절",
      "common.pending": "대기 중", "common.approved": "승인됨", "common.rejected": "거절됨",
      "common.completed": "완료", "common.active": "활성", "common.blocked": "차단됨", "common.suspended": "정지됨",
      "nav.overview": "개요", "nav.cards": "카드", "nav.transfer": "송금", "nav.statement": "명세서",
      "nav.loans": "대출", "nav.bills": "청구서", "nav.atm": "ATM 카드", "nav.invest": "투자",
      "nav.support": "고객지원", "nav.settings": "설정", "nav.logout": "로그아웃",
      "dash.hello": "다시 오신 것을 환영합니다", "dash.balance": "총 잔액", "dash.income": "수입(30일)", "dash.expense": "지출(30일)",
      "dash.quick": "빠른 작업", "dash.recent": "최근 거래", "dash.viewall": "전체 보기",
      "dash.accounts": "내 계좌", "dash.rates": "시장 환율",
      "act.wire": "해외 송금", "act.internal": "내부 이체", "act.statement": "명세서",
      "act.loan": "대출 신청", "act.bill": "청구서 납부", "act.atm": "ATM 카드", "act.invest": "투자", "act.support": "고객지원",
      "cards.title": "내 카드", "cards.sub": "샘플 데이터입니다. 이 번호는 실제가 아니며 결제할 수 없습니다.",
      "cards.sample": "샘플 데이터", "cards.freeze": "정지", "cards.unfreeze": "해제", "cards.frozen": "정지됨",
      "cards.number": "카드 번호", "cards.expiry": "유효기간", "cards.cvv": "CVV",
      "wire.title": "해외 송금", "wire.sub": "외부 은행 계좌로 자금을 보냅니다.",
      "wire.beneficiary": "수취인", "wire.iban": "IBAN / 계좌번호", "wire.bank": "은행", "wire.swift": "SWIFT / BIC",
      "internal.title": "내부 이체", "internal.sub": "내 계좌 간에 즉시 자금을 이동합니다.",
      "internal.from": "보내는 계좌", "internal.to": "받는 계좌", "internal.savings": "저축 계좌", "internal.checking": "입출금 계좌",
      "stmt.title": "계좌 명세서", "stmt.sub": "원하는 기간의 명세서를 내려받거나 인쇄합니다.",
      "stmt.export": "CSV 내보내기", "stmt.print": "인쇄",
      "loan.title": "대출 신청", "loan.sub": "데모 대출을 신청합니다. 신청은 관리자 콘솔로 전달됩니다.",
      "loan.term": "기간(개월)", "loan.purpose": "용도", "loan.apply": "신청 제출",
      "bill.title": "청구서 납부", "bill.sub": "잔액에서 공과금 등을 납부합니다.",
      "bill.payee": "납부처", "bill.account": "청구 계좌", "bill.pay": "납부",
      "atm.title": "ATM 카드 신청", "atm.sub": "실물 카드를 신청합니다. 데모 전용이며 발급되지 않습니다.",
      "atm.deliver": "배송 주소", "atm.request": "카드 신청",
      "invest.title": "투자", "invest.sub": "데모 포트폴리오 화면입니다. 실제 증권 거래는 없습니다.",
      "invest.portfolio": "포트폴리오 가치", "invest.holdings": "보유 종목", "invest.return": "수익률",
      "support.title": "고객지원", "support.sub": "운영팀에 메시지를 보냅니다. 답변은 여기에 표시됩니다.",
      "support.placeholder": "메시지를 입력하세요…", "support.send": "보내기",
      "settings.title": "설정", "settings.sub": "화면과 환경설정.",
      "settings.theme": "다크 모드", "settings.language": "언어", "settings.reset": "데모 데이터 초기화",
      "settings.resetnote": "이 브라우저의 모든 데모 데이터를 지우고 초기 상태로 되돌립니다.",
      "login.title": "데모 로그인", "login.sub": "아래 데모 계정을 사용하세요. 실제 인증 정보는 필요 없습니다.",
      "login.demo": "데모 계정", "login.fill": "데모 정보 입력", "login.error": "이메일 또는 비밀번호가 올바르지 않습니다.",
      "login.blocked": "이 데모 계정은 차단되었습니다. 관리자 콘솔에서 해제하세요.",
      "admin.title": "운영 콘솔", "admin.sub": "데모 사용자, 신청, 고객지원을 관리합니다.",
      "admin.users": "사용자", "admin.requests": "신청", "admin.loans": "대출", "admin.inbox": "고객지원 수신함",
      "admin.overview": "개요", "admin.totalusers": "전체 사용자", "admin.totalbal": "총 잔액",
      "admin.pendingreq": "대기 중 신청", "admin.openmsgs": "미처리 메시지",
      "admin.createuser": "사용자 생성", "admin.fund": "입금", "admin.withdraw": "출금",
      "admin.block": "차단", "admin.suspend": "정지", "admin.activate": "활성화",
      "admin.newuser": "새 데모 사용자", "admin.name": "이름", "admin.opening": "초기 잔액",
      "admin.currency": "통화", "admin.reply": "답변", "admin.sendreply": "답변 보내기",
      "admin.norequests": "이 화면에 신청이 없습니다.", "admin.nomessages": "아직 메시지가 없습니다.",
      "admin.amount": "금액", "admin.user": "사용자", "admin.kind": "유형", "admin.balance": "잔액",
      "admin.deposit": "입금", "admin.withdrawal": "출금", "admin.atm": "ATM 카드", "admin.loan": "대출",
      "admin.acct": "계좌", "admin.created": "생성일", "admin.youradmin": "관리자 콘솔",
      "admin.separate": "이 콘솔은 고객 앱과 분리된 경로입니다.",
      "toast.saved": "저장했습니다", "toast.sent": "보냈습니다", "toast.submitted": "검토 요청을 보냈습니다",
      "toast.copied": "복사했습니다", "toast.reset": "데모 데이터를 초기화했습니다", "toast.insufficient": "데모 잔액이 부족합니다",
      "toast.filled": "데모 정보를 입력했습니다", "toast.frozen": "카드를 정지했습니다", "toast.unfrozen": "카드 정지를 해제했습니다",
      "toast.created": "사용자를 생성했습니다", "toast.updated": "업데이트했습니다", "toast.replied": "답변을 보냈습니다"
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
    fmtMoney: fmtMoney, fmtNum: fmtNum, fmtDate: fmtDate, fmtDateTime: fmtDateTime, initials: initials,
    fetchRates: fetchRates, convert: convert, FALLBACK: FALLBACK,
    t: t, lang: lang, setLang: setLang, applyI18n: applyI18n, LANGS: LANGS, I18N: I18N,
    langSelectHTML: langSelectHTML, wireLangSelect: wireLangSelect,
    theme: theme, setTheme: setTheme, toggleTheme: toggleTheme, themeBtnHTML: themeBtnHTML, wireThemeBtn: wireThemeBtn,
    icon: icon, toast: toast, modal: modal, statusPill: statusPill, csvDownload: csvDownload,
    initChrome: initChrome
  };
})(window);