// POST /api/track
// Ghi một lượt xem trang. Trang web gọi hàm này một lần khi tải xong.
//
// Không lưu địa chỉ IP. visitor_id là chuỗi băm từ IP + user-agent + ngày,
// đủ để đếm khách duy nhất trong ngày nhưng không truy ngược ra người cụ thể,
// và tự đổi mỗi ngày.
import crypto from 'node:crypto';
import { admin, json } from './_lib/supabase.js';

const SALT = process.env.VISITOR_SALT || 'fitop-retreat-2026';

function hashVisitor(ip, ua) {
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256')
    .update(`${SALT}|${day}|${ip}|${ua}`)
    .digest('hex').slice(0, 24);
}

// Quy nguồn truy cập về vài nhóm dễ đọc
function detectSource(referrer, utm) {
  const s = String(utm || referrer || '').toLowerCase();
  if (!s) return 'truc-tiep';
  if (s.includes('facebook') || s.includes('fb.')) return 'facebook';
  if (s.includes('zalo')) return 'zalo';
  if (s.includes('tiktok')) return 'tiktok';
  if (s.includes('google')) return 'google';
  if (s.includes('youtube')) return 'youtube';
  if (s.includes('fitop.com.vn')) return 'noi-bo';
  return 'khac';
}

function detectDevice(ua) {
  const u = String(ua).toLowerCase();
  if (/ipad|tablet/.test(u)) return 'tablet';
  if (/mobi|android|iphone/.test(u)) return 'mobile';
  return 'desktop';
}

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let body = {};
  try { body = await req.json(); } catch { /* vẫn ghi, coi như trang chủ */ }

  const ua = req.headers.get('user-agent') || '';

  // Bỏ qua bot: không tính vào số liệu
  if (/bot|crawler|spider|crawling|preview|headless|lighthouse/i.test(ua)) {
    return json(200, { ok: true, skipped: 'bot' });
  }

  const ip =
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    '0.0.0.0';

  const country = context?.geo?.country?.code || null;

  try {
    const sb = admin();
    await sb.from('page_views').insert({
      path: String(body.path || '/').slice(0, 300),
      referrer: body.referrer ? String(body.referrer).slice(0, 300) : null,
      source: detectSource(body.referrer, body.utm_source),
      device: detectDevice(ua),
      country,
      visitor_id: hashVisitor(ip, ua),
      session_id: body.session_id ? String(body.session_id).slice(0, 64) : null,
    });
  } catch (e) {
    // Không bao giờ để việc đếm lượt làm hỏng trang của khách
    return json(200, { ok: false });
  }

  return json(200, { ok: true });
};

export const config = { path: '/api/track' };
