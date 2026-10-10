// POST /api/mark-paid   { order_id, amount? }
// Xác nhận tay một đơn đã nhận được tiền — dùng khi chưa có dịch vụ đối soát
// tự động. Chỉ admin/staff gọi được.
//
// Đổi status sang 'paid' sẽ kích hoạt trigger accrue_commission() trong
// Supabase, tự ghi hoa hồng cho CTV nếu đơn có mã CTV.
import { admin, json } from './_lib/supabase.js';
import { requireAdmin } from './_lib/adminauth.js';
import { pushOrderToHubspot } from './_lib/hubspot.js';

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const sb = admin();
  const me = await requireAdmin(req, sb);
  if (!me.ok) return json(me.status, { error: me.error });

  let body;
  try { body = await req.json(); }
  catch { return json(400, { error: 'invalid_json' }); }

  const oid = String(body.order_id || '').trim().toUpperCase();
  if (!/^FT[0-9A-Z]{5}$/.test(oid)) return json(400, { error: 'ma_don_khong_hop_le' });

  const { data: order } = await sb.from('orders')
    .select('order_id, total, status, package, customer_name, customer_phone, customer_email, coupon_code, ctv_code')
    .eq('order_id', oid).maybeSingle();
  if (!order) return json(404, { error: 'khong_thay_don' });
  if (order.status === 'paid') return json(200, { ok: true, da_xac_nhan_truoc_do: true });

  const amount = Number(body.amount) > 0 ? Number(body.amount) : Number(order.total);

  const { data: updated, error } = await sb.from('orders').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
    paid_amount: amount,
    provider: 'manual',
    provider_ref: `admin:${me.email}`,
    note: `Xác nhận tay bởi ${me.email}`,
  }).eq('order_id', oid).in('status', ['pending', 'mismatch'])
    .select('order_id, paid_amount, ctv_code').single();

  if (error) return json(500, { error: 'cap_nhat_that_bai', detail: error.message });

  // Ghi vào nhật ký đối soát để sau này tra được
  await sb.from('payment_events').insert({
    provider: 'manual',
    provider_ref: `admin:${me.email}:${oid}:${Date.now()}`,
    amount,
    content: `Xác nhận tay ${oid}`,
    matched_order: oid,
    result: 'matched',
    raw_payload: { by: me.email, order_id: oid, amount },
  });

  // Báo sang CRM: lead này đã thành khách trả tiền
  const crm = await pushOrderToHubspot(
    { ...order, paid_amount: amount }, 'da_thanh_toan'
  );

  return json(200, { ok: true, don: updated, crm });
};

export const config = { path: '/api/mark-paid' };
