-- =====================================================================
-- FiTop Retreat — Phát hành tài liệu có kiểm soát
-- Chạy SAU 004_mail.sql. Chạy lại nhiều lần không sao.
--
-- Nguyên tắc: KHÔNG có link file công khai. File nằm trong bucket riêng
-- tư, mỗi lần khách bấm tải thì máy chủ mới sinh link ký hạn 10 phút,
-- đóng dấu mờ tên người mua, rồi ghi lại ai đã tải.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Kho file riêng tư
--    public = false là điểm mấu chốt. Bật public lên là mất tất cả.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tailieu', 'tailieu', false)
on conflict (id) do update set public = false;

-- ---------------------------------------------------------------------
-- 2. documents — danh mục tài liệu
--    nhom: I..X theo danh mục gốc, A..G cho các nhóm bổ sung
-- ---------------------------------------------------------------------
create table if not exists public.documents (
  ma            text primary key,              -- FT-01-OTA, FT-A-TAMTRU...
  ten           text not null,
  nhom          text not null,                 -- I | II | ... | X | A | B...
  ten_nhom      text,                          -- "Bán phòng & quản lý kênh bán"
  loai          text,                          -- SOP | Biểu mẫu | Checklist | Công cụ
  mo_ta         text,
  duong_dan     text,                          -- đường dẫn trong bucket tailieu
  dinh_dang     text default 'pdf',            -- pdf | xlsx | docx
  phien_ban     text default '1.0',
  ngay_cap_nhat date default current_date,
  file_goc      boolean not null default false, -- true = bản sửa được (Excel/Word)
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists documents_nhom_idx on public.documents (nhom)
  where active = true;

comment on table public.documents is
  'Danh mục tài liệu. duong_dan trỏ vào bucket riêng tư tailieu, không bao giờ lộ ra ngoài.';
comment on column public.documents.file_goc is
  'true = file Excel/Word sửa được. Chỉ gói USB và Cứu lỗ mới được tải loại này.';

-- ---------------------------------------------------------------------
-- 3. goi_nhom — gói nào xem được nhóm nào
--    Tách riêng để đổi chính sách bán hàng không phải sửa mã nguồn.
-- ---------------------------------------------------------------------
create table if not exists public.goi_nhom (
  goi   text not null,                         -- online | usb | cuulo | nam
  nhom  text not null,
  primary key (goi, nhom)
);

insert into public.goi_nhom (goi, nhom) values
  -- Gói Online 250k: vận hành hàng ngày
  ('online','I'), ('online','II'), ('online','VI'), ('online','VII'),
  -- Gói USB 299k: như Online, khác ở chỗ được file gốc
  ('usb','I'), ('usb','II'), ('usb','VI'), ('usb','VII'),
  -- Gói Cứu lỗ 1.490k: toàn bộ
  ('cuulo','I'), ('cuulo','II'), ('cuulo','III'), ('cuulo','IV'), ('cuulo','V'),
  ('cuulo','VI'), ('cuulo','VII'), ('cuulo','VIII'), ('cuulo','IX'), ('cuulo','X'),
  ('cuulo','A'), ('cuulo','B'), ('cuulo','C'), ('cuulo','D'),
  ('cuulo','E'), ('cuulo','F'), ('cuulo','G'),
  -- Gói năm 1.990k: toàn bộ + cập nhật 12 tháng
  ('nam','I'), ('nam','II'), ('nam','III'), ('nam','IV'), ('nam','V'),
  ('nam','VI'), ('nam','VII'), ('nam','VIII'), ('nam','IX'), ('nam','X'),
  ('nam','A'), ('nam','B'), ('nam','C'), ('nam','D'),
  ('nam','E'), ('nam','F'), ('nam','G')
on conflict do nothing;

-- Gói nào được tải file gốc Excel/Word
create table if not exists public.goi_quyen (
  goi           text primary key,
  duoc_file_goc boolean not null default false,
  so_thiet_bi   int not null default 3          -- trần số thiết bị cùng dùng
);

insert into public.goi_quyen (goi, duoc_file_goc, so_thiet_bi) values
  ('online', false, 2),
  ('usb',    true,  2),
  ('cuulo',  true,  3),
  ('nam',    true,  5)
on conflict (goi) do update
  set duoc_file_goc = excluded.duoc_file_goc,
      so_thiet_bi   = excluded.so_thiet_bi;

-- ---------------------------------------------------------------------
-- 4. entitlements — ai đã mua gói gì, còn hạn tới bao giờ
-- ---------------------------------------------------------------------
create table if not exists public.entitlements (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  goi        text not null,
  order_id   text references public.orders(order_id),
  bat_dau    timestamptz not null default now(),
  het_han    timestamptz,                      -- null = vĩnh viễn
  ghi_chu    text,
  created_at timestamptz not null default now()
);

create unique index if not exists entitlements_email_goi_idx
  on public.entitlements (lower(email), goi);
create index if not exists entitlements_email_idx
  on public.entitlements (lower(email));

comment on column public.entitlements.het_han is
  'null = mua đứt. Gói năm đặt het_han = bat_dau + 12 tháng.';

-- ---------------------------------------------------------------------
-- 5. document_access_log — ai mở tài liệu nào, lúc nào
--    Vừa để chống gian lận, vừa để biết tài liệu nào khách cần nhất.
-- ---------------------------------------------------------------------
create table if not exists public.document_access_log (
  id         bigserial primary key,
  email      text not null,
  doc_ma     text,
  order_id   text,
  hanh_dong  text not null default 'tai',      -- xem | tai
  ip         text,
  thiet_bi   text,                             -- dấu vân tay đã băm
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists dal_email_idx   on public.document_access_log (lower(email), created_at desc);
create index if not exists dal_doc_idx     on public.document_access_log (doc_ma, created_at desc);
create index if not exists dal_created_idx on public.document_access_log (created_at desc);

-- ---------------------------------------------------------------------
-- 6. RLS — khoá hết, chỉ Netlify Function (service_role) đi qua được
-- ---------------------------------------------------------------------
alter table public.documents           enable row level security;
alter table public.goi_nhom            enable row level security;
alter table public.goi_quyen           enable row level security;
alter table public.entitlements        enable row level security;
alter table public.document_access_log enable row level security;

-- Không đặt policy nào cho anon/authenticated.
-- Khách không đọc thẳng được bảng nào; mọi thứ đi qua /api.

-- ---------------------------------------------------------------------
-- 7. Hàm tra quyền — trả về danh sách tài liệu một email được xem
-- ---------------------------------------------------------------------
create or replace function public.tai_lieu_cua(p_email text)
returns table (
  ma text, ten text, nhom text, ten_nhom text, loai text,
  mo_ta text, dinh_dang text, phien_ban text,
  ngay_cap_nhat date, duoc_file_goc boolean
)
language sql stable security definer set search_path = public as $$
  select distinct
    d.ma, d.ten, d.nhom, d.ten_nhom, d.loai,
    d.mo_ta, d.dinh_dang, d.phien_ban, d.ngay_cap_nhat,
    bool_or(q.duoc_file_goc) over (partition by d.ma) as duoc_file_goc
  from public.entitlements e
  join public.goi_nhom  g on g.goi = e.goi
  join public.goi_quyen q on q.goi = e.goi
  join public.documents d on d.nhom = g.nhom
  where lower(e.email) = lower(p_email)
    and (e.het_han is null or e.het_han > now())
    and d.active = true
    and (d.file_goc = false or q.duoc_file_goc = true)
  order by d.nhom, d.ma;
$$;

revoke all on function public.tai_lieu_cua(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Hàm kiểm một tài liệu cụ thể — dùng trước khi sinh link tải
-- ---------------------------------------------------------------------
create or replace function public.duoc_tai(p_email text, p_ma text)
returns table (duoc boolean, duong_dan text, ten text, dinh_dang text, goi text)
language sql stable security definer set search_path = public as $$
  select true, d.duong_dan, d.ten, d.dinh_dang, e.goi
  from public.entitlements e
  join public.goi_nhom  g on g.goi = e.goi
  join public.goi_quyen q on q.goi = e.goi
  join public.documents d on d.nhom = g.nhom
  where lower(e.email) = lower(p_email)
    and d.ma = p_ma
    and (e.het_han is null or e.het_han > now())
    and d.active = true
    and (d.file_goc = false or q.duoc_file_goc = true)
  limit 1;
$$;

revoke all on function public.duoc_tai(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 9. Thống kê cho admin.html
-- ---------------------------------------------------------------------
create or replace function public.stats_tailieu()
returns table (doc_ma text, ten text, so_luot bigint, so_nguoi bigint)
language sql stable security definer set search_path = public as $$
  select l.doc_ma,
         max(d.ten) as ten,
         count(*) as so_luot,
         count(distinct lower(l.email)) as so_nguoi
  from public.document_access_log l
  left join public.documents d on d.ma = l.doc_ma
  where l.created_at >= current_date - interval '30 days'
  group by l.doc_ma
  order by so_luot desc;
$$;

revoke all on function public.stats_tailieu() from public, anon, authenticated;
