-- =====================================================================
-- FiTop Retreat — Khai 7 quy trình TÀI CHÍNH · KIỂM SOÁT (nhóm TC)
--
-- Đã chạy trên môi trường thật ngày 16/10/2026, kết quả đọc lại được:
--   TC=7  TONG=58  (LT=18 · FB=16 · KD=9 · NS=8 · TC=7)
--
-- Nguồn: 7 tệp .doc của chính chủ sở hữu — cùng họ với ba bộ Lễ tân, Buồng
-- phòng, Nhà hàng và Bếp (khung ISO sẵn, khối ba chữ ký, mã QT.KT). Xử lý
-- bằng đúng công cụ của các bộ đó: gỡ logo cũ, gỡ ba tên người, đổi ngày ban
-- hành sang 2026, email liên hệ → info@fitop.com.vn.
--
-- Một chỗ phải cẩn thận và đã kiểm: quy trình tạm ứng – thanh toán trích dẫn
-- "Nghị định 123/2020/NĐ-CP ngày 19/10/2020". Bộ lọc năm chỉ đụng tới mốc
-- 2023–2025 nên 2020 còn nguyên. Đã rà toàn bộ 58 tài liệu đang bán: 10 trích
-- dẫn pháp lý và tiêu chuẩn, không cái nào bị đổi năm.
-- =====================================================================

insert into public.documents
  (ma, ten, nhom, ten_nhom, loai, mo_ta, duong_dan, dinh_dang, phien_ban, cap_do, file_goc, active)
values
  ('FT-TC-01','Quy trình báo cáo tiêu thụ các mặt hàng giá trị cao','TC','Tài chính · Kiểm soát','SOP',
   'Theo dõi tồn kho và tiêu thụ rượu, thuốc lá, hàng giá trị cao; đối chiếu định kỳ',
   'FT-TC-01.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-TC-02','Quy trình giải trí, tiếp khách','TC','Tài chính · Kiểm soát','SOP',
   'Định mức, thẩm quyền duyệt và chứng từ cho chi phí tiếp khách, giải trí',
   'FT-TC-02.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-TC-03','Quy trình kiểm soát quỹ tiền lẻ','TC','Tài chính · Kiểm soát','SOP',
   'Cấp, giữ, kiểm đếm và bàn giao quỹ tiền lẻ tại các điểm thu',
   'FT-TC-03.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-TC-04','Quy trình kiểm soát tiền mặt','TC','Tài chính · Kiểm soát','SOP',
   'Thu, nộp, bảo quản tiền mặt và đối chiếu doanh thu cuối ca',
   'FT-TC-04.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-TC-05','Quy trình quản lý giá vốn minibar','TC','Tài chính · Kiểm soát','SOP',
   'Định mức, nhập xuất và tính giá vốn hàng minibar',
   'FT-TC-05.pdf','pdf','1.0','Nâng cao',false,true),

  ('FT-TC-06','Quy trình tạm ứng – thanh toán','TC','Tài chính · Kiểm soát','SOP',
   'Đề nghị tạm ứng, duyệt, chi tiền, hoàn ứng và quản lý công nợ nội bộ',
   'FT-TC-06.pdf','pdf','1.0','Quản lý',false,true),

  ('FT-TC-07','Quy trình thanh toán chi phí','TC','Tài chính · Kiểm soát','SOP',
   'Hồ sơ hợp lệ, thẩm quyền duyệt và trình tự thanh toán chi phí',
   'FT-TC-07.pdf','pdf','1.0','Quản lý',false,true)

on conflict (ma) do update set
  ten = excluded.ten, nhom = excluded.nhom, ten_nhom = excluded.ten_nhom,
  loai = excluded.loai, mo_ta = excluded.mo_ta, duong_dan = excluded.duong_dan,
  dinh_dang = excluded.dinh_dang, phien_ban = excluded.phien_ban,
  cap_do = excluded.cap_do, ngay_cap_nhat = current_date, active = true;

update public.bo_phan
   set so_tai_lieu = (select count(*) from public.documents d
                       where d.nhom = bo_phan.ma and d.active)
 where ma in ('LT', 'FB', 'KD', 'NS', 'TC');

-- Kiểm lại — đừng tin dòng Success, đọc số
select
  (select count(*) from public.documents where nhom = 'TC' and active) as tai_chinh_kiem_soat,
  (select count(*) from public.documents where active)                 as tong_co_that,
  (select sum(so_tai_lieu) from public.bo_phan)                        as tong_dang_quang_cao,
  (select string_agg(ma || '=' || so_tai_lieu, ' · ' order by thu_tu)
     from public.bo_phan)                                              as sau_bo_phan,
  (select count(*) from storage.objects o where o.bucket_id = 'tailieu'
     and not exists (select 1 from public.documents d
                      where d.duong_dan = o.name))                     as tep_mo_coi_con_lai;
