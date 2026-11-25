-- ============================================================
-- UBS-PROFPORT — DEMO banking prototype
-- Supabase schema + seed
-- Project: https://zincdoarinlonbpxiipt.supabase.co
--
-- IMPORTANT: This is a UI/UX prototype. The data model below is
-- for a demo only. It contains NO real money, NO real card data,
-- and NO fee-gating of any kind. Card numbers are the standard
-- test value 4000 0000 0000 0000 and must never be treated as
-- real payment instruments.
--
-- Run this whole file in Supabase → SQL Editor → New query → Run.
-- It is idempotent: it drops and recreates the demo tables.
-- ============================================================

-- ---------- 0. Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- 1. Clean slate (demo only) ----------
drop table if exists public.support_messages cascade;
drop table if exists public.requests cascade;
drop table if exists public.loans cascade;
drop table if exists public.transactions cascade;
drop table if exists public.cards cascade;
drop table if exists public.accounts cascade;
drop table if exists public.profiles cascade;
drop table if exists public.fx_rates cascade;

-- ---------- 2. Profiles (one row per demo user) ----------
create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique,                       -- links to auth.users when you wire real auth
  full_name     text not null,
  email         text not null unique,
  role          text not null default 'customer' check (role in ('customer','admin')),
  status        text not null default 'active'   check (status in ('active','suspended','blocked')),
  created_at    timestamptz not null default now()
);

-- ---------- 3. Accounts ----------
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  account_number  text not null unique,
  account_type    text not null default 'checking' check (account_type in ('checking','savings')),
  currency        text not null default 'USD' check (currency in ('USD','EUR','JPY','KRW')),
  balance         numeric(18,2) not null default 0,
  created_at      timestamptz not null default now()
);
create index accounts_profile_idx on public.accounts(profile_id);

-- ---------- 4. Cards (DEMO ONLY — sample numbers) ----------
create table public.cards (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  card_type     text not null default 'debit' check (card_type in ('debit','credit')),
  brand         text not null default 'UBS-PROFPORT DEBIT',
  -- Sample/test values only. Never store real PANs in a demo.
  card_number   text not null default '4000 0000 0000 0000',
  expiry        text not null default '12/29',
  cvv           text not null default '123',
  status        text not null default 'active' check (status in ('active','frozen')),
  is_sample     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index cards_profile_idx on public.cards(profile_id);

-- ---------- 5. Transactions (ledger) ----------
create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  direction     text not null check (direction in ('credit','debit')),
  description   text not null,
  amount        numeric(18,2) not null check (amount >= 0),
  currency      text not null default 'USD' check (currency in ('USD','EUR','JPY','KRW')),
  status        text not null default 'completed' check (status in ('pending','completed','rejected')),
  created_at    timestamptz not null default now()
);
create index transactions_account_idx on public.transactions(account_id, created_at desc);

-- ---------- 6. Loans ----------
create table public.loans (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  amount        numeric(18,2) not null check (amount > 0),
  term_months   int not null default 24,
  purpose       text,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now()
);
create index loans_profile_idx on public.loans(profile_id);

-- ---------- 7. Requests (deposit / withdrawal / atm / loan) ----------
create table public.requests (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  kind          text not null check (kind in ('deposit','withdrawal','atm','loan')),
  amount        numeric(18,2) not null default 0,
  note          text,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now()
);
create index requests_profile_idx on public.requests(profile_id, created_at desc);

-- ---------- 8. Support messages ----------
create table public.support_messages (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  sender        text not null check (sender in ('user','admin')),
  body          text not null,
  created_at    timestamptz not null default now()
);
create index support_profile_idx on public.support_messages(profile_id, created_at);

-- ---------- 9. FX rate cache (optional) ----------
create table public.fx_rates (
  base          text primary key default 'USD',
  usd           numeric(18,6) not null default 1,
  eur           numeric(18,6) not null,
  jpy           numeric(18,6) not null,
  krw           numeric(18,6) not null,
  source        text not null default 'fallback',
  fetched_at    timestamptz not null default now()
);

-- ============================================================
-- 10. Row Level Security
--     Demo defaults: read-only for anon, writes via service role.
--     Tighten these before any real deployment.
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.accounts          enable row level security;
alter table public.cards             enable row level security;
alter table public.transactions      enable row level security;
alter table public.loans             enable row level security;
alter table public.requests          enable row level security;
alter table public.support_messages  enable row level security;
alter table public.fx_rates          enable row level security;

-- Public read of the demo dataset (prototype convenience).
create policy "demo read profiles"   on public.profiles          for select using (true);
create policy "demo read accounts"   on public.accounts          for select using (true);
create policy "demo read cards"      on public.cards             for select using (true);
create policy "demo read tx"         on public.transactions      for select using (true);
create policy "demo read loans"      on public.loans             for select using (true);
create policy "demo read requests"   on public.requests          for select using (true);
create policy "demo read support"    on public.support_messages  for select using (true);
create policy "demo read fx"         on public.fx_rates          for select using (true);

-- NOTE: no insert/update/delete policies are granted to anon.
-- The demo UI runs entirely on localStorage; the service role key
-- (server-side only) is what would write to these tables.

-- ============================================================
-- 11. Seed data
-- ============================================================
insert into public.profiles (id, full_name, email, role, status) values
  ('11111111-1111-4111-8111-111111111111', 'Alex Morgan',   'alex@demo.local',   'customer', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'Priya Raman',   'priya@demo.local',  'customer', 'active'),
  ('33333333-3333-4333-8333-333333333333', 'Tomás Silva',   'tomas@demo.local',  'customer', 'suspended'),
  ('99999999-9999-4999-8999-999999999999', 'Demo Operations','admin@demo.local',  'admin',    'active');

insert into public.accounts (id, profile_id, account_number, account_type, currency, balance) values
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '5818 2044 7710', 'checking', 'USD', 24850.75),
  ('a1111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', '5818 2044 9021', 'savings',  'USD', 12400.00),
  ('a2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', '7742 1180 3391', 'checking', 'EUR',  6120.40),
  ('a3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', '3390 5521 8842', 'checking', 'USD',   980.15);

insert into public.cards (profile_id, card_type, brand, card_number, expiry, cvv, status) values
  ('11111111-1111-4111-8111-111111111111', 'debit',  'UBS-PROFPORT DEBIT',  '4000 0000 0000 0000', '12/29', '123', 'active'),
  ('11111111-1111-4111-8111-111111111111', 'credit', 'UBS-PROFPORT CREDIT', '5555 5555 5555 4444', '08/28', '456', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'debit',  'UBS-PROFPORT DEBIT',  '4000 0000 0000 0000', '03/30', '321', 'active');

insert into public.transactions (account_id, direction, description, amount, currency, status, created_at) values
  ('a1111111-1111-4111-8111-111111111111', 'credit', 'Salary — Northwind Studio', 5200.00, 'USD', 'completed', now() - interval '2 days'),
  ('a1111111-1111-4111-8111-111111111111', 'debit',  'Rent — Apartment 4B',       1450.00, 'USD', 'completed', now() - interval '3 days'),
  ('a1111111-1111-4111-8111-111111111111', 'debit',  'Groceries — Market',          96.40, 'USD', 'completed', now() - interval '4 days'),
  ('a1111111-1111-4111-8111-111111111111', 'debit',  'Electricity bill',            78.20, 'USD', 'completed', now() - interval '6 days'),
  ('a1111111-1111-4111-8111-111111111111', 'credit', 'Refund — Online store',       42.50, 'USD', 'completed', now() - interval '8 days'),
  ('a1111111-1111-4111-8111-111111111111', 'debit',  'Transfer to Savings',        500.00, 'USD', 'completed', now() - interval '11 days'),
  ('a2222222-2222-4222-8222-222222222222', 'credit', 'Freelance invoice #204',    2400.00, 'EUR', 'completed', now() - interval '5 days'),
  ('a2222222-2222-4222-8222-222222222222', 'debit',  'Train tickets',               88.00, 'EUR', 'completed', now() - interval '7 days'),
  ('a3333333-3333-4333-8333-333333333333', 'credit', 'Opening deposit',           1000.00, 'USD', 'completed', now() - interval '30 days');

insert into public.loans (profile_id, amount, term_months, purpose, status) values
  ('11111111-1111-4111-8111-111111111111', 8000.00, 24, 'Home renovation', 'approved');

insert into public.requests (profile_id, kind, amount, note, status) values
  ('11111111-1111-4111-8111-111111111111', 'deposit',    1200.00, 'Payroll deposit',   'pending'),
  ('11111111-1111-4111-8111-111111111111', 'withdrawal',  300.00, 'ATM withdrawal',    'pending'),
  ('22222222-2222-4222-8222-222222222222', 'loan',       5000.00, 'Equipment purchase','pending');

insert into public.support_messages (profile_id, sender, body, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'user',  'Hi, my card was declined at a store today. Could you check?', now() - interval '2 days'),
  ('11111111-1111-4111-8111-111111111111', 'admin', 'Thanks for reaching out — this is a demo environment, so no real card exists. In a live system we would review the merchant and unblock it.', now() - interval '2 days' + interval '1 hour'),
  ('33333333-3333-4333-8333-333333333333', 'user',  'Why is my account suspended?', now() - interval '1 day');

insert into public.fx_rates (base, usd, eur, jpy, krw, source) values
  ('USD', 1, 0.921, 151.4, 1342.5, 'fallback');

-- ============================================================
-- 12. Convenience view for the admin console
-- ============================================================
create or replace view public.admin_user_overview as
select
  p.id,
  p.full_name,
  p.email,
  p.status,
  p.role,
  a.account_number,
  a.currency,
  a.balance,
  (select count(*) from public.requests r where r.profile_id = p.id and r.status = 'pending') as pending_requests,
  (select count(*) from public.support_messages m where m.profile_id = p.id and m.sender = 'user') as user_messages
from public.profiles p
left join public.accounts a on a.profile_id = p.id and a.account_type = 'checking'
order by p.created_at;

-- Done. Demo data only — no real money, no real cards, no fee gating.
