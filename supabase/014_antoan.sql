-- =====================================================================
-- FiTop Retreat — Khai 8 tài liệu AN TOÀN · PHÁP LÝ (nhóm AT)
--
-- Bộ phận cuối cùng. Sau bộ này cả sáu bộ phận đều có hàng thật, số trên
-- trang chủ bằng đúng số trong thư viện: LT=18 · FB=16 · KD=9 · NS=8 · TC=7
-- · AT=8 = 66.
--
-- QUYỀN SỬ DỤNG. Nguồn là tài liệu của bên thứ ba, chủ sở hữu FiTop xác nhận
-- có quyền trong trao đổi ngày 16/10/2026. Riêng FT-AT-05 phải hỏi lại một
-- lần nữa và được xác nhận riêng, vì nó không giống bảy tệp kia: đó là hồ sơ
-- thiết kế do hai công ty kỹ thuật lập cho chủ đầu tư, không phải tài liệu
-- vận hành. Đã gỡ tên cả bốn pháp nhân (công trình, chủ đầu tư, đơn vị thiết
-- kế kiến trúc, đơn vị tư vấn cơ điện) cùng địa chỉ, và xoá hai ảnh phối cảnh
-- toà nhà thật ra khỏi gói tệp — không chỉ xoá tham chiếu, vì để lại trong
-- gói thì vẫn bung ra xem được.
--
-- BỐN HỌ TÀI LIỆU, BỐN CÁCH XỬ LÝ. Đây là bộ hỗn tạp nhất từ trước tới nay:
--
-- 1. FT-AT-01, 02, 06, 07 — cùng họ với Lễ tân, Buồng phòng, Nhà hàng, Bếp,
--    Tài chính. Chạy doi.py như cũ. Mã tài liệu mang hậu tố "-UHMG.LK" là
--    chữ viết tắt của công ty khác, đã gỡ cho khớp bộ Lễ tân (QT.FO01).
--
-- 2. FT-AT-03, 04 — không có khung ISO, đầu trang còn trơ "Restaurant
--    Logo&name" và "COMPANY NAME Adress: Phone:". Dựng khung như bộ Kinh
--    doanh và Hành chính · Nhân sự.
--
-- 3. FT-AT-05 — 753 đoạn, 33 trang. Xử lý riêng, xem ghi chú bên dưới.
--
-- 4. FT-AT-08 — bảng tính, công cụ nội bộ của chính FiTop. Đặt file_goc =
--    true như FT-KD-09: chỉ gói cao nhất tải được tệp sửa được.
--
-- LỖI ĐÃ BẮT ĐƯỢC Ở BỘ NÀY, ĐÁNG GHI LẠI:
--
-- a. doi.py chỉ đổi email có chữ "lamori". Bốn tệp ở nhóm 1 in
--    "gopy@uhmgroup.com.vn" trong câu mời góp ý — lọt qua bộ lọc cũ. Khách
--    mua tài liệu FiTop mà gửi góp ý sang hộp thư công ty khác thì vừa hỏng
--    việc vừa lộ nguồn. Đã đổi sang lọc MỌI địa chỉ email, và đổi cả đích
--    mailto: nằm trong tệp .rels — đổi chữ mà quên đích thì bấm vào vẫn mở
--    hộp thư cũ. Đã rà lại toàn bộ 98 PDF của sáu bộ trước: 0 tệp dính.
--
-- b. FT-AT-05 in "Dự án: Thanh Nga Luxury" ở ĐẦU TRANG CHẠY, tức trên mọi
--    trang, và địa chỉ công trình ở chân trang. Hai phần đó là tệp riêng
--    trong gói, cắt phần tử ở thân tài liệu không chạm tới. Lại còn bị Word
--    cắt thành từng mẩu rời "Thanh" / " " / "Nga Luxury" nên thay theo từng
--    mẩu cũng không bắt được. Phải dựng lại hẳn hai phần đó.
--
-- c. NĂM. FT-AT-05 có khoảng 70 trích dẫn tiêu chuẩn mang năm trong số hiệu:
--    TCVN 9385:2012, QCVN 09:2013/BXD, TCXDVN 333:2005, ISO 7202:1987,
--    TCVN 2622:1995... Đổi bất kỳ số nào trong đó là bịa ra một tiêu chuẩn
--    không tồn tại, trong tài liệu kỹ thuật bán cho người đi bảo trì toà
--    nhà. Nên tệp này KHÔNG có bộ lọc năm nào cả — mốc duy nhất cần đổi là
--    "12/2019" trên bìa, mà bìa thì cắt bỏ. Bốn tệp nhóm 1 chỉ có ngày ban
--    hành 01/12/2023, đã kiểm từng chuỗi có chữ số năm trước khi chạy.
--
-- d. Bảng tính FT-AT-08 có hai dòng ví dụ chứa tên thật: người phụ trách,
--    người phối hợp, và cả tên + chức vụ + số điện thoại của người bên bán ở
--    một thương vụ. Đã thay bằng một dòng ví dụ hư cấu (NV-01, ĐM-01). Danh
--    mục còn ghi mốc năm cố định ("BCTC thuế 2022, 2021", "Kế hoạch kinh
--    doanh năm 2024") — bán năm 2026 thì danh mục đòi hồ sơ của bốn năm
--    trước, nên đổi sang quy ước N / N-1 / N-2 theo năm hiện hành.
--
-- CHỖ CÒN LỆCH, CỐ Ý GIỮ: FT-AT-06 và FT-AT-07 là việc của bộ phận kỹ thuật
-- hơn là an toàn. Giữ ở AT vì bảo trì cơ điện và điều hoà gắn với kiểm định
-- định kỳ, chống sét, PCCC — tức là tuân thủ. Nếu sau này tách bộ Kỹ thuật
-- thì chuyển hai mã này cùng FT-NS-03, FT-NS-04, FT-NS-08 sang.
-- =====================================================================

insert into public.documents
  (ma, ten, nhom, ten_nhom, loai, mo_ta, duong_dan, dinh_dang, phien_ban, cap_do, file_goc, active)
values
  ('FT-AT-01','Quy trình xử lý khách báo mất tài sản trong phòng','AT','An toàn · Pháp lý','SOP',
   'Tiếp nhận tin báo, thu thập thông tin, lập biên bản xác minh và phối hợp xử lý',
   'FT-AT-01.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-AT-02','Quy trình tuần tra tài sản','AT','An toàn · Pháp lý','SOP',
   'Tuần tra phòng khách, khu công cộng và khu kỹ thuật; nội dung kiểm tra từng khu vực',
   'FT-AT-02.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-AT-03','Quy định quản lý danh mục dụng cụ bộ phận bảo vệ','AT','An toàn · Pháp lý','SOP',
   'Định mức, giao nhận ca, bảo quản và xử lý khi mất hoặc hư hỏng dụng cụ',
   'FT-AT-03.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-AT-04','Kế hoạch huấn luyện nhân viên bảo vệ','AT','An toàn · Pháp lý','SOP',
   'Nội dung, phương pháp, thời lượng và người huấn luyện cho từng đầu việc',
   'FT-AT-04.pdf','pdf','1.0','Cơ bản',false,true),

  ('FT-AT-05','Quy trình bảo trì hệ thống cơ điện','AT','An toàn · Pháp lý','SOP',
   'Năm chương: điện, điện nhẹ, điều hoà và thông gió, cấp thoát nước, phòng cháy chữa cháy — kèm chu kỳ kiểm tra và tiêu chuẩn áp dụng',
   'FT-AT-05.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-AT-06','Quy trình bảo trì máy lạnh trung tâm','AT','An toàn · Pháp lý','SOP',
   'Chuẩn bị dụng cụ, an toàn lao động và trình tự bảo trì máy công suất 15–20 HP',
   'FT-AT-06.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-AT-07','Quy trình phối hợp buồng phòng – lễ tân – kỹ thuật trong bảo trì định kỳ phòng','AT','An toàn · Pháp lý','SOP',
   'Dự báo, lên kế hoạch, khoá phòng, bàn giao và nghiệm thu giữa ba bộ phận',
   'FT-AT-07.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-AT-08','Danh mục hồ sơ pháp lý doanh nghiệp (Excel)','AT','An toàn · Pháp lý','Biểu mẫu',
   'Bốn thẻ: hồ sơ đầu vào, hồ sơ chứng minh tài chính, chi tiết hồ sơ vay vốn và bảng theo dõi nhiều hồ sơ cùng lúc',
   'FT-AT-08.xlsx','xlsx','1.0','Quản lý',true,true)

on conflict (ma) do update set
  ten = excluded.ten, nhom = excluded.nhom, ten_nhom = excluded.ten_nhom,
  loai = excluded.loai, mo_ta = excluded.mo_ta, duong_dan = excluded.duong_dan,
  dinh_dang = excluded.dinh_dang, phien_ban = excluded.phien_ban,
  cap_do = excluded.cap_do, file_goc = excluded.file_goc,
  ngay_cap_nhat = current_date, active = true;

update public.bo_phan
   set so_tai_lieu = (select count(*) from public.documents d
                       where d.nhom = bo_phan.ma and d.active)
 where ma in ('LT', 'FB', 'KD', 'NS', 'TC', 'AT');

-- Kiểm lại — đừng tin dòng Success, đọc số
select
  (select count(*) from public.documents where nhom = 'AT' and active)  as an_toan_phap_ly,
  (select count(*) from public.documents where active)                  as tong_co_that,
  (select count(*) from public.documents where file_goc)                as chi_goi_cao_nhat_tai_duoc,
  (select sum(so_tai_lieu) from public.bo_phan)                         as tong_dang_quang_cao,
  (select string_agg(ma || '=' || so_tai_lieu, ' · ' order by thu_tu)
     from public.bo_phan)                                               as sau_bo_phan,
  (select count(*) from storage.objects o where o.bucket_id = 'tailieu'
     and not exists (select 1 from public.documents d
                      where d.duong_dan = o.name))                      as tep_mo_coi,
  (select count(*) from public.documents d where not exists
     (select 1 from storage.objects o where o.bucket_id = 'tailieu'
        and o.name = d.duong_dan))                                      as khai_ma_khong_co_tep;
