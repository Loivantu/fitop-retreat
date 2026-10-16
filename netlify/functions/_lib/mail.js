// Gửi email cho khách và cho FiTop, qua Resend.
//
// Khoá RESEND_API_KEY lấy từ biến môi trường Netlify — KHÔNG bao giờ ghi vào
// mã nguồn. Chưa khai khoá thì mọi hàm ở đây im lặng bỏ qua, không làm hỏng
// luồng thanh toán. Cùng một tài khoản Resend dùng cho hai việc:
//   1. API key ở đây  → 3 luật tự động của FiTop
//   2. SMTP cùng tài khoản → Supabase Auth (link đăng nhập), khai riêng
//      trong Supabase Dashboard: smtp.resend.com, cổng 465, user "resend".
//
// Biến môi trường:
//   RESEND_API_KEY   bắt buộc, nếu thiếu thì không gửi gì
//   MAIL_FROM        mặc định 'FiTop Retreat <no-reply@fitop.com.vn>'
//   MAIL_REPLY_TO    tuỳ chọn — hộp thư thật để khách bấm Trả lời
//   MAIL_ADMIN       nơi nhận thư báo nội bộ, mặc định info@fitop.com.vn

const API = 'https://api.resend.com/emails';

const FROM     = process.env.MAIL_FROM || 'FiTop Retreat <no-reply@fitop.com.vn>';
const REPLY_TO = (process.env.MAIL_REPLY_TO || '').trim();
const ADMIN    = process.env.MAIL_ADMIN || 'info@fitop.com.vn';

// Thông tin pháp nhân — bắt buộc có trên email thương mại (NĐ 52/2013, 85/2021)
const DN = {
  ten:  'CÔNG TY TNHH TƯ VẤN & DỊCH VỤ FITOP',
  mst:  '0317740194',
  dchi: 'Lầu 5, số 15 Trần Khắc Chân, Phường Tân Định, TP. Hồ Chí Minh',
  zalo: 'https://zalo.me/645264228537648840',
  web:  'https://fitop.com.vn',
};

// Tài khoản nhận tiền — đang công khai trên fitop.com.vn
const BANK = {
  bin:  process.env.BANK_BIN || '970432',
  acc:  process.env.BANK_ACC || '92779',
  ten:  process.env.BANK_NAME || 'CONG TY TNHH TU VAN VA DICH VU FITOP',
  nhan: process.env.BANK_LABEL || 'VPBank',
};

const NAVY = '#16202E', GOLD = '#C69A3A', GOLD_DK = '#A8781F';

const SP = {
  online: 'Tài liệu bản Online',
  usb:    'Tài liệu bản USB',
  other:  'Gói dịch vụ tư vấn',
};

const tien = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

// Chặn chèn thẻ HTML qua tên hoặc ghi chú của khách
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------------------------------------------------------------- khung thư */

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
      Thư này được gửi tự động cho đơn hàng của anh/chị trên fitop.com.vn.
      Anh/chị có quyền yêu cầu xem, sửa, xoá thông tin đã gửi theo
      Nghị định 13/2023/NĐ-CP qua Zalo ở trên.
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

function bangDon(o, hangThem = []) {
  const hang = [
    ['Mã đơn', `<strong style="font-family:monospace;font-size:15px">${esc(o.order_id)}</strong>`],
    ['Sản phẩm', esc(SP[o.package] || o.package || '—')],
    ...hangThem,
  ];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="border:1px solid #E8E2D6;border-radius:8px;margin:16px 0">${
    hang.map(([k, v], i) => `<tr>
    <td style="padding:10px 14px;${i ? 'border-top:1px solid #F0EBE0;' : ''}
        color:#6B6B6B;font-size:13px;width:42%">${k}</td>
    <td style="padding:10px 14px;${i ? 'border-top:1px solid #F0EBE0;' : ''}
        color:#2A2A2A;font-size:13px">${v}</td></tr>`).join('')
  }</table>`;
}

/* ------------------------------------------------------------------- gửi đi */

/**
 * Gửi một email. Không bao giờ ném lỗi ra ngoài.
 * @returns {Promise<{ok:boolean, skipped?:string, status?:number, id?:string, error?:string}>}
 */
export async function send({ to, subject, html, replyTo, bcc }) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return { ok: false, skipped: 'chua_khai_resend_api_key' };

  const nhan = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!nhan.length) return { ok: false, skipped: 'khong_co_nguoi_nhan' };

  const body = { from: FROM, to: nhan, subject, html };
  const rt = (replyTo || REPLY_TO).trim();
  if (rt) body.reply_to = rt;
  if (bcc) body.bcc = Array.isArray(bcc) ? bcc : [bcc];

  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, status: r.status, error: d?.message || 'resend_loi' };
    return { ok: true, id: d?.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* --------------------------------------------- LUẬT 1 — xác nhận đã trả tiền */

/**
 * Gửi email xác nhận sau khi đơn chuyển sang 'paid'.
 * Có link tài liệu nếu đã khai DOC_URL_ONLINE / DOC_URL_USB.
 */
export async function mailXacNhanDon(o) {
  const to = (o.customer_email || '').trim();
  if (!to || !to.includes('@')) return { ok: false, skipped: 'khach_khong_de_email' };

  const soTien = Number(o.paid_amount || o.total || 0);

  const them = [
    ['Số tiền đã nhận', `<strong>${tien(soTien)}</strong>`],
    o.coupon_code ? ['Mã ưu đãi', esc(o.coupon_code)] : null,
    ['Trạng thái', '<strong style="color:#1F7A45">Đã thanh toán</strong>'],
  ].filter(Boolean);

  // Tài liệu giao qua thư viện có đăng nhập, không gửi link file trong thư.
  // Thư bị chuyển tiếp thì người nhận vẫn phải mở được hộp thư này mới vào được.
  // o.quyen là kết quả ghiQuyen() — không ghi được quyền thì đừng hứa suông.
  const daMoQuyen = o.quyen?.ok === true;

  const phanUsb = o.package === 'usb'
    ? `<p>Bộ USB bản cứng sẽ được FiTop gửi tới anh/chị. Nhân viên liên hệ trong
       24 giờ làm việc để xác nhận địa chỉ nhận hàng.</p>`
    : '';

  const phanLink = daMoQuyen
    ? `<p>Thư viện tài liệu của anh/chị đã mở. Vào bằng chính địa chỉ email này —
       không cần mật khẩu, mỗi lần vào hệ thống gửi một link đăng nhập.</p>
       ${nut('https://fitop.com.vn/tailieu', 'Mở thư viện tài liệu')}
       <p style="font-size:12px;color:#6B6B6B">Đăng nhập bằng
       <strong>${esc(to)}</strong>. Mỗi bản tải về có đóng dấu tên anh/chị, nên
       đừng chuyển tiếp thư này hay chia tài khoản cho người ngoài.</p>
       ${phanUsb}`
    : `${phanUsb}<p>FiTop đang mở quyền xem tài liệu cho anh/chị và sẽ báo lại
       trong 24 giờ làm việc. Cần gấp, anh/chị nhắn
       <a href="${DN.zalo}" style="color:${GOLD_DK}">Zalo</a>.</p>`;

  const than = `
    <p style="margin:0 0 4px">Kính gửi <strong>${esc(o.customer_name || 'anh/chị')}</strong>,</p>
    <p>FiTop đã nhận được tiền cho đơn hàng dưới đây. Cảm ơn anh/chị đã tin dùng.</p>
    ${bangDon(o, them)}
    ${phanLink}
    <p style="margin-top:20px">Mọi thắc mắc về đơn hàng, anh/chị nhắn Zalo kèm mã đơn <strong>${esc(o.order_id)}</strong>
       để FiTop tra nhanh nhất.</p>`;

  return send({
    to,
    subject: `FiTop Retreat — đã nhận thanh toán đơn ${o.order_id}`,
    html: khung(`Xác nhận thanh toán ${o.order_id}`, than),
    bcc: ADMIN,
  });
}

/* ------------------------------------------------ LUẬT 2 — nhắc đơn còn treo */

/** Nhắc một lần với đơn 'pending' quá hạn. */
export async function mailNhacDonTreo(o) {
  const to = (o.customer_email || '').trim();
  if (!to || !to.includes('@')) return { ok: false, skipped: 'khach_khong_de_email' };

  const soTien = Number(o.total || 0);
  const note = `FITOP ${o.order_id}`;
  const qr = `https://img.vietqr.io/image/${BANK.bin}-${BANK.acc}-compact2.png`
           + `?amount=${soTien}&addInfo=${encodeURIComponent(note)}`
           + `&accountName=${encodeURIComponent(BANK.ten)}`;

  const them = [
    ['Số tiền cần chuyển', `<strong>${tien(soTien)}</strong>`],
    ['Ngân hàng', `${esc(BANK.nhan)} — số tài khoản <strong>${esc(BANK.acc)}</strong>`],
    ['Chủ tài khoản', esc(BANK.ten)],
    ['Nội dung chuyển khoản', `<strong style="font-family:monospace">${esc(note)}</strong>`],
  ];

  const than = `
    <p style="margin:0 0 4px">Kính gửi <strong>${esc(o.customer_name || 'anh/chị')}</strong>,</p>
    <p>Đơn hàng của anh/chị trên fitop.com.vn vẫn đang chờ thanh toán.
       Thông tin chuyển khoản như sau:</p>
    ${bangDon(o, them)}
    <p style="margin:0 0 10px"><strong>Quét mã để chuyển nhanh:</strong></p>
    <img src="${qr}" alt="Mã QR chuyển khoản ${esc(o.order_id)}" width="220"
         style="display:block;border:1px solid #E8E2D6;border-radius:8px">
    <p style="margin-top:16px;font-size:13px;color:#6B6B6B">
       Nhớ ghi đúng nội dung <strong style="font-family:monospace">${esc(note)}</strong>
       để hệ thống tự nhận và mở tài liệu ngay. Ghi sai nội dung thì FiTop phải
       đối soát tay, chậm hơn.</p>
    <p>Đơn đã thanh toán rồi mà vẫn nhận được thư này, hoặc anh/chị không còn
       nhu cầu, nhắn giúp FiTop qua
       <a href="${DN.zalo}" style="color:${GOLD_DK}">Zalo</a>.</p>
    <p style="font-size:12px;color:#9A9A9A">FiTop chỉ nhắc một lần duy nhất cho mỗi đơn.</p>`;

  return send({
    to,
    subject: `FiTop Retreat — đơn ${o.order_id} đang chờ thanh toán`,
    html: khung(`Nhắc thanh toán ${o.order_id}`, than),
  });
}

/* ------------------------------------------------- LUẬT 3 — báo lead mới nội bộ */

/** Báo về FiTop khi có người để lại thông tin. Thư nội bộ, không gửi khách. */
export async function mailLeadMoi(lead) {
  const nguon = { datlich: 'Đặt lịch đánh giá', ctv: 'Đăng ký cộng tác viên' };
  const ten = nguon[lead.form] || lead.form || 'Lead mới';
  const hang = [
    ['Họ tên', esc(lead.name || '—')],
    ['Điện thoại', lead.phone
      ? `<a href="tel:${esc(String(lead.phone).replace(/\s/g, ''))}" style="color:${GOLD_DK};font-weight:700">${esc(lead.phone)}</a>`
      : '—'],
    ['Email', lead.email ? esc(lead.email) : '—'],
    ['Loại hình', esc(lead.business || '—')],
    ['Ghi chú', esc(lead.note || '—')],
  ];

  const than = `
    <p style="margin:0"><strong>${esc(ten)}</strong>
       — có người vừa để lại thông tin trên fitop.com.vn.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #E8E2D6;border-radius:8px;margin:16px 0">${
      hang.map(([k, v], i) => `<tr>
      <td style="padding:10px 14px;${i ? 'border-top:1px solid #F0EBE0;' : ''}
          color:#6B6B6B;font-size:13px;width:34%">${k}</td>
      <td style="padding:10px 14px;${i ? 'border-top:1px solid #F0EBE0;' : ''}
          color:#2A2A2A;font-size:13px">${v}</td></tr>`).join('')
    }</table>
    <p style="font-size:13px;color:#6B6B6B">Cam kết trên web là gọi lại trong
       <strong>24 giờ làm việc</strong>.</p>`;

  return send({
    to: ADMIN,
    subject: `[Lead] ${lead.name || lead.phone || 'khách mới'} — ${ten}`,
    html: khung('Lead mới từ fitop.com.vn', than),
    replyTo: (lead.email || '').trim() || undefined,
  });
}
