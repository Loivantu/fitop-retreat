# Các bước dựng — từ repo này đến chạy thật

Mỗi bước ghi rõ **ai làm**. Việc có mật khẩu, OTP, tài khoản ngân hàng:
anh Lợi tự làm, trợ lý AI không làm thay.

---

## Bước 1 — Đưa repo lên GitHub (anh Lợi)

Tạo repo rỗng tên `fitop-retreat` trên GitHub, **Private**, không tick
"Add a README". Rồi trong thư mục này:

```bash
git init
git add .
git commit -m "Khởi tạo repo: web tĩnh + Netlify Functions + schema Supabase"
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản>/fitop-retreat.git
git push -u origin main
```

Xong bước này, Claude Code đọc và sửa được trực tiếp cả repo — không còn
copy-paste từng đoạn qua chat.

---

## Bước 2 — Dựng bảng trên Supabase (anh Lợi bấm, AI đã viết sẵn SQL)

Supabase Studio → **SQL Editor** → **New query**:

1. Dán toàn bộ `supabase/001_schema.sql` → **Run**
2. Dán toàn bộ `supabase/002_rls.sql` → **Run**

Kiểm tra: **Table Editor** phải thấy 7 bảng `profiles`, `coupons`, `orders`,
`payment_events`, `commissions`, `commission_rates`, `leads`.

Lấy `service_role` key: **Project Settings → API → service_role**.
Copy, dán thẳng vào Netlify ở bước 3. Không dán vào chat, không lưu file.

---

## Bước 3 — Khai biến môi trường trên Netlify (anh Lợi)

Netlify → site `fitop-retreat` → **Site configuration → Environment variables**
→ **Add a variable**, lần lượt:

| Tên biến | Giá trị lấy ở đâu |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `SEPAY_WEBHOOK_KEY` | tự đặt một chuỗi dài bất kỳ, khai y hệt bên SePay |
| `DOC_URL_ONLINE` | link tài liệu bản Online |
| `DOC_URL_USB` | link tài liệu bản USB |

`CASSO_WEBHOOK_KEY` và `PAYOS_CHECKSUM_KEY` để trống nếu chưa dùng.

---

## Bước 4 — Nối Netlify với GitHub (anh Lợi)

Netlify → site → **Build & deploy → Link repository** → chọn `fitop-retreat`.
Từ đây mỗi lần `git push` là Netlify tự deploy.

---

## Bước 5 — Khai webhook ở dịch vụ đối soát (anh Lợi)

URL nhận tín hiệu:

```
https://fitop.com.vn/api/payment-webhook
```

**Nếu dùng SePay:** sepay.vn → Tích hợp webhook → dán URL trên, chọn
"Có tiền vào", khai API Key đúng chuỗi đã đặt ở `SEPAY_WEBHOOK_KEY`.

**Nếu dùng Casso:** cách khai tương tự, Casso gửi khoá qua header
`Secure-Token` — khai vào `CASSO_WEBHOOK_KEY`.

Mã nguồn nhận cả ba nhà cung cấp, nên đổi bên nào cũng không phải sửa code,
chỉ đổi biến môi trường.

---

## Bước 6 — Sửa web gọi API (AI làm, sau khi bước 1 xong)

Hiện `public/index.html` còn lưu đơn vào `localStorage` của trình duyệt.
Cần đổi thành:

1. Khách chọn gói → gọi `POST /api/create-order` → nhận `order_id`,
   `total`, `unlock_token`, `transfer_note`.
2. Sinh ảnh VietQR từ `total` và `transfer_note` server trả về
   (không tự tính lại ở trình duyệt).
3. Cứ 5 giây gọi `GET /api/order-status?order_id=…&token=…`;
   khi `status = "paid"` thì hiện "✅ Đã thanh toán" và mở `download_url`.
4. Dừng hỏi sau 15 phút, hiện số Zalo OA để khách nhắn nếu đã chuyển rồi.

Việc này sửa nhiều chỗ trong một file 176KB — nên làm sau khi repo đã lên
GitHub, để sửa trực tiếp và commit được.

---

## Bước 7 — Chạy thử (anh Lợi + AI)

1. Tạo một mã ưu đãi giảm gần hết trong bảng `coupons`, để tổng tiền còn
   **2.000đ** — chạy thử bằng tiền thật nhưng không tốn.
2. Đặt đơn trên web, quét QR, chuyển khoản đúng nội dung.
3. Kiểm tra: bảng `payment_events` có dòng `result = matched`;
   bảng `orders` có `status = paid`; web tự đổi sang "Đã thanh toán".
4. Thử sai nội dung chuyển khoản → phải thấy `result = no_match`,
   đơn vẫn `pending`. Đây là trường hợp FiTop xác nhận tay.
5. Thử chuyển thiếu tiền → đơn phải thành `mismatch`, **không** mở tài liệu.
6. Thử đơn có mã CTV → bảng `commissions` phải tự có một dòng
   `status = accrued` với đúng mức hoa hồng.

Lập biên bản nghiệm thu BM-04 theo quy trình ISO đã có.

---

## Bước 8 — Go-live

Tắt mã ưu đãi chạy thử. Thông báo nội bộ. Hướng dẫn khách giữ đúng
nội dung chuyển khoản `FITOP <mã đơn>`.

Giữ nguyên quy trình xác nhận tay làm dự phòng — bảng `payment_events`
là nơi tra khi khách nói "em đã chuyển rồi".
