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

All demo accounts use the password `demo1234`.

| Email | Role |
|---|---|
| `alex.morgan@example.com` | Customer |
| `priya.raman@example.com` | Customer |
| `tomas.silva@example.com` | Customer (suspended) |
| `admin@example.com` | **Admin console** |

Sign-in is real Supabase Auth. The admin console (`/admin.html`) only opens for
a profile whose `role` is `admin` — a customer session is rejected there.

## Features

**Customer app**
- Account overview with balance, 30-day income/expense
- Debit & credit cards with obviously fake numbers (`4000 0000 0000 0000`), demo expiry/CVV, freeze toggle
- Wire transfer, internal transfer, account statement (CSV export + print)
- Loan request, pay bill, ATM card request, investments
- Support thread (messages reach the admin inbox)
- Mobile bottom navigation, side menu, dark mode
- Built-in translator: English, Spanish, Italian, Portuguese, Dutch, French, Japanese, Korean
- All data read from and written to Supabase

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

The app reads and writes the Supabase tables directly from the browser through
`assets/data.js` (plain `fetch` against the REST and Auth APIs — no SDK, no build
step). Tables used: `profiles`, `accounts`, `cards`, `transactions`, `loans`,
`requests`, `support_messages`, `fx_rates`.

1. Open **SQL Editor → New query**
2. Paste all of `supabase-schema.sql` and run it
3. Paste all of `supabase-auth-rls.sql` and run it
   (adds `is_admin()` / `my_profile_id()`, per-user Row Level Security, and links
   the seed profiles to the demo auth users)
4. Create the four demo users in **Authentication → Users** (or the Auth admin
   API) with the addresses above and password `demo1234`, then re-run the four
   `update public.profiles ... from auth.users` statements at the end of
   `supabase-auth-rls.sql`

Then put your **anon public** key in `assets/config.js`. Never put the
`service_role` key in the browser.

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
├── supabase-auth-rls.sql
├── assets/
│   ├── app.css
│   ├── config.js
│   ├── data.js      ← Supabase REST + Auth layer
│   └── core.js
└── images/
    └── hero.jpg
```

## License

Demo/prototype code. The "UBS-PROFPORT" name is fictional and used only as a
placeholder for this prototype.
