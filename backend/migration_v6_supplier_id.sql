-- Phase 5.x — Step 4: add supplier_id column to parts
-- Run this once in the Supabase SQL editor.
--   https://supabase.com/dashboard/project/uifvnppwgbxaqmorwgky/sql/new
--
-- Safe to re-run (uses `if not exists`).

alter table parts add column if not exists supplier_id text default '';
create index if not exists parts_supplier_id_idx on parts(supplier_id);
