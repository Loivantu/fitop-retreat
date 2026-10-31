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

    // Mã QR Zalo OA ở góc dưới phải, kèm hai dòng chữ nhỏ bên trái nó.
    // Đặt cao hơn dòng chân trang để không đè lên, và đủ nhỏ để không chiếm chỗ
    // nội dung: 46pt vẫn quét được bằng điện thoại ở khoảng cách đọc bình thường.
    if (hangQr) {
      const canh = 46;
      const x = width - canh - 28;
      const y = 18;
      const b = canh / QR_SIZE;
      // Nền trắng quanh mã: máy quét cần vùng lặng, và trang PDF có thể có nền.
      trang.drawRectangle({
        x: x - 5, y: y - 5, width: canh + 10, height: canh + 10,
        color: rgb(1, 1, 1),
      });
      for (const [h, c, rong] of hangQr) {
        trang.drawRectangle({
          x: x + c * b,
          y: y + (QR_SIZE - 1 - h) * b,
          width: rong * b,
          height: b,
          color: rgb(0.086, 0.125, 0.18),
        });
      }
      trang.drawText('Quet de theo doi', {
        x: x - 104, y: y + 28, size: 7, font,
        color: rgb(0.45, 0.45, 0.45),
      });
      trang.drawText('Zalo OA FiTop', {
        x: x - 104, y: y + 17, size: 7, font,
        color: rgb(0.45, 0.45, 0.45),
      });
    }
  }

  return Buffer.from(await pdf.save());
}
