-- =====================================================================
-- FiTop Retreat — Đăng ký ký gửi căn (self-service listing)
-- Chạy trong Supabase Studio → SQL Editor → New query → Run.
-- Chạy lại nhiều lần không sao (idempotent).
--
-- Mô hình: chủ nhà tự nộp tin trên web → lưu bảng can_ky_gui (trạng thái
-- 'cho_duyet'), ảnh để trong bucket can-anh. FiTop duyệt trong trang quản
-- trị. Chỉ tin 'da_duyet' mới hiện trên trang công khai /can-ho.
--
-- Mọi việc GHI (nộp tin, duyệt) đi qua Netlify Function dùng service_role,
-- nên bảng này BẬT RLS và KHÔNG mở policy nào cho khoá publishable — trình
-- duyệt không đọc/ghi thẳng bảng. Trang công khai đọc qua /api/can-cong-khai.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Kho ảnh căn — CÔNG KHAI (ai có link ảnh đều xem được)
--    Ảnh tin đăng vốn để khoe ra, nên bucket public = true. Tên file do
--    server đặt ngẫu nhiên nên không đoán được tin chưa duyệt.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('can-anh', 'can-anh', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------
-- 2. can_ky_gui — tin căn/khách sạn/homestay chủ nhà ký gửi
-- ---------------------------------------------------------------------
create table if not exists public.can_ky_gui (
  id             uuid primary key default gen_random_uuid(),
  ma             text unique,                        -- mã hiển thị, vd KG-9F3A2C
  ten            text not null,                      -- tên căn / khách sạn / homestay
  loai           text not null                       -- phân loại
                   check (loai in ('can_ho','homestay','hotel','villa','nha_nguyen_can','khac')),
  tinh           text,                               -- tỉnh / thành phố (hiện công khai)
  dia_chi        text,                               -- địa chỉ chi tiết (CHỈ nội bộ)
  so_phong       int,
  dien_tich      numeric,                            -- m2
  gia            numeric,                            -- số tiền chủ nhà đưa ra
  gia_don_vi     text not null default 'thang'       -- đêm | tháng | bán đứt
                   check (gia_don_vi in ('dem','thang','ban')),
  mo_ta          text,
  tien_ich       text[] not null default '{}',       -- wifi, hồ bơi, bếp, máy giặt...
  anh            text[] not null default '{}',       -- đường dẫn trong bucket can-anh
  lien_he_ten    text,                               -- liên hệ chủ nhà (CHỈ nội bộ)
  lien_he_sdt    text,                               -- (CHỈ nội bộ)
  lien_he_email  text,                               -- (CHỈ nội bộ)
  trang_thai     text not null default 'cho_duyet'
                   check (trang_thai in ('cho_duyet','da_duyet','tu_choi','an')),
  ghi_chu_duyet  text,                               -- lý do từ chối / ghi chú nội bộ
  nguon          text not null default 'web',
  created_at     timestamptz not null default now(),
  duyet_at       timestamptz
);

create index if not exists can_ky_gui_trangthai_idx on public.can_ky_gui(trang_thai, created_at desc);
create index if not exists can_ky_gui_loai_idx       on public.can_ky_gui(loai);
create index if not exists can_ky_gui_tinh_idx        on public.can_ky_gui(tinh);

-- ---------------------------------------------------------------------
-- 3. RLS — khoá publishable không đọc/ghi thẳng bảng này.
--    Nộp tin qua /api/dang-ky-can, duyệt qua /api/can-admin, hiển thị công
--    khai qua /api/can-cong-khai — tất cả dùng service_role (bỏ qua RLS).
-- ---------------------------------------------------------------------
alter table public.can_ky_gui enable row level security;
-- Không tạo policy nào: RLS bật + không policy = khoá publishable bị chặn
-- hoàn toàn, chỉ service_role (Netlify Function) truy cập được.
