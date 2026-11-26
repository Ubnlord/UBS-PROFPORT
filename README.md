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
| `app.html` | `/app.html` | Customer dashboard (login + sign-up) |
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

**Sign-up & automatic provisioning**
- Anyone can create a demo account from `/app.html` → *Create a demo account*
- On sign-up the user chooses a name, email, password, phone, country, their
  **preferred currency** (18 supported) and account type
- A **10-digit account number and a demo debit card are created automatically**
  — the user does not have to request either one
- Provisioning runs in Postgres via the `on_auth_user_created` trigger
  (`public.handle_new_user()`), with a browser-side fallback for projects that
  have not applied that trigger yet
- If Supabase email confirmation is enabled, the UI says so and asks the user
  to confirm before signing in

**Customer app**
- Account overview with balance, 30-day income/expense
- Debit & credit cards with obviously fake numbers in the reserved
  `4000 0000 0000 xxxx` test range, demo expiry/CVV, freeze toggle, and
  *Issue another demo card*
- Wire transfer, internal transfer, account statement (CSV export + print)
- **Currency converter** — converts any amount between the 18 supported
  currencies at the current indicative rate, with a swap control
- Loan request, pay bill, ATM card request, investments
- Support thread (messages reach the admin inbox)
- Mobile bottom navigation, side menu, dark mode
- Built-in translator: English, Spanish, Italian, Portuguese, Dutch, French, Japanese, Korean
- All data read from and written to Supabase

**Account settings**
- Edit profile details: full name, phone, country, address (email is read-only
  because it belongs to the auth user)
- Choose and change the **account currency** — the balance is converted at the
  live rate so the account keeps its value
- Account details panel: account number, account type, member-since date
- Security: change the demo account password through Supabase Auth
- Appearance: dark mode, language switcher

**Admin console**
- Block / suspend / activate users
- Fund and withdraw from user accounts
- **Create users** with phone, country, opening balance, currency, account type
  and an *issue a demo card* toggle — account number and card are generated
  automatically
- **Edit users** — details, account number, currency (with balance conversion),
  card list and *Issue card*
- Approve / reject loans
- Approve / reject deposit and withdrawal requests
- Support inbox with replies

**Multi-currency**
- 18 currencies: USD, EUR, GBP, JPY, KRW, CAD, AUD, CHF, CNY, INR, NGN, GHS,
  KES, ZAR, BRL, MXN, AED, SGD
- Live rates from `open.er-api.com` with `frankfurter.app` as a second source
- Supabase `fx_rates` cache as a third source
- Built-in fallback rates if everything else is unreachable

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
   (creates the tables, the demo seed data, and the **signup trigger** that
   issues an account number and a card for every new auth user)
3. Paste all of `supabase-auth-rls.sql` and run it
   (adds `is_admin()` / `my_profile_id()`, per-user Row Level Security, allows a
   signed-in user to provision their own profile/account/card, and links the
   seed profiles to the demo auth users)
4. Create the four demo users in **Authentication → Users** (or the Auth admin
   API) with the addresses above and password `demo1234`, then re-run the four
   `update public.profiles ... from auth.users` statements at the end of
   `supabase-auth-rls.sql`
5. For self-service sign-up, leave **Authentication → Providers → Email** with
   *Enable signups* on. Turning off *Confirm email* lets a new user land
   straight in the dashboard; leaving it on shows the "check your email" notice

Then put your **anon public** key in `assets/config.js`. Never put the
`service_role` key in the browser.

### How auto-provisioning works

`public.handle_new_user()` is attached to `auth.users` with an `after insert`
trigger. It reads the signup metadata (`full_name`, `currency`, `account_type`,
`phone`, `country`), inserts the profile row, then inserts one checking (or
savings) account with a generated 10-digit number and one demo debit card.

If the trigger is not installed, `assets/data.js` falls back to creating the
same three rows from the browser immediately after sign-up succeeds.

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
├── supabase-schema.sql      ← tables, seed, signup trigger
├── supabase-auth-rls.sql    ← auth helpers + row level security
├── assets/
│   ├── app.css
│   ├── config.js
│   ├── data.js      ← Supabase REST + Auth layer
│   ├── core.js
│   └── bridge.js
└── images/
    └── hero.jpg
```

## License

Demo/prototype code. The "UBS-PROFPORT" name is fictional and used only as a
placeholder for this prototype.
