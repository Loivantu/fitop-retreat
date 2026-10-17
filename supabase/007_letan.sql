-- =====================================================================
-- Khai 11 tài liệu bộ phận Lễ tân vào danh mục.
-- Chạy SAU khi 11 tệp PDF đã nằm trong kho riêng tư `tailieu`.
--
-- phien_ban = '1.0' có chủ ý: đây là bản dựng từ file Word gốc, đã gỡ
-- thương hiệu cũ và tên người biên soạn.
-- Không có lệnh xoá nên SQL Editor không chặn.
-- =====================================================================

insert into public.documents
  (ma, ten, nhom, ten_nhom, loai, mo_ta, duong_dan, dinh_dang, phien_ban, cap_do, file_goc, active)
values
  ('FT-LT-01', 'Quy trình nhận đặt phòng', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Nhận đặt phòng trực tiếp, qua điện thoại, email, fax',
   'FT-LT-01.pdf', 'pdf', '1.0', 'Cơ bản', false, true),
  ('FT-LT-02', 'Quy trình nhận đặt phòng danh sách chờ (Waiting list)', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Hết phòng thì ghi danh sách chờ, thứ tự ưu tiên, thông báo khách',
   'FT-LT-02.pdf', 'pdf', '1.0', 'Cơ bản', false, true),
  ('FT-LT-03', 'Quy trình điều chỉnh đặt phòng', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Đổi ngày, đổi hạng phòng, huỷ một phần, xác nhận lại với khách',
   'FT-LT-03.pdf', 'pdf', '1.0', 'Cơ bản', false, true),
  ('FT-LT-04', 'Quy trình làm thủ tục check in đoàn', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Chuẩn bị trước khi đoàn tới, chia phòng, bàn giao trưởng đoàn',
   'FT-LT-04.pdf', 'pdf', '1.0', 'Quản lý', false, true),
  ('FT-LT-05', 'Quy trình khách trả phòng', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Kiểm phòng, chốt phát sinh, thanh toán và tiễn khách',
   'FT-LT-05.pdf', 'pdf', '1.0', 'Cơ bản', false, true),
  ('FT-LT-06', 'Quy trình check out đoàn', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Chốt hoá đơn đoàn, kiểm phòng hàng loạt, bàn giao hành lý',
   'FT-LT-06.pdf', 'pdf', '1.0', 'Quản lý', false, true),
  ('FT-LT-07', 'Quy trình xử lý các góp ý của khách', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Tiếp nhận phàn nàn, phân cấp xử lý, báo cáo và theo dõi khắc phục',
   'FT-LT-07.pdf', 'pdf', '1.0', 'Quản lý', false, true),
  ('FT-LT-08', 'Quy trình tiếp nhận và xử lý khi khách báo mất tài sản', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Lập biên bản, phối hợp an ninh, trích xuất camera, làm việc với khách',
   'FT-LT-08.pdf', 'pdf', '1.0', 'Quản lý', false, true),
  ('FT-LT-09', 'Quy trình khách thanh toán bằng tiền mặt khi check out', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Thu tiền mặt và ngoại tệ, kiểm đếm, ghi sổ quỹ, bàn giao ca',
   'FT-LT-09.pdf', 'pdf', '1.0', 'Cơ bản', false, true),
  ('FT-LT-10', 'Quy trình khách thanh toán bằng thẻ tín dụng khi check out', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Quẹt thẻ, xử lý giao dịch lỗi, lưu chứng từ, đối soát cuối ca',
   'FT-LT-10.pdf', 'pdf', '1.0', 'Cơ bản', false, true),
  ('FT-LT-11', 'Quy trình làm thủ tục check in khách lẻ có booking', 'LT', 'Lễ tân · Buồng phòng', 'SOP', 'Đón khách lẻ đã đặt trước: xác minh, giấy tờ, giao phòng',
   'FT-LT-11.pdf', 'pdf', '1.0', 'Cơ bản', false, true)
on conflict (ma) do update set
  ten = excluded.ten, nhom = excluded.nhom, ten_nhom = excluded.ten_nhom,
  loai = excluded.loai, mo_ta = excluded.mo_ta, duong_dan = excluded.duong_dan,
  dinh_dang = excluded.dinh_dang, phien_ban = excluded.phien_ban,
  cap_do = excluded.cap_do, ngay_cap_nhat = current_date, active = true;

-- Kiểm lại — đọc số, đừng tin dòng Success
select
  (select count(*) from public.documents where nhom = 'LT' and active) as tai_lieu_le_tan,
  (select count(*) from public.documents)                              as tong_tai_lieu,
  (select count(*) from public.goi_nhom where nhom = 'LT')             as so_goi_xem_duoc;
