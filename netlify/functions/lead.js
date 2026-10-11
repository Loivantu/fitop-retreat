// POST /api/lead   { form, name, phone, email?, business?, note?, ctv_code? }
// Luật 3 — khách để lại thông tin trên web thì:
//   1. ghi vào bảng leads ở Supabase  → admin.html đếm được lead thật
//   2. gửi thư báo về FiTop            → không ai phải ngồi nhìn HubSpot
//
// Web vẫn gửi song song sang HubSpot như cũ (hàm hsLead trong index.html).
// Hàm này KHÔNG thay HubSpot, nó bù chỗ HubSpot không làm được: đếm lead
// trong admin.html và báo ngay khi có người để lại số.
//
// Ghi bằng service_role nên bỏ qua RLS. Không cần đăng nhập — form công khai.
// Chặn lạm dụng bằng:
//   · bắt buộc có họ tên + số điện thoại Việt Nam hợp lệ
//   · cùng số điện thoại + cùng nguồn trong 10 phút thì bỏ qua
//   · giới hạn độ dài mọi trường
import { admin, json } from './_lib/supabase.js';
import { mailLeadMoi } from './_lib/mail.js';

// Form trên web  →  giá trị cột source (giữ đúng quy ước 001_schema.sql:
// web | zalo-oa | ctv | facebook)
const NGUON = { datlich: 'web', ctv: 'ctv' };

const cat = (s, n) => String(s == null ? '' : s).trim().slice(0, n);

// Số Việt Nam: 10 số bắt đầu bằng 0, hoặc dạng +84/84
function chuanSdt(s) {
  const d = String(s || '').replace(/\D/g, '');
  if (/^84\d{9}$/.test(d)) return '0' + d.slice(2);
  if (/^0\d{9}$/.test(d)) return d;
  return null;
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let b;
  try { b = await req.json(); }
  catch { return json(400, { error: 'invalid_json' }); }

  const form = cat(b.form, 20).toLowerCase();
  const source = NGUON[form];
  if (!source) return json(400, { error: 'nguon_khong_hop_le' });

  const full_name = cat(b.name, 120);
  const phone = chuanSdt(b.phone);
  if (!full_name) return json(400, { error: 'thieu_ho_ten' });
  if (!phone) return json(400, { error: 'so_dien_thoai_khong_hop_le' });

  const email         = cat(b.email, 160);
  const property_type = cat(b.business, 120);
  const message       = cat(b.note, 1000);
  const ctv_code      = cat(b.ctv_code, 40).toUpperCase();

  const sb = admin();

  // Chặn gửi trùng do khách bấm hai lần hoặc mạng gửi lại
  const mocTrung = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: trung } = await sb.from('leads')
    .select('id').eq('phone', phone).eq('source', source)
    .gte('created_at', mocTrung).limit(1).maybeSingle();
  if (trung) return json(200, { ok: true, trung_lap: true });

  const { data: lead, error } = await sb.from('leads').insert({
    source, full_name, phone,
    email: email || null,
    property_type: property_type || null,
    message: message || null,
    ctv_code: ctv_code || null,
  }).select('id').single();

  // Dù ghi lỗi vẫn báo thư — thà có thư còn hơn mất hẳn lead
  const mail = await mailLeadMoi({
    form, name: full_name, phone, email, business: property_type, note: message,
  });

  if (error) {
    console.error('lead: ghi that bai —', error.message);
    return json(500, { error: 'ghi_that_bai', mail: mail.ok ? 'da_bao' : 'khong_bao_duoc' });
  }

  // Chỉ ghi dấu khi chắc chắn có id — tránh gửi câu update thiếu điều kiện
  if (mail.ok && lead?.id) {
    await sb.from('leads')
      .update({ mail_bao_at: new Date().toISOString() })
      .eq('id', lead.id);
  }

  return json(200, {
    ok: true,
    id: lead?.id || null,
    mail: mail.ok ? 'da_bao' : (mail.skipped || 'loi'),
  });
};

export const config = { path: '/api/lead' };
