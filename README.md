# FiTop Retreat — fitop.com.vn

Website và hệ thống bán tài liệu / nhận yêu cầu khảo sát của
**CÔNG TY TNHH TƯ VẤN & DỊCH VỤ FITOP** (MST 0317740194).

## Kiến trúc

```
Trình duyệt khách  ──→  public/index.html        (tĩnh, Netlify CDN)
                            │
                            ├─→ POST /api/create-order      tạo đơn + sinh VietQR
                            └─→ GET  /api/order-status       hỏi "trả tiền chưa?"
                                      ▲
Dịch vụ đối soát    ──→  POST /api/payment-webhook           "tiền đã về"
(SePay / Casso / PayOS)           │
                                  ▼
                            Supabase Postgres
                      orders · coupons · commissions
                      profiles · payment_events · leads
```

Nguyên tắc: **trình duyệt không được tự quyết định đơn đã trả tiền hay chưa.**
Mọi thay đổi trạng thái đơn chỉ xảy ra trong Netlify Function, bằng
`service_role` key nằm ở biến môi trường. Khoá publishable trên web chỉ đọc
được mã ưu đãi đang bật và dữ liệu của chính người đăng nhập (xem
`supabase/002_rls.sql`).

## Thư mục

| Đường dẫn | Nội dung |
|---|---|
| `public/` | Trang tĩnh — Netlify publish thư mục này |
| `netlify/functions/` | Xử lý phía server |
| `supabase/001_schema.sql` | Bảng, trigger, bậc hoa hồng |
| `supabase/002_rls.sql` | Phân quyền dòng (Row Level Security) |
| `docs/DEPLOY.md` | Các bước dựng từ đầu |
| `.env.example` | Danh sách biến môi trường cần khai |

## Chạy trên máy

```bash
npm install
cp .env.example .env     # điền giá trị thật vào .env (file này không lên Git)
npx netlify dev          # mở http://localhost:8888
```

## Đưa lên Netlify

Netlify đọc `netlify.toml`, không cần cấu hình thêm trong giao diện —
trừ biến môi trường, phải khai tay ở
**Site configuration → Environment variables**.

## Quy tắc bảo mật — áp dụng không ngoại lệ

1. `service_role` key, khoá webhook, API token: chỉ ở biến môi trường Netlify.
   Không ghi vào mã nguồn, không dán qua chat, không chụp ảnh gửi đi.
2. Khoá publishable (`sb_publishable_…`) được phép nằm trong HTML — nó công khai
   theo thiết kế, và RLS là lớp chặn thật.
3. Mỗi đơn có `unlock_token` riêng. Không có token thì không trả link tài liệu.
4. Webhook luôn ghi log vào `payment_events`, kể cả khi không khớp đơn —
   để đối soát tay khi khách ghi sai nội dung chuyển khoản.
5. Giữ nguyên quy trình xác nhận tay làm dự phòng. Dịch vụ đối soát lỗi
   thì không mất đơn, chỉ chậm hơn.
