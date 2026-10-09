-- =====================================================================
-- FiTop Retreat — Row Level Security
-- Chạy SAU 001_schema.sql
--
-- Nguyên tắc: khoá publishable key trên web chỉ ĐỌC được thứ công khai
-- (coupons đang bật) và dữ liệu của chính người đăng nhập.
-- Mọi việc ghi đơn, xác nhận thanh toán, ghi hoa hồng đều đi qua
-- Netlify Function dùng service_role key — key đó KHÔNG BAO GIỜ
-- xuất hiện trong mã nguồn hay trên trình duyệt.
-- =====================================================================

alter table public.profiles         enable row level security;
alter table public.coupons          enable row level security;
alter table public.orders           enable row level security;
alter table public.commissions      enable row level security;
alter table public.commission_rates enable row level security;
alter table public.payment_events   enable row level security;
alter table public.leads            enable row level security;

-- helper: người đang đăng nhập có phải admin/staff
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff','admin')
  );
$$;

-- ---------------- profiles ----------------
drop policy if exists profiles_self_read   on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------- coupons ----------------
-- Web cần tra mã ưu đãi trước khi khách đăng nhập → cho đọc mã đang bật.
drop policy if exists coupons_public_read on public.coupons;
create policy coupons_public_read on public.coupons
  for select using (
    active = true and (expires is null or expires >= current_date)
  );

-- ---------------- orders ----------------
-- Khách chỉ thấy đơn của chính mình. Khách chưa đăng nhập tra đơn
-- qua Netlify Function order-status (dùng order_id + unlock_token).
drop policy if exists orders_own_read on public.orders;
create policy orders_own_read on public.orders
  for select using (user_id = auth.uid() or public.is_staff());

-- Không có policy insert/update/delete cho anon & authenticated:
-- mọi thay đổi đơn chỉ đi qua service_role (Netlify Function).

-- ---------------- commissions ----------------
drop policy if exists commissions_ctv_read on public.commissions;
create policy commissions_ctv_read on public.commissions
  for select using (
    public.is_staff()
    or ctv_code = (select ctv_code from public.profiles where id = auth.uid())
  );

-- ---------------- commission_rates ----------------
drop policy if exists rates_public_read on public.commission_rates;
create policy rates_public_read on public.commission_rates
  for select using (true);

-- ---------------- payment_events ----------------
-- Chỉ staff/admin được xem. Webhook ghi bằng service_role.
drop policy if exists events_staff_read on public.payment_events;
create policy events_staff_read on public.payment_events
  for select using (public.is_staff());

-- ---------------- leads ----------------
-- Cho web gửi lead khi khách chưa đăng nhập, nhưng không cho đọc lại.
drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert on public.leads
  for insert with check (true);

drop policy if exists leads_staff_read on public.leads;
create policy leads_staff_read on public.leads
  for select using (public.is_staff());
