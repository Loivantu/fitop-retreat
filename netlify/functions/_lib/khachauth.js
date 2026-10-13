// Xác thực khách mua tài liệu.
//
// Khách đăng nhập bằng magic link của Supabase Auth (không mật khẩu). Trình
// duyệt giữ access_token, gửi kèm mỗi lần gọi /api/tai-lieu và /api/tai-file.
// Hàm này đổi token đó thành một địa chỉ email đã được xác thực.
//
// Vì sao không tin thẳng email khách gõ: ai cũng gõ được email người khác.
// Chỉ người mở được hộp thư mới bấm được link trong thư, nên token mới là
// bằng chứng. Email lấy ra từ token, không lấy từ thân yêu cầu.
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const PUBLISHABLE = 'sb_publishable_xdMiANHLWt6isE5I9XbyxA_VWfzizFQ';

/**
 * Đổi header Authorization thành email đã xác thực.
 * @returns {Promise<{ok:true,email:string,uid:string}|{ok:false,status:number,error:string}>}
 */
export async function khachDangNhap(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { ok: false, status: 401, error: 'chua_dang_nhap' };

  const url = process.env.SUPABASE_URL;
  if (!url) return { ok: false, status: 500, error: 'thieu_supabase_url' };

  const anon = createClient(
    url,
    process.env.SUPABASE_PUBLISHABLE_KEY || PUBLISHABLE,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user?.email) {
    return { ok: false, status: 401, error: 'phien_het_han' };
  }
  return { ok: true, email: data.user.email.toLowerCase(), uid: data.user.id };
}

/**
 * Dấu vân tay thiết bị — băm một chiều, không lưu được ngược về máy khách.
 * Trình duyệt gửi x-thiet-bi (chuỗi ngẫu nhiên nó tự sinh và giữ trong
 * localStorage). Trộn thêm user-agent để đổi máy là đổi dấu vân tay.
 */
export function vanTayThietBi(req) {
  const raw = [
    (req.headers.get('x-thiet-bi') || '').slice(0, 80),
    (req.headers.get('user-agent') || '').slice(0, 200),
  ].join('|');
  if (!raw.replace(/\|/g, '')) return null;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/**
 * Trần số thiết bị: một tài khoản chia cho cả văn phòng thì được, cho cả
 * group Facebook thì không. Đếm số thiết bị khác nhau đã tải trong 90 ngày.
 *
 * Thiết bị đã dùng rồi luôn đi lọt. Chỉ thiết bị MỚI, khi đã chạm trần, mới
 * bị chặn — người mua thật gần như không bao giờ gặp.
 *
 * @returns {Promise<{ok:true,so_thiet_bi:number,tran:number}|{ok:false,status:number,error:string,so_thiet_bi:number,tran:number}>}
 */
export async function trongTranThietBi(sb, email, vanTay) {
  // Trần lấy theo gói cao nhất khách đang có hiệu lực
  const { data: goi } = await sb
    .from('entitlements')
    .select('goi, het_han')
    .ilike('email', email);

  const conHan = (goi || []).filter(
    (g) => !g.het_han || new Date(g.het_han) > new Date()
  );
  if (!conHan.length) {
    return { ok: false, status: 403, error: 'chua_mua_goi_nao', so_thiet_bi: 0, tran: 0 };
  }

  const { data: quyen } = await sb
    .from('goi_quyen')
    .select('goi, so_thiet_bi')
    .in('goi', conHan.map((g) => g.goi));

  const tran = Math.max(1, ...(quyen || []).map((q) => q.so_thiet_bi || 1));

  if (!vanTay) return { ok: true, so_thiet_bi: 0, tran };

  const moc = new Date(Date.now() - 90 * 86400_000).toISOString();
  const { data: log } = await sb
    .from('document_access_log')
    .select('thiet_bi')
    .ilike('email', email)
    .gte('created_at', moc)
    .not('thiet_bi', 'is', null);

  const daCo = new Set((log || []).map((r) => r.thiet_bi));
  if (daCo.has(vanTay)) return { ok: true, so_thiet_bi: daCo.size, tran };

  if (daCo.size >= tran) {
    return {
      ok: false,
      status: 429,
      error: 'vuot_tran_thiet_bi',
      so_thiet_bi: daCo.size,
      tran,
    };
  }
  return { ok: true, so_thiet_bi: daCo.size + 1, tran };
}
