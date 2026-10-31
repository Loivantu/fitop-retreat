// Ma QR Zalo OA FiTop Retreat — https://zalo.me/645264228537648840
//
// Luu duoi dang ma tran 25x25 dong goi hex, khong phai anh PNG.
//
// VI SAO: ban dau file nay chua PNG base64 4.9KB. Khi chuyen qua trinh duyet
// de day len GitHub, chuoi bi sai o giua ma hai phep kiem — so byte va chu ky
// PNG — deu khong bat duoc, vi base64 sai van giai ma ra dung so byte va bon
// byte dau van la chu ky PNG. Ket qua: PDF phat di khong co QR suot mot luc.
//
// Chuoi hex duoi day chi 157 ky tu va co ham kiem tra di kem, sai mot ky tu la
// maKiemTra() tra ve khac MA_KIEM_TRA. Doi QR thi chay lai ca hai so.
//
// Sinh lai khi doi OA:
//   const q = require('qrcode').create(url, { errorCorrectionLevel: 'M' });
//   // roi dong goi q.modules.data thanh hex theo dung thu tu tren xuong, trai sang phai

export const LINK_OA = 'https://zalo.me/645264228537648840';
export const QR_SIZE = 25;
export const QR_HEX =
  'fe3dbfc11e906eab4bb75b35dbab12ec145d07faaafe01a500be323e5c380892b16b7a373d166497bd6464aaecbf77519371a28afa0076c63f822af0' +
  '5f119ba87fadd40f7eebfa1b041bb9fef95f8';
export const MA_KIEM_TRA = 196809108;

/** Bam chuoi hex de phat hien sai lech khi sao chep. */
export function maKiemTra(s = QR_HEX) {
  let t = 0;
  for (const c of s) t = (t * 31 + c.charCodeAt(0)) >>> 0;
  return t;
}

/**
 * Tra ve mang 0/1 dai QR_SIZE * QR_SIZE, doc tu tren xuong, trai sang phai.
 * Nem loi neu chuoi hex sai — tha khong co QR con hon in ra mot ma vo nghia.
 */
export function oQr() {
  if (maKiemTra() !== MA_KIEM_TRA) throw new Error('QR_HEX sai ma kiem tra');
  const o = [];
  for (const c of QR_HEX) {
    const v = parseInt(c, 16);
    o.push((v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1);
  }
  return o.slice(0, QR_SIZE * QR_SIZE);
}
