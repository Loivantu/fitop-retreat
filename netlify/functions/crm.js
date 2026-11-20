// /api/crm — màn hình làm việc với khách, dùng cho admin.html
//
//   GET  /api/crm?view=hom_nay            lead mới + lead đến hạn gọi lại
//   GET  /api/crm?view=danh_sach&stage=…  danh sách lead, lọc theo bước
//   GET  /api/crm?view=chi_tiet&id=…      một lead + toàn bộ ghi chú
//   POST /api/crm  { viec: 'doi_buoc'  , id, stage, ghi_chu?, lost_reason? }
//   POST /api/crm  { viec: 'ghi_chu'   , id, ghi_chu }
//   POST /api/crm  { viec: 'hen_lai'   , id, ngay }        ISO hoặc '' để xoá hẹn
//   POST /api/crm  { viec: 'them_zalo' , name, phone, email?, business?, note? }
//
// Vì sao không dùng phần mềm CRM: ở mức vài chục lead một tháng, thứ thiếu
// không phải tính năng, mà là một chỗ duy nhất trả lời "hôm nay gọi ai".
// Bốn việc trên là đủ cho câu hỏi đó, và chạy trên hạ tầng đã trả tiền rồi.
//
// Chỉ quản trị đọc được — cùng cách bảo vệ như /api/stats.
import { admin, json } from './_lib/supabase.js';
import { requireAdmin } from './_lib/adminauth.js';

const BUOC = ['moi', 'da_lien_he', 'hen_danh_gia', 'da_bao_gia', 'chot', 'mat'];

const COT = 'id, full_name, phone, email, company, property_type, message, source,' +
            ' ctv_code, stage, owner, next_action_at, lost_reason, zalo_id,' +
            ' created_at, updated_at';

const cat = (s, n) => String(s == null ? '' : s).trim().slice(0, n);

// Số Việt Nam: 10 số bắt đầu bằng 0, hoặc dạng +84/84. Giữ đúng luật của lead.js
function chuanSdt(s) {
  const d = String(s || '').replace(/\D/g, '');
  if (/^84\d{9}$/.test(d)) return '0' + d.slice(2);
  if (/^0\d{9}$/.test(d)) return d;
  return null;
}

// ----------------------------------------------------------------- GET
async function doc(sb, url) {
  const view = url.searchParams.get('view') || 'hom_nay';

  if (view === 'hom_nay') {
    const bay_gio = new Date().toISOString();
    const [tong, moi, den_han] = await Promise.all([
      sb.rpc('crm_hom_nay'),
      sb.from('leads').select(COT)
        .eq('stage', 'moi')
        .order('created_at', { ascending: false }).limit(50),
      sb.from('leads').select(COT)
        .not('next_action_at', 'is', null)
        .lte('next_action_at', bay_gio)
        .not('stage', 'in', '("chot","mat")')
        .order('next_action_at', { ascending: true }).limit(50),
    ]);
    return json(200, {
      tong_quan: tong.data || {},
      moi: moi.data || [],
      den_han: den_han.data || [],
    });
  }

  if (view === 'danh_sach') {
    const stage = cat(url.searchParams.get('stage'), 20);
    const tim   = cat(url.searchParams.get('tim'), 60);
    let q = sb.from('leads').select(COT).order('created_at', { ascending: false }).limit(200);
    if (BUOC.includes(stage)) q = q.eq('stage', stage);
    if (tim) {
      const an = tim.replace(/[%,()]/g, '');
      q = q.or(`full_name.ilike.%${an}%,phone.ilike.%${an}%,email.ilike.%${an}%`);
    }
    const { data, error } = await q;
    if (error) return json(500, { error: 'doc_that_bai' });
    return json(200, { danh_sach: data || [] });
  }

  if (view === 'chi_tiet') {
    const id = cat(url.searchParams.get('id'), 40);
    if (!id) return json(400, { error: 'thieu_id' });
    const [lead, notes] = await Promise.all([
      sb.from('leads').select(COT).eq('id', id).maybeSingle(),
      sb.from('lead_notes').select('noi_dung, nguoi_ghi, stage_cu, stage_moi, created_at')
        .eq('lead_id', id).order('created_at', { ascending: false }).limit(100),
    ]);
    if (!lead.data) return json(404, { error: 'khong_thay' });
    return json(200, { lead: lead.data, ghi_chu: notes.data || [] });
  }

  return json(400, { error: 'view_khong_hop_le' });
}

// ---------------------------------------------------------------- POST
async function ghi(sb, body, nguoi) {
  const viec = cat(body.viec, 20);
  const id   = cat(body.id, 40);

  if (viec === 'them_zalo') {
    const full_name = cat(body.name, 120);
    const phone = chuanSdt(body.phone);
    if (!full_name) return json(400, { error: 'thieu_ho_ten' });
    if (!phone) return json(400, { error: 'so_dien_thoai_khong_hop_le' });

    // Cùng số đã có trong sổ thì mở lại lead cũ, đừng tạo bản trùng
    const { data: cu } = await sb.from('leads')
      .select('id, full_name').eq('phone', phone)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (cu) {
      await sb.from('lead_notes').insert({
        lead_id: cu.id, nguoi_ghi: nguoi,
        noi_dung: 'Nhắn lại qua Zalo. ' + (cat(body.note, 500) || ''),
      });
      return json(200, { ok: true, id: cu.id, da_co: true, ten: cu.full_name });
    }

    const { data, error } = await sb.from('leads').insert({
      source: 'zalo',
      full_name, phone,
      email: cat(body.email, 160) || null,
      property_type: cat(body.business, 120) || null,
      message: cat(body.note, 1000) || null,
      zalo_id: cat(body.zalo_id, 80) || null,
      stage: 'da_lien_he',                 // đã nhắn rồi mới vào sổ được
    }).select('id').single();
    if (error) return json(500, { error: 'ghi_that_bai' });
    return json(200, { ok: true, id: data.id });
  }

  if (!id) return json(400, { error: 'thieu_id' });

  const { data: truoc } = await sb.from('leads').select('stage').eq('id', id).maybeSingle();
  if (!truoc) return json(404, { error: 'khong_thay' });

  if (viec === 'doi_buoc') {
    const stage = cat(body.stage, 20);
    if (!BUOC.includes(stage)) return json(400, { error: 'buoc_khong_hop_le' });

    const sua = { stage };
    if (stage === 'mat') sua.lost_reason = cat(body.lost_reason, 300) || null;
    // Chốt hoặc mất thì không còn phải gọi lại
    if (stage === 'chot' || stage === 'mat') sua.next_action_at = null;

    const { error } = await sb.from('leads').update(sua).eq('id', id);
    if (error) return json(500, { error: 'ghi_that_bai' });

    await sb.from('lead_notes').insert({
      lead_id: id, nguoi_ghi: nguoi,
      noi_dung: cat(body.ghi_chu, 1000) || ('Chuyển bước: ' + truoc.stage + ' → ' + stage),
      stage_cu: truoc.stage, stage_moi: stage,
    });
    return json(200, { ok: true, stage });
  }

  if (viec === 'ghi_chu') {
    const noi_dung = cat(body.ghi_chu, 2000);
    if (!noi_dung) return json(400, { error: 'ghi_chu_rong' });
    const { error } = await sb.from('lead_notes').insert({
      lead_id: id, noi_dung, nguoi_ghi: nguoi, stage_cu: truoc.stage,
    });
    if (error) return json(500, { error: 'ghi_that_bai' });
    // Chạm vào lead để updated_at nhảy theo, màn hình xếp đúng thứ tự
    await sb.from('leads').update({ owner: nguoi }).eq('id', id);
    return json(200, { ok: true });
  }

  if (viec === 'hen_lai') {
    const ngay = cat(body.ngay, 40);
    let moc = null;
    if (ngay) {
      const d = new Date(ngay);
      if (isNaN(d.getTime())) return json(400, { error: 'ngay_khong_hop_le' });
      moc = d.toISOString();
    }
    const { error } = await sb.from('leads').update({ next_action_at: moc }).eq('id', id);
    if (error) return json(500, { error: 'ghi_that_bai' });
    await sb.from('lead_notes').insert({
      lead_id: id, nguoi_ghi: nguoi, stage_cu: truoc.stage,
      noi_dung: moc ? ('Hẹn gọi lại: ' + ngay) : 'Bỏ hẹn gọi lại',
    });
    return json(200, { ok: true, next_action_at: moc });
  }

  return json(400, { error: 'viec_khong_hop_le' });
}

// ----------------------------------------------------------------------
export default async (req) => {
  const sb = admin();
  const me = await requireAdmin(req, sb);
  if (!me.ok) return json(me.status, { error: me.error });

  if (req.method === 'GET') return doc(sb, new URL(req.url));

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); }
    catch { return json(400, { error: 'invalid_json' }); }
    return ghi(sb, body, me.email || 'admin');
  }

  return json(405, { error: 'method_not_allowed' });
};

export const config = { path: '/api/crm' };
