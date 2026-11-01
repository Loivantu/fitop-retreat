// Đóng dấu mờ tên người nhận vào từng trang PDF.
//
// Dùng cho trang /mau — bản tài liệu phát miễn phí vẫn phải truy được nguồn.
//
// GHI CHÚ NỢ KỸ THUẬT: tai-file.js hiện có một bản đóng dấu riêng gần giống
// hệt. Hai bản nên gộp làm một, nếu không sớm muộn dấu trên bản phát miễn phí
// sẽ lệch dấu trên bản bán, và lúc đó truy nguồn rò rỉ sẽ chỉ sai người.
// Chưa gộp ở lần này vì sửa tai-file.js là động vào đường thanh toán đang
// chạy — để riêng một lần làm, có kiểm thử đàng hoàng.
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { QR_SIZE, oQr } from './qr.js';

// pdf-lib dùng phông chuẩn WinAnsi, không vẽ được dấu tiếng Việt.
// Bỏ dấu để dòng chữ hiện đúng thay vì ném lỗi giữa chừng.
export const BO_DAU = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7E]/g, '');

/**
 * @param {Uint8Array|Buffer} bytes  PDF gốc
 * @param {string} email             người nhận — hiện trên dấu chéo và chân trang
 * @param {string|null} ghiChu       dòng thêm ở chân trang, ví dụ 'Ban mau mien phi'
 */
export async function dongDau(bytes, email, ghiChu) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  // Mã QR Zalo OA, nhúng một lần rồi vẽ lại trên mọi trang.
  // Mỗi file phát đi là một tờ rơi: người cầm nó đang làm đúng nghề mình bán,
  // nên chân trang phải có đường quay về OA, không chỉ có dấu chống phát tán.
  // Vẽ bằng ô vuông thay vì nhúng ảnh: ô vuông nét ở mọi cỡ, và chuỗi 157 ký tự
  // có mã kiểm tra nên không thể hỏng âm thầm như base64 ảnh.
  // Gộp các ô đen liền nhau trên cùng một hàng thành một hình chữ nhật, để số
  // lệnh vẽ giảm từ 625 xuống khoảng 150 mỗi trang.
  let hangQr = null;
  try {
    const o = oQr();
    hangQr = [];
    for (let h = 0; h < QR_SIZE; h++) {
      let dau = -1;
      for (let c = 0; c <= QR_SIZE; c++) {
        const den = c < QR_SIZE && o[h * QR_SIZE + c] === 1;
        if (den && dau < 0) dau = c;
        if (!den && dau >= 0) { hangQr.push([h, dau, c - dau]); dau = -1; }
      }
    }
  } catch (e) {
    hangQr = null; // hỏng QR thì vẫn đóng dấu như cũ, không chặn việc gửi file
  }

  const ngay = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });
  const cheo = BO_DAU(email);
  const chan = BO_DAU(
    `FiTop Retreat - Ban quyen cua ${email}` +
    `${ghiChu ? ` - ${ghiChu}` : ''}` +
    ` - Tai ngay ${ngay}`
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

    // Dòng chân trang: để truy ra người tải, và để chính người tải đọc được.
    // Bản đầu dùng cỡ 7 màu xám nhạt ở y=14 — kiểm tra ngày 29/10/2026 cho thấy
    // nó có thật trên cả 5 trang nhưng không ai đọc nổi trên điện thoại. Một con
    // dấu không đọc được thì không răn đe được ai, nên đậm và cao lên.
    trang.drawText(chan, {
      x: 28,
      y: 22,
      size: 8.5,
      font,
      color: rgb(0.28, 0.28, 0.28),
      opacity: 1,
    });

  }

  // Trang cuối cho mã QR.
  //
  // Bản trước vẽ QR vào góc dưới phải MỌI trang, và nó đè lên nội dung thật:
  // tài liệu FT-KD-06 in "Trang 1 / 4" ở x 520-570 cách đáy 15pt — đúng chỗ đó.
  // Đo lại cả bốn trang thì khoảng trống an toàn bên phải chỉ còn khoảng 20pt,
  // không đủ cho một mã quét được. Mỗi tài liệu lại có bố cục khác nhau, nên
  // không có toạ độ nào an toàn cho tất cả. Thêm hẳn một trang là cách duy nhất
  // chắc chắn không bao giờ che chữ của người ta.
  //
  // Chữ trên trang này cố tình chỉ dùng ký tự ASCII: phông Helvetica chuẩn của
  // pdf-lib không có dấu tiếng Việt, mà một trang bán hàng viết tiếng Việt
  // không dấu thì trông rẻ tiền. Tên thương hiệu và địa chỉ web thì vốn không dấu.
  if (hangQr && pdf.getPageCount() > 0) {
    const dam = await pdf.embedFont(StandardFonts.HelveticaBold);
    const { width: w0, height: h0 } = pdf.getPage(0).getSize();
    const t = pdf.addPage([w0, h0]);
    const giua = w0 / 2;

    const ten = 'FiTop Retreat';
    const coTen = 26;
    t.drawText(ten, {
      x: giua - dam.widthOfTextAtSize(ten, coTen) / 2,
      y: h0 - 150, size: coTen, font: dam, color: rgb(0.086, 0.125, 0.18),
    });

    const phu = 'HOSPITALITY OPERATIONS CONSULTING';
    const coPhu = 9;
    t.drawText(phu, {
      x: giua - font.widthOfTextAtSize(phu, coPhu) / 2,
      y: h0 - 172, size: coPhu, font, color: rgb(0.66, 0.52, 0.20),
    });

    t.drawRectangle({
      x: giua - 26, y: h0 - 198, width: 52, height: 3,
      color: rgb(0.78, 0.60, 0.23),
    });

    const canh = 168;
    const x = giua - canh / 2;
    const y = h0 - 420;
    const b = canh / QR_SIZE;
    for (const [hg, c, rong] of hangQr) {
      t.drawRectangle({
        x: x + c * b,
        y: y + (QR_SIZE - 1 - hg) * b,
        width: rong * b,
        height: b,
        color: rgb(0.086, 0.125, 0.18),
      });
    }

    const moi = 'Quet ma de theo doi Zalo OA';
    const coMoi = 13;
    t.drawText(moi, {
      x: giua - dam.widthOfTextAtSize(moi, coMoi) / 2,
      y: y - 46, size: coMoi, font: dam, color: rgb(0.086, 0.125, 0.18),
    });

    const web = 'fitop.com.vn/mau';
    const coWeb = 12;
    t.drawText(web, {
      x: giua - font.widthOfTextAtSize(web, coWeb) / 2,
      y: y - 68, size: coWeb, font, color: rgb(0.66, 0.52, 0.20),
    });

    const cty = 'CONG TY TNHH TU VAN & DICH VU FITOP  ·  MST 0317740194';
    const coCty = 8;
    t.drawText(cty, {
      x: giua - font.widthOfTextAtSize(cty, coCty) / 2,
      y: 48, size: coCty, font, color: rgb(0.55, 0.55, 0.55),
    });

    t.drawText(chan, {
      x: 28, y: 22, size: 8.5, font, color: rgb(0.28, 0.28, 0.28),
    });
  }

  return Buffer.from(await pdf.save());
}
