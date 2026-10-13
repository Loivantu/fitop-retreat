// Nối "đã trả tiền" với "được xem tài liệu".
//
// Đơn chuyển sang paid thì ghi một dòng vào entitlements. Từ lúc đó khách
// đăng nhập bằng chính email trên đơn là thấy tài liệu của gói mình mua.
//
// Không có email trên đơn thì không ghi được quyền — gọi hàm này trả về
// { ok:false, ly_do:'khong_co_email' } để nơi gọi còn biết mà báo FiTop
// liên hệ khách xin email.

// Gói trên đơn hàng  →  gói trong bảng phân quyền.
// orders.package hiện dùng: online | usb | other
const BANG_GOI = {
  online: 'online',
  usb: 'usb',
  cuulo: 'cuulo',
  'cuu-lo': 'cuulo',
  nam: 'nam',
  year: 'nam',
};

// Gói năm hết hạn sau 12 tháng, các gói khác mua đứt
const SO_THANG = { nam: 12 };

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb  client service_role
 * @param {{order_id:string, package:string, customer_email:string}} don
 */
export async function ghiQuyen(sb, don) {
  const email = String(don?.customer_email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, ly_do: 'khong_co_email' };
  }

  const goi = BANG_GOI[String(don?.package || '').toLowerCase()];
  if (!goi) {
    // 'other' hoặc gói lạ: không đoán bừa, để người thật quyết
    return { ok: false, ly_do: 'goi_khong_tra_duoc', goi_tren_don: don?.package };
  }

  const batDau = new Date();
  const soThang = SO_THANG[goi];
  const hetHan = soThang
    ? new Date(new Date(batDau).setMonth(batDau.getMonth() + soThang)).toISOString()
    : null;

  const dong = {
    email,
    goi,
    order_id: don.order_id || null,
    bat_dau: batDau.toISOString(),
    het_han: hetHan,
    ghi_chu: `Đơn ${don.order_id || '—'}`,
  };

  // Khách mua lại cùng gói thì gia hạn, không tạo dòng thứ hai.
  //
  // Không dùng upsert được: chỉ số duy nhất trong 005_tailieu.sql đặt trên
  // biểu thức (lower(email), goi), mà PostgREST chỉ nhận onConflict theo tên
  // cột thật. Nên tra trước rồi mới quyết sửa hay thêm.
  const { data: cu } = await sb
    .from('entitlements')
    .select('id, het_han')
    .ilike('email', email)
    .eq('goi', goi)
    .maybeSingle();

  if (cu) {
    // Gói năm: cộng tiếp vào phần còn lại, đừng cắt mất những ngày khách đã trả
    let hetHanMoi = hetHan;
    if (soThang && cu.het_han && new Date(cu.het_han) > batDau) {
      const moc = new Date(cu.het_han);
      hetHanMoi = new Date(moc.setMonth(moc.getMonth() + soThang)).toISOString();
    }
    const { error } = await sb
      .from('entitlements')
      .update({ het_han: hetHanMoi, order_id: dong.order_id, ghi_chu: dong.ghi_chu })
      .eq('id', cu.id);
    if (error) {
      console.error('ghiQuyen: gia han that bai —', error.message);
      return { ok: false, ly_do: 'ghi_that_bai', chi_tiet: error.message };
    }
    return { ok: true, goi, het_han: hetHanMoi, gia_han: true };
  }

  const { error } = await sb.from('entitlements').insert(dong);
  if (error) {
    console.error('ghiQuyen: that bai —', error.message);
    return { ok: false, ly_do: 'ghi_that_bai', chi_tiet: error.message };
  }
  return { ok: true, goi, het_han: hetHan };
}
