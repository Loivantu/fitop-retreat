// GET /api/tai-file?ma=FT-01-OTA
// Header: Authorization: Bearer <access_token>
//
// Ba lớp trước khi một byte nào rời khỏi máy chủ:
//   1. Token phải hợp lệ            → biết chắc email là của người mở được hộp thư
//   2. Gói phải phủ nhóm tài liệu   → hàm duoc_tai() trong Supabase quyết
//   3. Thiết bị phải trong trần gói → một tài khoản không chia cho cả group
//
// Qua được ba lớp thì:
//   · PDF  → tải về máy chủ, đóng dấu mờ tên người mua vào từng trang, trả thẳng
//   · Khác → trả link ký hạn 10 phút (Excel/Word không đóng dấu được gọn gàng)
//
// Mọi lượt tải đều ghi vào document_access_log. Khi một bộ tài liệu rò ra
// ngoài, dấu mờ chỉ đúng một người, và nhật ký cho biết người đó tải lúc nào.
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { admin, json } from './_lib/supabase.js';
import { khachDangNhap, vanTayThietBi, trongTranThietBi } from './_lib/khachauth.js';

const KHO = 'tailieu';
const HAN_LINK = 600;                 // giây — 10 phút
const TRAN_DONG_DAU = 4 * 1024 * 1024; // PDF lớn hơn thì khỏi đóng dấu, trả link

// pdf-lib dùng phông chuẩn WinAnsi, không vẽ được dấu tiếng Việt.
// Bỏ dấu để dòng chữ hiện đúng thay vì ném lỗi giữa chừng.
const BO_DAU = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7E]/g, '');

async function dongDau(bytes, email, maDon) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const ngay = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });
  const cheo = BO_DAU(email);
  const chan = BO_DAU(
    `FiTop Retreat - Ban quyen cua ${email}${maDon ? ` - Don ${maDon}` : ''} - Tai ngay ${ngay}`
  );

  for (const trang of pdf.getPages()) {
    const { width, height } = trang.getSize();

    // Dấu chéo giữa trang: mờ, nằm dưới chữ, đủ đọc khi chụp màn hình
    const co = Math.max(18, Math.min(34, width / 18));
    trang.drawText(cheo, {
      x: width * 0.12,
      y: height * 0.42,
      size: co,
      font,
      color: rgb(0.78, 0.60, 0.23),   // vàng FiTop, nhạt
      opacity: 0.16,
      rotate: degrees(30),
    });

    // Dòng chân trang: nhỏ, rõ, để truy ra người tải
    trang.drawText(chan, {
      x: 28,
      y: 14,
      size: 7,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.85,
    });
  }

  return Buffer.from(await pdf.save());
}

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' });

  const ma = (new URL(req.url).searchParams.get('ma') || '').trim();
  if (!ma || ma.length > 60) return json(400, { error: 'thieu_ma_tai_lieu' });

  const ai = await khachDangNhap(req);
  if (!ai.ok) return json(ai.status, { error: ai.error });

  const sb = admin();
  const vanTay = vanTayThietBi(req);

  const tran = await trongTranThietBi(sb, ai.email, vanTay);
  if (!tran.ok) {
    return json(tran.status, {
      error: tran.error,
      so_thiet_bi: tran.so_thiet_bi,
      tran: tran.tran,
    });
  }

  const { data: quyen, error: loiQuyen } = await sb.rpc('duoc_tai', {
    p_email: ai.email,
    p_ma: ma,
  });
  if (loiQuyen) {
    console.error('tai-file: tra quyen that bai —', loiQuyen.message);
    return json(500, { error: 'tra_quyen_that_bai' });
  }

  const q = Array.isArray(quyen) ? quyen[0] : quyen;
  if (!q?.duoc || !q?.duong_dan) {
    return json(403, { error: 'khong_co_quyen_voi_tai_lieu_nay' });
  }

  // Ghi nhật ký TRƯỚC khi trả file — thà thừa một dòng còn hơn mất dấu vết
  await sb.from('document_access_log').insert({
    email: ai.email,
    doc_ma: ma,
    hanh_dong: 'tai',
    ip: req.headers.get('x-nf-client-connection-ip') || null,
    thiet_bi: vanTay,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
  });

  const laPdf = (q.dinh_dang || '').toLowerCase() === 'pdf'
    || /\.pdf$/i.test(q.duong_dan);

  if (laPdf) {
    const { data: blob, error: loiTai } = await sb.storage.from(KHO).download(q.duong_dan);
    if (loiTai || !blob) {
      console.error('tai-file: khong tai duoc tu kho —', loiTai?.message);
      return json(502, { error: 'khong_doc_duoc_file' });
    }
    const goc = Buffer.from(await blob.arrayBuffer());

    if (goc.length <= TRAN_DONG_DAU) {
      try {
        const daDau = await dongDau(goc, ai.email, null);
        return new Response(daDau, {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-disposition':
              `attachment; filename="${BO_DAU(q.ten || ma).replace(/[^\w .-]/g, '_')}.pdf"`,
            'cache-control': 'no-store',
          },
        });
      } catch (e) {
        // PDF hỏng hoặc có mật khẩu: đừng chặn khách, quay về link ký hạn
        console.error('tai-file: dong dau that bai —', e.message);
      }
    }
  }

  const { data: link, error: loiLink } = await sb.storage
    .from(KHO)
    .createSignedUrl(q.duong_dan, HAN_LINK, { download: true });

  if (loiLink || !link?.signedUrl) {
    console.error('tai-file: khong ky duoc link —', loiLink?.message);
    return json(502, { error: 'khong_ky_duoc_link' });
  }

  return json(200, {
    ok: true,
    ten: q.ten,
    dinh_dang: q.dinh_dang,
    url: link.signedUrl,
    het_han_sau_giay: HAN_LINK,
    dong_dau: false,
  });
};

export const config = { path: '/api/tai-file' };
