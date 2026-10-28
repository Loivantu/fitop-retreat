-- =====================================================================
-- FiTop Retreat — 016_mau.sql — 28/10/2026
-- Bảng ghi người nhận tài liệu mẫu ở fitop.com.vn/mau
--
-- Đây là danh sách khách quan trọng nhất của chiến dịch video: mỗi dòng là
-- một người đã tự nói cho biết họ quan tâm bộ phận nào. Ghi cả lần gửi hỏng
-- để còn gửi lại tay, đừng im lặng mất khách.
-- =====================================================================

create table if not exists public.mau_yeu_cau (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  bo          text not null check (bo in ('LT','FB','KD','NS','TC','AT')),
  doc_ma      text,                                  -- tài liệu đã gửi
  da_gui      boolean not null default false,
  ly_do_hong  text,                                  -- null nếu gửi được
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- Đếm theo email trong 24h để chặn lạm dụng — chạy mỗi lần có người xin mẫu
create index if not exists mau_email_idx on public.mau_yeu_cau (email, created_at desc);
-- Xem bộ nào được quan tâm nhất
create index if not exists mau_bo_idx on public.mau_yeu_cau (bo, created_at desc);

comment on table public.mau_yeu_cau is
  'Người để lại email nhận tài liệu mẫu. Nguồn khách cho chiến dịch HD-FITOP-VIDEO-03.';

-- Chỉ service_role đụng tới. Trang web gọi qua /api/nhan-mau, không chạm bảng.
alter table public.mau_yeu_cau enable row level security;

drop policy if exists mau_chi_service on public.mau_yeu_cau;
create policy mau_chi_service on public.mau_yeu_cau
  for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------
-- Kiểm lại — đọc số, đừng tin dòng Success
-- co_bang phải = 1 · du_6_tai_lieu_mau phải = 6
-- Thiếu tài liệu nào thì trang /mau sẽ trả lỗi "chua_san_sang" cho bộ đó.
-- ---------------------------------------------------------------------
select
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='mau_yeu_cau')  as co_bang,
  (select count(*) from public.mau_yeu_cau)                     as so_dong,
  (select count(*) from public.documents
     where ma in ('FT-LT-04','FT-FB-07','FT-KD-06',
                  'FT-NS-01','FT-TC-04','FT-AT-08')
       and active)                                              as du_6_tai_lieu_mau;
