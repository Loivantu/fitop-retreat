// POST /api/mark-paid   { order_id, amount? }
// Xác nhận tay một đơn đã nhận được tiền — dùng khi chưa có dịch vụ đối soát
// tự động. Chỉ admin/staff gọi được.
//
// Đổi status sang 'paid' sẽ kích hoạt trigger accrue_commission() trong
// Supabase, tự ghi hoa hồng cho CTV nếu đơn có mã CTV.
import { createClient } from '@supabase/supabase-js';
import { admin, json } from './_lib/supabase.js';
import { pushOrderToHubspot } from './_lib/hubspot.js';

const PUBLISHABLE = 'sb_publishable_xdMiANHLWt6isE5I9XbyxA_VWfzizFQ';

async function requireStaff(req, sb) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;

  const anon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY || PUBLISHABLE,
    { auth: { persistSession: false } }
  );
  const { data } = await anon.auth.getUser(token);
  if (!data?.user) return null;

  const { data: me } = await sb
    .from('profiles').select('id, role, email')
    .eq('id', data.user.id).maybeSingle();

  return me && ['admin', 'staff'].includes(me.role) ? me : null;
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const sb = admin();
  const me = await requireStaff(req, sb);
  if (!me) return json(403, { error: 'khong_du_quyen' });

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
