-- =====================================================================
-- FiTop Retreat — Khai 9 tài liệu KINH DOANH · MARKETING (nhóm KD)
--
-- Đã chạy trên môi trường thật ngày 15/10/2026, kết quả đọc lại được:
--   KD=9  TONG=43  (LT=18 · FB=16 · KD=9)
--
-- Bộ này KHÁC ba bộ trước và cần nói rõ, vì sau này mở ra sẽ thắc mắc:
--
-- 1. Nguồn hỗn hợp. Bảy tệp mang logo nhúng của South Entertainment
--    Corporation – Asiana Plaza, một tệp còn mang thêm logo Ngọc Sương Bến
--    Thuyền và nhắc "tiêu chuẩn Asiana Plaza" trong phần nhiệm vụ. Chủ sở hữu
--    FiTop đã xác nhận có quyền sử dụng và bán lại trước khi xử lý. Mọi logo,
--    tên công ty và địa chỉ cũ đã gỡ; tên cơ sở trong câu văn thay bằng chữ
--    trung tính "cơ sở" để tài liệu dùng được cho nhiều nơi.
--
-- 2. Không tệp nào sẵn khung ISO. Ba bộ trước chỉ cần vá; bộ này phải dựng
--    đầu trang, khối ba chữ ký và đuôi Nhóm cộng tác hoàn toàn mới. Cách làm:
--    GIỮ NGUYÊN thân tài liệu gốc rồi cắt đầu cũ lắp đầu FiTop. Không rót nội
--    dung sang tài liệu khác — lưu đồ ở bộ này vẽ bằng khối của Word, chép
--    sang là các khối chồng lên nhau và số thứ tự tự động nhảy loạn.
--
-- 3. Đầu trang chạy của bản gốc (mã QT-KD, ngày 2017, có tệp còn trơ dòng
--    "COMPANY NAME Adress: Phone:") đã dọn sạch — 34 tài liệu của ba bộ trước
--    cũng không có đầu trang chạy.
--
-- 4. FT-KD-09 là tệp Excel SỬA ĐƯỢC nên đặt file_goc = true: chỉ gói usb-goc
--    tải được. Để false thì gói 250.000đ cũng có tệp sửa được, phá thang giá.
--
-- Lỗi còn lại của bản gốc, cố ý giữ nguyên vì chưa rõ ánh xạ đúng: thân
-- FT-KD-02 còn câu "Xin tham khảo thêm các quy trình: QT-KD-01, QT-KD-03,
-- QT-KD-04" trỏ sang hệ mã cũ. Ba tệp gốc 03/05/06 vốn dùng chung một mã
-- QT-KD-01 — mã FiTop mới đã tách đúng.
-- =====================================================================

insert into public.documents
  (ma, ten, nhom, ten_nhom, loai, mo_ta, duong_dan, dinh_dang, phien_ban, cap_do, file_goc, active)
values
  ('FT-KD-01','Quy định bộ phận Kinh doanh','KD','Kinh doanh · Marketing','SOP',
   'Giờ giấc, đồng phục, tác phong, sử dụng điện thoại và kỷ luật của bộ phận kinh doanh',
   'FT-KD-01.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-KD-02','Quy trình marketing và phát triển kinh doanh','KD','Kinh doanh · Marketing','SOP',
   'Quảng cáo, khuyến mãi, chào hàng trực tiếp, quan hệ công chúng và đo hiệu quả',
   'FT-KD-02.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-KD-03','Quy trình xác nhận báo cáo bán hàng','KD','Kinh doanh · Marketing','SOP',
   'Lập, đối chiếu và xác nhận báo cáo bán hàng hằng ngày của bộ phận',
   'FT-KD-03.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-KD-04','Mô tả công việc nhân viên kinh doanh – chăm sóc khách hàng','KD','Kinh doanh · Marketing','SOP',
   'Mục tiêu, nhiệm vụ, mối quan hệ công việc và yêu cầu năng lực của vị trí',
   'FT-KD-04.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-KD-05','Quy trình bán hàng','KD','Kinh doanh · Marketing','SOP',
   'Tiếp cận, làm quen, lấy thông tin, chào bán và theo đuổi khách hàng tiềm năng',
   'FT-KD-05.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-KD-06','Quy trình nhận tiệc','KD','Kinh doanh · Marketing','SOP',
   'Tiếp nhận thông tin đặt tiệc, báo giá, xác nhận và chuyển thông tin cho các bộ phận',
   'FT-KD-06.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-KD-07','Nội quy bộ phận Kinh doanh – chăm sóc khách hàng','KD','Kinh doanh · Marketing','SOP',
   'Tác phong, bảo mật thông tin khách hàng và các hình thức kỷ luật',
   'FT-KD-07.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-KD-08','Quy trình sale chuyên nghiệp','KD','Kinh doanh · Marketing','SOP',
   'Chuẩn đón khách, tư vấn, chốt dịch vụ và chăm sóc sau bán theo từng bước',
   'FT-KD-08.pdf','pdf','1.0','Nâng cao',false,true),

  -- Dựng từ bộ slide kế hoạch kinh doanh của chủ sở hữu, nhưng là BẢN TRỐNG:
  -- giữ bố cục và công thức, bỏ sạch số liệu thật và tên cơ sở.
  ('FT-KD-09','Mẫu kế hoạch kinh doanh năm (Excel)','KD','Kinh doanh · Marketing','Biểu mẫu',
   'Bảng tính trống: doanh thu – giá vốn – lợi nhuận gộp 12 tháng và công suất phòng, tự tính bằng công thức',
   'FT-KD-09.xlsx','xlsx','1.0','Quản lý',true,true)

on conflict (ma) do update set
  ten = excluded.ten, nhom = excluded.nhom, ten_nhom = excluded.ten_nhom,
  loai = excluded.loai, mo_ta = excluded.mo_ta, duong_dan = excluded.duong_dan,
  dinh_dang = excluded.dinh_dang, phien_ban = excluded.phien_ban,
  cap_do = excluded.cap_do, file_goc = excluded.file_goc,
  ngay_cap_nhat = current_date, active = true;

-- Số quảng cáo = số thật, cho các bộ phận đã có tài liệu
update public.bo_phan
   set so_tai_lieu = (select count(*) from public.documents d
                       where d.nhom = bo_phan.ma and d.active)
 where ma in ('LT', 'FB', 'KD');

-- Kiểm lại — đừng tin dòng Success, đọc số
select
  (select count(*) from public.documents where nhom = 'KD' and active) as kinh_doanh_marketing,
  (select count(*) from public.documents where active)                 as tong_co_that,
  (select count(*) from public.documents where file_goc)               as chi_goi_cao_nhat_tai_duoc,
  (select sum(so_tai_lieu) from public.bo_phan)                        as tong_dang_quang_cao,
  (select string_agg(ma || '=' || so_tai_lieu, ' · ' order by thu_tu)
     from public.bo_phan)                                              as sau_bo_phan;
