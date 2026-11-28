// GET /api/can-cong-khai?loai=&tinh=
// Trả danh sách căn ĐÃ DUYỆT để hiển thị trên trang công khai /can-ho.
//
// CHỈ trả thông tin công khai: KHÔNG kèm địa chỉ chi tiết, KHÔNG kèm liên hệ
// chủ nhà — khách thuê liên hệ FiTop, không liên hệ thẳng chủ nhà. Đọc bằng
// service_role rồi lọc 'da_duyet', nên bảng vẫn khoá kín với khoá publishable.
import { admin, json } from './_lib/supabase.js';

const BUCKET = 'can-anh';

const anhCongKhai = (path) =>
  `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' });

  const u = new URL(req.url);
  const loai = (u.searchParams.get('loai') || '').trim().toLowerCase();
  const tinh = (u.searchParams.get('tinh') || '').trim();

  const sb = admin();
  let q = sb.from('can_ky_gui')
    .select('id, ma, ten, loai, tinh, so_phong, dien_tich, gia, gia_don_vi, mo_ta, tien_ich, anh, created_at')
    .eq('trang_thai', 'da_duyet')
    .order('created_at', { ascending: false })
    .limit(300);
  if (loai) q = q.eq('loai', loai);
  if (tinh) q = q.eq('tinh', tinh);

  const { data, error } = await q;
  if (error) {
    console.error('can-cong-khai:', error.message);
    return json(500, { error: 'loi_doc' });
  }

  const items = (data || []).map((r) => ({
    id: r.id, ma: r.ma, ten: r.ten, loai: r.loai, tinh: r.tinh,
    so_phong: r.so_phong, dien_tich: r.dien_tich,
    gia: r.gia, gia_don_vi: r.gia_don_vi,
    mo_ta: r.mo_ta, tien_ich: r.tien_ich || [],
    anh: (r.anh || []).map(anhCongKhai),
    created_at: r.created_at,
  }));

  return new Response(JSON.stringify({ ok: true, items }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Cho CDN giữ 60s để trang công khai nhẹ tải, vẫn cập nhật nhanh.
      'cache-control': 'public, max-age=60',
    },
  });
};

export const config = { path: '/api/can-cong-khai' };
