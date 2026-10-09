// POST /api/create-order
// Web gọi hàm này khi khách bấm chọn gói → sinh order_id và ghi đơn vào Supabase.
// Giá và mức giảm được TÍNH LẠI Ở ĐÂY, không tin số tiền do trình duyệt gửi lên.
import { admin, json } from './_lib/supabase.js';

// Giá niêm yết — sửa ở đây là nơi duy nhất
const PRICES = {
  online: { amount: 250000, label: 'Tài liệu bản Online' },
  usb:    { amount: 450000, label: 'Tài liệu bản USB' },
  other:  { amount: 0,      label: 'Gói dịch vụ tư vấn' }, // báo giá riêng
};

const newOrderId = () =>
  'FT' + Date.now().toString(36).slice(-5).toUpperCase();

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let body;
  try { body = await req.json(); }
  catch { return json(400, { error: 'invalid_json' }); }

  const pkg = String(body.package || '').toLowerCase();
  if (!PRICES[pkg]) return json(400, { error: 'unknown_package' });

  const sb = admin();
  const base = PRICES[pkg];

  // Giá gói 'other' do FiTop báo riêng → cho phép truyền amount nhưng chặn mức vô lý
  let amount = base.amount;
  if (pkg === 'other') {
    amount = Number(body.amount || 0);
    if (!Number.isFinite(amount) || amount < 100000 || amount > 500000000) {
      return json(400, { error: 'invalid_amount' });
    }
  }

  // --- tra mã ưu đãi từ DB, không tin dữ liệu trình duyệt ---
  let discount = 0, couponCode = null, ctvCode = null;
  const code = (body.coupon || '').trim().toUpperCase();
  if (code) {
    const { data: c } = await sb
      .from('coupons').select('*')
      .eq('code', code).eq('active', true).maybeSingle();

    const valid =
      c &&
      (!c.expires || new Date(c.expires + 'T23:59:59') >= new Date()) &&
      (c.applies.includes('all') || c.applies.includes(pkg)) &&
      amount >= Number(c.min_amount || 0);

    if (valid) {
      discount = c.type === 'percent'
        ? Math.round(amount * Number(c.value) / 100)
        : Math.min(Number(c.value), amount);
      couponCode = c.code;
      ctvCode = c.ctv_code || null;
    }
  }

  const total = Math.max(0, amount - discount);
  const order_id = newOrderId();

  const { data, error } = await sb.from('orders').insert({
    order_id,
    user_id: body.user_id || null,
    customer_name:  body.name  || null,
    customer_phone: body.phone || null,
    customer_email: body.email || null,
    package: pkg,
    description: base.label,
    amount, discount, total,
    coupon_code: couponCode,
    ctv_code: ctvCode,
    status: 'pending',
  }).select('order_id, total, discount, amount, unlock_token').single();

  if (error) return json(500, { error: 'insert_failed', detail: error.message });

  return json(200, {
    order_id: data.order_id,
    amount: data.amount,
    discount: data.discount,
    total: data.total,
    coupon: couponCode,
    unlock_token: data.unlock_token,     // web giữ để tra trạng thái
    transfer_note: `FITOP ${data.order_id}`,
  });
};

export const config = { path: '/api/create-order' };
