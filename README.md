# UBS-PROFPORT — Demo Online Banking Prototype

> **DEMO — not a real bank. No real money, no real cards.**
> This is a UI/UX prototype. It is not affiliated with any bank. All names,
> account numbers, card numbers, balances and transactions are sample data.

A complete online-banking interface prototype: a marketing landing page, a
customer dashboard, and an admin console on a separate route — all static
HTML/CSS/JS with no build step.

## Pages

| File | Route | Purpose |
|---|---|---|
| `index.html` | `/` | Marketing / landing page with live FX rates |
| `app.html` | `/app.html` | Customer dashboard (login gate) |
| `admin.html` | `/admin.html` | Admin console — **separate route** |
| `setup.html` | `/setup.html` | Setup & deployment guide |

## Demo login

- Email: `alex@demo.local`
- Password: `demo1234`

The admin console needs no login — it is a demo operations view.

## Features

**Customer app**
- Account overview with balance, 30-day income/expense
- Debit & credit cards with obviously fake numbers (`4000 0000 0000 0000`), demo expiry/CVV, freeze toggle
- Wire transfer, internal transfer, account statement (CSV export + print)
- Loan request, pay bill, ATM card request, investments
- Support thread (messages reach the admin inbox)
- Mobile bottom navigation, side menu, dark mode
- Built-in translator: English, Spanish, Italian, Portuguese, Dutch, French, Japanese, Korean

**Admin console**
- Block / suspend / activate users
- Fund and withdraw from user accounts
- Create users
- Approve / reject loans
- Approve / reject deposit and withdrawal requests
- Support inbox with replies

**Multi-currency**
- USD, EUR, JPY, KRW
- Live rates from `open.er-api.com` with `frankfurter.app` as a second source
- Built-in fallback rates if the network is unavailable

## What this project deliberately does NOT include

- No TAX / COT / IMF fee feature
- No fee that gates a transaction or "releases" funds
- No real card issuance, no real payment processing, no real money movement

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Supabase

Project: `https://zincdoarinlonbpxiipt.supabase.co`

1. Open **SQL Editor → New query**
2. Paste all of `supabase-schema.sql`
3. Run

Then copy `assets/config.js.example` values into `assets/config.js` (or edit it
directly) with your **anon public** key. Never put the `service_role` key in the
browser.

## Deploy

Static hosting — GitHub Pages, Netlify, Vercel or Cloudflare Pages. No build
command, publish directory `/`.

## Push to GitHub

```bash
git init
git add .
git commit -m "UBS-PROFPORT demo banking prototype"
git branch -M main
git remote add origin https://github.com/Ubnlord/UBS-PROFPORT.git
git push -u origin main
```

## Project structure

```
ubs-profport/
├── index.html
├── app.html
├── admin.html
├── setup.html
├── supabase-schema.sql
├── assets/
│   ├── app.css
│   ├── core.js
│   └── config.js
└── images/
    └── hero.png
```

## License

Demo/prototype code. The "UBS-PROFPORT" name is fictional and used only as a
placeholder for this prototype.