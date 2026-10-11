// Luật 2 — nhắc đơn còn treo. Hàm theo giờ, Netlify tự gọi, không có URL
// công khai nên không ai gọi được từ ngoài.
//
// Quét các đơn:
//   status = 'pending'
//   tạo cách đây quá NHAC_SAU_GIO giờ (mặc định 24)
//   chưa từng nhắc  (mail_nhac_at is null)
//   còn trong hạn   (tạo cách đây dưới NHAC_BO_SAU_GIO giờ, mặc định 168 = 7 ngày)
//   có email
//
// Nhắc ĐÚNG MỘT LẦN mỗi đơn: ghi mail_nhac_at ngay sau khi gửi. Đơn quá 7 ngày
// thì thôi, không nhắc nữa — khách đã bỏ, nhắc thêm thành thư rác.
import { admin } from './_lib/supabase.js';
import { mailNhacDonTreo } from './_lib/mail.js';

const SAU   = Number(process.env.NHAC_SAU_GIO || 24);
const BO    = Number(process.env.NHAC_BO_SAU_GIO || 168);
const TRAN  = Number(process.env.NHAC_TOI_DA_MOI_LAN || 40);   // chặn trần Resend

export default async () => {
  const sb = admin();
  const now = Date.now();
  const tu  = new Date(now - BO  * 3600_000).toISOString();   // mới hơn mốc này
  const den = new Date(now - SAU * 3600_000).toISOString();   // cũ hơn mốc này

  const { data: dons, error } = await sb.from('orders')
    .select('order_id, package, total, customer_name, customer_email, created_at')
    .eq('status', 'pending')
    .is('mail_nhac_at', null)
    .not('customer_email', 'is', null)
    .gte('created_at', tu)
    .lte('created_at', den)
    .order('created_at', { ascending: true })
    .limit(TRAN);

  if (error) {
    console.error('nhac-don-treo: doc don that bai —', error.message);
    return new Response('loi_doc_don', { status: 500 });
  }

  let guiDuoc = 0, boQua = 0;
  for (const o of dons || []) {
    const kq = await mailNhacDonTreo(o);
    if (kq.ok) {
      // Ghi dấu NGAY, kể cả lần sau có lỗi cũng không gửi trùng
      await sb.from('orders')
        .update({ mail_nhac_at: new Date().toISOString() })
        .eq('order_id', o.order_id);
      guiDuoc++;
    } else {
      boQua++;
      // Thiếu khoá API thì dừng luôn, khỏi quét tiếp vô nghĩa
      if (kq.skipped === 'chua_khai_resend_api_key') break;
      console.warn('nhac-don-treo:', o.order_id, '—', kq.skipped || kq.error);
    }
  }

  console.log(`nhac-don-treo: xet ${dons?.length || 0} don, gui ${guiDuoc}, bo qua ${boQua}`);
  return new Response(JSON.stringify({ xet: dons?.length || 0, gui: guiDuoc, bo_qua: boQua }), {
    headers: { 'content-type': 'application/json' },
  });
};

// Mỗi giờ một lần. Đơn tạo lúc 10h sáng sẽ được nhắc trong khoảng 10–11h
// sáng hôm sau. Không cần sát phút.
export const config = { schedule: '@hourly' };
