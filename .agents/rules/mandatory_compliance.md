# Quy trình Triển khai Bắt buộc (Mandatory Execution Rules)

Mọi hoạt động phân tích, thiết kế UI/UX, biên tập nội dung, viết code và cập nhật tính năng trong dự án này BẮT BUỘC tuân thủ nghiêm ngặt 4 tài liệu tham chiếu gốc:

1. **Giao diện & UI/UX Design System**: [DESIGN.md](file:///Users/ngocdangtien/antigravity/Product-Task-Management/DESIGN.md)
   - **Phông chữ chuẩn hóa**: `Merriweather` (tiêu đề bài viết), `Merriweather Sans` (chỉ dẫn UI/button/heading ngắn <8 từ), `Arial` (văn bản còn lại, body, sapo, chú thích, bảng dữ liệu).
   - **Phong cách VnExpress**: Mật độ thông tin dày dặn (newspaper-dense), phẳng hoàn toàn (phân biệt tầng bằng viền border phớt nhẹ, tuyệt đối không dùng drop-shadow/box-shadow trừ focus ring), không dùng animation/gradient rườm rà.

2. **Biên tập Câu từ & Văn phong Báo chí**: [EDITOR.md](file:///Users/ngocdangtien/antigravity/Product-Task-Management/EDITOR.md)
   - Quy trình biên tập chuẩn: Title → Lead → Body.
   - Viết ngắn gọn, đơn giản (KISS), thể chủ động (S-V-O), đưa fact quan trọng nhất lên đầu, không bắt đầu tin bài bằng câu trích dẫn trực tiếp.

3. **Quy tắc Viết hoa & Định dạng Thời gian**: [RULE.md](file:///Users/ngocdangtien/antigravity/Product-Task-Management/RULE.md)
   - Áp dụng nghiêm ngặt 8 quy tắc viết hoa: Từ đầu câu, Tên riêng & Danh từ riêng, Tiêu đề, Thời gian, Địa danh & Ngôn ngữ, Sự kiện lịch sử, Phòng ban (ví dụ: `Ban Sản phẩm - Công nghệ VnExpress`).
   - Định dạng thời gian dạng đầy đủ: `{Thứ}, {Ngày}/{Tháng}/{Năm}, {Giờ}:{Phút} ({Timezone})` (ví dụ: `Thứ hai, 30/1/2017, 06:30 (GMT+7)` - Thứ không viết hoa từ thứ hai, Ngày & Tháng 1 chữ số không thêm số 0 ở đầu). Dạng rút gọn tiếng Anh: `(Sun, 02 Aug 2026)` khi sử dụng `formatDateWithEnDay`.

4. **Quy chuẩn Dữ liệu & Nghiệp vụ WMS**: [AGENTS.md](file:///Users/ngocdangtien/antigravity/Product-Task-Management/AGENTS.md)
   - Cấu trúc dữ liệu chuẩn cho Công việc (Tasks), Dự án (Projects), Thành viên & Phân vai (Members & Roles).
   - Quy chuẩn Giao diện: Right Sidebar Drawer cho Task & Project, Bố cục Hàng công việc 2 tầng cân bằng nhẹ nhàng (Task Item Row), Box Thêm công việc mới tự động suy ra Nhóm, hiển thị thời gian đầy đủ, mức độ ưu tiên Checkbox Khẩn cấp, nền trung tính phớt nhẹ.

**Quy trình thực thi bắt buộc cho Agent:**
Trước khi chỉnh sửa hoặc phát triển bất kỳ tính năng UI, nội dung văn bản, hoặc logic dữ liệu nào, Agent BẮT BUỘC tra cứu nội dung tương ứng trong các file [DESIGN.md](file:///Users/ngocdangtien/antigravity/Product-Task-Management/DESIGN.md), [EDITOR.md](file:///Users/ngocdangtien/antigravity/Product-Task-Management/EDITOR.md), [RULE.md](file:///Users/ngocdangtien/antigravity/Product-Task-Management/RULE.md), [AGENTS.md](file:///Users/ngocdangtien/antigravity/Product-Task-Management/AGENTS.md) để đảm bảo 100% sự tuân thủ.
