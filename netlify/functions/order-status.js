// GET /api/order-status?order_id=FT1A2B3&token=<unlock_token>
// Web gọi mỗi 5 giây sau khi hiện QR, để tự đổi sang "Đã thanh toán"
// và mở link tài liệu — khách không cần đăng nhập.
//
// unlock_token là chuỗi uuid sinh lúc tạo đơn, chỉ trình duyệt của khách
// đó biết. Không có token thì chỉ trả về trạng thái, không trả link tài liệu.
import { admin, json } from './_lib/supabase.js';

export default async (req) => {
  const url = new URL(req.url);
  const oid = (url.searchParams.get('order_id') || '').trim().toUpperCase();
  const token = (url.searchParams.get('token') || '').trim();

  if (!/^FT[0-9A-Z]{5}$/.test(oid)) return json(400, { error: 'invalid_order_id' });

  const sb = admin();
  const { data: o } = await sb.from('orders')
    .select('order_id, package, description, total, status, paid_at, unlock_token')
    .eq('order_id', oid).maybeSingle();

  if (!o) return json(404, { error: 'not_found' });

  const unlocked = o.status === 'paid' && token && token === o.unlock_token;

  return json(200, {
    order_id: o.order_id,
    status: o.status,
    total: o.total,
    paid_at: o.paid_at,
    unlocked,
    // Link tài liệu chỉ trả về khi đã trả tiền VÀ đúng token.
    // Đặt DOC_URL_ONLINE / DOC_URL_USB trong biến môi trường Netlify.
    download_url: unlocked
      ? (o.package === 'usb'
          ? process.env.DOC_URL_USB || null
          : process.env.DOC_URL_ONLINE || null)
      : null,
  });
};

export const config = { path: '/api/order-status' };
