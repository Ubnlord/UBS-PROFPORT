-- ============================================================
-- UBS-PROFPORT — DEMO auth + RLS migration
-- Run AFTER supabase-schema.sql.
--
-- Adds:
--   1. profiles.auth_user_id links to auth.users
--   2. is_admin() helper
--   3. Row Level Security policies so a signed-in demo user can
--      read/write only their own rows, and an admin can read/write
--      everything.
--
-- Still a DEMO: no real money, no real cards, no fee gating.
-- ============================================================

-- ---------- 1. helper: is the caller an admin? ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- ---------- 2. helper: the caller's profile id ----------
create or replace function public.my_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.profiles p where p.auth_user_id = auth.uid() limit 1;
$$;

-- ---------- 3. drop the old wide-open demo read policies ----------
drop policy if exists "demo read profiles"  on public.profiles;
drop policy if exists "demo read accounts"  on public.accounts;
drop policy if exists "demo read cards"     on public.cards;
drop policy if exists "demo read tx"        on public.transactions;
drop policy if exists "demo read loans"     on public.loans;
drop policy if exists "demo read requests"  on public.requests;
drop policy if exists "demo read support"   on public.support_messages;
drop policy if exists "demo read fx"        on public.fx_rates;

-- ---------- 4. profiles ----------
create policy "profiles select own or admin" on public.profiles
  for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

create policy "profiles update own or admin" on public.profiles
  for update to authenticated
  using (auth_user_id = auth.uid() or public.is_admin())
  with check (auth_user_id = auth.uid() or public.is_admin());

create policy "profiles insert admin" on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- ---------- 5. accounts ----------
create policy "accounts select own or admin" on public.accounts
  for select to authenticated
  using (profile_id = public.my_profile_id() or public.is_admin());

create policy "accounts update own or admin" on public.accounts
  for update to authenticated
  using (profile_id = public.my_profile_id() or public.is_admin())
  with check (profile_id = public.my_profile_id() or public.is_admin());

create policy "accounts insert admin" on public.accounts
  for insert to authenticated
  with check (public.is_admin());

-- ---------- 6. cards ----------
create policy "cards select own or admin" on public.cards
  for select to authenticated
  using (profile_id = public.my_profile_id() or public.is_admin());

create policy "cards update own or admin" on public.cards
  for update to authenticated
  using (profile_id = public.my_profile_id() or public.is_admin())
  with check (profile_id = public.my_profile_id() or public.is_admin());

create policy "cards insert admin" on public.cards
  for insert to authenticated
  with check (public.is_admin());

-- ---------- 7. transactions ----------
create policy "tx select own or admin" on public.transactions
  for select to authenticated
  using (
    public.is_admin()
    or account_id in (select a.id from public.accounts a where a.profile_id = public.my_profile_id())
  );

create policy "tx insert own or admin" on public.transactions
  for insert to authenticated
  with check (
    public.is_admin()
    or account_id in (select a.id from public.accounts a where a.profile_id = public.my_profile_id())
  );

-- ---------- 8. loans ----------
create policy "loans select own or admin" on public.loans
  for select to authenticated
  using (profile_id = public.my_profile_id() or public.is_admin());

create policy "loans insert own" on public.loans
  for insert to authenticated
  with check (profile_id = public.my_profile_id());

create policy "loans update admin" on public.loans
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- 9. requests ----------
create policy "requests select own or admin" on public.requests
  for select to authenticated
  using (profile_id = public.my_profile_id() or public.is_admin());

create policy "requests insert own" on public.requests
  for insert to authenticated
  with check (profile_id = public.my_profile_id());

create policy "requests update admin" on public.requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- 10. support_messages ----------
create policy "support select own or admin" on public.support_messages
  for select to authenticated
  using (profile_id = public.my_profile_id() or public.is_admin());

create policy "support insert own or admin" on public.support_messages
  for insert to authenticated
  with check (profile_id = public.my_profile_id() or public.is_admin());

-- ---------- 11. fx_rates: readable by anyone signed in ----------
create policy "fx select authenticated" on public.fx_rates
  for select to authenticated
  using (true);

-- ============================================================
-- 12. Link the seed profiles to the real auth users
--     (created via the Auth admin API with these addresses)
-- ============================================================
update public.profiles p
set auth_user_id = u.id, email = u.email
from auth.users u
where u.email = 'alex.morgan@example.com'  and p.id = '11111111-1111-4111-8111-111111111111';

update public.profiles p
set auth_user_id = u.id, email = u.email
from auth.users u
where u.email = 'priya.raman@example.com'  and p.id = '22222222-2222-4222-8222-222222222222';

update public.profiles p
set auth_user_id = u.id, email = u.email
from auth.users u
where u.email = 'tomas.silva@example.com'  and p.id = '33333333-3333-4333-8333-333333333333';

update public.profiles p
set auth_user_id = u.id, email = u.email
from auth.users u
where u.email = 'admin@example.com'        and p.id = '99999999-9999-4999-8999-999999999999';

-- Done. Demo data only.
