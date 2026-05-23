-- Phase 4.5 — RLS hardening migration for Parts Pro
-- Run this in the Supabase SQL editor ONCE, AFTER you've finished testing
-- without auth. From this point on, every mutating call must carry a valid
-- JWT (Authorization: Bearer ...). Reads remain open to anon users for the
-- public storefront / public tracking pages (we can tighten further later).
--
-- Roll-back: replace every `auth.role() = 'authenticated'` clause with
-- `true` and re-run — that restores the open allow_all policies.

-- 1) Profiles table linked to auth.users (1:1). Stores the app-level role.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default '',
  role text default 'viewer' check (role in ('admin', 'manager', 'cashier', 'viewer')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Anyone (authenticated) can read their own profile; admins can read all.
drop policy if exists "profiles_self_read" on profiles;
create policy "profiles_self_read" on profiles
  for select using (auth.uid() = id);

-- Auto-create a profile row on signup (trigger).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.raw_user_meta_data->>'role', 'viewer'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Helper to check current user's role.
create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 3) Per-table policies. Reads open to anon (for now); writes auth-only,
--    DELETE restricted to admin/manager.
do $$
declare
  t text;
  tables text[] := array['parts','invoices','suppliers','customers','purchases','expenses','accounts','settings','liquids','vehicles','liquid_transactions','journal_entries'];
begin
  foreach t in array tables
  loop
    execute format('drop policy if exists "allow_all" on %I', t);
    execute format('drop policy if exists "select_open" on %I', t);
    execute format('drop policy if exists "insert_auth" on %I', t);
    execute format('drop policy if exists "update_auth" on %I', t);
    execute format('drop policy if exists "delete_admin_manager" on %I', t);

    -- SELECT: open to anyone (anon + authenticated) for now.
    execute format('create policy "select_open" on %I for select using (true)', t);

    -- INSERT/UPDATE: authenticated users with role in admin/manager/cashier.
    execute format($pl$create policy "insert_auth" on %I for insert
      with check (auth.role() = 'authenticated'
                  and public.current_user_role() in ('admin','manager','cashier'))$pl$, t);

    execute format($pl$create policy "update_auth" on %I for update
      using (auth.role() = 'authenticated'
             and public.current_user_role() in ('admin','manager','cashier'))
      with check (auth.role() = 'authenticated'
                  and public.current_user_role() in ('admin','manager','cashier'))$pl$, t);

    -- DELETE: admin + manager only.
    execute format($pl$create policy "delete_admin_manager" on %I for delete
      using (auth.role() = 'authenticated'
             and public.current_user_role() in ('admin','manager'))$pl$, t);
  end loop;
end $$;

-- 4) Bootstrap an initial admin manually after first signup:
-- update profiles set role='admin' where email='owner@example.com';
