-- =====================================================================
-- FiTop Retreat — Khai 5 tài liệu NHÀ HÀNG (QT.NH01–NH05) vào thư viện
--
-- Đã chạy trên môi trường thật ngày 14/10/2026, kết quả đọc lại được:
--   LT=18  FB=5  TONG=23  (18 hàng LT đều đã trỏ sang tệp -v2)
--
-- Nguồn: 5 tệp .doc gốc của chủ sở hữu, xử lý như hai bộ trước:
--   · bỏ tên thương hiệu cũ, tên ba người soạn/xem xét/phê duyệt và địa chỉ
--     lưu trữ cũ ở Thanh Hoá
--   · đổi mốc năm 2024 sang 2026, email liên hệ → info@fitop.com.vn
--   · GIỮ NGUYÊN cặp lưu đồ song ngữ Việt–Anh của bản gốc, không chèn thêm
--
-- Bộ này khác hai bộ trước: lưu đồ gốc nằm sẵn dạng PNG và in ra bình thường.
-- Chèn thêm là ra hai lưu đồ giống nhau — đúng lỗi đã mắc ở bản 1.0 của LT.
-- =====================================================================

insert into public.documents
  (ma, ten, nhom, ten_nhom, loai, mo_ta, duong_dan, dinh_dang, phien_ban, cap_do, file_goc, active)
values
  ('FT-FB-01','Quy trình lấy order',
   'FB','Nhà hàng · Bếp','SOP',
   'Chào đón khách, trình menu, ghi nhận và xác nhận lại yêu cầu món với khách',
   'FT-FB-01.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-FB-02','Quy trình thanh toán hoá đơn trong nhà hàng',
   'FB','Nhà hàng · Bếp','SOP',
   'Tính tiền, xuất hoá đơn VAT, thu tiền mặt hoặc thẻ và trả lại khách',
   'FT-FB-02.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-FB-03','Quy trình phối hợp giữa nhà hàng và bếp (trước tiệc)',
   'FB','Nhà hàng · Bếp','SOP',
   'Nhận thực đơn, báo số khách, chuẩn bị dụng cụ và canh giờ ra món',
   'FT-FB-03.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-FB-04','Quy trình phối hợp giữa nhà hàng và bếp (trong tiệc)',
   'FB','Nhà hàng · Bếp','SOP',
   'Nhịp ra món, xử lý phát sinh và đổi món khi tiệc đang diễn ra',
   'FT-FB-04.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-FB-05','Quy trình thu thập và xử lý thông tin, than phiền của khách',
   'FB','Nhà hàng · Bếp','SOP',
   'Ghi nhận góp ý, phân loại mức độ, xử lý tại chỗ và báo cáo lên trên',
   'FT-FB-05.pdf','pdf','1.0','Quản lý',false,true)

on conflict (ma) do update set
  ten = excluded.ten, nhom = excluded.nhom, ten_nhom = excluded.ten_nhom,
  loai = excluded.loai, mo_ta = excluded.mo_ta, duong_dan = excluded.duong_dan,
  dinh_dang = excluded.dinh_dang, phien_ban = excluded.phien_ban,
  cap_do = excluded.cap_do, ngay_cap_nhat = current_date, active = true;

-- Số tài liệu THẬT của bộ phận Nhà hàng · Bếp. Kế hoạch ban đầu là 16;
-- để nguyên 16 là trang bán hàng hứa 11 tài liệu chưa tồn tại.
update public.bo_phan set so_tai_lieu = 5 where ma = 'FB';

-- Kiểm lại — đừng tin dòng Success, đọc số
select
  (select count(*) from public.documents where nhom = 'FB' and active)  as nha_hang_bep,
  (select count(*) from public.documents where nhom = 'LT' and active)  as le_tan_buong_phong,
  (select count(*) from public.documents where active)                  as tong_dang_ban,
  (select count(*) from public.documents
     where nhom = 'LT' and duong_dan like '%-v2.pdf')                    as lt_da_sang_ban_1_1,
  (select string_agg(ma || '=' || so_tai_lieu, ' · ' order by thu_tu)
     from public.bo_phan)                                               as ke_hoach_6_bo_phan;
