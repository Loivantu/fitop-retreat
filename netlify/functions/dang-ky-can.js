// POST /api/dang-ky-can
// Chủ nhà tự nộp tin ký gửi căn/khách sạn/homestay: thông tin + ảnh.
//
//   1. ghi vào bảng can_ky_gui (trạng thái 'cho_duyet')
//   2. ảnh lưu bucket can-anh (server tự đặt tên, chủ nhà không chọn tên)
//   3. gửi thư báo FiTop để duyệt
//
// Ghi bằng service_role nên bỏ qua RLS. Form công khai, không cần đăng nhập.
// Chống lạm dụng:
//   · bắt buộc tên căn + loại hợp lệ + số điện thoại Việt Nam
//   · tối đa 6 ảnh, mỗi ảnh ≤ 2MB sau giải mã, tổng ≤ 6MB
//   · cùng SĐT + cùng tên căn trong 10 phút thì bỏ qua (chống bấm 2 lần)
import { admin, json } from './_lib/supabase.js';
import { send } from './_lib/mail.js';

const BUCKET = 'can-anh';
const LOAI = new Set(['can_ho', 'homestay', 'hotel', 'villa', 'nha_nguyen_can', 'khac']);
const DON_VI = new Set(['dem', 'thang', 'ban']);
const MAX_ANH = 6;
const MAX_ANH_BYTES = 2 * 1024 * 1024;          // 2MB mỗi ảnh sau giải mã
const MAX_TONG_BYTES = 6 * 1024 * 1024;         // 6MB tổng (giới hạn thân request)

const cat = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
const num = (v) => {
  const n = Number(String(v == null ? '' : v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Số Việt Nam: 10 số bắt đầu bằng 0, hoặc dạng +84/84
function chuanSdt(s) {
  const d = String(s || '').replace(/\D/g, '');
  if (/^84\d{9}$/.test(d)) return '0' + d.slice(2);
  if (/^0\d{9}$/.test(d)) return d;
  return null;
}

// "data:image/jpeg;base64,xxxx" hoặc "xxxx" → { buf, ext, type }
function docAnh(item) {
  let raw = typeof item === 'string' ? item : (item && item.data) || '';
  let type = (item && item.type) || '';
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(raw);
  if (m) { type = type || m[1]; raw = m[2]; }
  if (!raw) return null;
  let buf;
  try { buf = Buffer.from(raw, 'base64'); } catch { return null; }
  if (!buf || !buf.length) return null;
  const ext = /png/i.test(type) ? 'png' : /webp/i.test(type) ? 'webp' : 'jpg';
  const ct = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { buf, ext, type: ct };
}

function maNgauNhien() {
  const h = '0123456789ABCDEF';
  let s = '';
  for (let i = 0; i < 6; i++) s += h[Math.floor(Math.random() * 16)];
  return 'KG-' + s;
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let b;
  try { b = await req.json(); }
  catch { return json(400, { error: 'invalid_json' }); }

  // --- Bắt buộc ---
  const ten = cat(b.ten, 160);
  const loai = cat(b.loai, 30).toLowerCase();
  const sdt = chuanSdt(b.lien_he_sdt);
  if (!ten) return json(400, { error: 'thieu_ten_can' });
  if (!LOAI.has(loai)) return json(400, { error: 'loai_khong_hop_le' });
  if (!sdt) return json(400, { error: 'so_dien_thoai_khong_hop_le' });

  // --- Tuỳ chọn ---
  const tinh      = cat(b.tinh, 80);
  const dia_chi   = cat(b.dia_chi, 300);
  const so_phong  = Number.isFinite(+b.so_phong) && +b.so_phong > 0 ? Math.min(999, Math.round(+b.so_phong)) : null;
  const dien_tich = num(b.dien_tich);
  const gia       = num(b.gia);
  let gia_don_vi  = cat(b.gia_don_vi, 10).toLowerCase();
  if (!DON_VI.has(gia_don_vi)) gia_don_vi = 'thang';
  const mo_ta     = cat(b.mo_ta, 2000);
  const lien_he_ten   = cat(b.lien_he_ten, 120);
  const lien_he_email = cat(b.lien_he_email, 160);
  let tien_ich = Array.isArray(b.tien_ich) ? b.tien_ich.map((t) => cat(t, 40)).filter(Boolean).slice(0, 20) : [];

  const sb = admin();

  // Chống trùng: cùng SĐT + cùng tên trong 10 phút.
  const moc = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: trung } = await sb.from('can_ky_gui')
    .select('id, ma').eq('lien_he_sdt', sdt).eq('ten', ten)
    .gte('created_at', moc).limit(1).maybeSingle();
  if (trung) return json(200, { ok: true, trung_lap: true, id: trung.id, ma: trung.ma });

  const ma = maNgauNhien();

  // --- Ảnh ---
  const anhVao = Array.isArray(b.anh) ? b.anh.slice(0, MAX_ANH) : [];
  const duongDan = [];
  let tong = 0;
  for (let i = 0; i < anhVao.length; i++) {
    const a = docAnh(anhVao[i]);
    if (!a) continue;
    if (a.buf.length > MAX_ANH_BYTES) return json(413, { error: 'anh_qua_lon', vi_tri: i + 1 });
    tong += a.buf.length;
    if (tong > MAX_TONG_BYTES) return json(413, { error: 'tong_anh_qua_lon' });
    const path = `${ma}/${i + 1}.${a.ext}`;
    const { error: loiUp } = await sb.storage.from(BUCKET).upload(path, a.buf, {
      contentType: a.type, upsert: true,
    });
    if (loiUp) {
      console.error('dang-ky-can: up anh loi —', loiUp.message);
      continue; // thiếu một ảnh không nên chặn cả tin
    }
    duongDan.push(path);
  }

  // --- Ghi tin ---
  const { data: row, error } = await sb.from('can_ky_gui').insert({
    ma, ten, loai,
    tinh: tinh || null,
    dia_chi: dia_chi || null,
    so_phong, dien_tich, gia, gia_don_vi,
    mo_ta: mo_ta || null,
    tien_ich,
    anh: duongDan,
    lien_he_ten: lien_he_ten || null,
    lien_he_sdt: sdt,
    lien_he_email: lien_he_email || null,
  }).select('id, ma').single();

  if (error) {
    console.error('dang-ky-can: ghi that bai —', error.message);
    return json(500, { error: 'ghi_that_bai' });
  }

  // --- Báo FiTop (không chặn luồng nếu mail lỗi) ---
  try {
    const LOAI_TEN = {
      can_ho: 'Căn hộ', homestay: 'Homestay', hotel: 'Khách sạn',
      villa: 'Villa', nha_nguyen_can: 'Nhà nguyên căn', khac: 'Khác',
    };
    const DV = { dem: 'đ/đêm', thang: 'đ/tháng', ban: 'đ (bán)' };
    const giaTxt = gia ? gia.toLocaleString('vi-VN') + ' ' + (DV[gia_don_vi] || '') : '(chưa nêu)';
    await send({
      to: process.env.MAIL_ADMIN || 'info@fitop.com.vn',
      subject: `[Căn ký gửi] ${ten} — ${LOAI_TEN[loai] || loai}`,
      html: `<p>Có tin căn mới chờ duyệt:</p>
        <ul>
          <li><b>Mã:</b> ${ma}</li>
          <li><b>Tên:</b> ${ten}</li>
          <li><b>Loại:</b> ${LOAI_TEN[loai] || loai}</li>
          <li><b>Khu vực:</b> ${tinh || '(chưa nêu)'}</li>
          <li><b>Giá:</b> ${giaTxt}</li>
          <li><b>Số ảnh:</b> ${duongDan.length}</li>
          <li><b>Liên hệ:</b> ${lien_he_ten || ''} — ${sdt}${lien_he_email ? ' — ' + lien_he_email : ''}</li>
        </ul>
        <p>Duyệt tại trang quản trị: <a href="https://fitop.com.vn/quan-ly-can">fitop.com.vn/quan-ly-can</a></p>`,
    });
  } catch (e) { console.error('dang-ky-can: mail loi —', e.message); }

  return json(200, { ok: true, id: row?.id || null, ma: row?.ma || ma, so_anh: duongDan.length });
};

export const config = { path: '/api/dang-ky-can' };
