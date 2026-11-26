-- =====================================================================
-- 018_noibo.sql — Quản trị nội bộ, đợt 1
-- FiTop Retreat · 26/11/2026 · chạy trên dự án Supabase `fitop-retreat`
--
-- Ba thứ của đợt 1:
--   1. tai_san   — sổ tài sản số (4 cột chính: gì · ai giữ · ở đâu · hạn)
--   2. documents — thêm trạng thái sản xuất + chốt chặn ẩn danh hoá
--   3. noi_dung  — bảng trạng thái video ba tầng
--
-- An toàn khi chạy lại nhiều lần. Không xoá, không sửa dữ liệu đã có.
-- Chạy SAU 017_crm.sql.
-- =====================================================================


-- =====================================================================
-- 1. SỔ TÀI SẢN SỐ
-- ---------------------------------------------------------------------
-- Nhà máy đếm máy móc và khấu hao. FiTop không có máy móc — thứ mất đi
-- mà không mua lại được là tài liệu gốc, bản quyền, kịch bản và quyền
-- truy cập. Bốn cột là đủ: tài sản gì · ai giữ · lưu ở đâu · hạn ngày nào.
-- =====================================================================
create table if not exists public.tai_san (
  id         uuid primary key default gen_random_uuid(),
  ten        text not null unique,            -- unique để chạy lại file không sinh bản trùng
  loai       text not null,
  nguoi_giu  text,
  noi_luu    text,
  han        date,                            -- null = không có hạn
  rui_ro     text,                            -- mất thì hậu quả gì
  ghi_chu    text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tai_san_loai_check') then
    alter table public.tai_san add constraint tai_san_loai_check
      check (loai in ('tai_lieu','ban_quyen','noi_dung','ten_mien','ma_nguon','tai_khoan','khac'));
  end if;
end $$;

comment on table public.tai_san is
  'Sổ tài sản số. Rà lại mỗi quý. KHÔNG lưu mật khẩu, khoá API hay mã truy cập ở đây — chỉ ghi tài sản đó nằm ở đâu và ai giữ.';
comment on column public.tai_san.han is
  'Hạn phải gia hạn hoặc phải rà lại. Null nghĩa là không có hạn.';

create index if not exists tai_san_han_idx on public.tai_san (han)
  where han is not null and active = true;

-- Sáu dòng đầu, lấy từ sơ đồ hệ thống ngày 22/11.
-- `on conflict do nothing` nên chạy lại không ghi đè thứ anh đã sửa tay.
insert into public.tai_san (ten, loai, noi_luu, rui_ro) values
  ('66 tài liệu bản gốc Word/Excel', 'tai_lieu',  'Supabase Storage · bucket tailieu',
   'Mất là mất sản phẩm'),
  ('Bản quyền quy trình HC/NS bên thứ ba', 'ban_quyen', 'Hồ sơ giấy',
   'Không có giấy xác nhận thì không bán được'),
  ('Hồ sơ thiết kế MEP', 'ban_quyen', 'Hồ sơ giấy',
   'Có pháp nhân bên thứ ba, phải xác nhận quyền trước khi dùng'),
  ('Kịch bản và hình ảnh video 3 tầng', 'noi_dung', 'Máy cá nhân + Project trên Claude',
   'Mất là mất ba tháng làm lại'),
  ('Tên miền fitop.com.vn', 'ten_mien', 'Nhà đăng ký tên miền',
   'Hết hạn là web tắt'),
  ('Mã nguồn fitop-retreat', 'ma_nguon', 'GitHub · Loivantu/fitop-retreat (công khai)',
   'Khoá phải nằm ở biến môi trường Netlify, không nằm trong mã'),
  ('Mã truy cập bảng quản trị', 'tai_khoan', 'Biến ADMIN_PASSCODE trên Netlify',
   'Ai có mã này xem được doanh thu và xác nhận được thanh toán')
on conflict (ten) do nothing;

-- Tài sản sắp tới hạn — dùng cho màn hình rà soát quý
create or replace function public.tai_san_den_han(so_ngay int default 60)
returns table (ten text, loai text, nguoi_giu text, han date, con_lai int)
language sql stable security definer set search_path = public as $$
  select t.ten, t.loai, t.nguoi_giu, t.han, (t.han - current_date)::int
  from public.tai_san t
  where t.active = true and t.han is not null
    and t.han <= current_date + so_ngay
  order by t.han;
$$;
revoke all on function public.tai_san_den_han(int) from public, anon, authenticated;


-- =====================================================================
-- 2. DÂY CHUYỀN TÀI LIỆU
-- ---------------------------------------------------------------------
-- Soạn → Rà nội bộ → Ẩn danh hoá → Duyệt → Phát hành → Phiên bản
--
-- Bước ẩn danh hoá là ràng buộc pháp lý, không phải việc làm cho đẹp:
-- bản gốc còn tên nhà cung cấp và tên nhân viên thật của cơ sở khác.
-- Vì vậy nó được chặn bằng trigger, không để là việc nhớ bằng đầu.
-- =====================================================================
alter table public.documents add column if not exists trang_thai  text;
alter table public.documents add column if not exists nguoi_giu   text;
alter table public.documents add column if not exists da_an_danh  boolean;
alter table public.documents add column if not exists han_ra_soat date;
alter table public.documents add column if not exists updated_at  timestamptz not null default now();

-- Dòng đã có đang nằm trên web, nên coi như đã phát hành.
-- CỐ Ý để da_an_danh = null: chưa ai xác nhận đã ẩn danh hoá, và
-- null nói đúng điều đó. Đặt true ở đây là tự nhận một việc chưa làm.
update public.documents set trang_thai = 'phat_hanh' where trang_thai is null;

alter table public.documents alter column trang_thai set default 'soan';
alter table public.documents alter column trang_thai set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documents_trang_thai_check') then
    alter table public.documents add constraint documents_trang_thai_check
      check (trang_thai in ('soan','ra','an_danh','duyet','phat_hanh'));
  end if;
end $$;

comment on column public.documents.trang_thai is
  'soan | ra | an_danh | duyet | phat_hanh — sáu bước của dây chuyền tài liệu';
comment on column public.documents.da_an_danh is
  'true = đã thay tên nhà cung cấp và tên nhân viên thật thành NCC-01, NV-01. null = chưa ai rà.';
comment on column public.documents.han_ra_soat is
  'Hạn rà lại nội dung, thường 12 tháng sau lần phát hành gần nhất.';

create index if not exists documents_trang_thai_idx on public.documents (trang_thai)
  where active = true;

-- Chốt chặn: không cho CHUYỂN sang phát hành khi chưa ẩn danh hoá.
-- Chỉ bắt lúc chuyển bước, nên dòng cũ đang ở 'phat_hanh' không bị khoá.
create or replace function public.documents_chan_phat_hanh()
returns trigger language plpgsql as $$
begin
  if new.trang_thai = 'phat_hanh'
     and (tg_op = 'INSERT' or old.trang_thai is distinct from 'phat_hanh')
     and new.da_an_danh is not true then
    raise exception
      'Tài liệu % chưa ẩn danh hoá. Thay tên nhà cung cấp và tên nhân viên thật (NCC-01, NV-01), đặt da_an_danh = true, rồi mới phát hành.',
      new.ma;
  end if;
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists documents_chan_phat_hanh_trg on public.documents;
create trigger documents_chan_phat_hanh_trg
  before insert or update on public.documents
  for each row execute function public.documents_chan_phat_hanh();

-- Danh sách phải xử lý: đang bán mà chưa ai xác nhận đã ẩn danh hoá
create or replace view public.tai_lieu_chua_an_danh as
  select ma, ten, nhom, trang_thai, nguoi_giu, ngay_cap_nhat
  from public.documents
  where active = true and trang_thai = 'phat_hanh' and da_an_danh is not true
  order by nhom, ma;

comment on view public.tai_lieu_chua_an_danh is
  'Tài liệu đang phát hành mà chưa xác nhận ẩn danh hoá. Danh sách này phải về 0.';


-- =====================================================================
-- 3. DÂY CHUYỀN NỘI DUNG
-- ---------------------------------------------------------------------
-- Ý tưởng → Kịch bản → Prompt VEO 3 → Thumbnail → Bài đăng → Đăng & đo
--
-- Đo bằng SỐ NGƯỜI NHẮN, không đo bằng lượt xem. Lượt xem không trả lời
-- được câu nào.
-- =====================================================================
create table if not exists public.noi_dung (
  ma            text primary key,              -- A1..A7 · B1..B6 · D1..D12
  tang          text not null,                 -- A | B | D
  tieu_de       text not null,
  trang_thai    text not null default 'y_tuong',
  thoi_luong    text,                          -- '8 giây' | '35 giây'
  ngay_dang     date,
  kenh          text,                          -- 'Facebook · Zalo OA'
  so_nguoi_nhan int not null default 0,        -- người nhắn #DANHGIA / #DICHVU sau tập này
  ghi_chu       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'noi_dung_trang_thai_check') then
    alter table public.noi_dung add constraint noi_dung_trang_thai_check
      check (trang_thai in ('y_tuong','kich_ban','prompt','thumbnail','bai_dang','da_dang'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'noi_dung_tang_check') then
    alter table public.noi_dung add constraint noi_dung_tang_check
      check (tang in ('A','B','D'));
  end if;
end $$;

comment on table public.noi_dung is
  'Bảng trạng thái video. Con số đáng nhìn là so_nguoi_nhan, không phải lượt xem.';
comment on column public.noi_dung.trang_thai is
  'y_tuong | kich_ban | prompt | thumbnail | bai_dang | da_dang';

create index if not exists noi_dung_trang_thai_idx on public.noi_dung (tang, trang_thai);

-- Mười hai tập tầng D — tiêu đề lấy nguyên văn từ HD-FITOP-VEO-05.
-- Chín tập đã có thumbnail và end card: D1·D2·D3·D5·D6·D7·D8·D9·D10.
-- Còn thiếu hình: D4 · D11 · D12.
insert into public.noi_dung (ma, tang, tieu_de, trang_thai, thoi_luong) values
  ('D1','D','Anh đi vắng ba tháng',                                        'thumbnail','8 giây'),
  ('D2','D','Mở cái thứ hai không phải nhân đôi',                          'thumbnail','8 giây'),
  ('D3','D','Muốn nhượng quyền mà không ai mua',                           'thumbnail','8 giây'),
  ('D4','D','Nhà đầu tư không mua doanh thu',                              'kich_ban','8 giây'),
  ('D5','D','Họ chỉ hỏi một câu: bằng chứng đâu',                          'thumbnail','8 giây'),
  ('D6','D','Một câu hỏi làm định giá rơi',                                'thumbnail','8 giây'),
  ('D7','D','Bảy cách mở rộng, sáu cách cần cùng một thứ',                 'thumbnail','8 giây'),
  ('D8','D','Thuê quản lý hay tự vận hành — còn cách thứ ba',              'thumbnail','8 giây'),
  ('D9','D','Quản lý vùng đang chấm chi nhánh bằng gì?',                   'thumbnail','8 giây'),
  ('D10','D','Thêm người không chữa được chuỗi lệch chuẩn',                'thumbnail','8 giây'),
  ('D11','D','Kỹ thuật viên nghỉ, bao nhiêu khách đi theo?',               'kich_ban','8 giây'),
  ('D12','D','Chuẩn bị để lên sàn và chuẩn bị để bán được là cùng một việc','kich_ban','8 giây')
on conflict (ma) do nothing;

-- Tầng A (7 tập) và tầng B (6 tập) thêm sau khi chốt tiêu đề từng tập.
-- Cố ý không gieo sẵn dòng rỗng: một bảng đầy chữ "chưa điền" thì không
-- ai mở lần thứ hai.

create or replace function public.noi_dung_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists noi_dung_touch_trg on public.noi_dung;
create trigger noi_dung_touch_trg before update on public.noi_dung
  for each row execute function public.noi_dung_touch();

drop trigger if exists tai_san_touch_trg on public.tai_san;
create trigger tai_san_touch_trg before update on public.tai_san
  for each row execute function public.noi_dung_touch();


-- =====================================================================
-- 4. RLS — giữ đúng quy ước 002_rls.sql: chỉ staff
-- =====================================================================
alter table public.tai_san  enable row level security;
alter table public.noi_dung enable row level security;

drop policy if exists tai_san_staff_all on public.tai_san;
create policy tai_san_staff_all on public.tai_san
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists noi_dung_staff_all on public.noi_dung;
create policy noi_dung_staff_all on public.noi_dung
  for all using (public.is_staff()) with check (public.is_staff());


-- =====================================================================
-- 5. SỐ LIỆU CHO MÀN HÌNH NỘI BỘ
-- =====================================================================
create or replace function public.noibo_tong_quan()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'tai_san_tong',      (select count(*) from public.tai_san where active = true),
    'tai_san_den_han',   (select count(*) from public.tai_san
                           where active = true and han is not null
                             and han <= current_date + 60),
    'tai_lieu_tong',     (select count(*) from public.documents where active = true),
    'tai_lieu_chua_an_danh',
                         (select count(*) from public.tai_lieu_chua_an_danh),
    'tai_lieu_theo_buoc',(select coalesce(json_object_agg(t.trang_thai, t.n), '{}'::json) from (
                           select trang_thai, count(*) as n from public.documents
                           where active = true group by 1) t),
    'video_tong',        (select count(*) from public.noi_dung),
    'video_da_dang',     (select count(*) from public.noi_dung where trang_thai = 'da_dang'),
    'video_san_sang',    (select count(*) from public.noi_dung
                           where trang_thai in ('thumbnail','bai_dang')),
    'video_theo_tang',   (select coalesce(json_object_agg(t.tang, t.n), '{}'::json) from (
                           select tang, count(*) as n from public.noi_dung group by 1) t)
  );
$$;
revoke all on function public.noibo_tong_quan() from public, anon, authenticated;
