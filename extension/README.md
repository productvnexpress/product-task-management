# VnExpress WMS - Chrome Extension Thông Báo Công Việc

Tiện ích mở rộng Google Chrome giúp nhân sự Ban Sản phẩm - Công nghệ VnExpress nhận thông báo công việc tức thì (popup góc màn hình hệ điều hành) ngay cả khi không mở tab WMS trong trình duyệt.

---

## 1. Tính năng chính

- **Popup nổi trực tiếp trên mọi Website (In-Page Floating Toast)**: Khi đang duyệt bất kỳ trang web nào (Facebook, VnExpress, Google, YouTube...), một popup chuẩn nhận diện VnExpress (#963861) sẽ trượt lên ở góc phải bên dưới màn hình, kèm chuông và nút mở thẳng trang WMS. Không phụ thuộc vào cài đặt thông báo của hệ điều hành.
- **Thông báo nền hệ thống (OS Notification)**: Vẫn đồng thời gửi tới Trung tâm thông báo macOS / Windows khi Chrome thu nhỏ.
- **Nhắc nhở đóng task 16:30**: Tự động nhắc nhở rà soát và đóng task vào 16:30 các ngày làm việc trong tuần.
- **Badge số thông báo chưa đọc**: Hiển thị số lượng thông báo chưa đọc trực tiếp trên icon extension trên thanh công cụ trình duyệt.
- **Xem nhanh & Điều hướng 1 click**: Click vào thông báo hoặc icon extension để mở ngay trang Công việc hoặc chi tiết task trên WMS.
- **Chọn tài khoản 1 lần duy nhất**: Chọn tên nhân sự một lần, extension tự động lưu và nhận đúng thông báo cá nhân.

---

## 2. Hướng dẫn cài đặt & Cập nhật (Dành cho thành viên team)

1. Mở trình duyệt Google Chrome, truy cập vào đường dẫn:
   ```
   chrome://extensions
   ```
2. Bật công tắc **Developer mode** (Chế độ cho nhà phát triển) ở góc trên bên phải màn hình.
3. Bấm **Load unpacked** (Tải tiện ích đã giải nén) hoặc bấm nút **Reload (🔄)** nếu đã nạp trước đó.
4. Chọn thư mục `extension` trong mã nguồn dự án:
   ```
   /Volumes/Data/Code/product-task-management/extension
   ```
5. Mở bất kỳ tab nào (ví dụ Facebook, VnExpress, Google), bấm icon extension WMS và bấm **"Test chuông"** ➔ Popup sẽ nổi ngay lập tức ở góc phải bên dưới màn hình!

---

## 3. Cấu trúc thư mục

```
extension/
├── manifest.json       # Cấu hình Manifest V3 & quyền content_scripts
├── background.js       # Service worker chạy ngầm, sync Supabase & phát thông báo
├── content.js          # In-Page Toast HUD (Shadow DOM) hiển thị popup trên mọi website
├── popup.html          # Giao diện xem nhanh thông báo khi click icon
├── popup.js            # Xử lý logic chọn tài khoản, danh sách thông báo & test chuông
├── icons/              # Bộ icon 16x16, 48x48, 128x128
└── README.md           # Hướng dẫn cài đặt
```
