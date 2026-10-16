-- =====================================================================
-- FiTop Retreat — Khai 8 quy trình HÀNH CHÍNH · NHÂN SỰ (nhóm NS)
--
-- Đã chạy trên môi trường thật ngày 15/10/2026, kết quả đọc lại được:
--   NS=8  TONG=51  (LT=18 · FB=16 · KD=9 · NS=8)
--
-- QUYỀN SỬ DỤNG. Tám tệp gốc mang logo nhúng và tên THANH NGA LUXURY —
-- một cơ sở thứ ba, không phải tài liệu của chính chủ sở hữu FiTop. Chủ sở
-- hữu đã xác nhận bằng văn bản trong trao đổi ngày 16/10/2026: "tôi xác nhận
-- là có quyền". Ghi vào đây vì sau này mở hồ sơ ra sẽ thắc mắc, giống dòng
-- xác nhận bộ Asiana ở 011_kinhdoanh.sql. Toàn bộ logo, tên thương hiệu và
-- địa chỉ cũ đã gỡ; tên cơ sở trong câu văn thay bằng chữ trung tính
-- "cơ sở" để tài liệu dùng được cho nhiều nơi.
--
-- ĐỔI Ý GIỮA ĐƯỜNG. Ban đầu bộ này định dựng từ 14 BIỂU MẪU trống (phiếu
-- yêu cầu tuyển dụng, phiếu phỏng vấn, danh sách thử việc...). Chủ sở hữu
-- bỏ hướng đó, thay bằng 8 QUY TRÌNH. 14 biểu mẫu đã làm sạch nhận diện
-- nhưng KHÔNG khai bán — còn trong /home/claude/ns/ra nếu muốn dùng nội bộ.
-- Trước khi dùng phải cắt các trường nhạy cảm ở phiếu thông tin ứng viên:
-- tôn giáo, tình trạng hôn nhân, số CMND, số BHXH và thông tin thân nhân.
--
-- NĂM TRONG CÂU VĂN — chỗ dễ sai nhất của bộ này. Quy trình kiểm soát
-- phòng cháy chữa cháy trích dẫn "Luật Phòng cháy và chữa cháy ... thông qua
-- ngày 29 tháng 6 năm 2001". Bộ lọc năm dùng cho bốn bộ trước sẽ biến 2001
-- thành 2026 và tạo ra một câu sai về pháp luật. Nên dung_hc.py CHỈ đổi ngày
-- dạng dd/mm/yyyy — tức ngày ban hành tài liệu — và không đụng tới năm trong
-- câu văn. Đã rà toàn bộ tài liệu đang bán: 10 trích dẫn pháp lý và tiêu
-- chuẩn, không cái nào bị đổi năm.
--
-- MÃ CHÉO. Hai tham chiếu QT-HC-01 và QT-HC-02 trong câu văn ánh xạ sang
-- FT-NS-01 và FT-NS-02 — chắc chắn vì câu văn gọi đúng tên tài liệu đích.
-- Các mã QT khác để nguyên: đánh số của bản gốc không đáng tin, có hai tệp
-- cùng mang mã QT-HC-03.
--
-- NS03, NS04, NS08 NẰM SAI CHỖ. Kiểm soát máy móc thiết bị, kiểm soát thiết
-- bị đo lường và kiểm soát phòng cháy chữa cháy là việc của An toàn · Pháp
-- lý, không phải Nhân sự. Giữ ở NS vì bản gốc xếp chung bộ Hành chính và vì
-- AT chưa có tài liệu nào. Khi dựng bộ AT thì chuyển ba mã này sang.
--
-- Khối insert dưới đây dựng lại để chạy được trên môi trường mới. Tám dòng
-- thật đã khai trực tiếp trong SQL Editor, câu chữ phần mô tả có thể khác,
-- nên để "do nothing" — tệp lưu vết không được ghi đè bản đang chạy.
-- =====================================================================

insert into public.documents
  (ma, ten, nhom, ten_nhom, loai, mo_ta, duong_dan, dinh_dang, phien_ban, cap_do, file_goc, active)
values
  ('FT-NS-01','Quy trình tuyển dụng và đào tạo','NS','Hành chính · Nhân sự','SOP',
   'Xác định nhu cầu, tuyển chọn, thử việc và đào tạo nhân viên mới',
   'FT-NS-01.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-NS-02','Quy trình đánh giá nhân sự','NS','Hành chính · Nhân sự','SOP',
   'Tiêu chí, kỳ đánh giá, trình tự xét và lưu hồ sơ kết quả',
   'FT-NS-02.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-NS-03','Quy trình kiểm soát máy móc, thiết bị và dụng cụ','NS','Hành chính · Nhân sự','SOP',
   'Lập danh mục, bảo trì định kỳ, sửa chữa và thanh lý máy móc thiết bị',
   'FT-NS-03.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-NS-04','Quy trình kiểm soát thiết bị đo lường và kiểm tra','NS','Hành chính · Nhân sự','SOP',
   'Hiệu chuẩn, kiểm định và theo dõi tình trạng thiết bị đo lường',
   'FT-NS-04.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-NS-05','Quy trình quản lý IT và mạng thông tin','NS','Hành chính · Nhân sự','SOP',
   'Cấp quyền truy cập, sao lưu dữ liệu, bảo mật và xử lý sự cố hệ thống',
   'FT-NS-05.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-NS-06','Quy trình quản lý công văn, bưu phẩm đến và đi','NS','Hành chính · Nhân sự','SOP',
   'Tiếp nhận, vào sổ, phân phối, phát hành và lưu trữ văn thư',
   'FT-NS-06.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-NS-07','Quy trình mua sắm và sử dụng thiết bị văn phòng','NS','Hành chính · Nhân sự','SOP',
   'Đề nghị, duyệt, mua sắm, cấp phát và quản lý thiết bị văn phòng',
   'FT-NS-07.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-NS-08','Quy trình kiểm soát phòng cháy chữa cháy','NS','Hành chính · Nhân sự','SOP',
   'Phương án phòng cháy, kiểm tra thiết bị, huấn luyện và xử lý khi có cháy',
   'FT-NS-08.pdf','pdf','1.0','Quản lý',false,true)

on conflict (ma) do nothing;

update public.bo_phan
   set so_tai_lieu = (select count(*) from public.documents d
                       where d.nhom = bo_phan.ma and d.active)
 where ma in ('LT', 'FB', 'KD', 'NS');

-- Kiểm lại — đừng tin dòng Success, đọc số
select
  (select count(*) from public.documents where nhom = 'NS' and active) as hanh_chinh_nhan_su,
  (select count(*) from public.documents where active)                 as tong_co_that,
  (select sum(so_tai_lieu) from public.bo_phan)                        as tong_dang_quang_cao,
  (select string_agg(ma || '=' || so_tai_lieu, ' · ' order by thu_tu)
     from public.bo_phan)                                              as sau_bo_phan;
