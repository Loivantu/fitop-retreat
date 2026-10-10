// GET /api/stats
// Trả số liệu cho trang theo dõi. Chỉ tài khoản có quyền admin/staff đọc được.
//
// Trang admin gửi mã truy cập ở header x-admin-pass (hoặc token Supabase ở
// header Authorization nếu sau này quay lại đăng nhập bằng email).
// Xem _lib/adminauth.js.
import { admin, json } from './_lib/supabase.js';
import { requireAdmin } from './_lib/adminauth.js';

export default async (req) => {
  const sb = admin();
  const me = await requireAdmin(req, sb);
  if (!me.ok) return json(me.status, { error: me.error });

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
