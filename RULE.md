
# Quy tắc chung & Tiêu chuẩn phát triển (RULE.md)

**Mục đích:** File này lưu trữ các quy chuẩn nghiệp vụ đã được người dùng xác nhận. Mọi công việc thiết kế UI/UX và phát triển tính năng đều phải tuân thủ nghiêm ngặt hai tài liệu tham chiếu chính:

## 1. Quy tắc Viết hoa Chuẩn (Capitalization Rules & Visual Quick Guide)
Áp dụng đồng bộ và nghiêm ngặt quy tắc viết hoa cho toàn bộ văn bản, nhãn UI, tiêu đề báo cáo và nội dung mô tả:

1. **Từ đầu câu (First word in sentence)**:
   - Viết hoa chữ cái đầu tiên của mọi câu văn.
   - *Ví dụ*: "Tần suất đọc bài tăng mạnh trong tháng 3."

2. **Tên riêng & Danh từ riêng (Names & Proper Nouns)**:
   - Luôn viết hoa tên người, tổ chức, doanh nghiệp, quốc gia, tôn giáo, đảng phái, địa danh.
   - Viết hoa chức danh/tiêu đề khi đi cùng tên riêng cụ thể (Ví dụ: "Chủ tịch VnExpress"). Không viết hoa chức danh khi đứng độc lập dạng danh từ chung (Ví dụ: "bạn đọc L3", "tác giả bài viết").

3. **Từ đầu tiên trong câu trích dẫn (First word in quote)**:
   - Viết hoa từ đầu tiên nếu trích dẫn một câu hoàn chỉnh (Ví dụ: Tác giả phát biểu, "Bài viết cá nhân hoá giúp tăng trải nghiệm đọc.").
   - Không viết hoa từ đầu nếu trích dẫn chỉ là một phần câu.

4. **Thời gian - Ngày, tháng, ngày lễ (Days, Months, Holidays)**:
   - Viết hoa tên ngày trong tuần, tên tháng, ngày lễ (Ví dụ: "Thứ hai", "Tháng 3", "Ngày Quốc khánh").
   - **Không viết hoa tên các mùa trong năm** (Ví dụ: "mùa xuân", "mùa hạ", "mùa thu", "mùa đông").

5. **Từ trong tiêu đề & tác phẩm (Words in Titles)**:
   - Viết hoa từ đầu tiên và tất cả từ chính (danh từ, động từ, tính từ, trạng từ, đại từ) trong tiêu đề mục báo cáo hoặc tác phẩm.
   - Không viết hoa mạo từ, liên từ, giới từ ngắn (trừ khi đứng ở đầu câu tiêu đề).

6. **Địa danh & Ngôn ngữ (Locations & Languages)**:
   - Viết hoa tên thành phố, quốc gia, bang, quốc tịch, ngôn ngữ (Ví dụ: "Hà Nội", "Việt Nam", "tiếng Việt").
   - Không viết hoa từ chỉ hướng địa lý (đông, tây, nam, bắc) trừ khi từ đó là một phần của tên vùng lãnh thổ chính thức (Ví dụ: "Miền Bắc", "South Argentina").

7. **Thời kỳ & Sự kiện lịch sử (Time Periods & Historical Events)**:
   - Viết hoa tên thời kỳ, kỷ nguyên, sự kiện lịch sử mang tên riêng (Ví dụ: "Sự kiện Xung đột Trung Đông").
   - Không viết hoa từ chỉ thế kỷ chung (Ví dụ: "thế kỷ 21").

8. **Phòng ban & Khóa học (Departments & Courses)**:
   - Viết hoa tên phòng ban, ban biên tập, bộ môn có tên tổ chức cụ thể (Ví dụ: "Ban Công nghệ VnExpress", "Phòng Data Analytics").
   - Không viết hoa các tên ngành học/môn học chung.

---

## 2. Quy chuẩn thời gian (Date & Time Rules)

### 2.1. Dạng đầy đủ
📌 `{Thứ}, {Ngày}/{Tháng}/{Năm}, {Giờ}:{Phút} ({Timezone})`
- **Ví dụ:** `Thứ hai, 30/1/2017, 06:30 (GMT+7)`
- **Thứ:** Không viết hoa chữ thứ hai sau Thứ (ví dụ: `Thứ hai`, `Thứ ba`, `Thứ tư`, `Thứ năm`, `Thứ sáu`, `Thứ bảy`, `Chủ nhật`).
- **Ngày:** Không viết thêm số `0` ở những ngày chỉ có 1 chữ số (ví dụ: `1`, `2`, ..., `9`, `10`, ..., `31`).
- **Tháng:** Không viết thêm số `0` ở những tháng chỉ có 1 chữ số (ví dụ: `1`, `2`, ..., `9`, `10`, `11`, `12`).
- **Năm:** Viết theo quy tắc `yyyy` (ví dụ: `2026`, `2017`).
- **Giờ, Phút:** Viết theo quy tắc 24 giờ, luôn có 2 chữ số (từ 1 - 9 bổ sung số `0` ở đầu, ví dụ: `08:15`, `06:05`, `12:30`).
- **Timezone:** Mặc định là `GMT+7` (hoặc `GMT+/-{{number}}` viết liền).

### 2.2. Dạng rút gọn theo Năm, Thứ, Giờ
- **Theo Năm:** Chỉ hiển thị `{Năm}` khi thời gian sự kiện/bài viết nằm ngoài năm hiện tại.
- **Theo Thứ / Giờ:** Dùng trong các widget/báo cáo thời gian thực hoặc khoảng không gian hẹp.

### 2.3. Quy tắc Định dạng Ngày tháng (Date Formatting Rules)
- tất cả các vị trí hiển thị ngày tháng trong ứng dụng (bao gồm Nút chọn khoảng thời gian Date Picker, Preview khung chọn ngày, Ngày xuất bản bài viết trong Danh sách & Modal Chi tiết, Tiêu đề phân tích) phải **bổ sung thêm thứ trong tuần (tên viết tắt tiếng Anh, ví dụ: Sun, Mon, Tue...)**.
- Ví dụ định dạng chuẩn: `"Sun, 02 Aug 2026"`, `"Sun, 02 Aug 2026 • 14:30"`, `Hôm qua (Sun, 02 Aug 2026)`.

---

## 3. Quy tắc cắt ký tự (Text Truncation Rules)

- **Cơ chế:**
  - Ký tự bao gồm chữ, số, dấu hiệu, biểu tượng đặc biệt và khoảng trắng.
  - **Cắt ký tự KHÔNG được áp dụng với Title** (Tiêu đề bài viết hiển thị đầy đủ hoặc xuống dòng tự nhiên).
  - Khi cắt ký tự (cho tóm tắt, sô sapo, mô tả ngắn), **KHÔNG được cắt vào giữa của 1 từ** mà phải cắt vào khoảng trắng gần nhất ngay trước từ đó.
- **Hiển thị:**
  - Sau khi cắt ký tự, bổ sung hậu tố `"..."` (dấu ba chấm) liền kề.
  - *Ví dụ:* `"Đoàn tàu của Chủ tịch Kim đi qua Thiên Tân và dự kiến tối nay tới biên giới Trung - Triều..."`

---

## 4. Quy tắc về số & Rút gọn số (Number Rules)

### 4.1. Quy chuẩn dấu phân cách số tại VnExpress
- **Dấu chấm `.`**: Dùng phân tách hàng nghìn (ví dụ: `1.234.567`).
- **Dấu phẩy `,`**: Dùng cho phần thập phân (ví dụ: `1.234.567,89`).
- **Cụ thể:**
  - `1`
  - `12`
  - `123`
  - `1.234`
  - `123.456`
  - `1.234.567`
  - `1.234.567,89`

### 4.2. Quy tắc rút gọn số (Number Shortening)
Áp dụng khi diện tích hiển thị nhỏ hoặc cần đọc nhanh chỉ số lớn (hàng nghìn K, hàng triệu M, hàng tỷ B).

- **Quy tắc làm tròn (lấy 1 chữ số sau dấu phẩy `,`):**
  - Sử dụng chữ số hàng chục để làm tròn chữ số hàng trăm lên hoặc xuống:
    - Chữ số hàng chục `< 5` ⇒ Làm tròn xuống.
    - Chữ số hàng chục `≥ 5` ⇒ Làm tròn lên.
  - Nếu chữ số hàng trăm là 9 và chữ số hàng chục `≥ 5` thì làm tròn lên hàng tiếp theo.
  - **Chuyển dấu `.` thành dấu `,`** trước ký hiệu đơn vị K/M/B.
- **Ví dụ chuẩn mực:**
  - `7.891` ⇒ `7,9K`
  - `15.753` ⇒ `15,8K`
  - `99.961` ⇒ `100K`
  - `1.299.761` ⇒ `1.299,8K` ⇒ `1,3M`
  - `3.350` ⇒ `3,4K`
  - `450` ⇒ `450`

---