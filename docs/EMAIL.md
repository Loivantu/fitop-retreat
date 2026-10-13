# Gửi email — Resend

Cập nhật 13/10/2026.

## Tên miền gửi

`email.fitop.com.vn` — tên miền phụ, **đã xác thực (Verified)** tại Resend.

Dùng tên miền phụ chứ không dùng thẳng `fitop.com.vn` vì hai lý do:

1. Uy tín gửi thư tách riêng. Thư quảng cáo bị báo spam không kéo theo tên miền chính.
2. `fitop.com.vn` đã có sẵn SPF và 3 bản ghi MX của hộp thư iNET (`onemail.vn`).
   Thêm SPF thứ hai vào gốc sẽ làm hỏng cả hai.

## Bản ghi DNS đã thêm tại iNET

Trong vùng DNS của `fitop.com.vn`:

| Loại | Tên | Nội dung |
|---|---|---|
| TXT | `resend._domainkey.email` | khoá DKIM, 218 ký tự |
| CNAME | `rsend.email` | `rsend-apne1.forge.rmta.net` |
| CNAME | `send.email` | `send.forge.rmta.net` |

**Không thêm DMARC.** Resend đề xuất `_dmarc` nhưng bản ghi đó áp cho cả tên miền
gốc, ảnh hưởng tới hộp thư iNET. Để lại, khi nào rà soát xong mọi nguồn gửi thư
của công ty thì thêm sau.

## Biến môi trường trên Netlify

| Biến | Giá trị |
|---|---|
| `RESEND_API_KEY` | khoá `fitop-netlify`, tạo 13/10/2026 |
| `MAIL_FROM` | `FiTop Retreat <no-reply@email.fitop.com.vn>` |
| `MAIL_ADMIN` | `loivantu2019@gmail.com` |
| `NHAC_SAU_GIO` | `24` |

`MAIL_ADMIN` đang trỏ về Gmail cá nhân vì chuyển tiếp `info@fitop.com.vn`
chưa dựng. Khi dựng xong thì đổi lại.

## Hạn mức gói miễn phí

- 3.000 thư/tháng, 100 thư/ngày
- **Chỉ 1 khoá API.** Muốn khoá mới phải xoá khoá cũ — Resend chỉ hiện giá trị
  đầy đủ đúng một lần lúc tạo, không xem lại được.
- 1 tên miền gửi

Trần `NHAC_TOI_DA_MOI_LAN` trong `nhac-don-treo.js` đặt 40 thư mỗi lượt quét,
nằm dưới hạn mức 100/ngày.

## Đổi khoá khi cần

1. resend.com/api-keys → xoá khoá cũ → tạo khoá mới
2. Khai lại `RESEND_API_KEY` trên Netlify
3. Build lại (bất kỳ commit nào cũng kích hoạt)
