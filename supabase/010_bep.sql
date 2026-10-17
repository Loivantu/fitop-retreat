-- =====================================================================
-- FiTop Retreat — Khai 11 tài liệu BẾP vào bộ phận Nhà hàng · Bếp
--
-- Đã chạy trên môi trường thật ngày 14/10/2026, kết quả đọc lại được:
--   LT=18  FB=16  TONG=34
--
-- Cùng bộ phận FB với 5 quy trình nhà hàng ở 009_nhahang.sql. Cộng lại
-- đúng 16 — bằng con số dự kiến ban đầu cho bộ phận này.
--
-- Nguồn: 11 tệp .doc gốc (QTBEP-01…07 và QTPV-01…04), xử lý như các bộ
-- trước: bỏ thương hiệu cũ, ba tên người, địa chỉ lưu trữ cũ; đổi 2024 →
-- 2026; email → info@fitop.com.vn; giữ nguyên lưu đồ gốc, không chèn thêm.
--
-- Hai tài liệu không có mục Lưu đồ trong bản gốc (mở cửa Bếp, lưu trữ
-- hàng hoá) — giữ nguyên, không tự dựng thêm.
-- =====================================================================

insert into public.documents
  (ma, ten, nhom, ten_nhom, loai, mo_ta, duong_dan, dinh_dang, phien_ban, cap_do, file_goc, active)
values
  ('FT-FB-06','Quy trình đặt hàng Bếp','FB','Nhà hàng · Bếp','SOP',
   'Dự trù thực phẩm theo số khách lưu trú và thông tin tiệc, đối chiếu tồn kho, lập phiếu mua hàng',
   'FT-FB-06.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-FB-07','Quy trình mở cửa Bếp','FB','Nhà hàng · Bếp','SOP',
   'Chuẩn bị bếp sẵn sàng phục vụ: vệ sinh, thiết bị, an toàn thực phẩm và PCCC đầu ca',
   'FT-FB-07.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-FB-08','Quy trình đóng cửa Bếp','FB','Nhà hàng · Bếp','SOP',
   'Dọn vệ sinh cuối ngày, cất trữ thực phẩm, tắt thiết bị và kiểm tra an ninh – PCCC',
   'FT-FB-08.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-FB-09','Quy trình lưu trữ hàng hoá','FB','Nhà hàng · Bếp','SOP',
   'Sắp xếp kho khô, kho lạnh, nguyên tắc nhập trước xuất trước và theo dõi hạn dùng',
   'FT-FB-09.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-FB-10','Quy trình nhận Captain Order','FB','Nhà hàng · Bếp','SOP',
   'Bếp tiếp nhận phiếu gọi món từ nhà hàng, phân việc theo bộ phận và báo giờ ra món',
   'FT-FB-10.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-FB-11','Quy trình nhận hàng – nhập kho','FB','Nhà hàng · Bếp','SOP',
   'Kiểm hàng nhà cung cấp về số lượng, chất lượng, nhiệt độ, chứng từ trước khi nhập kho',
   'FT-FB-11.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-FB-12','Quy trình nhận thông tin tiệc','FB','Nhà hàng · Bếp','SOP',
   'Nhận phiếu báo tiệc, xác nhận thực đơn, số khách, giờ phục vụ và phân công chuẩn bị',
   'FT-FB-12.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-FB-13','Quy trình phục vụ A La Carte','FB','Nhà hàng · Bếp','SOP',
   'Phục vụ khách gọi món lẻ: tiếp nhận, ra món theo thứ tự, chăm sóc bàn trong bữa',
   'FT-FB-13.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-FB-14','Quy trình phục vụ buffet trưa','FB','Nhà hàng · Bếp','SOP',
   'Set up quầy, giữ nhiệt và tiếp món, kiểm soát vệ sinh và thu dọn sau ca trưa',
   'FT-FB-14.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-FB-15','Quy trình phục vụ buffet tối','FB','Nhà hàng · Bếp','SOP',
   'Set up quầy tối, bố trí món theo khu, tiếp món và xử lý thực phẩm còn dư',
   'FT-FB-15.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-FB-16','Quy trình phục vụ tiệc ngoài','FB','Nhà hàng · Bếp','SOP',
   'Tổ chức phục vụ tiệc ngoài cơ sở: vận chuyển, giữ nhiệt, dựng quầy và thu hồi dụng cụ',
   'FT-FB-16.pdf','pdf','1.0','Quản lý',false,true)

on conflict (ma) do update set
  ten = excluded.ten, nhom = excluded.nhom, ten_nhom = excluded.ten_nhom,
  loai = excluded.loai, mo_ta = excluded.mo_ta, duong_dan = excluded.duong_dan,
  dinh_dang = excluded.dinh_dang, phien_ban = excluded.phien_ban,
  cap_do = excluded.cap_do, ngay_cap_nhat = current_date, active = true;

-- Số tài liệu quảng cáo = số tài liệu thật, cho hai bộ phận đã xong.
-- Bốn bộ phận còn lại vẫn là con số kế hoạch, chưa có tài liệu nào.
update public.bo_phan
   set so_tai_lieu = (select count(*) from public.documents d
                       where d.nhom = bo_phan.ma and d.active)
 where ma in ('LT','FB');

-- Kiểm lại — đừng tin dòng Success, đọc số
select
  (select count(*) from public.documents where nhom = 'FB' and active) as nha_hang_bep,
  (select count(*) from public.documents where nhom = 'LT' and active) as le_tan_buong_phong,
  (select count(*) from public.documents where active)                 as tong_co_that,
  (select sum(so_tai_lieu) from public.bo_phan)                        as tong_dang_quang_cao,
  (select string_agg(ma || '=' || so_tai_lieu, ' · ' order by thu_tu)
     from public.bo_phan)                                              as sau_bo_phan;
