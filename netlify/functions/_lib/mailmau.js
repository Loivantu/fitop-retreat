// Gửi tài liệu mẫu kèm file đính kèm, cho trang /mau.
//
// Vì sao không dùng send() trong mail.js: hàm đó chưa nhận đính kèm. Sửa nó
// là động vào đường gửi thư của luồng thanh toán đang chạy, nên lần này thêm
// một hàm riêng chỉ lo việc đính kèm. Thư báo nội bộ (không đính kèm) vẫn gọi
// send() cũ để khỏi nhân đôi mẫu thư.
//
// Biến môi trường dùng chung với mail.js — giữ nguyên tên và giá trị mặc định,
// đổi ở Netlify là cả hai nơi cùng đổi:
//   RESEND_API_KEY · MAIL_FROM · MAIL_REPLY_TO · MAIL_ADMIN
import { send } from './mail.js';

const API      = 'https://api.resend.com/emails';
const FROM     = process.env.MAIL_FROM || 'FiTop Retreat <no-reply@fitop.com.vn>';
const REPLY_TO = (process.env.MAIL_REPLY_TO || '').trim();
const ADMIN    = process.env.MAIL_ADMIN || '';

const NAVY = '#16202E', GOLD = '#C69A3A', GOLD_DK = '#A07C24';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DN = {
  ten:  'CÔNG TY TNHH TƯ VẤN & DỊCH VỤ FITOP',
  mst:  '0317740194',
  dchi: 'Lầu 5, số 15 Trần Khắc Chân, Phường Tân Định, TP. Hồ Chí Minh',
  zalo: 'https://zalo.me/645264228537648840',
  web:  'https://fitop.com.vn',
};

function khung(tieude, than) {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(tieude)}</title></head>
<body style="margin:0;padding:0;background:#F4F2EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2EE">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="max-width:560px;background:#fff;border-radius:10px;overflow:hidden">
  <tr><td style="background:${NAVY};padding:22px 26px">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;
                font-weight:700;color:#fff;letter-spacing:.3px">FiTop Retreat</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;
                color:${GOLD};margin-top:3px;letter-spacing:1.2px;
                text-transform:uppercase">Tư vấn &amp; vận hành lưu trú</div>
  </td></tr>
  <tr><td style="padding:26px;font-family:Arial,Helvetica,sans-serif;
                 font-size:14px;line-height:1.65;color:#2A2A2A">${than}</td></tr>
  <tr><td style="padding:18px 26px;background:#FAF8F4;border-top:1px solid #E8E2D6;
                 font-family:Arial,Helvetica,sans-serif;font-size:11px;
                 line-height:1.6;color:#6B6B6B">
    <div><strong style="color:${NAVY}">${DN.ten}</strong></div>
    <div>Mã số doanh nghiệp: ${DN.mst}</div>
    <div>${DN.dchi}</div>
    <div style="margin-top:6px">
      <a href="${DN.zalo}" style="color:${GOLD_DK};text-decoration:none">Zalo</a>
      · <a href="${DN.web}" style="color:${GOLD_DK};text-decoration:none">fitop.com.vn</a>
    </div>
    <div style="margin-top:8px;color:#9A9A9A">
      Anh/chị nhận thư này vì đã để lại email tại fitop.com.vn/mau.
      Anh/chị có quyền yêu cầu xem, sửa hoặc xoá thông tin đã gửi theo
      Nghị định 13/2023/NĐ-CP — nhắn qua Zalo ở trên.
    </div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function nut(href, chu) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0">
<tr><td style="background:${GOLD};border-radius:6px">
<a href="${href}" style="display:inline-block;padding:12px 24px;
   font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;
   color:${NAVY};text-decoration:none">${esc(chu)}</a>
</td></tr></table>`;
}

/**
 * Gửi một tài liệu mẫu. File đã đóng dấu trước khi gọi hàm này.
 * Không bao giờ ném lỗi ra ngoài.
 *
 * @param {{email:string, tenBo:string, tenTaiLieu:string, maTaiLieu:string,
 *          tenFile:string, bytes:Buffer, link:string}} p
 * @returns {Promise<{ok:boolean, skipped?:string, status?:number, id?:string, error?:string}>}
 */
export async function mailBanMau(p) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return { ok: false, skipped: 'chua_khai_resend_api_key' };

  const to = (p.email || '').trim();
  if (!to || !to.includes('@')) return { ok: false, skipped: 'khong_co_email' };

  const than = `
    <p style="margin:0 0 14px">Chào anh/chị,</p>
    <p style="margin:0 0 14px">
      Đây là tài liệu mẫu anh/chị vừa yêu cầu — <strong>${esc(p.tenTaiLieu)}</strong>
      (${esc(p.maTaiLieu)}), thuộc bộ <strong>${esc(p.tenBo)}</strong>.
      File đính kèm ngay trong thư này, dùng được luôn.
    </p>
    <p style="margin:0 0 14px">
      Bản này có đóng dấu tên người nhận ở chân mỗi trang. Anh/chị cứ dùng
      trong nội bộ cơ sở của mình.
    </p>
    <p style="margin:0 0 6px"><strong>Bộ đầy đủ có gì</strong></p>
    <p style="margin:0 0 14px">
      Bộ ${esc(p.tenBo)} gồm trọn các quy trình và biểu mẫu của bộ phận này.
      Khi nào anh/chị thấy tài liệu mẫu dùng được thì xem thêm ở đây.
    </p>
    ${nut(p.link, 'Xem bộ đầy đủ')}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
      style="width:100%;margin:26px 0 0;border-top:1px solid #E2DACB">
      <tr>
        <td style="padding:20px 0 0;vertical-align:top">
          <p style="margin:0 0 6px;font-weight:700">Theo dõi FiTop trên Zalo</p>
          <p style="margin:0 0 12px;color:#5D6775;font-size:14px;line-height:1.55">
            Mỗi tuần một quy trình thật, rút từ thư viện 66 tài liệu.
            Cần hỏi gì về vận hành, anh/chị nhắn thẳng ở đó.
          </p>
          <a href="${DN.zalo}" style="display:inline-block;padding:10px 20px;
            background:#16202E;color:#FFFFFF;border-radius:4px;
            font-weight:700;font-size:14px;text-decoration:none">Quan tâm Zalo OA</a>
        </td>
      </tr>
    </table>`;

  const body = {
    from: FROM,
    to: [to],
    subject: `Tài liệu mẫu: ${p.tenTaiLieu} — FiTop Retreat`,
    html: khung('Tài liệu mẫu từ FiTop Retreat', than),
    attachments: [{
      filename: p.tenFile,
      content: Buffer.from(p.bytes).toString('base64'),
    }],
  };
  if (REPLY_TO) body.reply_to = REPLY_TO;

  let kq;
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    kq = r.ok ? { ok: true, id: d?.id }
              : { ok: false, status: r.status, error: d?.message || 'resend_loi' };
  } catch (e) {
    kq = { ok: false, error: String(e) };
  }

  // Báo nội bộ — dùng lại send() cũ, không đính kèm file.
  // Hỏng cũng mặc kệ: khách đã nhận được thư là việc chính.
  if (ADMIN) {
    try {
      await send({
        to: ADMIN,
        subject: `[Mẫu] ${p.tenBo} — ${to}`,
        html: khung('Có người nhận tài liệu mẫu', `
          <p style="margin:0 0 10px">Email: <strong>${esc(to)}</strong></p>
          <p style="margin:0 0 10px">Bộ quan tâm: <strong>${esc(p.tenBo)}</strong></p>
          <p style="margin:0">Đã gửi: ${esc(p.maTaiLieu)} — ${esc(p.tenTaiLieu)}</p>`),
      });
    } catch (e) { /* im lặng */ }
  }

  return kq;
}
