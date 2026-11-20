-- 017_crm.sql — Biến bảng leads từ một danh sách thành một phễu bán hàng.
--
-- Trước file này: leads chỉ ghi được "ai đã để lại số". Không trả lời được
-- "hôm nay phải gọi ai", "lần trước nói gì", "mất vì lý do gì". Thêm năm cột
-- và một bảng ghi chú là đủ cho quy mô hiện tại — không cần phần mềm CRM.
--
-- An toàn khi chạy lại nhiều lần. Không đụng vào dữ liệu đã có.

-- ---------------------------------------------------------------------
-- 1. Mở rộng leads
-- ---------------------------------------------------------------------
alter table public.leads add column if not exists stage          text;
alter table public.leads add column if not exists owner          text;
alter table public.leads add column if not exists next_action_at timestamptz;
alter table public.leads add column if not exists lost_reason    text;
alter table public.leads add column if not exists zalo_id        text;
alter table public.leads add column if not exists updated_at     timestamptz not null default now();

-- Lead cũ chưa có bước thì coi như mới, để không lọt khỏi màn hình "Hôm nay"
update public.leads set stage = 'moi' where stage is null;

alter table public.leads alter column stage set default 'moi';
alter table public.leads alter column stage set not null;

-- Sáu bước, viết thẳng vào ràng buộc để không ai gõ sai một giá trị thứ bảy
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_stage_check'
  ) then
    alter table public.leads add constraint leads_stage_check
      check (stage in ('moi','da_lien_he','hen_danh_gia','da_bao_gia','chot','mat'));
  end if;
end $$;

comment on column public.leads.stage is
  'moi | da_lien_he | hen_danh_gia | da_bao_gia | chot | mat';
comment on column public.leads.source is
  'web-datlich | web-ctv | mau | dangky | chamdiem | zalo | facebook | web | ctv';
comment on column public.leads.next_action_at is
  'Ngày phải chạm lại. Màn hình "Hôm nay" lấy theo cột này.';

-- Màn hình "Hôm nay" chỉ hỏi hai câu: lead mới chưa chạm, và lead đến hạn.
create index if not exists leads_stage_idx       on public.leads (stage, created_at desc);
create index if not exists leads_next_action_idx on public.leads (next_action_at)
  where next_action_at is not null;
create index if not exists leads_phone_idx       on public.leads (phone);

-- ---------------------------------------------------------------------
-- 2. lead_notes — lịch sử từng lần chạm
-- ---------------------------------------------------------------------
-- Một dòng mỗi lần gọi, nhắn, gặp. Không sửa, không xoá: lịch sử bán hàng
-- mà sửa được thì không còn là lịch sử.
create table if not exists public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  noi_dung   text not null,
  nguoi_ghi  text,
  stage_cu   text,                                  -- bước trước khi ghi chú này
  stage_moi  text,                                  -- bước sau, null nếu không đổi
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_idx
  on public.lead_notes (lead_id, created_at desc);

-- ---------------------------------------------------------------------
-- 3. RLS — giữ đúng quy ước của 002_rls.sql
-- ---------------------------------------------------------------------
-- leads: web được ghi, chỉ staff đọc. lead_notes chặt hơn: chỉ staff,
-- vì ghi chú bán hàng không phải thứ khách để lại.
alter table public.lead_notes enable row level security;

drop policy if exists lead_notes_staff_all on public.lead_notes;
create policy lead_notes_staff_all on public.lead_notes
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- 4. Tự cập nhật updated_at
-- ---------------------------------------------------------------------
create or replace function public.leads_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists leads_touch_trg on public.leads;
create trigger leads_touch_trg
  before update on public.leads
  for each row execute function public.leads_touch();

-- ---------------------------------------------------------------------
-- 5. Số liệu cho màn hình "Hôm nay"
-- ---------------------------------------------------------------------
create or replace function public.crm_hom_nay()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'moi',        (select count(*) from public.leads where stage = 'moi'),
    'den_han',    (select count(*) from public.leads
                    where next_action_at is not null
                      and next_action_at <= now()
                      and stage not in ('chot','mat')),
    'qua_han',    (select count(*) from public.leads
                    where next_action_at is not null
                      and next_action_at < now() - interval '1 day'
                      and stage not in ('chot','mat')),
    'dang_theo',  (select count(*) from public.leads
                    where stage in ('da_lien_he','hen_danh_gia','da_bao_gia')),
    'chot_30n',   (select count(*) from public.leads
                    where stage = 'chot' and updated_at >= now() - interval '30 days'),
    'moi_7n',     (select count(*) from public.leads
                    where created_at >= now() - interval '7 days'),
    'theo_nguon', (select coalesce(json_agg(t), '[]'::json) from (
                    select coalesce(source,'khong_ro') as nguon, count(*) as so_luong
                    from public.leads
                    where created_at >= now() - interval '30 days'
                    group by 1 order by 2 desc
                  ) t)
  );
$$;

revoke all on function public.crm_hom_nay() from public, anon, authenticated;
