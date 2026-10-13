-- =====================================================================
-- Dọn cấu trúc nhóm cũ (I–X, A–G) sau khi 006_bophan.sql đã chạy xong.
--
-- CHẠY RIÊNG, KHÔNG GỘP VÀO 006. SQL Editor của Supabase chặn ngầm cả tệp
-- nếu trong đó có 'delete' — màn hình vẫn báo Success mà không có gì chạy.
-- Chạy tệp này một mình, bấm xác nhận khi Supabase hỏi, rồi đọc số ở cuối.
-- =====================================================================

-- 1. Bỏ phân quyền theo nhóm La Mã và nhóm chữ cái
delete from public.goi_nhom
 where nhom ~ '^(I|II|III|IV|V|VI|VII|VIII|IX|X|A|B|C|D|E|F|G)$';

-- 2. Bỏ các hạng gói cũ không còn bán
delete from public.goi_nhom  where goi in ('online','usb','cuulo','nam');
delete from public.goi_quyen where goi in ('online','usb','cuulo','nam');

-- 3. Bỏ quyền kiểm thử và tài liệu kiểm thử
delete from public.entitlements where goi in ('online','usb','cuulo','nam');
delete from public.documents    where ma = 'FT-TEST-01';

-- 4. Kiểm lại
select
  (select count(*) from public.goi_nhom)      as con_lai_phan_quyen,
  (select count(*) from public.goi_quyen)     as con_lai_goi,
  (select count(*) from public.entitlements)  as con_lai_quyen_khach,
  (select count(*) from public.documents)     as con_lai_tai_lieu,
  (select string_agg(distinct goi, ', ' order by goi) from public.goi_nhom) as cac_goi;
