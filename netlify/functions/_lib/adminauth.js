// Kiểm tra quyền quản trị cho /api/stats và /api/mark-paid.
//
// Chấp nhận HAI cách, cách nào đúng cũng được:
//   1. Header  x-admin-pass: <mã>      — so với biến môi trường ADMIN_PASSCODE
//   2. Header  Authorization: Bearer <jwt>  — tài khoản Supabase có role admin/staff
//
// Cách 1 dành cho trang admin.html. Dùng mã truy cập vì Supabase gói miễn phí
// chỉ gửi được 2 email mỗi giờ cho cả dự án, nên đăng nhập bằng link email
// không dùng nổi. Cách 2 giữ lại để sau này gắn SMTP riêng thì quay về được
// mà không phải sửa gì.
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const PUBLISHABLE = 'sb_publishable_xdMiANHLWt6isE5I9XbyxA_VWfzizFQ';

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  if (x.length !== y.length) return false;        // độ dài khác thì khỏi so
  return crypto.timingSafeEqual(x, y);            // so kiểu không lộ thời gian
}

/**
 * @returns {Promise<{ok:true, by:string, email:string} | {ok:false, status:number, error:string}>}
 */
export async function requireAdmin(req, sb) {
  // --- Cách 1: mã truy cập ---
  const given = (req.headers.get('x-admin-pass') || '').trim();
  const want = (process.env.ADMIN_PASSCODE || '').trim();
  if (given) {
    if (!want) return { ok: false, status: 403, error: 'chua_khai_ma_truy_cap' };
    if (safeEqual(given, want)) {
      return { ok: true, by: 'passcode', email: 'admin@fitop.com.vn' };
    }
    return { ok: false, status: 403, error: 'ma_truy_cap_sai' };
  }

  // --- Cách 2: tài khoản Supabase ---
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { ok: false, status: 401, error: 'chua_dang_nhap' };

  const anon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY || PUBLISHABLE,
    { auth: { persistSession: false } }
  );
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, error: 'token_khong_hop_le' };

  const { data: me } = await sb
    .from('profiles').select('role, email')
    .eq('id', data.user.id).maybeSingle();

  if (!me || !['admin', 'staff'].includes(me.role)) {
    return { ok: false, status: 403, error: 'khong_du_quyen' };
  }
  return { ok: true, by: 'supabase', email: me.email || data.user.email };
}
