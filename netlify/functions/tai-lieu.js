// GET /api/tai-lieu
// Header: Authorization: Bearer <access_token của Supabase Auth>
//
// Trả về danh sách tài liệu mà email đang đăng nhập được xem, đã gom theo
// nhóm. KHÔNG trả đường dẫn file — chỉ trả mã tài liệu. Muốn tải phải gọi
// tiếp /api/tai-file, lúc đó máy chủ mới sinh link có hạn.
//
// Vì sao tách làm hai: nếu trả sẵn link ở đây thì chỉ cần một ảnh chụp màn
// hình là cả bộ link ra ngoài. Tách ra thì mỗi lần tải đều đi qua kiểm quyền
// và đều để lại dấu vết ai tải cái gì lúc nào.
import { admin, json } from './_lib/supabase.js';
import { khachDangNhap } from './_lib/khachauth.js';

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' });

  const ai = await khachDangNhap(req);
  if (!ai.ok) return json(ai.status, { error: ai.error });

  const sb = admin();

  const { data: ds, error } = await sb.rpc('tai_lieu_cua', { p_email: ai.email });
  if (error) {
    console.error('tai-lieu: tra quyen that bai —', error.message);
    return json(500, { error: 'tra_quyen_that_bai' });
  }

  // Gói đang có hiệu lực — để trang hiện "Gói Cứu lỗ · còn 11 tháng"
  const { data: goi } = await sb
    .from('entitlements')
    .select('goi, bat_dau, het_han')
    .ilike('email', ai.email);

  const conHan = (goi || []).filter(
    (g) => !g.het_han || new Date(g.het_han) > new Date()
  );

  // Gom theo nhóm, giữ nguyên thứ tự nhóm mà hàm SQL đã sắp
  const nhom = [];
  const chiMuc = new Map();
  for (const d of ds || []) {
    if (!chiMuc.has(d.nhom)) {
      chiMuc.set(d.nhom, { nhom: d.nhom, ten_nhom: d.ten_nhom || d.nhom, tai_lieu: [] });
      nhom.push(chiMuc.get(d.nhom));
    }
    chiMuc.get(d.nhom).tai_lieu.push({
      ma: d.ma,
      ten: d.ten,
      loai: d.loai,
      mo_ta: d.mo_ta,
      dinh_dang: d.dinh_dang,
      phien_ban: d.phien_ban,
      ngay_cap_nhat: d.ngay_cap_nhat,
    });
  }

  return json(200, {
    ok: true,
    email: ai.email,
    goi: conHan.map((g) => ({ goi: g.goi, het_han: g.het_han })),
    so_tai_lieu: (ds || []).length,
    nhom,
  });
};

export const config = { path: '/api/tai-lieu' };
