-- =====================================================================
-- FiTop Retreat — Đếm lượt truy cập & bảng theo dõi
-- Chạy SAU 001_schema.sql và 002_rls.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. page_views — mỗi lượt xem trang một dòng
--    Không lưu địa chỉ IP. Chỉ lưu dấu vân tay đã băm, không truy ngược
--    được ra người cụ thể.
-- ---------------------------------------------------------------------
create table if not exists public.page_views (
  id          bigserial primary key,
  path        text not null,
  referrer    text,
  source      text,                      -- facebook|zalo|tiktok|google|direct|khac
  device      text,                      -- mobile|desktop|tablet
  country     text,
  visitor_id  text,                      -- băm, để đếm khách duy nhất
  session_id  text,
  created_at  timestamptz not null default now()
);

create index if not exists page_views_created_idx  on public.page_views(created_at desc);
create index if not exists page_views_visitor_idx  on public.page_views(visitor_id, created_at desc);
create index if not exists page_views_source_idx   on public.page_views(source);

alter table public.page_views enable row level security;

-- Không có policy nào cho anon/authenticated: chỉ Netlify Function
-- (service_role) được ghi và đọc. Khách không đọc được dữ liệu này.
drop policy if exists page_views_staff_read on public.page_views;
create policy page_views_staff_read on public.page_views
  for select using (public.is_staff());

-- ---------------------------------------------------------------------
-- 2. Các hàm thống kê — trả về số liệu đã gộp, không trả dòng thô
--    Netlify Function gọi các hàm này bằng service_role.
-- ---------------------------------------------------------------------

-- 2.1 Theo GIỜ — 24 giờ gần nhất
create or replace function public.stats_hourly()
returns table (gio timestamptz, luot bigint, khach bigint)
language sql stable security definer set search_path = public as $$
  select date_trunc('hour', created_at) as gio,
         count(*)                        as luot,
         count(distinct visitor_id)      as khach
  from public.page_views
  where created_at >= now() - interval '24 hours'
  group by 1 order by 1;
$$;

-- 2.2 Theo NGÀY — 30 ngày gần nhất
create or replace function public.stats_daily()
returns table (ngay date, luot bigint, khach bigint)
language sql stable security definer set search_path = public as $$
  select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as ngay,
         count(*)                   as luot,
         count(distinct visitor_id) as khach
  from public.page_views
  where created_at >= now() - interval '30 days'
  group by 1 order by 1;
$$;

-- 2.3 Theo THÁNG — luỹ kế 12 tháng
create or replace function public.stats_monthly()
returns table (thang text, luot bigint, khach bigint)
language sql stable security definer set search_path = public as $$
  select to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM') as thang,
         count(*)                   as luot,
         count(distinct visitor_id) as khach
  from public.page_views
  where created_at >= now() - interval '12 months'
  group by 1 order by 1;
$$;

-- 2.4 Nguồn khách đến
create or replace function public.stats_sources()
returns table (nguon text, luot bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(source, 'khac') as nguon, count(*) as luot
  from public.page_views
  where created_at >= now() - interval '30 days'
  group by 1 order by 2 desc;
$$;

-- 2.5 Tổng quan nhanh
create or replace function public.stats_summary()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'luot_hom_nay', (
      select count(*) from public.page_views
      where (created_at at time zone 'Asia/Ho_Chi_Minh')::date
          = (now() at time zone 'Asia/Ho_Chi_Minh')::date),
    'khach_hom_nay', (
      select count(distinct visitor_id) from public.page_views
      where (created_at at time zone 'Asia/Ho_Chi_Minh')::date
          = (now() at time zone 'Asia/Ho_Chi_Minh')::date),
    'luot_thang_nay', (
      select count(*) from public.page_views
      where to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM')
          = to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM')),
    'khach_thang_nay', (
      select count(distinct visitor_id) from public.page_views
      where to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM')
          = to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM')),
    'luot_tong', (select count(*) from public.page_views),

    'don_cho', (select count(*) from public.orders where status = 'pending'),
    'don_da_tra', (select count(*) from public.orders where status = 'paid'),
    'don_lech', (select count(*) from public.orders where status = 'mismatch'),

    'doanh_thu_thang', (
      select coalesce(sum(coalesce(paid_amount, total)), 0) from public.orders
      where status = 'paid'
        and to_char(paid_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM')
          = to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM')),
    'doanh_thu_tong', (
      select coalesce(sum(coalesce(paid_amount, total)), 0) from public.orders
      where status = 'paid'),

    'hoa_hong_chua_tra', (
      select coalesce(sum(amount), 0) from public.commissions
      where status in ('accrued','approved'))
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Cấp quyền quản trị cho tài khoản của anh Lợi
--    Chạy được ngay cả khi chưa có tài khoản — khi nào đăng ký bằng
--    email này thì trigger bên dưới tự gán quyền admin.
-- ---------------------------------------------------------------------
update public.profiles
set role = 'admin'
where lower(email) = 'loivantu2019@gmail.com';

create or replace function public.grant_owner_admin()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email,'')) = 'loivantu2019@gmail.com' then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_grant_owner on public.profiles;
create trigger profiles_grant_owner
  before insert or update of email on public.profiles
  for each row execute function public.grant_owner_admin();
