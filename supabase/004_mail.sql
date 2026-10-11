-- =====================================================================
-- FiTop Retreat — cột dấu vết gửi email cho 3 luật tự động
-- Chạy SAU 003_analytics.sql. Chạy lại nhiều lần không sao.
--
-- Ba luật (xem netlify/functions/_lib/mail.js):
--   1. Đơn sang 'paid'        → email xác nhận kèm link tài liệu
--   2. Đơn 'pending' quá hạn  → nhắc MỘT lần
--   3. Lead mới               → báo về FiTop
--
-- Các cột dưới đây để hệ thống biết đã gửi rồi hay chưa, không gửi trùng.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. orders — dấu vết hai email gửi cho khách
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists mail_paid_at timestamptz,   -- đã gửi email xác nhận
  add column if not exists mail_nhac_at timestamptz;   -- đã nhắc đơn treo

comment on column public.orders.mail_paid_at is
  'Thời điểm đã gửi email xác nhận thanh toán. Null = chưa gửi.';
comment on column public.orders.mail_nhac_at is
  'Thời điểm đã nhắc đơn còn treo. Mỗi đơn chỉ nhắc một lần.';

-- Chỉ mục cho đúng câu truy vấn của nhac-don-treo.js:
-- đơn pending, chưa nhắc, sắp theo thời gian tạo.
create index if not exists orders_can_nhac_idx
  on public.orders (created_at)
  where status = 'pending' and mail_nhac_at is null;

-- ---------------------------------------------------------------------
-- 2. leads — dấu vết thư báo nội bộ
-- ---------------------------------------------------------------------
alter table public.leads
  add column if not exists mail_bao_at timestamptz;

comment on column public.leads.mail_bao_at is
  'Thời điểm đã gửi thư báo lead mới về FiTop. Null = chưa báo được.';

create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_phone_idx   on public.leads (phone, source);

-- ---------------------------------------------------------------------
-- 3. Đóng lỗ ghi lead công khai
--
-- Policy leads_public_insert cho PHÉP BẤT KỲ AI dùng publishable key ghi
-- bao nhiêu dòng cũng được vào bảng leads. Lúc đặt policy đó, web dự định
-- ghi lead trực tiếp từ trình duyệt. Giờ web gửi qua /api/lead — hàm đó
-- dùng service_role, bỏ qua RLS, nên policy này không còn ai dùng mà vẫn
-- để ngỏ cửa cho người ngoài đổ rác vào bảng.
-- ---------------------------------------------------------------------
drop policy if exists leads_public_insert on public.leads;

-- Giữ nguyên quyền đọc của staff/admin (đặt ở 002_rls.sql), ghi lại cho chắc
drop policy if exists leads_staff_read on public.leads;
create policy leads_staff_read on public.leads
  for select using (public.is_staff());

-- ---------------------------------------------------------------------
-- 4. Hàm đếm lead cho admin.html
--    Trả về số lead theo ngày, 30 ngày gần nhất, tách theo nguồn.
-- ---------------------------------------------------------------------
create or replace function public.stats_leads()
returns table (ngay date, nguon text, so_luong bigint)
language sql stable security definer set search_path = public as $$
  select created_at::date as ngay,
         coalesce(source, 'khac') as nguon,
         count(*) as so_luong
  from public.leads
  where created_at >= current_date - interval '30 days'
  group by 1, 2
  order by 1 desc, 3 desc;
$$;

revoke all on function public.stats_leads() from public, anon, authenticated;
