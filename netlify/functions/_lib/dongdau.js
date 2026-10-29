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

  return Buffer.from(await pdf.save());
}
