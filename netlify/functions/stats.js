// GET /api/stats
// Trả số liệu cho trang theo dõi. Chỉ tài khoản có quyền admin/staff đọc được.
//
// Trang admin đăng nhập bằng Supabase (gửi link vào email), rồi gửi kèm
// access token ở header Authorization. Hàm này xác minh token, tra bảng
// profiles xem có phải admin/staff không, rồi mới trả dữ liệu.
import { createClient } from '@supabase/supabase-js';
import { admin, json } from './_lib/supabase.js';

export default async (req) => {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return json(401, { error: 'chua_dang_nhap' });

  // Xác minh token bằng khoá công khai (publishable — an toàn khi lộ,
  // RLS mới là lớp chặn thật, nên để thẳng trong mã cho đỡ phải khai biến)
  const PUBLISHABLE = 'sb_publishable_xdMiANHLWt6isE5I9XbyxA_VWfzizFQ';
  const anon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY || PUBLISHABLE,
    { auth: { persistSession: false } }
  );
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: 'token_khong_hop_le' });

  const sb = admin();

  const { data: me } = await sb
    .from('profiles').select('role, full_name, email')
    .eq('id', userData.user.id).maybeSingle();

  if (!me || !['admin', 'staff'].includes(me.role)) {
    return json(403, { error: 'khong_du_quyen' });
  }

  const [summary, hourly, daily, monthly, sources, orders, events] =
    await Promise.all([
      sb.rpc('stats_summary'),
      sb.rpc('stats_hourly'),
      sb.rpc('stats_daily'),
      sb.rpc('stats_monthly'),
      sb.rpc('stats_sources'),
      sb.from('orders')
        .select('order_id, customer_name, customer_phone, package, total, paid_amount, status, ctv_code, coupon_code, created_at, paid_at')
        .order('created_at', { ascending: false }).limit(50),
      sb.from('payment_events')
        .select('provider, amount, content, matched_order, result, created_at')
        .order('created_at', { ascending: false }).limit(20),
    ]);

  return json(200, {
    nguoi_dung: { ten: me.full_name, email: me.email, quyen: me.role },
    tong_quan: summary.data || {},
    theo_gio: hourly.data || [],
    theo_ngay: daily.data || [],
    theo_thang: monthly.data || [],
    nguon: sources.data || [],
    don_hang: orders.data || [],
    giao_dich: events.data || [],
  });
};

export const config = { path: '/api/stats' };
