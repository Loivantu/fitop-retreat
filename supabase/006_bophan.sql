-- =====================================================================
-- FiTop Retreat — Xếp lại thư viện theo 6 BỘ PHẬN (thay cho nhóm I–X)
-- Chạy SAU 005_tailieu.sql. Chạy lại nhiều lần không sao.
--
-- Vì sao đổi: catalog thật trên web chia theo bộ phận, không theo số La Mã.
--   LT Lễ tân · Buồng phòng      12 tài liệu
--   FB Nhà hàng · Bếp            16
--   KD Kinh doanh · Marketing    10
--   NS Nhân sự · Đào tạo          9
--   TC Tài chính · Kiểm soát     11
--   AT An toàn · Pháp lý          8
--   -------------------------------
--                        tổng    66
--
-- Thang giá chốt 13/10/2026:
--   bo-XX      250.000đ   một bộ phận, PDF đóng dấu mờ
--   tron     1.290.000đ   cả 6 bộ phận (rẻ hơn mua lẻ 210.000đ)
--   usb-goc  1.890.000đ   trọn bộ + file gốc Word/Excel sửa được
--
-- File gốc sửa được CHỈ nằm ở gói cao nhất. File sửa được là file bị
-- chia sẻ nhiều nhất, nên nó phải là thứ đắt nhất.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. documents — thêm cấp độ, vì web quảng cáo "Cơ bản → Quản lý"
-- ---------------------------------------------------------------------
alter table public.documents
  add column if not exists cap_do text default 'Cơ bản';

comment on column public.documents.cap_do is
  'Cơ bản | Nâng cao | Quản lý — hiện trên thẻ tài liệu, không ảnh hưởng quyền xem.';

-- ---------------------------------------------------------------------
-- 2. Tên 6 bộ phận — để khai documents cho đúng, khỏi gõ sai
-- ---------------------------------------------------------------------
create table if not exists public.bo_phan (
  ma       text primary key,              -- LT | FB | KD | NS | TC | AT
  ten      text not null,
  ten_en   text,
  so_tai_lieu int,                        -- số tài liệu dự kiến, để đối chiếu
  thu_tu   int not null default 0
);

insert into public.bo_phan (ma, ten, ten_en, so_tai_lieu, thu_tu) values
  ('LT','Lễ tân · Buồng phòng',    'Front Office & Housekeeping', 12, 1),
  ('FB','Nhà hàng · Bếp',          'F&B Service & Kitchen',       16, 2),
  ('KD','Kinh doanh · Marketing',  'Sales & Marketing',           10, 3),
  ('NS','Nhân sự · Đào tạo',       'HR & Training',                9, 4),
  ('TC','Tài chính · Kiểm soát',   'Finance & Control',           11, 5),
  ('AT','An toàn · Pháp lý',       'Safety & Compliance',          8, 6)
on conflict (ma) do update
  set ten = excluded.ten, ten_en = excluded.ten_en,
      so_tai_lieu = excluded.so_tai_lieu, thu_tu = excluded.thu_tu;

alter table public.bo_phan enable row level security;
-- Không policy nào: khách đọc qua /api, không đọc thẳng bảng.

-- ---------------------------------------------------------------------
-- 3. goi_quyen — ba hạng gói
--    so_thiet_bi: gói càng đắt càng nhiều máy, vì cơ sở lớn nhiều người dùng
-- ---------------------------------------------------------------------
insert into public.goi_quyen (goi, duoc_file_goc, so_thiet_bi) values
  ('bo-LT',   false, 2),
  ('bo-FB',   false, 2),
  ('bo-KD',   false, 2),
  ('bo-NS',   false, 2),
  ('bo-TC',   false, 2),
  ('bo-AT',   false, 2),
  ('tron',    false, 3),
  ('usb-goc', true,  5)
on conflict (goi) do update
  set duoc_file_goc = excluded.duoc_file_goc,
      so_thiet_bi   = excluded.so_thiet_bi;

-- ---------------------------------------------------------------------
-- 4. goi_nhom — gói nào xem được bộ phận nào
-- ---------------------------------------------------------------------
insert into public.goi_nhom (goi, nhom) values
  ('bo-LT','LT'), ('bo-FB','FB'), ('bo-KD','KD'),
  ('bo-NS','NS'), ('bo-TC','TC'), ('bo-AT','AT'),
  ('tron','LT'), ('tron','FB'), ('tron','KD'),
  ('tron','NS'), ('tron','TC'), ('tron','AT'),
  ('usb-goc','LT'), ('usb-goc','FB'), ('usb-goc','KD'),
  ('usb-goc','NS'), ('usb-goc','TC'), ('usb-goc','AT')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 5. commission_rates — thiếu dòng là CTV bị ghi hoa hồng 0đ mà không báo lỗi
-- ---------------------------------------------------------------------
insert into public.commission_rates (package, rate, note) values
  ('bo-LT',   0.40, 'Một bộ phận — trần 40%'),
  ('bo-FB',   0.40, 'Một bộ phận — trần 40%'),
  ('bo-KD',   0.40, 'Một bộ phận — trần 40%'),
  ('bo-NS',   0.40, 'Một bộ phận — trần 40%'),
  ('bo-TC',   0.40, 'Một bộ phận — trần 40%'),
  ('bo-AT',   0.40, 'Một bộ phận — trần 40%'),
  ('tron',    0.35, 'Trọn thư viện 1.290k — 35%'),
  ('usb-goc', 0.30, 'USB bản gốc 1.890k — 30%, trừ giá vốn USB và vận chuyển')
on conflict (package) do update
  set rate = excluded.rate, note = excluded.note;

-- ---------------------------------------------------------------------
-- 6. Kiểm lại — đừng tin dòng Success, đọc số
-- ---------------------------------------------------------------------
select
  (select count(*) from public.bo_phan)                              as so_bo_phan,
  (select sum(so_tai_lieu) from public.bo_phan)                      as tong_tai_lieu_du_kien,
  (select count(*) from public.goi_quyen  where goi like 'bo-%'
                                              or goi in ('tron','usb-goc')) as so_goi_moi,
  (select count(*) from public.goi_nhom   where goi like 'bo-%'
                                              or goi in ('tron','usb-goc')) as so_dong_phan_quyen,
  (select count(*) from public.commission_rates
     where package like 'bo-%' or package in ('tron','usb-goc'))     as so_bac_hoa_hong,
  (select count(*) from public.orders where status = 'paid')         as don_da_thanh_toan_cu;
