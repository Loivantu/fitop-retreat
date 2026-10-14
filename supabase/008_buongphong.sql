-- =====================================================================
-- FiTop Retreat — Khai 7 tài liệu BUỒNG PHÒNG (QT.BP01–BP07) vào thư viện
--
-- Đã chạy trên môi trường thật ngày 14/10/2026, kết quả đọc lại được:
--   LT=18  TONG=18  CAPDO=Cơ bản/Quản lý
--
-- Nguồn: 7 tệp .doc gốc của chủ sở hữu, đã qua xử lý:
--   · bỏ tên thương hiệu cũ và tên ba người biên soạn/phê duyệt
--   · bỏ chữ ký quét của người thứ ba
--   · đổi mọi mốc năm 2023–2025 sang 2026, email liên hệ → info@fitop.com.vn
--   · vẽ lại lưu đồ (WMF gốc bị LibreOffice bỏ) và dựng lại theo mẫu FiTop
--
-- File PDF đóng dấu mờ nằm trong bucket riêng `tailieu`, tên FT-LT-12.pdf …
-- FT-LT-18.pdf. Bảng này KHÔNG bao giờ trả duong_dan ra ngoài — khách tải
-- qua /api/tai-file, đi qua ba cửa: token → trần thiết bị → duoc_tai().
--
-- Chạy lại nhiều lần không sao (on conflict do update).
-- =====================================================================

insert into public.documents
  (ma, ten, nhom, ten_nhom, loai, mo_ta, duong_dan, dinh_dang, phien_ban, cap_do, file_goc, active)
values
  ('FT-LT-12','Quy trình chuyển giao hoá đơn, cấp phát và bổ sung minibar',
   'LT','Lễ tân · Buồng phòng','SOP',
   'Giao nhận hoá đơn minibar, cấp phát và bổ sung hàng theo định mức',
   'FT-LT-12.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-LT-13','Quy trình giao nhận giặt ủi',
   'LT','Lễ tân · Buồng phòng','SOP',
   'Nhận đồ giặt của khách và của cơ sở, ghi phiếu, đối chiếu khi trả',
   'FT-LT-13.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-LT-14','Quy trình giặt ủi',
   'LT','Lễ tân · Buồng phòng','SOP',
   'Phân loại, xử lý vết bẩn, giặt sấy, là gấp và lưu kho đồ vải',
   'FT-LT-14.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-LT-15','Quy trình xử lý vật dụng thất lạc (Lost and Found)',
   'LT','Lễ tân · Buồng phòng','SOP',
   'Tiếp nhận, ghi sổ, lưu giữ theo thời hạn và trả lại đồ khách bỏ quên',
   'FT-LT-15.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-LT-16','Quy trình phối hợp giữa Buồng phòng – Lễ tân – Kỹ thuật',
   'LT','Lễ tân · Buồng phòng','SOP',
   'Báo và nhận trạng thái phòng, chuyển việc sửa chữa, xác nhận phòng sẵn sàng',
   'FT-LT-16.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-LT-17','Quy trình thực hiện các công việc chuẩn bị làm phòng',
   'LT','Lễ tân · Buồng phòng','SOP',
   'Chuẩn bị xe đẩy, hoá chất, đồ vải và vật tư trước khi vào ca dọn phòng',
   'FT-LT-17.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-LT-18','Quy trình vào phòng khách khi khách lên tiếng',
   'LT','Lễ tân · Buồng phòng','SOP',
   'Gõ cửa, xưng danh, xử lý tình huống khách đang ở trong phòng',
   'FT-LT-18.pdf','pdf','1.0','Cơ bản',false,true)

on conflict (ma) do update set
  ten = excluded.ten, nhom = excluded.nhom, ten_nhom = excluded.ten_nhom,
  loai = excluded.loai, mo_ta = excluded.mo_ta, duong_dan = excluded.duong_dan,
  dinh_dang = excluded.dinh_dang, phien_ban = excluded.phien_ban,
  cap_do = excluded.cap_do, ngay_cap_nhat = current_date, active = true;

-- Số tài liệu thật của bộ phận Lễ tân · Buồng phòng: 11 + 7 = 18
update public.bo_phan set so_tai_lieu = 18 where ma = 'LT';

-- Kiểm lại — đừng tin dòng Success, đọc số
select
  (select count(*) from public.documents where nhom = 'LT' and active) as le_tan_buong_phong,
  (select count(*) from public.documents where active)                 as tong_dang_ban,
  (select string_agg(distinct phien_ban, '/') from public.documents)   as phien_ban,
  (select string_agg(ma || '=' || so_tai_lieu, ' · ' order by thu_tu)
     from public.bo_phan)                                              as ke_hoach_6_bo_phan;

-- ---------------------------------------------------------------------
-- Bổ sung 14/10/2026 — sửa lỗi lưu đồ in hai lần
--
-- Bản 1.0 của 18 tài liệu Lễ tân · Buồng phòng bị chèn thêm một lưu đồ,
-- trong khi lưu đồ gốc vẫn in ra bình thường — thành ra mỗi tài liệu có hai
-- lưu đồ giống nhau. Bản 1.1 dựng lại, bỏ hẳn bước chèn.
--
-- Supabase Storage không ghi đè file trùng tên (nó đẻ ra bản "(1)"), nên bản
-- 1.1 nạp dưới tên FT-LT-xx-v2.pdf. 18 file 1.0 cũ thành file mồ côi, dọn sau
-- khi chủ sở hữu đồng ý.
-- ---------------------------------------------------------------------
update public.documents
   set duong_dan = ma || '-v2.pdf', phien_ban = '1.1', ngay_cap_nhat = current_date
 where nhom = 'LT' and duong_dan not like '%-v2.pdf';
