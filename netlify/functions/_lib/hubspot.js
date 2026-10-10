// Đẩy thông tin đơn hàng sang HubSpot.
//
// Dùng Forms Submission API — chỉ cần Portal ID + Form GUID, cả hai đều là
// mã công khai. KHÔNG dùng private app token, nên không có khoá bí mật nào
// ở đây. Nếu chưa khai Form GUID thì hàm im lặng bỏ qua, không làm hỏng
// luồng thanh toán.
//
// Quy ước phân vai (đã chốt trong tài liệu "Giải pháp CRM & tích hợp lead"):
//   CRM (HubSpot)  — lead, nuôi dưỡng, automation
//   Supabase       — đơn hàng, tài khoản, hoa hồng
// Hàm này là cầu nối một chiều: Supabase → HubSpot, để CRM biết lead nào
// đã trở thành khách trả tiền.

const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID || '247614091';
const REGION    = process.env.HUBSPOT_REGION || 'na2';
const FORM_ORDER = process.env.HUBSPOT_FORM_DONHANG || '';   // chưa có = tắt

function host() {
  return 'https://api' + (REGION && REGION !== 'na1' ? '-' + REGION : '') + '.hsforms.com';
}

// HubSpot gộp liên hệ theo email. Khách chỉ để số điện thoại thì sinh
// email giả theo đúng quy ước web đang dùng, để không tạo ra bản ghi trùng.
function emailFor(order) {
  const e = (order.customer_email || '').trim();
  if (e) return e;
  const p = String(order.customer_phone || '').replace(/\D/g, '');
  return p ? `sdt${p}@khach.fitop.com.vn` : '';
}

const PKG = { online: 'Tài liệu bản Online', usb: 'Tài liệu bản USB', other: 'Gói dịch vụ tư vấn' };

/**
 * @param {object} order  dòng trong bảng orders
 * @param {'da_thanh_toan'|'cho_thanh_toan'} stage
 */
export async function pushOrderToHubspot(order, stage = 'da_thanh_toan') {
  if (!FORM_ORDER || !PORTAL_ID) return { skipped: 'chua_khai_form_guid' };

  const email = emailFor(order);
  if (!email) return { skipped: 'khong_co_email_lan_sdt' };

  const amount = Number(order.paid_amount || order.total || 0);
  const ghiChu = [
    `Mã đơn: ${order.order_id}`,
    `Sản phẩm: ${PKG[order.package] || order.package}`,
    `Số tiền: ${amount.toLocaleString('vi-VN')}đ`,
    order.coupon_code ? `Mã ưu đãi: ${order.coupon_code}` : null,
    order.ctv_code ? `CTV giới thiệu: ${order.ctv_code}` : null,
    stage === 'da_thanh_toan' ? 'Trạng thái: ĐÃ THANH TOÁN' : 'Trạng thái: chờ thanh toán',
  ].filter(Boolean).join(' · ');

  const fields = [
    { name: 'email', value: email },
    order.customer_name  ? { name: 'firstname', value: order.customer_name } : null,
    order.customer_phone ? { name: 'phone', value: order.customer_phone } : null,
    { name: 'message', value: ghiChu },
  ].filter(Boolean);

  try {
    const r = await fetch(
      `${host()}/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_ORDER}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fields,
          context: { pageUri: 'https://fitop.com.vn/', pageName: 'Đơn hàng FiTop Retreat' },
          legalConsentOptions: {
            consent: {
              consentToProcess: true,
              text: 'Khách đã đặt mua trên fitop.com.vn và đồng ý cho FiTop liên hệ.',
            },
          },
        }),
      }
    );
    return { ok: r.ok, status: r.status };
  } catch (e) {
    // Không bao giờ để lỗi CRM làm hỏng việc xác nhận thanh toán
    return { ok: false, error: String(e) };
  }
}
