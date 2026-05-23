-- Parts Pro v2 Migration Script
-- Run this in Supabase Dashboard → SQL Editor

-- جدول القطع
create table if not exists parts (
  id text primary key,
  oem text,
  name_ar text not null,
  brand text default 'عام',
  category text default 'عام',
  model text default '',
  stock integer default 0,
  min_stock integer default 2,
  location text default '',
  cost numeric default 0,
  price numeric default 0,
  wholesale numeric default 0,
  updated_at timestamp default now()
);

-- جدول الفواتير
create table if not exists invoices (
  id text primary key,
  date text not null,
  customer text not null,
  phone text default '',
  items jsonb not null default '[]',
  subtotal numeric default 0,
  vat numeric default 0,
  total numeric default 0,
  payment text default 'نقدي',
  status text default 'مكتمل',
  created_at timestamp default now()
);

-- جدول الموردين
create table if not exists suppliers (
  id text primary key,
  name text not null,
  contact text default '',
  phone text default '',
  email text default '',
  address text default '',
  balance numeric default 0,
  parts_count integer default 0,
  status text default 'نشط',
  created_at timestamp default now()
);

-- جدول العملاء
create table if not exists customers (
  id text primary key,
  name text not null,
  phone text default '',
  email text default '',
  type text default 'نقدي',
  purchases_count integer default 0,
  total_purchases numeric default 0,
  balance numeric default 0,
  last_visit text default '',
  created_at timestamp default now()
);

-- جدول المشتريات
create table if not exists purchases (
  id text primary key,
  date text not null,
  supplier text not null,
  items jsonb not null default '[]',
  subtotal numeric default 0,
  vat numeric default 0,
  total numeric default 0,
  status text default 'مستلم',
  created_at timestamp default now()
);

-- جدول المصروفات
create table if not exists expenses (
  id text primary key,
  date text not null,
  category text not null,
  amount numeric default 0,
  description text default '',
  vendor text default '',
  payment text default 'نقدي',
  created_at timestamp default now()
);

-- جدول الحسابات
create table if not exists accounts (
  code text primary key,
  name text not null,
  type text default '',
  balance numeric default 0,
  parent text default ''
);

-- جدول الإعدادات
create table if not exists settings (
  id text primary key default 'main',
  company_name text default 'Parts Pro',
  address text default '',
  phone text default '',
  email text default '',
  vat_number text default '',
  cr_number text default '',
  currency text default 'ر.س',
  vat_enabled boolean default true,
  vat_rate numeric default 0.15,
  invoice_footer text default 'شكراً لتعاملكم معنا',
  updated_at timestamp default now()
);

-- جدول السوائل (Liquid System)
create table if not exists liquids (
  id text primary key,
  name text not null,
  category text default 'زيت محرك',
  brand text default '',
  capacity numeric default 1,
  stock integer default 0,
  min_stock integer default 5,
  cost numeric default 0,
  price numeric default 0,
  location text default '',
  updated_at timestamp default now()
);

-- جدول المركبات
create table if not exists vehicles (
  id text primary key,
  plate text not null,
  make text default '',
  model text default '',
  year integer default 2024,
  owner text default '',
  phone text default '',
  current_km integer default 0,
  last_oil_change_km integer default 0,
  last_oil_change_date text default '',
  oil_type text default '',
  notes text default '',
  updated_at timestamp default now()
);

-- جدول حركات السوائل
create table if not exists liquid_transactions (
  id text primary key,
  date text not null,
  vehicle_id text default '',
  vehicle_plate text default '',
  liquid_id text default '',
  liquid_name text default '',
  category text default '',
  qty integer default 1,
  price numeric default 0,
  total numeric default 0,
  km_at_service integer default 0,
  worker text default '',
  notes text default '',
  created_at timestamp default now()
);

-- جدول القيود اليومية (Double Entry)
create table if not exists journal_entries (
  id text primary key,
  date text not null,
  description text default '',
  entries jsonb not null default '[]',
  ref_id text default '',
  ref_type text default '',
  created_at timestamp default now()
);

-- Enable Row Level Security
alter table if exists parts enable row level security;
alter table if exists invoices enable row level security;
alter table if exists suppliers enable row level security;
alter table if exists customers enable row level security;
alter table if exists purchases enable row level security;
alter table if exists expenses enable row level security;
alter table if exists accounts enable row level security;
alter table if exists settings enable row level security;
alter table if exists liquids enable row level security;
alter table if exists vehicles enable row level security;
alter table if exists liquid_transactions enable row level security;
alter table if exists journal_entries enable row level security;

-- Open policies for anon access
DO $$
DECLARE
  t text;
  tables text[] := array['parts','invoices','suppliers','customers','purchases','expenses','accounts','settings','liquids','vehicles','liquid_transactions','journal_entries'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Seed default accounts (Chart of Accounts)
INSERT INTO accounts (code, name, type, balance, parent) VALUES
  ('1', 'الأصول', 'أصول', 0, ''),
  ('11', 'الأصول المتداولة', 'أصول', 0, '1'),
  ('1110', 'النقدية', 'أصول', 0, '11'),
  ('1120', 'البنك', 'أصول', 0, '11'),
  ('1130', 'العملاء', 'أصول', 0, '11'),
  ('12', 'المخزون', 'أصول', 0, '1'),
  ('1210', 'مخزون قطع الغيار', 'أصول', 0, '12'),
  ('1220', 'مخزون السوائل', 'أصول', 0, '12'),
  ('2', 'الخصوم والالتزامات', 'خصوم', 0, ''),
  ('21', 'الالتزامات المتداولة', 'خصوم', 0, '2'),
  ('2110', 'ضريبة القيمة المضافة', 'خصوم', 0, '21'),
  ('2120', 'الموردون', 'خصوم', 0, '21'),
  ('3', 'حقوق الملكية', 'حقوق ملكية', 0, ''),
  ('31', 'رأس المال', 'حقوق ملكية', 0, '3'),
  ('3110', 'رأس المال', 'حقوق ملكية', 0, '31'),
  ('4', 'الإيرادات', 'إيرادات', 0, ''),
  ('41', 'إيرادات المبيعات', 'إيرادات', 0, '4'),
  ('4100', 'مبيعات قطع الغيار', 'إيرادات', 0, '41'),
  ('4200', 'إيرادات خدمات الصيانة', 'إيرادات', 0, '41'),
  ('5', 'تكاليف المبيعات', 'تكاليف', 0, ''),
  ('5100', 'تكلفة البضاعة المباعة', 'تكاليف', 0, '5'),
  ('6', 'المصروفات', 'مصروفات', 0, ''),
  ('61', 'مصروفات تشغيلية', 'مصروفات', 0, '6'),
  ('6110', 'الإيجار', 'مصروفات', 0, '61'),
  ('6120', 'الكهرباء', 'مصروفات', 0, '61'),
  ('6130', 'المياه', 'مصروفات', 0, '61'),
  ('6140', 'الرواتب', 'مصروفات', 0, '61'),
  ('6150', 'نثريات', 'مصروفات', 0, '61')
ON CONFLICT (code) DO NOTHING;
