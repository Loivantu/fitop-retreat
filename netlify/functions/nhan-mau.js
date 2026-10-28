// POST /api/nhan-mau   { email, bo }
//
// Trang fitop.com.vn/mau gọi hàm này. Khách chọn một bộ phận, để lại email,
// nhận NGAY một tài liệu thật của bộ đó qua thư — đã đóng dấu tên họ.
//
// Vì sao phát không một tài liệu đang bán: không ai chuyển 250.000đ cho một
// trang web họ vừa nhìn thấy lần đầu. Cho trước một file dùng được là cách rẻ
// nhất để chứng minh phần còn lại cũng dùng được.
//
// Sáu mã tài liệu dưới đây CỐ Ý trùng sáu từ khoá trong HD-FITOP-VIDEO-03 —
// mỗi video tầng B mời bình luận một từ khoá, từ khoá đó dẫn về đúng bộ này.
import { admin, json } from './_lib/supabase.js';
import { dongDau, BO_DAU } from './_lib/dongdau.js';
import { mailBanMau } from './_lib/mailmau.js';

const KHO = 'tailieu';

const MAU = {
  LT: { ma: 'FT-LT-04', ten: 'Lễ tân · Buồng phòng' },
  FB: { ma: 'FT-FB-07', ten: 'Nhà hàng · Bếp' },
  KD: { ma: 'FT-KD-06', ten: 'Kinh doanh · Marketing' },
  NS: { ma: 'FT-NS-01', ten: 'Nhân sự · Đào tạo' },
  TC: { ma: 'FT-TC-04', ten: 'Tài chính · Kiểm soát' },
  AT: { ma: 'FT-AT-08', ten: 'An toàn · Pháp lý' },
};

const TRAN_NGAY = 6;          // một email xin tối đa 6 lần trong 24h
const HOP_LE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let body;
  try { body = await req.json(); }
  catch { return json(400, { error: 'invalid_json' }); }

  const email = String(body.email || '').trim().toLowerCase();
  const bo    = String(body.bo || '').trim().toUpperCase().replace(/^BO-/, '');

  if (!HOP_LE.test(email) || email.length > 160) {
    return json(400, { error: 'email_khong_hop_le' });
  }
  if (!MAU[bo]) return json(400, { error: 'bo_khong_hop_le' });

  const sb = admin();
  const dinh = MAU[bo];

  // --- chặn lạm dụng: đếm theo email trong 24h ---
  const tu = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await sb
    .from('mau_yeu_cau')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', tu);

  if ((count || 0) >= TRAN_NGAY) {
    return json(429, { error: 'qua_nhieu_lan' });
  }

  // --- lấy tài liệu từ danh mục, không hardcode đường dẫn ---
  const { data: tl, error: loiTl } = await sb
    .from('documents')
    .select('ma, ten, duong_dan, dinh_dang')
    .eq('ma', dinh.ma)
    .eq('active', true)
    .maybeSingle();

  if (loiTl || !tl?.duong_dan) {
    console.error('nhan-mau: khong thay tai lieu', dinh.ma, loiTl?.message);
    return json(500, { error: 'chua_san_sang' });
  }

  // --- tải file gốc từ kho riêng tư ---
  const { data: blob, error: loiTai } = await sb.storage.from(KHO).download(tl.duong_dan);
  if (loiTai || !blob) {
    console.error('nhan-mau: khong tai duoc', tl.duong_dan, loiTai?.message);
    return json(502, { error: 'khong_doc_duoc_file' });
  }

  const goc = Buffer.from(await blob.arrayBuffer());
  const laPdf = (tl.dinh_dang || '').toLowerCase() === 'pdf' || /\.pdf$/i.test(tl.duong_dan);

  // PDF thì đóng dấu tên người nhận. Excel/Word pdf-lib không đóng được,
  // gửi nguyên bản — đây là bản phát miễn phí nên chấp nhận được.
  let bytes = goc;
  if (laPdf) {
    try { bytes = await dongDau(goc, email, 'Ban mau mien phi'); }
    catch (e) { console.error('nhan-mau: dong dau that bai, gui ban goc —', e.message); }
  }

  const duoi = laPdf ? 'pdf' : (tl.dinh_dang || 'pdf').toLowerCase();
  const tenFile = `${BO_DAU(tl.ten || tl.ma).replace(/[^\w .-]/g, '_').trim()}.${duoi}`;

  const thu = await mailBanMau({
    email,
    tenBo: dinh.ten,
    tenTaiLieu: tl.ten || tl.ma,
    maTaiLieu: tl.ma,
    tenFile,
    bytes,
    link: `https://fitop.com.vn/tailieu?bo=${bo}`,
  });

  // Ghi lại dù thư có gửi được hay không — đây là danh sách khách, đừng để mất
  await sb.from('mau_yeu_cau').insert({
    email,
    bo,
    doc_ma: tl.ma,
    da_gui: !!thu.ok,
    ly_do_hong: thu.ok ? null : (thu.error || thu.skipped || null),
    ip: req.headers.get('x-nf-client-connection-ip') || null,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
  });

  if (!thu.ok) {
    console.error('nhan-mau: gui thu hong —', thu.error || thu.skipped);
    return json(502, { error: 'khong_gui_duoc_thu' });
  }

  return json(200, { ok: true, bo, ten_bo: dinh.ten, tai_lieu: tl.ten });
};

export const config = { path: '/api/nhan-mau' };
