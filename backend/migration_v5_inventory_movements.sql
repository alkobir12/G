-- Phase 5 — Inventory movement log
-- Run this once in the Supabase SQL editor.
--   https://supabase.com/dashboard/project/uifvnppwgbxaqmorwgky/sql/new

create table if not exists inventory_movements (
  id text primary key,
  part_id text,
  part_name text default '',
  type text not null check (type in ('in', 'out', 'adjust', 'wipe')),
  qty integer default 0,
  ref_type text default '',          -- 'purchase' | 'invoice' | 'manual' | 'wipe' | 'pos'
  ref_id text default '',
  before_stock integer default 0,
  after_stock integer default 0,
  user_id text default '',
  note text default '',
  created_at timestamptz default now()
);

create index if not exists inventory_movements_part_id_idx on inventory_movements(part_id);
create index if not exists inventory_movements_created_at_idx on inventory_movements(created_at desc);
create index if not exists inventory_movements_ref_idx on inventory_movements(ref_type, ref_id);

alter table inventory_movements enable row level security;

-- Open policy for the unauthenticated phase (matches the other v2 tables).
-- The v3 RLS migration will tighten this when auth lands.
drop policy if exists "allow_all" on inventory_movements;
create policy "allow_all" on inventory_movements
  for all using (true) with check (true);
