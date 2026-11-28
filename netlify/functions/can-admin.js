// /api/can-admin   (cần quyền quản trị — header x-admin-pass)
//   GET  ?trang_thai=cho_duyet|da_duyet|tu_choi|an|all   → liệt kê tin căn ký gửi
//   POST { id, trang_thai, ghi_chu_duyet? }              → duyệt / từ chối / ẩn
//
// Dùng cho trang /quan-ly-can. Trả ĐẦY ĐỦ thông tin (gồm địa chỉ & liên hệ
// chủ nhà) vì đây là màn hình nội bộ. Ghi bằng service_role.
import { admin, json } from './_lib/supabase.js';
import { requireAdmin } from './_lib/adminauth.js';

const BUCKET = 'can-anh';
const TRANG_THAI = new Set(['cho_duyet', 'da_duyet', 'tu_choi', 'an']);

const anhCongKhai = (path) =>
  `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

export default async (req) => {
  const sb = admin();
  const g = await requireAdmin(req, sb);
  if (!g.ok) return json(g.status, { error: g.error });

  // ----- Liệt kê -----
  if (req.method === 'GET') {
    const u = new URL(req.url);
    const tt = (u.searchParams.get('trang_thai') || 'cho_duyet').trim();
    let q = sb.from('can_ky_gui').select('*').order('created_at', { ascending: false }).limit(500);
    if (tt && tt !== 'all') q = q.eq('trang_thai', tt);
    const { data, error } = await q;
    if (error) return json(500, { error: 'loi_doc' });
    const items = (data || []).map((r) => ({ ...r, anh_url: (r.anh || []).map(anhCongKhai) }));

    // Đếm nhanh theo trạng thái để hiện badge trên trang.
    const { data: dem } = await sb.from('can_ky_gui').select('trang_thai');
    const count = {};
    (dem || []).forEach((x) => { count[x.trang_thai] = (count[x.trang_thai] || 0) + 1; });

    return json(200, { ok: true, items, count });
  }

  // ----- Duyệt / từ chối / ẩn -----
  if (req.method === 'POST') {
    let b;
    try { b = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
    const id = String(b.id || '').trim();
    const tt = String(b.trang_thai || '').trim();
    if (!id) return json(400, { error: 'thieu_id' });
    if (!TRANG_THAI.has(tt)) return json(400, { error: 'trang_thai_khong_hop_le' });

    const patch = { trang_thai: tt, ghi_chu_duyet: String(b.ghi_chu_duyet || '').slice(0, 500) || null };
    if (tt === 'da_duyet' || tt === 'tu_choi') patch.duyet_at = new Date().toISOString();

    const { data, error } = await sb.from('can_ky_gui').update(patch).eq('id', id).select('id, trang_thai').single();
    if (error) return json(500, { error: 'ghi_that_bai' });
    return json(200, { ok: true, id: data.id, trang_thai: data.trang_thai, by: g.by });
  }

  return json(405, { error: 'method_not_allowed' });
};

export const config = { path: '/api/can-admin' };
