# Quyết định kiến trúc & lý do

Ghi lại để sau này không phải bàn lại. Mỗi quyết định kèm lý do và điều kiện
để đổi ý.

---

## 1. Hai repo, một Supabase

| | Quyết định |
|---|---|
| Mã nguồn | 2 repo: `fitop-retreat`, `loinel` |
| Hosting | 2 site Netlify |
| Dữ liệu | **1** project Supabase |

Tách repo vì hai web khác mục đích và khác nhịp sửa — sửa LOINEL không được
có rủi ro làm sập trang đang bán tài liệu. Chung Supabase vì khách đăng nhập
một lần dùng cả hai web, và vì một CTV giới thiệu cả tài liệu FiTop lẫn tin
đăng LOINEL thì hoa hồng phải gom về một bảng. Hai project Supabase sẽ phải
đồng bộ tay và tốn phí gấp đôi khi vượt gói miễn phí.

**Đổi ý khi nào:** nếu LOINEL tách thành pháp nhân riêng, hoặc lượng truy cập
một bên lớn đến mức ảnh hưởng bên kia.

---

## 2. Chọn dịch vụ đối soát VietQR nào

Anh có nhắc PayOS và Casso. Trong hồ sơ ISO đã chốt **SePay cho Giai đoạn 2A**,
PayOS để **Giai đoạn 2B**. Lý do giữ nguyên thứ tự đó:

| Dịch vụ | Làm được gì | Vị trí trong lộ trình |
|---|---|---|
| **SePay** | Đọc tiền về tài khoản VPBank 92779, bắn webhook | **2A — làm ngay.** Gói khởi đầu 0đ, đúng mô hình khách đang chuyển khoản, không cần khách rời trang web |
| **Casso** | Cùng chức năng với SePay | Phương án thay thế ngang hàng. Dùng khi SePay gặp vấn đề — đổi 1 biến môi trường, không sửa code |
| **PayOS** | Cổng thẻ ATM / Visa nội địa / ví MoMo, ZaloPay | **2B — sau.** Khác việc: khách bấm nút nhập thẻ, không phải quét QR |

Vì vậy `netlify/functions/payment-webhook.js` **nhận cả ba** từ đầu. Khai bên
nào thì điền biến môi trường của bên đó, không phải viết lại code. Đây là chỗ
đáng làm sẵn, vì chi phí viết thêm gần bằng không mà tránh phải sửa lại khi
chuyển nhà cung cấp.

> **Cần kiểm tra lại trước khi đăng ký:** hạn mức giao dịch và phí gói miễn
> phí của SePay/Casso thay đổi theo thời gian. Số liệu trong hồ sơ ISO
> ghi tại thời điểm soạn, nên xem lại trang giá chính thức trước khi chốt.

---

## 3. Trình duyệt không được quyết định "đã trả tiền"

Trước đây web lưu đơn vào `localStorage` và tự tính số tiền. Ai mở Developer
Tools cũng sửa được. Vì vậy:

- Giá niêm yết nằm trong `create-order.js`, không nằm trong HTML.
- Mã ưu đãi tra từ bảng `coupons`, không tin mã trình duyệt gửi lên.
- Trạng thái `paid` chỉ do `payment-webhook.js` ghi, bằng `service_role` key.
- Khoá publishable trên web chỉ đọc được mã ưu đãi đang bật và dữ liệu của
  chính người đăng nhập — chặn bằng RLS, không chặn bằng JavaScript.

---

## 4. Vì sao có bảng `payment_events`

Khách ghi sai nội dung chuyển khoản là chuyện thường. Nếu webhook chỉ xử lý
đơn khớp rồi bỏ phần còn lại, FiTop sẽ không có gì để tra khi khách nói
"em chuyển rồi mà". Nên **mọi** lần webhook gọi tới đều được ghi lại, kể cả
không khớp đơn. Đối soát tay vẫn là lớp dự phòng — không bỏ.

---

## 5. Vì sao `unlock_token` thay vì bắt đăng nhập

Phần lớn khách mua tài liệu một lần, không muốn tạo tài khoản. Mỗi đơn sinh
một `unlock_token` riêng, trình duyệt của khách giữ. Có token + đơn đã
`paid` thì mới trả link tài liệu. Khách vẫn mua được mà không cần đăng ký,
mà link tài liệu không bị lộ cho người chỉ biết mã đơn.
