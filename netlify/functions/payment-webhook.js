// POST /api/payment-webhook
// Nhận tín hiệu "tiền đã về" từ dịch vụ đối soát VietQR.
// Hỗ trợ cùng lúc 3 nhà cung cấp — khai URL này ở bên nào cũng chạy:
//   SePay  : header  Authorization: Apikey <SEPAY_WEBHOOK_KEY>
//   Casso  : header  Secure-Token: <CASSO_WEBHOOK_KEY>
//   PayOS  : chữ ký  x-signature (HMAC-SHA256 của chuỗi JSON data)
//
// Quy tắc an toàn:
//   1. Sai khoá  → 401, không ghi gì.
//   2. Mọi lần gọi đều được log vào payment_events, kể cả không khớp đơn.
//   3. Trùng provider_ref → bỏ qua (webhook thường gửi lại nhiều lần).
//   4. Số tiền thiếu so với đơn → đánh dấu 'mismatch', KHÔNG mở tài liệu.
//   5. Chỉ đơn 'pending' mới được chuyển sang 'paid'.
import crypto from 'node:crypto';
import { admin, json } from './_lib/supabase.js';
import { pushOrderToHubspot } from './_lib/hubspot.js';
import { mailXacNhanDon } from './_lib/mail.js';

/* ---------- 1. Xác thực nguồn gọi ---------- */
function authenticate(req, rawBody) {
  const h = (n) => req.headers.get(n) || '';

  // SePay: "Authorization: Apikey xxx"
  const sepayKey = process.env.SEPAY_WEBHOOK_KEY;
  if (sepayKey) {
    const m = h('authorization').match(/^Apikey\s+(.+)$/i);
    if (m && safeEqual(m[1].trim(), sepayKey)) return 'sepay';
  }

  // Casso: "Secure-Token: xxx"
  const cassoKey = process.env.CASSO_WEBHOOK_KEY;
  if (cassoKey && h('secure-token') && safeEqual(h('secure-token'), cassoKey)) {
    return 'casso';
  }

  // PayOS: HMAC-SHA256 trên phần data
  const payosKey = process.env.PAYOS_CHECKSUM_KEY;
  const sig = h('x-signature');
  if (payosKey && sig) {
    try {
      const data = JSON.parse(rawBody).data;
      const expect = crypto
        .createHmac('sha256', payosKey)
        .update(sortedQuery(data))
        .digest('hex');
      if (safeEqual(sig, expect)) return 'payos';
    } catch { /* bỏ qua */ }
  }
  return null;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// PayOS ký trên chuỗi key=value sắp theo alphabet
function sortedQuery(o) {
  return Object.keys(o).sort()
    .map((k) => `${k}=${o[k] === null || o[k] === undefined ? '' : o[k]}`)
    .join('&');
}

/* ---------- 2. Chuẩn hoá payload về một dạng chung ---------- */
function normalize(provider, p) {
  if (provider === 'sepay') {
    return {
      ref: String(p.id ?? p.referenceCode ?? ''),
      amount: Number(p.transferAmount ?? p.amount ?? 0),
      content: String(p.content ?? p.description ?? ''),
      direction: String(p.transferType ?? 'in'),   // 'in' = tiền vào
    };
  }
  if (provider === 'casso') {
    const d = Array.isArray(p.data) ? p.data[0] : (p.data || p);
    return {
      ref: String(d.id ?? d.tid ?? ''),
      amount: Number(d.amount ?? 0),
      content: String(d.description ?? ''),
      direction: Number(d.amount ?? 0) >= 0 ? 'in' : 'out',
    };
  }
  // payos
  const d = p.data || {};
  return {
    ref: String(d.reference ?? d.orderCode ?? ''),
    amount: Number(d.amount ?? 0),
    content: String(d.description ?? ''),
    direction: 'in',
  };
}

/* ---------- 3. Dò order_id trong nội dung chuyển khoản ---------- */
// Khách hay ghi thiếu, thêm dấu, viết liền: "FITOP FT1A2B3", "ftop ft1a2b3",
// "FT1A2B3 thanh toan", "CT DEN:... FITOPFT1A2B3". Mã đơn theo mẫu
// FT + 5 ký tự chữ-số. Trả về TẤT CẢ ứng viên rồi để DB chọn mã thật —
// không đoán, tránh bắt sai một chuỗi tình cờ giống mẫu.
function findOrderIds(content) {
  const up = String(content).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const out = [];
  for (let i = 0; i + 7 <= up.length; i++) {
    if (up[i] === 'F' && up[i + 1] === 'T') {
      const cand = up.slice(i, i + 7);
      if (/^FT[0-9A-Z]{5}$/.test(cand) && !out.includes(cand)) out.push(cand);
    }
  }
  return out;
}

/* ---------- 4. Xử lý ---------- */
export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const raw = await req.text();
  const provider = authenticate(req, raw);
  if (!provider) return json(401, { error: 'unauthorized' });

  let payload;
  try { payload = JSON.parse(raw); }
  catch { return json(400, { error: 'invalid_json' }); }

  const sb = admin();
  const tx = normalize(provider, payload);

  const logEvent = (result, matched) =>
    sb.from('payment_events').insert({
      provider,
      provider_ref: tx.ref || null,
      amount: tx.amount,
      content: tx.content,
      matched_order: matched || null,
      result,
      raw_payload: payload,
    });

  // Chỉ xử lý tiền VÀO
  if (tx.direction === 'out' || tx.amount <= 0) {
    await logEvent('no_match', null);
    return json(200, { success: true, skipped: 'not_incoming' });
  }

  // Chống xử lý trùng
  if (tx.ref) {
    const { data: dup } = await sb.from('payment_events')
      .select('id').eq('provider', provider).eq('provider_ref', tx.ref)
      .maybeSingle();
    if (dup) return json(200, { success: true, skipped: 'duplicate' });
  }

  const candidates = findOrderIds(tx.content);
  if (!candidates.length) {
    await logEvent('no_match', null);
    // Trả 200 để bên cung cấp không gửi lại mãi; FiTop đối soát tay từ bảng log.
    return json(200, { success: true, matched: false, reason: 'no_order_id' });
  }

  // Để DB chọn mã thật trong các ứng viên. Nếu nhiều mã cùng khớp,
  // ưu tiên đơn còn 'pending' và có số tiền trùng với số tiền nhận được.
  const { data: found } = await sb.from('orders')
    .select('order_id, total, status')
    .in('order_id', candidates);

  const order =
    (found || []).find((o) => o.status === 'pending' && Number(o.total) === tx.amount) ||
    (found || []).find((o) => o.status === 'pending') ||
    (found || [])[0];

  if (!order) {
    await logEvent('no_match', candidates.join(','));
    return json(200, { success: true, matched: false, reason: 'order_not_found' });
  }
  const oid = order.order_id;

  if (order.status === 'paid') {
    await logEvent('duplicate', oid);
    return json(200, { success: true, skipped: 'already_paid' });
  }

  // Thiếu tiền → không mở tài liệu, đưa về hàng chờ xử lý tay
  if (tx.amount + 1 < Number(order.total)) {
    await sb.from('orders').update({
      status: 'mismatch',
      paid_amount: tx.amount,
      provider, provider_ref: tx.ref || null,
      raw_payload: payload,
      note: `Chuyển thiếu: nhận ${tx.amount}, cần ${order.total}`,
    }).eq('order_id', oid).eq('status', 'pending');
    await logEvent('amount_mismatch', oid);
    return json(200, { success: true, matched: true, status: 'mismatch' });
  }

  // Đủ tiền → đánh dấu đã thanh toán.
  // Điều kiện .eq('status','pending') bảo đảm hai webhook song song
  // không cùng ghi 'paid' hai lần.
  const { data: updated } = await sb.from('orders').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
    paid_amount: tx.amount,
    provider, provider_ref: tx.ref || null,
    raw_payload: payload,
  }).eq('order_id', oid).eq('status', 'pending').select('order_id');

  await logEvent(updated && updated.length ? 'matched' : 'duplicate', oid);

  // Trigger accrue_commission() trong Supabase tự ghi hoa hồng CTV.
  // Báo sang CRM để HubSpot biết lead này đã thành khách trả tiền.
  if (updated && updated.length) {
    const { data: full } = await sb.from('orders')
      .select('order_id, package, total, paid_amount, customer_name, customer_phone, customer_email, coupon_code, ctv_code')
      .eq('order_id', oid).maybeSingle();
    if (full) {
      await pushOrderToHubspot(full, 'da_thanh_toan');
      // Luật 1: email xác nhận kèm link tài liệu
      const mail = await mailXacNhanDon(full);
      if (mail.ok) {
        await sb.from('orders')
          .update({ mail_paid_at: new Date().toISOString() })
          .eq('order_id', oid);
      }
    }
  }

  return json(200, { success: true, matched: true, status: 'paid', order_id: oid });
};

export const config = { path: '/api/payment-webhook' };
