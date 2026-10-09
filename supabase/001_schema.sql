-- =====================================================================
-- FiTop Retreat — Supabase schema
-- Chạy trong Supabase Studio → SQL Editor → New query → Run
-- Chạy file này TRƯỚC, rồi mới chạy 002_rls.sql
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. profiles — hồ sơ người dùng (gắn 1-1 với auth.users của Supabase)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  phone         text,
  email         text,
  company       text,
  role          text not null default 'member'
                  check (role in ('member','ctv','staff','admin')),
  ctv_code      text unique,              -- chỉ có khi role = 'ctv'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_ctv_code_idx on public.profiles(ctv_code);

-- Tự tạo profile khi có người đăng ký tài khoản mới
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. coupons — mã ưu đãi & mã CTV (web đã đọc bảng này)
-- ---------------------------------------------------------------------
create table if not exists public.coupons (
  code        text primary key,
  type        text not null check (type in ('percent','amount')),
  value       numeric not null check (value > 0),
  applies     text[] not null default array['all'],  -- all|online|usb|other
  min_amount  numeric not null default 0,
  ctv_code    text,                                  -- gán đơn cho CTV nào
  note        text,
  expires     date,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. orders — đơn hàng, nguồn sự thật duy nhất của trạng thái thanh toán
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_id      text unique not null,            -- FTxxxxx, in trên QR
  user_id       uuid references auth.users(id) on delete set null,
  customer_name  text,
  customer_phone text,
  customer_email text,
  package       text not null,                   -- online|usb|other
  description   text,
  amount        numeric not null check (amount >= 0),   -- giá gốc
  discount      numeric not null default 0 check (discount >= 0),
  total         numeric not null check (total >= 0),    -- số tiền phải chuyển
  coupon_code   text references public.coupons(code),
  ctv_code      text,
  status        text not null default 'pending'
                  check (status in ('pending','paid','mismatch','cancelled','refunded')),
  -- dấu vết thanh toán (do webhook ghi)
  paid_at       timestamptz,
  paid_amount   numeric,
  provider      text,                            -- sepay|payos|casso|manual
  provider_ref  text,                            -- id giao dịch bên cung cấp
  raw_payload   jsonb,
  unlock_token  uuid not null default gen_random_uuid(),  -- khoá mở tài liệu
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists orders_status_idx     on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_ctv_code_idx   on public.orders(ctv_code);
create index if not exists orders_user_id_idx    on public.orders(user_id);

-- ---------------------------------------------------------------------
-- 4. payment_events — log mọi webhook nhận được, kể cả không khớp đơn
--    Giữ lại để đối soát khi khách ghi sai nội dung chuyển khoản.
-- ---------------------------------------------------------------------
create table if not exists public.payment_events (
  id            bigserial primary key,
  provider      text not null,
  provider_ref  text,
  amount        numeric,
  content       text,                            -- nội dung chuyển khoản thô
  matched_order text,                            -- order_id khớp được (nếu có)
  result        text not null,                   -- matched|no_match|amount_mismatch|duplicate
  raw_payload   jsonb,
  created_at    timestamptz not null default now()
);

create unique index if not exists payment_events_dedupe_idx
  on public.payment_events(provider, provider_ref)
  where provider_ref is not null;

create index if not exists payment_events_result_idx on public.payment_events(result, created_at desc);

-- ---------------------------------------------------------------------
-- 5. commissions — hoa hồng CTV, ghi tự động khi đơn chuyển sang paid
-- ---------------------------------------------------------------------
create table if not exists public.commissions (
  id          uuid primary key default gen_random_uuid(),
  order_id    text not null references public.orders(order_id) on delete cascade,
  ctv_code    text not null,
  base_amount numeric not null,                  -- số tiền thực thu của đơn
  rate        numeric not null,                  -- 0.40 = 40%
  amount      numeric not null,                  -- hoa hồng phải trả
  status      text not null default 'accrued'
                check (status in ('accrued','approved','paid','void')),
  period      text,                              -- '2026-10' kỳ chi trả
  paid_at     timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);

create unique index if not exists commissions_order_unique on public.commissions(order_id);
create index if not exists commissions_ctv_idx on public.commissions(ctv_code, status);

-- ---------------------------------------------------------------------
-- 6. commission_rates — bậc hoa hồng theo loại sản phẩm (sửa không cần deploy)
-- ---------------------------------------------------------------------
create table if not exists public.commission_rates (
  package   text primary key,
  rate      numeric not null check (rate >= 0 and rate <= 1),
  note      text
);

insert into public.commission_rates (package, rate, note) values
  ('online', 0.40, 'Tài liệu bản Online — 30-40%, áp mức trần 40%'),
  ('usb',    0.30, 'Tài liệu bản USB — 25-30%, áp mức trần 30%'),
  ('other',  0.15, 'Gói dịch vụ tư vấn — 10-15%, áp mức trần 15%')
on conflict (package) do nothing;

-- ---------------------------------------------------------------------
-- 7. leads — form khảo sát / liên hệ (song song HubSpot, để có bản gốc)
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  full_name   text,
  phone       text,
  email       text,
  company     text,
  property_type text,                            -- khachsan|resort|fnb|spa
  message     text,
  source      text,                              -- web|zalo-oa|ctv|facebook
  ctv_code    text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. updated_at tự động
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists orders_touch   on public.orders;
create trigger orders_touch   before update on public.orders
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 9. Ghi hoa hồng tự động khi đơn chuyển sang 'paid'
-- ---------------------------------------------------------------------
create or replace function public.accrue_commission()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare r numeric;
begin
  if new.status = 'paid'
     and coalesce(old.status,'') <> 'paid'
     and new.ctv_code is not null then

    select rate into r from public.commission_rates where package = new.package;
    if r is null then r := 0; end if;

    insert into public.commissions
      (order_id, ctv_code, base_amount, rate, amount, period)
    values
      (new.order_id, new.ctv_code, coalesce(new.paid_amount, new.total), r,
       round(coalesce(new.paid_amount, new.total) * r),
       to_char(coalesce(new.paid_at, now()), 'YYYY-MM'))
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_accrue_commission on public.orders;
create trigger orders_accrue_commission
  after update of status on public.orders
  for each row execute function public.accrue_commission();
