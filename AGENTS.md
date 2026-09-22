# AGENTS.md - Tài liệu Chuẩn hóa Quy chuẩn & Dữ liệu Hệ thống WMS

> **Ban Sản phẩm - Công nghệ VnExpress**  
> *Single Source of Truth (SSOT)*: Tài liệu quy chuẩn hóa toàn bộ cấu trúc dữ liệu, danh mục thực thể, quy tắc nghiệp vụ và giao diện của Hệ thống Quản lý Công việc & Dự án (WMS). Mọi cập nhật trong hệ thống phải tuân thủ nghiêm ngặt theo tài liệu này.

> **QUY TẮC MẶC ĐỊNH BẮT BUỘC (GLOBAL MANDATORY RULE)**: khi làm bất cứ việc gì (lập trình, thiết kế UI/UX, viết văn bản, phản hồi, biên tập thông báo, nhãn dữ liệu...) **bắt buộc phải tham chiếu các tiêu chuẩn từ [EDITOR.md](file:///Volumes/Data/Code/product-task-management/EDITOR.md)** với các tiêu chí tối thượng: **Ngắn gọn, súc tích, trọng tâm, Facts first, KISS, thể chủ động, cắt bỏ từ đệm thừa và không rườm rà**.

---

## MỤC LỤC
1. [Nhóm 1: Quản lý Công việc (Tasks Specification)](#1-nhóm-1-quản-lý-công-việc-tasks-specification)
2. [Nhóm 2: Quản lý Dự án (Projects Specification)](#2-nhóm-2-quản-lý-dự-án-projects-specification)
3. [Nhóm 3: Quản lý Nhân sự & Phân vai (Members & Roles Specification)](#3-nhóm-3-quản-lý-nhân-sự--phân-vai-members--roles-specification)
4. [Nhóm 4: Tính năng Hệ thống (Features Specification)](#4-nhóm-4-tính-năng-hệ-thống-features-specification)
   - [4.8. Quy chuẩn Hệ thống Chuyển động & Hoạt họa Giao diện (Framer Motion Standards)](#48-quy-chuẩn-hệ-thống-chuyển-động--hoạt-họa-giao-diện-motion--transitions-specification---framer-motion-standards)
   - [4.9. Quy chuẩn Hệ thống Phân quyền Truy cập (Role-Based Access Control - RBAC)](#49-quy-chuẩn-hệ-thống-phân-quyền-truy-cập-role-based-access-control---rbac)
   - [4.10. Quy chuẩn Mặc định Góc nhìn khi Truy cập (Default Perspectives by RBAC)](#410-quy-chuẩn-mặc-định-góc-nhìn-khi-truy-cập-default-perspectives-by-rbac)
   - [4.11. Thanh Điều kiện Lọc Neo Cố định (Active Filters Bar)](#411-thanh-điều-kiện-lọc-neo-cố-định-active-filters-bar)
   - [4.13. Hệ thống Thông báo Cá nhân Right Sidebar (Targeted Notifications Drawer)](#413-hệ-thống-thông-báo-cá-nhân-right-sidebar-targeted-notifications-drawer)
   - [4.14. Quy chuẩn Thời gian làm việc & Mục Thiết lập trong Workspace (Working Time & Admin Settings)](#414-quy-chuẩn-thời-gian-làm-việc--mục-thiết-lập-trong-workspace-working-time--admin-settings-specification)
   - [4.15. Quy chuẩn Friendly URL & Deep Linking (Semantic Routing Specification)](#415-quy-chuẩn-friendly-url--deep-linking-semantic-routing-specification)
   - [4.16. Quy chuẩn Cảnh báo Giai đoạn & Deadline Dự án trước 3 ngày (Project & Phase Deadline Alerts)](#416-quy-chuẩn-cảnh-báo-giai-đoạn--deadline-dự-án-trước-3-ngày-project--phase-deadline-alerts-specification)

---

# 1. NHÓM 1: QUẢN LÝ CÔNG VIỆC (TASKS SPECIFICATION)

### 1.1. Cấu trúc Dữ liệu Chuẩn của một Công việc (Task Data Model)
Mỗi công việc trong hệ thống được định nghĩa đầy đủ theo các thuộc tính sau:

| Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mô tả & Quy chuẩn |
|---|---|---|---|
| `id` | `string` | Có | Định danh duy nhất (UUID hoặc chuỗi hash dạng `task_xxx`). |
| `title` | `string` | Có | Tiêu đề công việc ngắn gọn, rõ ràng, phản ánh đúng hành động (Action-oriented). |
| `projectId` | `string` | Có | Khóa ngoại liên kết với Dự án (`ProjectItem.id`). |
| `projectName` | `string` | Có | Tên hiển thị của dự án (phục vụ hiển thị nhanh không cần join). |
| `team` | `TeamType` | Có | Nhóm chuyên môn chịu trách nhiệm: `'Product Manager'` \| `'UX/UI Designer'` \| `'SEO'` \| `'Data'`. |
| `assignee` | `string` | Có | Họ tên thành viên phụ trách chính (thuộc nhóm Product hoặc Stakeholder). |
| `priority` | `PriorityLevel` | Có | Mức độ ưu tiên: `'Khẩn cấp'` (Đỏ) \| `'Bình thường'` (Xám/Trung tính). |
| `dueDate` | `string` | Có | Ngày hạn hoàn thành theo định dạng chuẩn ISO `YYYY-MM-DD`. |
| `status` | `TaskStatus` | Có | 4 trạng thái công việc chuẩn: `'Chưa làm'` (Mặc định khi tạo việc) \| `'Đang làm'` \| `'Bị nghẽn'` \| `'Hoàn thành'`. |
| `progress` | `number` | Có | Tiến độ hoàn thành thực tế từ `0` đến `100` (%). Mặc định khởi tạo `0%`. |
| `notes` | `string` | Không | Ghi chú hướng dẫn thực hiện, tiêu chí nghiệm thu hoặc checklist nội bộ. |
| `resultLink` | `string` | Không | Đường dẫn tài liệu kết quả (Link Figma, PRD Google Docs, Ticket Jira, Báo cáo, Code). |
| `tags` | `string[]` | Không | Mảng nhãn phân loại bổ sung (ví dụ: `['Gấp', 'Họp BBT', 'Release']`). |
| `logs` | `TaskLogItem[]` | Có | Mảng lịch sử thay đổi công việc tự động lưu vết (Audit Trail). |
| `createdAt` | `string` | Có | Thời điểm tạo công việc (ISO Timestamp). |
| `updatedAt` | `string` | Có | Thời điểm cập nhật lần cuối (ISO Timestamp). |

### 1.2. Cấu trúc Nhật ký Công việc (Task Log Item)
Mỗi lần công việc có chỉnh sửa (đổi trạng thái, đổi hạn, đổi người nhận, cập nhật link kết quả...), hệ thống tự động sinh 1 bản ghi lịch sử:
- `id`: Định danh bản ghi log.
- `author`: Họ tên người thực hiện điều chỉnh (lấy từ tài khoản đang đăng nhập).
- `timestamp`: Thời gian ghi nhận (ISO timestamp, hiển thị chuẩn giao diện gồm cả ngày và giờ phút dạng `Fri, 20 Nov 2026 • 14:30`).
- `action`: Hành động ngắn gọn (Tạo mới, Đổi trạng thái, Đổi hạn, Thêm ghi chú...).
- `details`: Chi tiết thay đổi (Giá trị cũ ➔ Giá trị mới).

### 1.3. Quy tắc Nghiệp vụ Thời hạn & Trạng thái
1. **Trạng thái Mặc định khi Giao việc (Default Status)**: Mọi công việc khi được thêm mới từ thanh Quick Add Bar hoặc tạo trong hệ thống mặc định ở trạng thái `'Chưa làm'` với tiến độ `progress = 0%`.
2. **Cảnh báo Quá hạn (Overdue)**: Khi ngày hiện tại > `dueDate` và trạng thái khác `'Hoàn thành'`. Hiển thị nhãn đỏ và cảnh báo nổi bật.
3. **Đến hạn Hôm nay (Due Today)**: Khi `dueDate` = ngày hiện tại và trạng thái khác `'Hoàn thành'`. Hiển thị nhãn vàng hổ phách.
4. **Sắp đến hạn (Due Soon)**: Khi hạn hoàn thành trong vòng 2 ngày tới.
5. **Đánh dấu Hoàn thành (Quick Toggle)**:
   - Khi bấm checkbox hoàn thành: Trạng thái chuyển thành `'Hoàn thành'`, `progress` chuyển thành `100%`.
   - Khi bỏ chọn hoàn thành: Trạng thái chuyển về `'Chưa làm'` hoặc `'Đang làm'`, `progress` giữ theo giá trị trước đó (hoặc mặc định `0%`/`50%`).
6. **Bắt buộc nhập Link hoàn thành khi chuyển trạng thái Hoàn thành**:
   - Khi bấm checkbox hoàn thành hoặc chuyển dropdown sang `'Hoàn thành'`: Nếu công việc chưa có link kết quả (`resultLink`), hệ thống bắt buộc mở modal `CompleteTaskModal` yêu cầu nhập Link hoàn thành (Figma, PRD, Báo cáo, Code, Staging...). Cho phép bấm nhanh "Dùng link làm việc" nếu công việc đã có sẵn `workLink`.
   - Trong giao diện chi tiết `TaskDetailDrawer`: Bắt buộc nhập `Link hoàn thành` khi trạng thái là `'Hoàn thành'`. Không cho phép lưu nếu trường này bị bỏ trống.
   - Khi chọn trạng thái `'Đang làm'`: **Không bắt buộc** nhập Link làm việc (`workLink`).
7. **Sắp xếp Khối Việc Đã hoàn thành (Completed Tasks Ordering)**: Danh sách công việc thuộc khối "Đã hoàn thành" trên trang Công việc bắt buộc được sắp xếp theo thời gian từ mới nhất đến cũ nhất (descending) dựa trên ngày hạn hoàn thành (`dueDate`) và thời điểm hoàn thành (`completedAt`). Các công việc có hạn hoặc hoàn thành gần đây nhất luôn được hiển thị ở vị trí đầu tiên.

### 1.4. Giao diện Chi tiết Công việc (TaskDetailDrawer)
- Giao diện dạng **Right Sidebar Drawer** trượt từ bên phải sang (chiều rộng tối ưu ~500-550px).
- Hỗ trợ 2 Tabs điều hướng chính:
  1. **Tab `Thông tin`**: Hiển thị và chỉnh sửa các trường thông tin tác nghiệp chuẩn hóa:
     - **Công việc**: Textarea tiêu đề công việc đưa lên đầu tiên, **bắt buộc sử dụng font `Merriweather Sans` (`font-title`)**.
     - **Trạng thái**: Dropdown chọn 4 trạng thái chuẩn (`Chưa làm`, `Đang làm`, `Bị nghẽn`, `Hoàn thành`). Kèm ô nhập lý do nếu chọn `Bị nghẽn`. Không bắt buộc nhập Link làm việc khi chọn `Đang làm`.
     - **Link làm việc (Figma, Google, Notion,...)**: Ô nhập đường dẫn làm việc (luôn được nhập trước), hỗ trợ nút mở link nhanh.
     - **Link kết quả (Figma, Beta, Production...)**: Ô nhập đường dẫn kết quả sản phẩm. Hỗ trợ tùy chọn **"Link kết quả và Link làm việc là một"** (Checkbox đồng bộ tự động giá trị từ Link làm việc để tránh phải nhập 2 lần, tự động khóa ô nhập và mở link tương ứng).
     - **Dự án**: Dropdown chọn dự án thuộc hệ thống.
     - **Giai đoạn**: Dropdown chọn giai đoạn dự án tương ứng.
     - **Phụ trách**: Dropdown chọn người phụ trách (chỉ hiển thị họ tên, không kèm IP Phone).
     - **Hạn hoàn thành**: Chọn ngày hạn kèm dòng xem trước định dạng chuẩn (ví dụ: `"Sun, 02 Aug 2026"`, `"Sun, 02 Aug 2026 • 14:30"`, `Hôm qua (Sun, 02 Aug 2026)`).
     - **Ưu tiên = Khẩn cấp**: Dạng Checkbox, tick chọn để đánh dấu công việc Khẩn cấp.
     - **Bình luận & Trao đổi**: Khối trao đổi thông tin công việc gồm **Người gửi** (Cố định là tài khoản đang đăng nhập, hiển thị dạng read-only, tuyệt đối không cho phép chọn người khác), **Nội dung bình luận** (Hỗ trợ gõ `@` để bung popup gợi ý và tag toàn bộ nhân sự hệ thống gồm cả ban Product và ngoài Product), nút **Gửi bình luận** gửi tức thì (hoặc phím tắt `Ctrl+Enter` / `Cmd+Enter`), danh sách các trao đổi gần đây của công việc có highlight tag `@`. Tự động kích hoạt luồng thông báo trao đổi: bắn thông báo nhắc đến bạn cho nhân sự được tag `@`, thông báo phản hồi cho người phụ trách và các nhân sự từng tham gia trao đổi trong công việc (loại trừ người gửi, chống trùng lặp, biên tập theo EDITOR.md).
  2. **Tab `Lịch sử`**: Dòng thời gian tự động hiển thị đầy đủ lịch sử thay đổi (Audit Log): Ai đã sửa gì, lúc nào, nội dung bình luận / ghi chú (hỗ trợ hiển thị nổi bật các tag `@Nhân sự`). Khu vực "Thêm bình luận / Trao đổi mới" cũng cố định người ghi là tài khoản đang đăng nhập và hỗ trợ gõ `@` để tag toàn bộ nhân sự.
- **Nút bấm tác vụ Footer**:
  - Nút **`Xoá`** (màu đỏ, icon `Trash2`) thay cho tên gọi cũ "Xóa việc".
  - Nút **`Đóng`** và **`Lưu thay đổi`**.
- **Các trường không áp dụng (Bỏ khỏi giao diện Drawer)**: Nhóm đảm nhận, Product Owners, Ghi chú & Chi tiết bổ sung.
- Thao tác nhanh: Lưu thay đổi với phím tắt `Ctrl+S` / `Cmd+S`, đóng nhanh bằng phím `ESC`.

### 1.5. Quy chuẩn Bố cục Hàng Công việc (Task Item Row Specification)
1. **Bố cục 2 Tầng Cân bằng, Thoáng & Nhẹ nhàng (Clean 2-Level Balanced Layout)**:
   - **Tuyệt đối không bọc nhiều khối hộp (No Heavy Box Stacking)**: Không bao quanh từng thông tin tác nghiệp (Giai đoạn, Nhân sự, Hạn, Mức độ) bằng các thẻ pill đóng khung có viền (`border`) và nền màu (`background`) xếp chồng chất gây nặng nề, tức mắt.
   - **Tầng 1 (Hàng trên)**:
     - *Bên trái*: Checkbox hoàn thành (tròn kiểu Google Tasks), Tiêu đề công việc (`font-title` Merriweather Sans đậm rõ ràng, không kèm dòng mô tả nhỏ bên dưới để giữ giao diện tinh gọn), Cảnh báo nghẽn (nếu bị nghẽn).
     - *Bên phải*: Dropdown chuyển trạng thái nhanh (`TaskStatus`) và các nút tác vụ nhanh (Xóa, Xem chi tiết).
   - **Tầng 2 (Hàng dưới - Thanh siêu dữ liệu dàn trải cân đối)**: Thụt lề `pl-8` thẳng hàng với tiêu đề công việc, dàn trải đều sang 2 bên trên một hàng duy nhất:
     - *Bên trái*: Tên dự án (nếu bật), Link làm việc (`Link`), Link kết quả (`CheckCircle2`).
     - *Bên phải (`ml-auto`)*: Cụm thông tin tác nghiệp dàn ngang gồm: **Giai đoạn** (`phaseName`) • **Nhân sự** (`assignee`) • **Thời gian** (`dueDate`) • **Mức độ** (`priority` - chỉ hiện khi khẩn cấp/ưu tiên cao), phân tách bằng dấu chấm `•` tinh tế và micro-icons.
2. **Quy chuẩn Font chữ & Hiển thị Thời gian / Ngày tháng**:
   - **Định dạng hiển thị hạn**: Trong danh sách công việc, hiển thị hạn theo quy chuẩn: `Hôm nay`, `Hôm qua`, `Ngày mai`; nếu nằm ngoài 3 thời gian này mới hiển thị `"Tue, 15 Sep 2026"` (sử dụng hàm `formatTaskDueDisplay(dueDate)`).
   - **Tuyệt đối sử dụng font `Merriweather Sans` (`font-ui`)**, không dùng font `Roboto Mono` (`font-num`).
   - Phân cấp màu chữ trực quan theo tình trạng: Đỏ cho Quá hạn, Cam cho Hôm nay, Vàng cho Sắp đến hạn, Xám trung tính cho ngày bình thường (không dùng nền hộp).
3. **Quy chuẩn Nhận diện Việc của Tôi**:
   - **Không dùng tag `⭐ Việc của bạn`**: Bỏ tag riêng biệt cạnh tiêu đề để tránh rác giao diện.
   - **Nhận diện nhẹ nhàng, tinh tế tại phần Nhân sự (`assignee`)**: Chữ đổi sang màu mận VnExpress `#963861 font-semibold` kèm chip `Tôi` nhỏ gọn (`bg-[#963861]/10 text-[#963861]`).
   - Giữ dải màu viền trái `border-l-4 border-l-[#963861]` and nền phớt nhẹ `bg-[#fffbfd]` trên toàn bộ thẻ hàng công việc để nhận diện ngoại vi tức thì mà không gây rối mắt.
4. **Quy chuẩn Tiêu đề Khối Công việc Đang thực hiện & Phân nhóm Dự án**:
   - Tiêu đề danh sách: Text **`Công việc đang thực hiện (xx)`** sử dụng kiểu chữ thường (`font-normal`), không in đậm (`font-bold`) để tạo cảm giác nhẹ nhàng, tinh gọn cho giao diện.
   - Tiêu đề nhóm dự án: Tên dự án sử dụng `font-normal` (bỏ `font-bold`), sử dụng biểu tượng thư mục đơn giản (`Folder` icon thanh mảnh từ bộ Lucide) thay cho emoji thư mục vàng cũ.
5. **Bố cục 2 Cột Phân nhóm Dự án (2-Column Project Grouping Layout)**:
   - **Cột Trái (Project Anchor Rail ~220px)**: Đặt tên dự án lệch hẳn sang trái bên ngoài card công việc (`font-title` Merriweather Sans, `font-normal`, text `#202020`), icon thư mục `Folder` thanh mảnh, nhãn mã dự án (`code`), số lượng việc (`xx việc`). Neo cố định (`md:sticky md:top-24 self-start`) tự động pin theo khi dự án có nhiều công việc lúc cuộn màn hình.
   - **Tách 2 Vùng Tương tác Độc lập tại Cột Trái**:
     - **Vùng 1 (Tên dự án & Mã dự án)**: Bấm vào để **lọc danh sách công việc theo dự án** đó (bấm lại để bỏ lọc và xem tất cả).
     - **Vùng 2 ("Thông tin dự án →")**: Thay thế text cũ `"Chi tiết"`, bấm vào để **mở Right Sidebar Drawer** hiển thị toàn bộ thông tin chi tiết dự án.
   - **Cột Phải (Task List Card - Flex-1)**: Khối card công việc màu trắng chuẩn nguyên bản (`bg-white rounded-[12px] border border-[#e0e0e0] shadow-2xs divide-y divide-[#f0f0f0]`), chứa đầy đủ các hàng công việc (`TaskItemRow`) với trải nghiệm rộng thoáng, giải phóng hoàn toàn các thanh bar ngang cắt vụn giao diện.

### 1.6. Quy chuẩn Box Thêm công việc mới (QuickAddBar Specification)
1. **Tự động ánh xạ Nhóm (No Team Selector)**: Bỏ hoàn toàn ô chọn Nhóm (`Product Manager`, `UX/UI Designer`, `SEO`, `Data`). Nhóm chuyên môn (`team`) được hệ thống tự động suy ra dựa trên Nhân sự được chọn (`assignee`).
2. **Phân nhóm Dự án (2 Nhóm Dự án + Dự án Đặc biệt)**:
   - **Nhóm 1 (Dự án tham gia)**: Các dự án mà nhân sự được giao việc (`assignee`) trực tiếp tham gia (theo vai trò PM, Designer, SEO, Data, Lead hoặc có công việc được giao). Nhóm này được sắp xếp ưu tiên theo **dự án có công việc được tạo gần nhất**.
   - **Nhóm 2 (Dự án khác)**: Các dự án còn lại trong hệ thống, được sắp xếp theo **thứ tự bảng chữ cái Alphabet (A-Z)**.
   - **Dự án đặc biệt "Chưa xác định (Others)"**: Luôn hiển thị ở vị trí **cuối cùng** của danh sách lựa chọn để gán cho các công việc phát sinh chưa kịp phân loại.
3. **Quy chuẩn Thời hạn Hoàn thành (Due Date & Date Picker)**:
   - **Mặc định**: Khởi tạo là ngày hiện tại (`today`).
   - **Giới hạn chọn ngày lùi (Minimum Date Bound)**: Không cho phép chọn các ngày cũ hơn ngày hiện tại quá 7 ngày (`min = today - 7 days`), vừa linh hoạt chống quên vừa ngăn ngừa sai lệch dữ liệu quá khứ.
   - **Tương tác mở Date Picker**: Bấm vào bất kỳ đâu trên ô ngày, nhãn văn bản ngày tháng `(Sun, 02 Aug 2026)` hay icon lịch đều lập tức bung mở trình chọn ngày Date Picker (sử dụng API native `showPicker()`), không bắt buộc người dùng phải click chuẩn xác vào biểu tượng lịch nhỏ.
4. **Hiển thị Ngày hạn đầy đủ (Full Date Formatting)**: Khi chọn hoặc nhập ngày hạn hoàn thành (`dueDate`), bắt buộc hiển thị xem trước thông tin đầy đủ dạng `(Sun, 02 Aug 2026)` sử dụng `formatDateWithEnDay(dueDate)`.
5. **Mức độ Ưu tiên dạng Checkbox Khẩn cấp**: Không dùng dropdown nhiều lựa chọn mức ưu tiên. Chỉ dùng checkbox duy nhất `🚨 Khẩn cấp` (Checked = `'Khẩn cấp'`, Unchecked = `'Bình thường'`).
6. **Thiết kế Nền & Khung trung tính (Clean & Neutral Styling)**:
   - Toàn hệ thống không sử dụng các ô background màu quá nổi bật hoặc tương phản mạnh gây rác thị giác.
   - Sử dụng các khung chứa trung tính, phớt xám nhẹ (`bg-[#ffffff]`, `bg-[#f9f9f9]`, `border-[#e0e0e0]`).

### 1.7. Quy chuẩn Kiểm soát & Cảnh báo Task Đến hạn Trong Ngày (Daily Due Tasks Accountability Specification)
   - **Quy tắc miễn trừ khi Nghỉ phép & Ngày nghỉ/Ngày lễ**:
     - Nhân sự có lịch nghỉ phép đã được duyệt bao trùm ngày hôm nay (`startDate <= today && today <= endDate`) sẽ **tự động được miễn trừ** khỏi danh sách cảnh báo cần nhập task hôm nay (`missingMembers`).
     - **Miễn trừ vào ngày nghỉ & ngày lễ**: Vào các ngày nghỉ (Thứ Bảy, Chủ Nhật không làm bù) hoặc các ngày nghỉ lễ theo `workingTimeService`, hệ thống **tự động ẩn hoàn toàn khối cảnh báo `DailyCompletionAlert`**.
2. **Phân quyền Hiển thị Cảnh báo theo Cấp bậc (RBAC Scoped Alert)**:
   - **Admin (Quản trị viên)**: Hiển thị cảnh báo **tổng thể toàn bộ phận Sản phẩm** (PM, Designer, SEO, Data). Giúp Trưởng ban bao quát toàn diện tình trạng lên kế hoạch ngày của cả bộ phận.
   - **Manager (Quản lý sản phẩm PM)**: Hiển thị cảnh báo **toàn bộ nhân sự được khai báo chính thức trong các dự án phụ trách** (`roles.pm`, `roles.designer`, `roles.seo`, `roles.data`, `leadName`).
     - *Quy tắc phạm vi*: Chỉ tính nhân sự được khai báo trong dự án. Một số tình huống nhân sự ngoài dự án tham gia hỗ trợ một vài task sẽ **không** tính vào dự án.
   - **Executive (Chuyên viên Designer, SEO, Data)**: Hiển thị cảnh báo **với từng cá nhân**. Nếu cá nhân chưa có task nào đến hạn hôm nay và không nghỉ phép, hiển thị nhắc nhở cá nhân để chủ động cập nhật hạn chót hoặc tạo việc mới trong ngày. Nếu đang nghỉ phép, hiển thị thông báo trạng thái nghỉ phép.
3. **Cơ chế Giao diện Trực quan (`DailyCompletionAlert`)**:
   - Đặt trong cột chuẩn của trang Công việc.
   - **Tiêu đề ngắn gọn, súc tích**:
     - Admin: `Cảnh báo: {count} nhân sự chưa có task đến hạn hôm nay`
     - Manager: `Cảnh báo: {count} nhân sự chưa có task đến hạn hôm nay`
     - Executive: `Cảnh báo: Bạn chưa có task đến hạn hôm nay`
     - Loại bỏ các thành phần rườm rà: Nút "Sao chép đôn đốc", tag pill số lượng, và dòng phụ đề "Phạm vi quản lý...".
   - **Danh sách nhân sự chưa có task**:
     - Nhãn hiển thị: `Nhân sự cần nhập task đến hạn hôm nay:` (thống nhất cho cả Admin và Manager).
     - Định dạng tên: Kết hợp dạng `[Tên] [Họ]` (ví dụ: `Trung Tiêu`, `Trung Vũ`, `Vinh Ngô`, `Hiếu Nguyễn`, `Sơn Vũ`, `Tùng Trần`...) giúp phân biệt rõ ràng khi có nhiều nhân sự trùng tên gọi.
     - Sắp xếp tự động theo thứ tự bảng chữ cái ABC tiếng Việt (A-Z) ưu tiên theo Tên gọi (`firstName`), nếu trùng tên sẽ xét tiếp theo Họ (`lastName`).
     - Bấm vào tên để lọc nhanh danh sách công việc của nhân sự đó (bấm lại để hoàn tác).
   - Khi 100% nhân sự trong phạm vi đã có task đến hạn hôm nay: Hiển thị thanh thông báo xanh chúc mừng tinh gọn (`Tất cả nhân sự đã có task đến hạn hôm nay` / `Tất cả nhân sự trong dự án đã có task đến hạn hôm nay`).

### 1.8. Quy chuẩn Thông báo Lịch nghỉ Phép Trong Ngày & 3 Ngày làm việc Tới (DailyLeaveNotice Specification)
1. **Quy tắc Nghiệp vụ**:
   - Tự động quét và tổng hợp danh sách nghỉ phép đã duyệt (`status === 'Đã duyệt'`) của các nhân sự thuộc bộ phận Product (`Product Manager`, `UX/UI Designer`, `SEO`, `Data`).
   - Kiểm tra 2 mốc thời gian:
     - **Hôm nay**: Các nhân sự có đơn nghỉ bao trùm ngày hiện tại (`startDate <= today && today <= endDate`).
     - **3 ngày làm việc tới**: Xác định 3 ngày làm việc tiếp theo bằng `workingTimeService.getNextWorkingDays(3)` (tự động loại trừ Thứ Bảy, Chủ Nhật không làm bù và các ngày lễ quốc gia), sau đó tổng hợp nhân sự nghỉ trong 3 ngày này.
2. **Quy chuẩn Bố cục Tỷ lệ Ngang & Căn chỉnh Cân đối (Balanced Layout)**:
   - **Bố cục khi có người nghỉ**:
     - **Khối Cảnh báo (`DailyCompletionAlert`)**: Chiếm 7/12 (~58.3% chiều rộng), đủ không gian hiển thị tiêu đề và danh sách tên không bị chật.
     - **Khối Lịch nghỉ phép (`DailyLeaveNotice`)**: Chiếm 5/12 (~41.7% chiều rộng), sử dụng tông màu **hồng nhẹ VnExpress (`#963861`, nền `#fdf4f8`, viền `#f3c2d4`)**, đảm bảo hiển thị trọn vẹn tiêu đề và ngày tháng dạng `Trung Tiêu (sáng Mon, 14 Sep 2026)` trên một hàng thoáng đãng.
     - **Đồng bộ chiều cao (`items-stretch`)**: Cả 2 khối cùng có `h-full flex flex-col`, chiều cao Header đồng nhất (`min-h-[44px]`), đường kẻ phân cách ngang và đáy card khớp hàng hoàn hảo.
   - **Bố cục khi không có ai nghỉ (cả hôm nay và 3 ngày tới)**:
     - Khối Lịch nghỉ tự động ẩn. Toàn bộ 100% không gian này được nhường trọn cho khối Cảnh báo (`DailyCompletionAlert`).
3. **Quy chuẩn Biên tập Ngôn ngữ & Kiểu chữ (`EDITOR.md`)**:
   - Đưa facts quan trọng nhất lên đầu (Facts first), súc tích, trực diện, không dùng từ đệm rườm rà.
   - Tên nhân sự: Sử dụng kiểu chữ thường `font-normal` ở cả mục "Hôm nay" và "3 ngày tới" để nhất quán với khối bên trái.
   - Định dạng ngày nghỉ chuẩn hóa: `[Tên Họ] (sáng Mon, 14 Sep 2026)` hoặc `[Tên Họ] (Mon, 14 Sep 2026)` sử dụng `formatDateWithEnDay`.
   - Buổi nghỉ: Chú thích ngắn gọn `(sáng)` hoặc `(chiều)`, nghỉ trọn ngày không cần ghi thêm chữ 'cả ngày'.
   - Hiển thị:
     - Hôm nay: `[Tên Họ] (sáng)` hoặc `[Tên Họ]`
     - 3 ngày tới: `[Tên Họ] (sáng Mon, 14 Sep 2026)` hoặc `[Tên Họ] (Mon, 14 Sep 2026)`

### 1.9. Dòng Thông báo Nghỉ Lễ Sắp Tới (UpcomingHolidayBanner Specification)
1. **Quy chuẩn Tách Dòng Độc lập & Màu sắc Nổi bật**:
   - Tách thành 1 dòng banner độc lập đặt phía trên khối Cảnh báo tiến độ ngày & Lịch nghỉ phép.
   - Sử dụng dải màu gradient rực rỡ, mang sắc thái lễ hội bắt mắt (`bg-gradient-to-r from-[#ffe4e6] via-[#fce7f3] to-[#fef3c7] border border-[#f43f5e]/40`, icon `Sparkles` phát sáng).
2. **Quy tắc Nghiệp vụ Thời gian & Biên tập Ngôn ngữ**:
   - Phạm vi quét: Tự động quét và chỉ thông báo khi có ngày nghỉ lễ diễn ra trong vòng **5 ngày tới** (`workingTimeService.getUpcomingHolidays(5)`). Nếu không có ngày lễ nào trong 5 ngày tới, dòng này tự động ẩn hoàn toàn.
   - Tuyệt đối không hiển thị hậu tố `(5 ngày)` hay `(15 ngày)`.
   - Cấu trúc hiển thị chuẩn hóa bắt buộc:
     `Nghỉ lễ sắp tới: {Thời gian} ({Tên ngày lễ}) - {Số ngày nghỉ} ngày`
     - Ví dụ: `Nghỉ lễ sắp tới: Thu, 24 Sep 2026 (Văn hoá Việt Nam) - 1 ngày`
     - Ví dụ nhiều ngày: `Nghỉ lễ sắp tới: Thu, 30 Apr 2026 - Sun, 03 May 2026 (Ngày Chiến Thắng 30/4 & 1/5) - 4 ngày`

### 1.10. Box Thống kê Kết quả Công việc Tuần trước vào Sáng thứ Hai (MondayWeeklySummary Specification)
1. **Quy tắc Nghiệp vụ**:
   - **Thời điểm hiển thị**: Tự động hiển thị và mở rộng vào **sáng thứ Hai** hàng tuần (`new Date().getDay() === 1`) ở đầu trang Công việc (`activeTab === 'tasks'`).
   - **Khả năng mở xem lại**: Trên các ngày khác trong tuần hoặc sau khi đã đóng, cung cấp nút bấm tinh gọn `[📊 Kết quả tuần trước]` để mở lại nhanh bất kỳ lúc nào.
   - **Lưu trạng thái đóng**: Nếu người dùng bấm đóng (`X`), hệ thống lưu vết theo tuần (`vne_monday_summary_dismissed_YYYY-Www`) để tránh làm phiền trong suốt tuần làm việc đó.
2. **Cấu trúc 5 Thẻ KPI Chuẩn hóa (Image 2 Specification)**:
   - **KPI 1: TỔNG CÔNG VIỆC**: Số lượng tổng công việc trong kỳ kèm phân tích chân trang `Xong: X | Đang làm: Y | Nghẽn: Z`.
   - **KPI 2: ĐÚNG HẠN (Mục tiêu ≥85%)**: Tỷ lệ % hoàn thành đúng hạn kèm số lượng `(Đúng hạn/Tổng xong)` và thanh tiến trình màu sắc tương ứng (Xanh ≥85%, Cam ≥70%, Đỏ <70%).
   - **KPI 3: HOÀN THÀNH SAU HẠN**: Số lượng và tỷ lệ % việc hoàn thành sau ngày hạn, chú thích rõ "Bấm xong sau ngày hạn".
   - **KPI 4: ĐANG QUÁ HẠN**: Số việc quá hạn chưa hoàn thành kèm chấm đỏ nhấp nháy khi > 0.
   - **KPI 5: ĐIỂM NGHẼN**: Số việc bị nghẽn trong tuần.
3. **Phân quyền & Chuyển đổi Phạm vi**:
   - **Chuyên viên (Executive)**: Hiển thị kết quả cá nhân của chính mình.
   - **Quản lý (Manager) & Admin**: Mặc định hiển thị kết quả cá nhân ("Việc của tôi"), kèm nút chuyển đổi nhanh sang "Toàn bộ phận".
   - **Tương tác Drill-down**: Bấm vào bất kỳ thẻ KPI nào để xem ngay danh sách công việc chi tiết tương ứng bên dưới.


---

# 2. NHÓM 2: QUẢN LÝ DỰ ÁN (PROJECTS SPECIFICATION)

### 2.1. Quy chuẩn Kiến trúc Giao diện Quản lý Dự án (Drawer Architecture)
- **Single Unified Drawer**: Dùng chung một Right Sidebar Drawer (độ rộng ~60-65% màn hình) cho cả 2 thao tác: **Xem & Chỉnh sửa dự án** và **Tạo mới dự án**.
- **Tuyệt đối không dùng modal pop-up giữa màn hình** để thao tác thông tin dự án.
- **Header tinh gọn**: Bên trái là Tên dự án và biểu tượng **Lịch sử thay đổi (Audit History)**; bên phải là Mã dự án, Tag trạng thái, và nút Đóng `ESC`.
- **Footer cố định**: Thanh nút Lưu thay đổi / Tạo dự án và Hủy thao tác kèm phím tắt `Ctrl+S` / `Cmd+S`.

### 2.2. Chi tiết 4 Phần Dữ liệu Chuẩn của Dự án
Mỗi dự án được cấu trúc nhất quán theo 4 khối chức năng:

#### Phần 1: Tổng quan Dự án (Overview)
- **Tên dự án**: Tên chính thức của sản phẩm / nền tảng.
- **Mã dự án**: Mã định danh viết hoa duy nhất (Prefix `VNE-`, ví dụ: `VNE-YKIEN`, `VNE-WMS`).
- **4 Trạng thái chuẩn duy nhất**:
  1. `Chưa triển khai` (⚪ Xám trung tính)
  2. `Đang triển khai` (🔵 Xanh dương)
  3. `Tạm dừng` (🔴 Đỏ cam)
  4. `Hoàn thành` (🟢 Xanh lá)
  *(Lưu ý: Dự án sử dụng chuẩn `'Hoàn thành'`. Mọi biến thể dữ liệu cũ `'Đã hoàn thành'` đều được tự động chuẩn hóa về `'Hoàn thành'` khi tải và lưu để tránh lỗi hiển thị lệch trong form chỉnh sửa).*
- **Dự án Chiến lược (`isStrategic`)**:
  - Checkbox đánh dấu dự án cấp Toà soạn / Công ty đặc biệt quan tâm, ưu tiên nguồn lực triển khai.
  - Khi tick chọn: Hiển thị biểu tượng ngôi sao vàng ⭐ nổi bật cạnh tên dự án trên toàn hệ thống (Thẻ dự án, Drawer, Sidebar).
  - Bộ lọc dự án hỗ trợ tab lọc riêng `⭐ Chiến lược`.
- **Kế hoạch thời gian**: Ngày `Bắt đầu` và Ngày `Hoàn thành` dự kiến (`YYYY-MM-DD`).
- **Mô tả dự án**: Bối cảnh, mục tiêu nghiệp vụ và phạm vi dự án.
- **Mục tiêu & KPI**: Chỉ số định lượng cụ thể cần đạt sau khi ra mắt (Pageviews, Users, Tỷ lệ tương tác, Doanh thu...).
- **Product Owner**: Đại diện đơn vị nghiệp vụ (Ban Biên tập, Ban Nội dung, Ban Kinh doanh) phụ trách bài toán sản phẩm và nghiệm thu KPI.
- **Đội ngũ Sản phẩm (Phân vai chuyên môn 4 nhóm)**:
  - `Product Manager`: Quản lý tiến độ, viết PRD và điều phối chung.
  - `UX/UI Designer`: Thiết kế Wireframe, Prototype và UI chuẩn design system.
  - `SEO Specialist`: Tối ưu hóa cấu trúc dữ liệu on-page, keyword và traffic organic.
  - `Data Specialist`: Thiết kế tracking plan, đo lường số liệu và dashboard phân tích.

#### Phần 2: Động cơ Giai đoạn (Phases Engine) & Quy chuẩn Timeline
- **Tự động sinh nhãn thứ tự (Auto-Prefixing)**: Người dùng chỉ cần nhập nội dung giai đoạn (ví dụ: *Nghiên cứu & PRD*), hệ thống tự động gán nhãn `Giai đoạn X: [Nội dung nhiệm vụ]`.
- **Tự động sắp xếp thời gian (Chronological Auto-Sorting)**: Các giai đoạn luôn tự động sắp xếp theo ngày hạn (`dueDate`) từ gần nhất đến xa nhất. Thứ tự `Giai đoạn 1, 2, 3...` được tự động đánh số lại theo trình tự thời gian này.
- **4 Trạng thái giai đoạn**: `Chưa bắt đầu` \| `Đang triển khai` \| `Bị nghẽn` \| `Đã hoàn thành`.
- **Phân quyền thêm Giai đoạn (Phases RBAC)**:
  - Cấp **Executive** (Chuyên viên UI/UX, SEO, Data): **Không được thêm giai đoạn** (chỉ xem, hiển thị chú thích *"Chỉ Manager & Admin được thêm giai đoạn"*).
  - Cấp **Manager** (PM) và **Admin**: Toàn quyền thêm, sửa, đánh số và xoá các giai đoạn.
- **Quy chuẩn Khối "Timeline" trong Thẻ Dự án**:
  - Tiêu đề mục: Đổi thành **`Timeline`** (bỏ tiền tố "Tiến trình Timeline").
  - Tiền tố giai đoạn: **`Giai đoạn X: ` sử dụng kiểu chữ thường (`font-normal`)**, bỏ in đậm (`font-bold`) để giao diện thanh thoát, nhẹ nhàng, không gây nặng mắt.
  - **Bỏ nút Edit (bút chì) sau mỗi dòng giai đoạn**: Toàn bộ thao tác chỉnh sửa thông tin dự án và giai đoạn được thực hiện tập trung trong Project Drawer ("Chi tiết").
  - **Cột Khoảng thời gian (Duration)**: Thêm cột hiển thị số ngày giữa 2 giai đoạn (ví dụ: `24 ngày`), đặt chính giữa cột **Thời gian** và **Trạng thái** (không đặt Title cột).
    - Mốc *Bắt đầu*: Hiển thị `—`.
    - Các *Giai đoạn*: Tính khoảng cách số ngày từ mốc liền trước đến hạn của giai đoạn.
    - Mốc *Ra mắt*: Tính khoảng cách số ngày từ giai đoạn cuối cùng đến ngày ra mắt.
  - Căn chỉnh thẳng hàng đồng bộ các cột:
    - Cột tên mốc/giai đoạn: `min-w-0 flex-1`
    - Cột thời gian: Cố định `w-32 font-ui text-[11px] text-[#5f5f5f]`
    - Cột khoảng thời gian (Duration): Cố định `w-24 text-center font-ui text-[11px] text-[#5f5f5f]`
    - Cột trạng thái: Khung `w-32` chứa thẻ trạng thái `w-28 text-center text-[11px] font-ui font-medium rounded-[4px] border` căn giữa đồng nhất.
  - Tag mốc hoàn thành: Đổi từ `"Mốc ra mắt:"` / `"Ra mắt"` thành **`Hoàn thành:`** và badge **`Hoàn thành`** để nhất quán trong ngoài với 4 trạng thái chuẩn của hệ thống.

#### Phần 3: Hệ thống Liên kết Dự án (Project Links)
- **6 Liên kết mặc định**:
  1. `Order Tech`: Ticket yêu cầu kỹ thuật / Jira / IT Helpdesk.
  2. `Chat Group`: Kênh trao đổi trực tuyến (Lark / Zalo / Slack / Telegram).
  3. `Dashboard`: Bảng theo dõi số liệu đo lường (Looker Studio / Metabase / GA4).
  4. `Report`: Báo cáo tổng kết, nghiệm thu (Google Sheets / Docs / Slides).
  5. `Beta`: Đường dẫn môi trường chạy thử nghiệm nội bộ (Staging).
  6. `Production`: Đường dẫn sản phẩm chạy chính thức trên VnExpress.
- **Liên kết bổ sung (Custom Links)**: Tự do thêm không giới hạn liên kết với Tiêu đề và URL tùy biến.

#### Phần 4: Ghi chú Dự án (Project Notes)
- Dùng lưu vết các biên bản cuộc họp, thỏa thuận nhanh, quyết định kỹ thuật:
  - `Người ghi chú`: Cố định là tài khoản đang đăng nhập (`currentActorName`), hiển thị dạng read-only, tuyệt đối không cho phép chọn người khác.
  - `Nội dung`: Nội dung chi tiết của ghi chú.
  - `Thời gian`: Hệ thống tự động ghi nhận ngày giờ tạo.

#### Phần 5: Sườn Checklist 34 Tiêu chuẩn Dự án (Project Checklist — Product Management)
Cung cấp bộ khung sườn tiêu chuẩn hóa 5 giai đoạn cho toàn bộ team triển khai bám theo từ lúc khởi sự đến sau khi ra mắt:
1. **Giai đoạn 1 — Trước khi bắt đầu (7 tiêu chuẩn)**:
   - Vấn đề thật của độc giả & lý do cần làm bây giờ.
   - Nhóm độc giả phục vụ (OV, DO hay cả hai).
   - Chỉ số đo thành công, baseline hiện tại & mục tiêu năm.
   - Số lượng giai đoạn và mốc dự kiến từng giai đoạn.
   - Xác định Product Owner duy nhất chịu trách nhiệm từ đầu đến cuối.
   - Kênh và quyết định phê duyệt chính thức (họp BBT, email...).
   - Kế hoạch triển khai chi tiết: ai làm gì, phụ thuộc ai, rủi ro lớn nhất về thời gian.
2. **Giai đoạn 2 — Thiết kế & Chuyển giao (7 tiêu chuẩn)**:
   - Đủ màn hình, đủ trạng thái (empty, loading, error) trên Desktop, Mobile Web/App.
   - Tài liệu logic luồng người dùng (INPUT - PROCESS - OUTPUT).
   - Chốt zone vị trí quảng cáo (trải nghiệm đọc vs tối ưu doanh thu).
   - Spec tracking chi tiết (event gì, trigger khi nào, chuẩn đặt tên ITM/ADP).
   - Yêu cầu SEO đầy đủ (cấu trúc URL, meta, schema, canonical, sitemap).
   - Pháp lý, bản quyền, phối hợp Ban Trị sự / Kế toán / Nhân sự.
   - Nguồn dữ liệu đầu vào & nhu cầu CMS/tool nhập liệu riêng cho Tòa soạn.
3. **Giai đoạn 3 — Sản phẩm BETA (8 tiêu chuẩn)**:
   - Giải pháp nhập liệu/vận hành trên CMS Editor & App Editor.
   - Ý kiến thống nhất với Tổng thư ký tòa soạn về vị trí trên Trang chủ.
   - Cấu hình menu, folder, widget trên desktop & mobile web.
   - Mobile app push, category ID & deep link tương ứng.
   - Kiểm thử đa trình duyệt (Chrome, Safari) & thiết bị thực tế (iOS, Android).
   - Chuẩn tốc độ Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms).
   - Kiểm tra tracking dữ liệu thực tế trên staging.
   - Kế hoạch rollback khi có sự cố nghiêm trọng sau release.
4. **Giai đoạn 4 — Chuẩn bị Release (8 tiêu chuẩn)**:
   - Ấn định ngày giờ release & xác nhận sẵn sàng từ Tech, Tòa soạn, QC.
   - Dự trù thời gian test sau release & nhân sự trực tiếp nghiệm thu.
   - **Quy tắc bất biến: Tuyệt đối không release vào cuối tuần hoặc sau 15:00 các ngày trong tuần**.
   - Form tiếp nhận phản hồi / báo lỗi từ Tòa soạn và độc giả.
   - Product Owner duyệt lần cuối (sign-off) trên beta/staging.
   - Thông báo kế hoạch release tới BBT, BLĐ, Ban Trị sự, TKTS, Vận hành SD.
   - Chuẩn bị tài liệu truyền thông, ảnh chụp, What's New trên App Store/Google Play.
   - Dashboard đo lường (VnExpress Analytics / PowerBI / SIS) sẵn sàng.
5. **Giai đoạn 5 — Ra mắt (4 tiêu chuẩn)**:
   - Thông báo / bài viết / banner giới thiệu tính năng tới độc giả.
   - Theo dõi dữ liệu real-time trong 48h đầu sau go-live (lượng truy cập, lỗi error rate).
   - Lịch báo cáo hiệu quả định kỳ (sau 3 ngày, 1 tuần, 1 tháng).
   - Họp / gửi email đánh giá rút kinh nghiệm (Post-mortem / Retrospective).

- **Trạng thái & Tương tác**:
  - `status`: `'pending'` (chưa làm) \| `'completed'` (đã xong, dấu tích xanh) \| `'skipped'` (bỏ qua / không áp dụng, chữ gạch ngang mờ).
  - Tự động hiển thị thanh tiến độ tuân thủ tiêu chuẩn: `% hoàn thành` dựa trên số lượng hoàn thành / (tổng - bỏ qua).
- **Tích hợp Tác nghiệp**:
  - Xem và cập nhật tổng thể trong Section **`5: Checklist`** của `ProjectDetailsDrawer`, hỗ trợ thanh 5 menu điều hướng nhanh (Tổng quan, Giai đoạn, Liên kết, Ghi chú, Checklist) được pin cố định dưới tên dự án.
  - Nút **`Checklist (xx/yy)`** trên thanh `QuickAddBar`: Mở nhanh modal `ProjectChecklistModal` để tra cứu và 1-click gán nội dung tiêu chuẩn làm tiêu đề công việc.
- **Tổ chức Database Supabase**:
  - Cột `checklist JSONB DEFAULT '[]'::jsonb` trong bảng `projects`.

### 2.3. Nhật ký Thay đổi Dự án (Audit History Log)
- Ghi lại vết mọi lần thay đổi thông tin dự án gồm: Trường dữ liệu thay đổi, Giá trị cũ, Giá trị mới, Người thực hiện, và Thời gian thực hiện.
- Truy cập bằng icon Lịch sử tại Header của Drawer chi tiết dự án.

### 2.4. Danh mục 17 Dự án Chính thức Ban Sản phẩm - Công nghệ

| STT | Tên Dự án | Mã Dự án | Người phụ trách chính | Mô tả / Phạm vi |
|---|---|---|---|---|
| 1 | Ý kiến | VNE-YKIEN | Trần Huy Anh, Nguyễn Hải Đạt | Chuyên mục Ý kiến độc giả - Quản lý, kiểm duyệt và đề xuất bài viết phân tích đa chiều. |
| 2 | Spam Vote Event | VNE-SPAMVOTE | Nguyễn Trung Hiếu, Tiêu Đình Trung | Hệ thống lọc và phát hiện gian lận bình chọn (Spam Vote) cho các sự kiện bình chọn lớn. |
| 3 | Thế giới | VNE-THEGIOI | Nguyễn Trung Hiếu, Tiêu Đình Trung | Nâng cấp trải nghiệm trang chuyên mục Thế giới, hiển thị bản đồ xung đột và tin nhanh quốc tế. |
| 4 | Sáng kiến khoa học 2026 | VNE-SKKH26 | Nguyễn Trung Hiếu, Nguyễn Hải Đạt | Trang thông tin và cổng nộp bài dự thi Cuộc thi Sáng kiến Khoa học 2026. |
| 5 | Tech Awards 2026 | VNE-TECH26 | Nguyễn Trung Hiếu, Tiêu Đình Trung | Giải thưởng Sản phẩm Công nghệ Xuất sắc Tech Awards 2026 - Cổng bình chọn & Đánh giá của Chuyên gia. |
| 6 | AI4VN 2026 | VNE-AI4VN26 | Nguyễn Trung Hiếu, Nguyễn Hải Đạt | Ngày hội Trí tuệ nhân tạo Việt Nam (AI4VN 2026) - Triển lãm, Hội thảo & Kết nối Doanh nghiệp. |
| 7 | Overseas | VNE-OVERSEAS | Nguyễn Trung Hiếu | Nền tảng truyền thông và kết nối cộng đồng người Việt tại nước ngoài. |
| 8 | Du lịch | VNE-DULICH | Nguyễn Trung Hiếu, Tiêu Đình Trung, Vũ Hữu Trung | Chuyên mục Du lịch - Gợi ý hành trình, cẩm nang du lịch thông minh và đặt tour kết nối. |
| 9 | AskVnE | VNE-ASKVNE | Nguyễn Trung Hiếu, Nguyễn Hữu Nam | Hỏi đáp cùng chuyên gia AskVnE - Giải đáp thắc mắc Sức khỏe, Pháp luật, Đời sống. |
| 10 | Car Awards 2026 | VNE-CAR26 | Nguyễn Trung Hiếu, Nguyễn Hữu Nam | Chương trình Bình chọn Ô tô của năm (Car Awards 2026) - Bảng chấm điểm & So sánh thông số xe. |
| 11 | Vietnam iContent 2026 | VNE-ICONTENT26 | Nguyễn Trung Hiếu, Nguyễn Hải Đạt | Ngày hội Sáng tạo Nội dung Số Việt Nam (Vietnam iContent Awards 2026). |
| 12 | ASEAN Cup 2026 | VNE-ASEAN26 | Trần Huy Anh, Vũ Ngọc Sơn, Vũ Hữu Trung | Trang tin chuyên đề Giải vô địch Bóng đá Đông Nam Á ASEAN Cup 2026 - Lịch thi đấu & Video Highlight. |
| 13 | vneGO | VNE-VNEGO | Đặng Tiến Ngọc, Vũ Ngọc Sơn | Ứng dụng & Dịch vụ di chuyển vneGO - Đặt vé, cập nhật giao thông và lộ trình du lịch. |
| 14 | Newsletters | VNE-NEWSLETTER | Đặng Tiến Ngọc, Trần Bình Minh | Hệ thống Bản tin tin tức (Newsletter) đăng ký nhận qua Email cá nhân hóa theo chủ đề yêu thích. |
| 15 | Work Management System (WMS) | VNE-WMS | Trần Huy Anh, Trần Duy Tùng | Hệ thống Quản lý Công việc & Tiến độ Dự án nội bộ Ban Sản phẩm - Công nghệ VnExpress. |
| 16 | KPI System | VNE-KPI | Đặng Tiến Ngọc, Trần Duy Tùng | Hệ thống Đánh giá & Theo dõi Chỉ số Hiệu suất Công việc (KPI) cho cán bộ nhân viên. |
| 17 | Cá nhân hoá (Personalization) | VNE-PERSONALIZE | Đặng Tiến Ngọc | Trình gợi ý bài viết thông minh (Recommendation Engine) cá nhân hóa trang chủ theo hành vi đọc. |
| 18 | Chưa xác định (Others) | VNE-OTHERS | Toàn ban | Dự án mặc định dành cho các công việc phát sinh tự do chưa được phân loại vào dự án cụ thể. |

---

# 3. NHÓM 3: QUẢN LÝ NHÂN SỰ & PHÂN VAI (MEMBERS & ROLES SPECIFICATION)

### 3.1. Quy tắc Ánh xạ Nhóm Chuyên môn (Team Mapping)
- **Quản lý sản phẩm** ➔ Nhóm: `Product Manager`
- **Thiết kế** ➔ Nhóm: `UX/UI Designer`
- **SEO** ➔ Nhóm: `SEO`
- **Dữ liệu** ➔ Nhóm: `Data`

---

### 3.2. Danh sách Nhân sự Nhóm 1: Ban Sản phẩm - Công nghệ (12 Nhân sự)

| Danh xưng | Họ tên | Họ | Tên | Tài khoản | Vùng | Ban | Chức vụ | Nhóm chuyên môn | IP Phone | Email | Gmail | Ngày vào |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Anh | Trần Huy Anh | Trần | Anh | huyanh | Hà Nội | Sản phẩm - Công nghệ | Quản lý sản phẩm | Product Manager | 4847 | huyanh@vnexpress.net | tranhuyanh@gmail.com | 17/02/2014 |
| Anh | Ngô Quang Vinh | Ngô | Vinh | quangvinh | Hà Nội | Sản phẩm - Công nghệ | Dữ liệu | Data | 4887 | quangvinh@vnexpress.net | vinhnq.neu@gmail.com | 02/12/2023 |
| Anh | Nguyễn Trung Hiếu | Nguyễn | Hiếu | nguyenhieu | Hà Nội | Sản phẩm - Công nghệ | Quản lý sản phẩm | Product Manager | 4887 | nguyenhieu@vnexpress.net | hieunt.fo@gmail.com | |
| Anh | Đặng Tiến Ngọc | Đặng | Ngọc | tienngoc | Hà Nội | Sản phẩm - Công nghệ | Quản lý sản phẩm | Product Manager | 4581 | tienngoc@vnexpress.net | ngocdt.design@gmail.com | |
| Anh | Trần Duy Tùng | Trần | Tùng | duytung | Hà Nội | Sản phẩm - Công nghệ | Thiết kế | UX/UI Designer | 4887 | duytung@vnexpress.net | duytung.tran0810@gmail.com | 16/10/2017 |
| Anh | Trần Bình Minh | Trần | Minh | binhminh | Hà Nội | Sản phẩm - Công nghệ | Thiết kế | UX/UI Designer | 4851 | binhminh@vnexpress.net | tbminh.0803@gmail.com | 16/11/2020 |
| Anh | Tiêu Đình Trung | Tiêu | Trung | dinhtrung | TP HCM | Sản phẩm - Công nghệ | Thiết kế | UX/UI Designer | | dinhtrung@vnexpress.net | tieudinhtrung@gmail.com | 15/03/2012 |
| Anh | Vũ Ngọc Sơn | Vũ | Sơn | ngocson | Hà Nội | Sản phẩm - Công nghệ | Thiết kế | UX/UI Designer | 4597 | ngocson@vnexpress.net | thienkhoiart@gmail.com | 18/03/2019 |
| Anh | Nguyễn Hữu Nam | Nguyễn | Nam | huunam | Hà Nội | Sản phẩm - Công nghệ | Thiết kế | UX/UI Designer | 4597 | huunam@vnexpress.net | namnhfo@gmail.com | 02/03/2020 |
| Anh | Nguyễn Hải Đạt | Nguyễn | Đạt | haidat | Hà Nội | Sản phẩm - Công nghệ | Thiết kế | UX/UI Designer | 4597 | haidat@vnexpress.net | datnguyenhai2511@gmail.com | 01/06/2021 |
| Anh | Vũ Hữu Trung | Vũ | Trung | huutrung | Hà Nội | Sản phẩm - Công nghệ | SEO | SEO | 4851 | huutrung@vnexpress.net | trungvh23@gmail.com | 18/05/2020 |
| Anh | Phương Văn Tiến | Phương | Tiến | vantien | Hà Nội | Sản phẩm - Công nghệ | SEO | SEO | 4847 | vantien@vnexpress.net | tienphuong111294@gmail.com | 05/04/2021 |

---

### 3.3. Danh sách Nhân sự Nhóm 2: Stakeholders - Ban Biên tập & Lãnh đạo các Ban (38 Nhân sự)

| Danh xưng | Họ tên | Họ | Tên | Tài khoản | Vùng | Ban | Chức vụ | IP Phone | Email | Gmail |
|---|---|---|---|---|---|---|---|---|---|---|
| Anh | Phạm Văn Hiếu | Phạm | Hiếu | phamhieu | Hà Nội | BBT | TBT | 4501 | phamhieu@vnexpress.net | haiduyld2010@gmail.com |
| Chị | Thang Bích Liên | Thang | Liên | bichlien | TP HCM | BBT | Trưởng VP TP HCM | 8500 | bichlien@vnexpress.net | bichlienvne@gmail.com |
| Chị | Nguyễn Thị Thanh Hải | Nguyễn | Hải | nguyenhai | TP HCM | BBT | P. TBT | 8510 | nguyenhai@vnexpress.net | nguyenhaivne@gmail.com |
| Chị | Nguyễn Thu Hương | Nguyễn | Hương | huongnguyen | Hà Nội | BBT | P. TBT | 4525 | huongnguyen@vnexpress.net | linhhuong79@gmail.com |
| Chị | Nguyễn Thị Thanh Huyền | Nguyễn | Huyền | thanhhuyen | Hà Nội | BBT | SD | 4512 | thanhhuyen@vnexpress.net | thanh.huyen.vne@gmail.com |
| Anh | Phạm Trọng Nghiệp | Phạm | Nghiệp | trongnghiep | Hà Nội | BBT | Uỷ viên BBT | 4518 | trongnghiep@vnexpress.net | trongnghiep180@gmail.com |
| Chị | Bùi Thanh Vân | Bùi | Vân | thanhvan | Hà Nội | BBT | SD | 4530 | thanhvan@vnexpress.net | thanhvan.vne@gmail.com |
| Chị | Phan Vũ Thùy Trang | Phan | Trang | thuytrang | Hà Nội | BBT | SD | 4543 | thuytrang@vnexpress.net | phanvttrang@gmail.com |
| Anh | Phạm An Nhơn | Phạm | Nhơn | annhon | TP HCM | BBT | SD | 8506 | annhon@vnexpress.net | nhonvne@gmail.com |
| Anh | Nhiêu Kiến Huy | Nhiêu | Huy | kienhuy | TP HCM | BBT | SD | 8525 | kienhuy@vnexpress.net | nhieuhuy@gmail.com |
| Anh | Phạm Trần Lê | Phạm | Lê | tranle | Hà Nội | BBT | P. TBT | 4514 | tranle@vnexpress.net | |
| Chị | Nguyễn Như Trang | Nguyễn | Trang | nhutrang | Hà Nội | Thời sự Hà Nội | Trưởng ban | 4552 | nhutrang@vnexpress.net | trangvne@gmail.com |
| Chị | Hoàng Thị Thùy | Hoàng | Thùy | hoangthuy | Hà Nội | Thời sự Hà Nội | Phó ban | 4536 | hoangthuy@vnexpress.net | hoangthuyvnexpress@gmail.com |
| Anh | Nguyễn Trung Hiếu | Nguyễn | Hiếu | trunghieu | TP HCM | Thời sự TP HCM | Trưởng ban | 8503 | trunghieu@vnexpress.net | hieu.dinhquan@gmail.com |
| Anh | Nguyễn Hữu Công | Nguyễn | Công | huucong | TP HCM | Thời sự TP HCM | Phó ban | 8593 | huucong@vnexpress.net | huucongnguyen@gmail.com |
| Chị | Phạm Thanh Nga | Phạm | Nga | thanhnga | Hà Nội | Pháp luật | Trưởng ban | 4531 | thanhnga@vnexpress.net | khoai3002@gmail.com |
| Chị | Vũ Thị Mai | Vũ | Mai | tuyetmai | TP HCM | Pháp luật | Phó ban | 8550 | tuyetmai@vnexpress.net | vumaivne@gmail.com |
| Chị | Lê Thị Thanh Lan | Lê | Lan | thanhlan | Hà Nội | Kinh doanh | Trưởng ban | 4549 | thanhlan@vnexpress.net | thanhthanhlan@gmail.com |
| Anh | Nguyễn Bảo Thành | Nguyễn | Thành | baothanh | Hà Nội | Thế giới | Trưởng ban | 4542 | baothanh@vnexpress.net | baothanhmsa@gmail.com |
| Chị | Lưu Thị Thu Hà | Lưu | Hà | luuha | Hà Nội | Góc nhìn | Trưởng ban | 4577 | luuha@vnexpress.net | thuhavne@gmail.com |
| Chị | Vũ Thị Lan Anh | Vũ | Anh | anhlan | Hà Nội | Giáo dục | Trưởng ban | 4547 | anhlan@vnexpress.net | lananh1102@gmail.com |
| Chị | Lâm Thị Bích Ngọc | Lâm | Ngọc | bichngoc | Hà Nội | Khoa học công nghệ | Phó ban | 4534 | bichngoc@vnexpress.net | bichngocvne@gmail.com |
| Chị | Phạm Phương Thúy | Phạm | Thúy | phuongthuy | Hà Nội | Khoa học công nghệ | Trưởng ban | 4537 | phuongthuy@vnexpress.net | peevethuy@gmail.com |
| Anh | Lê Doãn Mạnh | Lê | Mạnh | doanmanh | Hà Nội | Thể thao | Trưởng ban | 4527 | doanmanh@vnexpress.net | doanmanhvne@gmail.com |
| Anh | Lương Tân Hương | Lương | Hương | tanhuong | Hà Nội | Đời sống | Trưởng ban | 4516 | tanhuong@vnexpress.net | luongtanhuong@gmail.com |
| Chị | Vũ Thuý Vi | Vũ | Vi | vuvi | TP HCM | English | Trưởng ban | 8854 | vuvi@vnexpress.net | thuyvi.vtv@gmail.com |
| Chị | Thái Thị Thái Vân | Thái | Vân | vanthai | Hà Nội | English | Phó ban | 4520 | vanthai@vnexpress.net | |
| Anh | Phạm Đức Huy | Phạm | Huy | duchuy | Hà Nội | Xe | Trưởng ban | 4515 | duchuy@vnexpress.net | huyphamduc206@gmail.com |
| Chị | Dương Thanh Vân | Dương | Vân | duongvan | TP HCM | Giải trí | Trưởng ban | 8512 | duongvan@vnexpress.net | mayxanhnuisap@gmail.com |
| Chị | Lê Thị Hoàng Anh | Lê | Anh | hoanganh | Hà Nội | Giải trí | Phó ban | 4524 | hoanganh@vnexpress.net | |
| Chị | Nguỵ Xuân Tuyền | Nguỵ | Tuyền | xuantuyen | TP HCM | Sức khoẻ | Trưởng ban | 8515 | xuantuyen@vnexpress.net | xuantuyenvne@gmail.com |
| Anh | Vũ Thanh Bình | Vũ | Bình | vubinh | TP HCM | Cộng đồng | Trưởng ban | 8551 | vubinh@vnexpress.net | vuthanhbinhtuoitre@gmail.com |
| Chị | Nguyễn Thùy Ngân | Nguyễn | Ngân | thuyngan | TP HCM | Podcasts | Trưởng ban | 8511 | thuyngan@vnexpress.net | nganlee7635@gmail.com |
| Chị | Lê Thị Thanh Huyền | Lê | Huyền | lehuyen | TP HCM | Video | Trưởng ban | | lehuyen@vnexpress.net | lethanhhuyen149@gmail.com |
| Chị | Thu Hằng | Thu | Hằng | hangthu | TP HCM | Spotlight | Trưởng ban | 8509 | hangthu@vnexpress.net | thuhang.bc95@gmail.com |
| Chị | Dương Phương Thảo | Dương | Thảo | phuongthao | Hà Nội | VBrand | Trưởng ban | 4533 | phuongthao@vnexpress.net | |
| Anh | Phạm Ngọc Thành | Phạm | Thành | ngocthanh | Hà Nội | Ảnh | Trưởng ban | | ngocthanh@vnexpress.net | |
| Anh | Bùi Văn Đông | Bùi | Đông | buidong | Hà Nội | Cộng đồng | Phó ban | 4509 | buidong@vnexpress.net | dongbm29@gmail.com |

---

### 3.4. Quy chuẩn Xác thực, Quản lý Hồ sơ & Đổi mật khẩu (Authentication & Password Specification)
1. **Lớp Xác thực Đăng nhập (Authentication Layer)**:
   - Áp dụng độc quyền cho 12 nhân sự thuộc **Ban Sản phẩm - Công nghệ (Nhóm Product)**.
   - Định danh đăng nhập: Sử dụng trường `username` (ví dụ: `tienngoc`, `huyanh`, `duytung`, `quangvinh`, `binhminh`, `dinhtrung`, `ngocson`, `huunam`, `haidat`, `huutrung`, `vantien`, `nguyenhieu`).
   - Mật khẩu mặc định hệ thống: `@26022001!`.
   - Giao diện đăng nhập (`LoginView`): Bắt buộc kiểm tra chính xác tài khoản và mật khẩu trước khi cho phép truy cập hệ thống WMS. Hỗ trợ tính năng gợi ý nhanh danh sách 12 nhân sự Product và ẩn/hiện mật khẩu.
2. **Quản lý Hồ sơ Cá nhân (Profile Management)**:
   - Truy cập qua Avatar/Profile Menu trên Header thanh điều hướng.
   - **Chỉ cho phép thay đổi mật khẩu (Password-only modification)**: Toàn bộ thông tin định danh cá nhân (Họ tên, Username, Chức vụ, Nhóm chuyên môn, Phòng ban, Vùng, IP Phone, Email) được hiển thị dạng chỉ đọc (Read-only badge/card) để bảo đảm tính toàn vẹn dữ liệu SSOT.
- **Quy tắc Đổi mật khẩu (Change Password Rules)**:
   - Yêu cầu nhập đúng Mật khẩu hiện tại trước khi thiết lập mật khẩu mới.
   - Mật khẩu mới có độ dài tối thiểu 6 ký tự và không được trùng với mật khẩu hiện tại.
   - Xác nhận mật khẩu mới phải khớp 100% với mật khẩu mới.
   - Mật khẩu mới được lưu trữ tại `localStorage` (`vne_user_passwords_v1`) và có hiệu lực ngay lập tức cho các lần đăng nhập kế tiếp.
4. **Cơ chế Đăng xuất (Logout)**:
   - Xóa phiên làm việc hiện tại (`vne_auth_username_v1`), đưa người dùng quay trở lại màn hình đăng nhập an toàn.

---

### 3.5. Quy chuẩn Mặt phẳng chung (Unified Workspace) & Bộ chuyển đổi Góc nhìn theo Tài khoản (Perspective Switcher)
1. **Triết lý Mặt phẳng chung (Unified Transparent Workspace)**:
   - Toàn bộ Ban Sản phẩm - Công nghệ (12 nhân sự) cùng làm việc trên một không gian chung minh bạch, không phân mảnh, không cô lập dữ liệu. Mọi thành viên đều có thể nhìn thấy công việc và dự án của nhau.
   - Khi đăng nhập vào hệ thống, chế độ xem mặc định luôn là **Toàn ban (Xem tất cả 32 công việc & 17 dự án)**.
   - Tuyệt đối không tự động khóa hoặc lọc cứng chỉ hiển thị việc riêng của người đăng nhập ngay khi vào ứng dụng.
2. **Nhận diện Việc của Tôi trên Mặt phẳng chung**:
   - Dù đang xem Toàn ban hay xem bất kỳ góc nhìn nào, công việc của tài khoản đang đăng nhập (`currentAuthUser`) luôn được nhận diện trực quan:
     - Dải viền trái màu mận VnExpress `#963861`: `border-l-4 border-l-[#963861]`
     - Nền phớt nhẹ nhận diện: `bg-[#fffbfd]`
     - Phần nhân sự (`assignee`): Tên người phụ trách đổi sang màu mận `#963861 font-semibold` kèm chip `Tôi` nhỏ gọn (`bg-[#963861]/10 text-[#963861] font-bold px-1.5 py-0.2 rounded-full`).
3. **Phân chia theo Tài khoản để Xem nhanh (Perspective Switcher & Quick Navigation)**:
   - **Trên thanh Header**: Luôn hiển thị đồng thời cả **Bộ chọn góc nhìn (`AccountSwitcher`)** và **User Profile Menu (`currentAuthUser`)**.
   - Bộ chọn góc nhìn trên Header hỗ trợ chuyển đổi 1-click giữa:
     - `🌐 Toàn ban (Xem tất cả)`: Mặt phẳng chung xem toàn bộ 32 công việc & 17 dự án của phòng.
     - `⭐ Việc của tôi (${user.name})`: Lọc nhanh danh sách công việc do người dùng phụ trách.
     - `👥 Xem theo đồng nghiệp (12 nhân sự)`: Cho phép chọn bất kỳ đồng nghiệp nào để xem ngay công việc & dự án của người đó (rất tiện khi họp giao ban, standup, trao đổi liên chuyên môn).
   - **Thanh điều khiển góc nhìn nhanh (Perspective Control Bar) ở đầu trang Công việc & Dự án**:
     - Cho phép chuyển đổi 1-chạm: `[ 🌐 Toàn ban ]`, `[ ⭐ Việc của tôi ]`, `[ 📁 Dự án của tôi ]`.
     - Khi đang xem theo một nhân sự: Hiển thị thanh trạng thái tinh gọn, thông tin số lượng việc/dự án đang làm, kèm nút `✕ Quay lại Toàn ban`.

---

# 4. NHÓM 4: TÍNH NĂNG HỆ THỐNG (FEATURES SPECIFICATION)

### 4.1. Tính năng Tìm kiếm & Bộ lọc (Search & Filtering)

#### A. Tìm kiếm & Lọc Công việc (Tasks Filter Bar)
- **Thanh tìm kiếm tức thì**: Lọc theo từ khóa trong tiêu đề công việc, tên người phụ trách (`assignee`), tên dự án (`projectName`) và nội dung ghi chú (`notes`).
- **Bộ lọc đa chiều đồng thời**:
  - `Dự án`: Lọc theo từng dự án cụ thể hoặc hiển thị "Tất cả dự án".
  - `Nhóm chuyên môn (Team)`: Lọc theo Product Manager, UX/UI Designer, SEO, Data.
  - `Độ ưu tiên (Priority)`: Lọc theo Cao, Trung bình, Thấp.
  - `Trạng thái (Status)`: Lọc theo Cần làm, Đang làm, Hoàn thành.
- **Nút xóa nhanh bộ lọc (Clear Filters)**: Hiển thị khi có bộ lọc đang kích hoạt để đưa về trạng thái xem mặc định chỉ với 1 click.

#### B. Tìm kiếm & Lọc Dự án (Projects Filter)
- Ô tìm kiếm nhanh theo Tên dự án, Mã dự án (`VNE-XXX`), hoặc Tên người phụ trách chính.
- Lọc theo 4 trạng thái dự án: Đang triển khai, Chuẩn bị ra mắt, Tạm dừng, Đã hoàn thành.
- Chế độ chuyển đổi phạm vi dự án: `⭐ Dự án của tôi` vs `Tất cả dự án`.

#### C. Tìm kiếm & Lọc Nhân sự (Members Search)
- Tìm kiếm tức thì theo: Tên, Chức vụ, Phòng ban, Tên đăng nhập (username), IP Phone, hoặc Email.
- Chuyển đổi tab nhóm: `Nhóm Product (12)` và `Nhóm Stakeholder (38)`.
- Bộ lọc theo Vùng (Hà Nội, TP HCM) và lọc theo Nhóm chuyên môn đối với nhóm Product.

---

### 4.2. Tính năng Tạo mới (Creation Workflows)

#### A. Tạo mới Công việc Nhanh (Quick Add Bar)
- **Vị trí**: Nằm ngay đầu danh sách công việc, thiết kế 1 dòng tinh gọn, không mở modal che khuất màn hình.
- **Thao tác**:
  - Nhập tiêu đề công việc vào ô văn bản.
  - Chọn nhanh Dự án, Nhóm chuyên môn, Người nhận việc, Độ ưu tiên, Ngày hạn trực tiếp trên các dropdown nhỏ gọn cạnh ô nhập.
  - Nhấn phím `Enter` hoặc click nút `Thêm việc` để tạo tức thì.
- **Cơ chế điền sẵn thông minh (Smart Defaults)**:
  - Tự động điền `Assignee` theo tài khoản thành viên đang đăng nhập.
  - Tự động điền `Team` theo nhóm chuyên môn của thành viên đó.
  - Tự động điền `DueDate` mặc định (ngày hôm nay).
  - Tự động tạo bản ghi khởi tạo (Creation Log) trong lịch sử công việc.

#### B. Tạo mới Dự án (New Project Drawer)
- **Thực hiện hoàn toàn trên Right Sidebar Drawer** (tuyệt đối không dùng modal trung tâm).
- Nhập đầy đủ 4 phần:
  - Tổng quan: Tên dự án, Mã dự án (viết hoa), Thời gian bắt đầu - kết thúc, Trạng thái, Mô tả, Mục tiêu & KPI, Product Owner, và chọn 4 thành viên cho 4 vai trò (PM, Designer, SEO, Data).
  - Các giai đoạn dự kiến (hệ thống tự động sắp xếp theo hạn).
  - Các đường link tài liệu vận hành ban đầu.
  - Ghi chú khởi tạo dự án.
- Phím tắt `Ctrl+S` / `Cmd+S` lưu nhanh dự án mới.

#### C. Tạo mới Nhân sự (New Member Modal)
- Nút "Thêm nhân sự" tại màn hình Quản lý Nhân sự mở modal chuẩn hóa:
  - Chọn Nhóm: `Product` hoặc `Stakeholder`.
  - Nhập đầy đủ Danh xưng, Họ, Tên, Username, Chức vụ, Ban, Vùng, IP Phone, Email VnE, Gmail.
  - Tự động ánh xạ Nhóm chuyên môn nếu là nhân sự Product.

---

### 4.3. Tính năng Cá nhân hoá (Personalization Engine)

#### A. Bộ chuyển đổi Tài khoản (Account Switcher)
- Tích hợp tại góc phải thanh điều hướng Header.
- Nút hiển thị gọn gàng: Avatar đại diện (chữ cái viết tắt), Tên thành viên và mũi tên mở rộng (loại bỏ nhãn rườm rà).
- Danh sách thả xuống tinh gọn:
  - Mục đầu: `Toàn ban (Xem tất cả)`.
  - Danh sách 12 nhân sự Product với avatar, họ tên và tag chức vụ chuyên môn.
  - Ô tìm kiếm nhanh nhân sự bên trong menu.
- Lưu trữ lựa chọn người dùng vào `localStorage` (`vne_active_product_member_id`) để duy trì trạng thái khi tải lại trang.

#### B. Cá nhân hoá Giao diện & Dữ liệu theo Tài khoản
1. **Banner Cá nhân hóa (Personalization Banner)**:
   - Hiển thị thông tin thành viên đang chọn, chức vụ, số việc đang làm, việc hoàn thành, việc đến hạn hôm nay và số dự án phụ trách.
   - **3 chế độ xem nhanh**:
     - `⭐ Việc của tôi`: Chỉ lọc những việc do mình trực tiếp phụ trách.
     - `📁 Dự án của tôi`: Lọc các việc thuộc các dự án mà mình có tham gia vai trò.
     - `🌐 Tất cả công việc`: Hiển thị toàn bộ công việc trong ban.
2. **Nhận diện Việc & Dự án**:
   - Nhận diện việc của mình trực tiếp tại nhãn Nhân sự (`assignee`) với màu thương hiệu `#963861`, icon và chip `Tôi` (bỏ tag riêng `⭐ Việc của bạn` cạnh tiêu đề).
   - Gắn huy hiệu vai trò (ví dụ: `Dự án của bạn: Product Manager • 2 việc được giao`) trên thẻ dự án.
3. **Tự động gán Tác giả (Author Attribution)**:
   - Khi chỉnh sửa công việc, thêm log cập nhật, hoặc thêm ghi chú dự án, hệ thống tự động điền tên tác giả theo tài khoản đang kích hoạt.

---

### 4.4. Tính năng Báo cáo Standup (Daily Standup Generator)
- Nút "Báo cáo Standup" trên thanh tiêu đề mở bảng tổng hợp tự động theo mẫu họp hàng ngày:
  - **Mục 1: Hôm qua đã hoàn thành**: Tổng hợp danh sách công việc đã đánh dấu hoàn thành gần đây.
  - **Mục 2: Hôm nay đang làm**: Danh sách công việc đang tiến hành (`Đang làm`) có kèm % tiến độ.
  - **Mục 3: Vướng mắc / Cần hỗ trợ (Blockers)**: Các việc quá hạn, việc có độ ưu tiên cao hoặc các ghi chú nghẽn tiến độ.
- **Tùy chọn xuất**: Lọc báo cáo theo cá nhân đang chọn hoặc báo cáo toàn bộ Ban.
- **Nút Copy nhanh (Copy to Clipboard)**: Sao chép toàn bộ nội dung đã định dạng đẹp để dán trực tiếp vào nhóm chat (Lark / Zalo / Slack).

---

### 4.5. Tính năng Nhắc việc & Kiểm soát Tiến độ (Reminder & Urge Control)
- **Bảng nhắc việc (ReminderPanel)**:
  - Đếm tự động số công việc **Quá hạn** (Màu đỏ).
  - Đếm số việc **Đến hạn hôm nay** (Màu vàng hổ phách).
  - Đếm số việc **Chưa cập nhật kết quả / Chưa có link tài liệu**.
  - Nhấp vào từng khối thống kê để tự động lọc danh sách công việc tương ứng.
- **Hệ thống Phím tắt Tiện ích (Keyboard Shortcuts)**:
  - `Enter`: Tạo việc nhanh trên Quick Add Bar.
  - `Ctrl+S` / `Cmd+S`: Lưu nhanh dữ liệu trong Task Detail Drawer hoặc Project Drawer.
  - `ESC`: Đóng mọi Drawer / Modal đang mở.

---

### 4.6. Quy chuẩn Độ rộng & Bố cục Toàn hệ thống (Global Layout & Width Constraints)
- **Độ rộng chuẩn duy nhất (Single Unified Max-Width)**:
  - Toàn bộ các phân hệ chính: **Công việc (Tasks)**, **Dự án (Projects)**, và **Nhân sự (Members)** **BẮT BUỘC** áp dụng độ rộng tối đa chuẩn `max-w-[800px]` (`w-full max-w-[800px] mx-auto`).
  - **Tuyệt đối không tự ý nới rộng sang `max-w-6xl` hay bất kỳ kích thước nào khác** đối với bất kỳ tab nào, đảm bảo trải nghiệm thị giác nhất quán, cân đối và chuyên nghiệp khi chuyển đổi giữa các tab.
- **Khung chứa chính (`main`)**:
  - `className="flex-1 px-4 md:px-0 py-6 md:py-8 w-full max-w-[800px] mx-auto space-y-6"`
- **Container các phân hệ con**:
  - `MembersManager`: `w-full max-w-[800px] mx-auto`
  - `ProjectsManager`: `w-full max-w-[800px] mx-auto`
  - `TrashManager`: `w-full max-w-[800px] mx-auto`

---

### 4.7. Quy chuẩn Thùng rác & Phân quyền Xoá Dữ liệu (Trash & Authorization Specification)
- **Cơ chế Xoá Mềm (Soft-delete Architecture)**:
  - Khi người dùng thực hiện xoá Công việc, Dự án hoặc Nhân sự từ giao diện tác nghiệp, dữ liệu **không bị xoá vĩnh viễn** mà được tự động đóng gói chuyển vào phân hệ **Thùng rác (`TrashItem`)**.
  - Toàn bộ thuộc tính và lịch sử gốc của thực thể được giữ nguyên vẹn trong trường `data` để đảm bảo khôi phục 100% không mất dữ liệu.
- **Cấu trúc Dữ liệu Thùng rác (`TrashItem`)**:
  - `id`: Định danh bản ghi thùng rác (`trash_xxx`).
  - `originalId`: ID thực thể gốc.
  - `type`: Phân loại đối tượng: `'task'` \| `'project'` \| `'member'`.
  - `title`: Tên hiển thị chính.
  - `subtitle`: Thông tin tóm tắt phụ (Ví dụ: Tên dự án, người phụ trách, mã dự án, phòng ban).
  - `deletedAt`: Thời điểm chuyển vào thùng rác (ISO Timestamp).
  - `deletedBy`: Tên thành viên thực hiện thao tác xoá.
  - `data`: Toàn bộ payload dữ liệu gốc của thực thể (`TaskItem` \| `ProjectItem` \| `MemberItem`).
- **Khôi phục Dữ liệu (Restore)**:
  - Mọi thành viên đều có thể bấm **Khôi phục** để đưa công việc, dự án hoặc nhân sự trở lại danh sách hoạt động tương ứng ngay lập tức.
- **Phân quyền Dọn sạch & Xoá Vĩnh viễn (Strict Authorization Rule)**:
  - **Chỉ duy nhất tài khoản của Đặng Tiến Ngọc (`tienngoc` / `tienngoc@vnexpress.net`)** mới có quyền thực hiện **Dọn sạch Thùng rác (Empty Trash)** hoặc **Xoá vĩnh viễn từng mục (Permanent Delete)**.
  - Khi đăng nhập bằng tài khoản khác, nút **Dọn sạch Thùng rác** và nút **Xoá vĩnh viễn** sẽ ở trạng thái vô hiệu hoá (`disabled`) kèm biểu tượng ổ khoá 🔒 và thông báo giải thích rõ quyền hạn quản trị.
- **Giao diện & Trải nghiệm**:
  - **Sidebar chuẩn hoá**: Bỏ tiêu đề nhóm "Giao diện chính", nhóm lọc thời hạn đổi tên thành **"Thời hạn"**.
  - **Xem Chi tiết Dữ liệu đã Xoá (Detail Drawer)**: Bấm vào tiêu đề hoặc nút **Chi tiết** trên từng mục để mở Drawer trượt từ bên phải hiển thị đầy đủ thông tin:
    - **Khối Nhật ký Xoá (Deletion Audit Log)**: Hiển thị nổi bật **Người thực hiện xoá** (`deletedBy`) và **Thời điểm xoá** (`deletedAt` theo định dạng chuẩn).
    - Toàn bộ nội dung gốc của Công việc, Dự án hoặc Nhân sự, bao gồm đầy đủ các liên kết, mục tiêu, giai đoạn và lịch sử thay đổi (`logs`).
  - **Nút điều hướng "Thùng rác"** tại Sidebar bên trái, kèm huy hiệu đếm số lượng mục đang lưu trữ.
  - Bộ lọc nhanh theo loại: *Tất cả*, *Công việc*, *Dự án*, *Nhân sự*.
  - Ô tìm kiếm thời gian thực theo tiêu đề và mô tả.
  - Hộp thoại xác nhận an toàn (Confirmation Modal) trước khi dọn sạch thùng rác.

---

### 4.8. Quy chuẩn Hệ thống Chuyển động & Hoạt họa Giao diện (Motion & Transitions Specification - Framer Motion Standards)
- **Single Motion Engine**: Toàn bộ hệ thống thống nhất sử dụng thư viện `motion` (`motion/react` từ hệ sinh thái Framer Motion). Tuyệt đối không sử dụng các animation CSS thuần chắp vá thiếu kiểm soát vòng đời hoặc các thư viện hoạt họa bên thứ ba khác.
- **Triết lý Thiết kế Chuyển động (Motion Principles)**:
  - **Tự nhiên & Quán tính thực tế (Natural Physics & Inertia)**: Ưu tiên sử dụng cơ chế vật lý lò xo (`type: 'spring'`) cho các thành phần trượt (Drawers) và phản hồi xúc giác (Haptic micro-interactions); sử dụng đường cong giảm tốc mượt mà (`easeOut` / cubic-bezier `[0.16, 1, 0.3, 1]`) cho các hộp thoại và nội dung chuyển trang.
  - **Tốc độ Tác nghiệp Tối ưu (Snappy Enterprise Performance)**: Thời lượng hoạt họa luôn nằm trong biên độ `150ms - 300ms`, mang lại cảm giác phản hồi nhanh, thanh thoát, không gây độ trễ cản trở năng suất công việc của người dùng.
  - **Kiểm soát Vòng đời Thoát & Vào trọn vẹn (Exit Lifecycle via `<AnimatePresence>`)**: Mọi thành phần hiển thị có điều kiện (Drawer, Modal Pop-up, Accordion mở rộng, Tab chuyển trang) **BẮT BUỘC** phải được bọc trong `<AnimatePresence>` để bảo đảm khi đóng/thoát đối tượng sẽ lướt mượt mà ra ngoài thay vì biến mất đột ngột (unmount giật lag).

#### 1. Quy chuẩn Chuyển động Right Sidebar Drawers (`TaskDetailDrawer`, `ProjectDetailsDrawer`)
- **Lớp nền mờ (Backdrop Overlay)**:
  - `initial={{ opacity: 0 }}`
  - `animate={{ opacity: 1 }}`
  - `exit={{ opacity: 0 }}`
  - `transition={{ duration: 0.22, ease: 'easeOut' }}`
  - Kết hợp với lớp kính mờ `backdrop-blur-xs`.
- **Thân Drawer (Panel Container)**:
  - Vị trí ban đầu: `initial={{ x: '100%' }}` (nằm ngoài lề phải màn hình).
  - Trượt vào: `animate={{ x: 0 }}`.
  - Trượt ra khi đóng: `exit={{ x: '100%' }}`.
  - Thông số vật lý Framer Spring chuẩn hóa: `transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}`.
- **Chuyển đổi Tab bên trong Drawer (`Thông tin` ↔ `Lịch sử`)**:
  - `initial={{ opacity: 0, y: 6 }}`
  - `animate={{ opacity: 1, y: 0 }}`
  - `transition={{ duration: 0.15, ease: 'easeOut' }}`.

#### 2. Quy chuẩn Hộp thoại Pop-up & Modal (`StandupModal`, `ProjectHistoryModal`)
- **Lớp nền mờ (Backdrop Overlay)**: `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}`.
- **Thân Hộp thoại (Dialog Card)**:
  - Xuất hiện: `initial={{ opacity: 0, scale: 0.95, y: 10 }}` ➔ `animate={{ opacity: 1, scale: 1, y: 0 }}`.
  - Biến mất: `exit={{ opacity: 0, scale: 0.95, y: 8 }}`.
  - Đường cong chuyển động: `transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}`.

#### 3. Quy chuẩn Chuyển đổi Phân hệ / Tab Trang (`App.tsx`)
- Container chính của 4 phân hệ (*Công việc*, *Dự án*, *Nhân sự*, *Thùng rác*) bọc trong `<AnimatePresence mode="wait">` với định danh `key={activeTab}`:
  - `initial={{ opacity: 0, y: 8 }}`
  - `animate={{ opacity: 1, y: 0 }}`
  - `exit={{ opacity: 0, y: -6 }}`
  - `transition={{ duration: 0.18, ease: 'easeOut' }}`.

#### 4. Quy chuẩn Phản hồi Xúc giác Vi mô (Micro-interactions)
- **Nút Checkbox Hoàn thành Công việc (Google Tasks Style)**:
  - Nút tròn với cơ chế đàn hồi khi hover/click:
    - `whileHover={{ scale: 1.15 }}`
    - `whileTap={{ scale: 0.85 }}`
    - `transition={{ type: 'spring', stiffness: 400, damping: 17 }}`.
- **Nút Thao tác Nhanh (Icon Buttons: Xoá, Xem chi tiết, Phím bấm Tác vụ)**:
  - `whileHover={{ scale: 1.12 }}`
  - `whileTap={{ scale: 0.9 }}`.
- **Khối Mở rộng / Thu gọn (Accordion & QuickAddBar options)**:
  - Bọc trong `<AnimatePresence>` với class `overflow-hidden`:
    - `initial={{ opacity: 0, height: 0 }}`
    - `animate={{ opacity: 1, height: 'auto' }}`
    - `exit={{ opacity: 0, height: 0 }}`
    - `transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}`.

---

### 4.9. Quy chuẩn Hệ thống Phân quyền Truy cập (Role-Based Access Control - RBAC)

Hệ thống hoạt động trên nguyên tắc **Mặt phẳng chung (Unified Workspace)**: Mọi thành viên đều có thể quan sát, nắm bắt tiến độ và trao đổi công việc toàn ban. Quyền tác nghiệp được phân định rõ ràng dựa trên 5 hành vi và 4 nhóm thực thể:

#### 1. Danh mục 5 Hành vi (Actions)
- **1. Tạo (`create`)**: Tạo mới thực thể.
- **2. Xem (`view`)**: Xem thông tin chi tiết trên mặt phẳng chung.
- **3. Sửa (`edit`)**: Chỉnh sửa dữ liệu, cập nhật tiến độ.
- **4. Xoá (`delete`)**: Chuyển thực thể vào Thùng rác hoặc xoá vĩnh viễn.
- **5. Khôi phục (`restore`)**: Khôi phục thực thể từ Thùng rác về trạng thái hoạt động.

#### 2. Danh mục 4 Nhóm Thực thể (Entities)
- **a. Công việc (`Tasks`)**
- **b. Dự án (`Projects`)**
- **c. Nhân sự (`Members`)**
- **d. Thùng rác (`Trash`)**

#### 3. Ma trận 3 Nhóm Quyền Chuẩn hóa (Role Matrix)

| Nhóm quyền | Đối tượng áp dụng | Công việc (a) | Dự án (b) | Nhân sự (c) | Thùng rác (d) | Ghi chú quyền hạn |
|---|---|---|---|---|---|---|
| **1. Executive** (Chuyên viên) | UX/UI Designer, SEO, Data Specialist | `a1234` | `b2` | `c2` | `d25` | • Chỉ sửa, xoá công việc do chính mình tạo (`createdBy`/`assignee`).<br>• Dự án & Nhân sự: Chỉ xem. **Riêng nhân sự UX/UI Designer có quyền chỉnh sửa thông tin các liên kết trong Dự án (Section 3: Liên kết) để hỗ trợ cho PM**.<br>• Thùng rác: Chỉ khôi phục mục do chính mình đã xoá (`deletedBy`). |
| **2. Manager** (Quản lý) | Product Manager (ngoại trừ Admin) | `a1234` | `b12345` | `c2` | `d25` | • Sửa, xoá công việc do mình tạo. **Có quyền chỉnh sửa việc của các nhân sự trong dự án mà mình phụ trách (`leadName`/PM/người tạo), không được phép chỉnh sửa dự án không phụ trách (trừ việc do mình tạo)**.<br>• Tạo dự án mới; chỉ sửa, xoá dự án do mình tạo/phụ trách.<br>• Nhân sự: Chỉ xem.<br>• Thùng rác: Chỉ khôi phục mục do chính mình đã xoá. |
| **3. Admin** (Quản trị viên) | Tài khoản Đặng Tiến Ngọc (`tienngoc`) | `a1234` | `b12345` | `c12345` | `d245` | • Toàn quyền tối cao trên toàn bộ hệ thống: Tạo, Xem, Sửa, Xoá, Khôi phục mọi Công việc, Dự án, Nhân sự.<br>• Độc quyền thực hiện Xoá vĩnh viễn và Dọn sạch toàn bộ Thùng rác. |

#### 4. Quy tắc Nghiệp vụ Quyền sở hữu (Ownership Rules)
1. **Quyền sở hữu Công việc**: Xác định qua trường `createdBy` (hoặc log khởi tạo ban đầu, fallback về người phụ trách `assignee`). Riêng Manager phụ trách dự án có quyền sửa công việc của tất cả nhân sự trong dự án đó.
2. **Quyền sở hữu Dự án**: Xác định qua trường `createdBy` (hoặc người phụ trách Lead, PM của dự án).
3. **Quyền chỉnh sửa Liên kết Dự án**: Cả Lead, PM và nhân sự UX/UI Designer đều có quyền cập nhật nhanh các đường dẫn làm việc/kết quả tại Section 3 của Chi tiết Dự án.
4. **Quyền khôi phục Thùng rác**: Xác định qua trường `deletedBy` tự động lưu lại danh tính tài khoản tại thời điểm xoá.

---

### 4.10. Quy chuẩn Góc nhìn Mặc định theo Vai trò (Default Perspective per Role)
Hệ thống tự động kích hoạt phạm vi công việc mặc định ngay khi đăng nhập dựa trên cấp bậc tài khoản:
1. **Admin** (`tienngoc`): Kích hoạt góc nhìn **`Toàn bộ phận`** (`all`) để bao quát toàn diện tiến độ của tất cả nhân sự và dự án.
2. **Manager** (`huyanh`, `nguyenhieu`): Kích hoạt góc nhìn **`Dự án của tôi`** (`my-projects`) để tập trung theo dõi các dự án do chính mình làm Lead/PM.
3. **Executive** (Nhân sự Product còn lại): Kích hoạt góc nhìn **`Của tôi`** (`mine`) để lập tức làm việc với các đầu việc do chính mình phụ trách (`assignee`).
- Người dùng có thể linh hoạt chuyển đổi giữa 3 góc nhìn này bất kỳ lúc nào tại menu tài khoản ở Header góc phải.

---

### 4.11. Quy chuẩn Thanh Điều kiện Lọc Được Ghim (ActiveFiltersBar)
1. **Vị trí & Ghim cố định (Pinned / Sticky)**:
   - Ghim cố định (`sticky top-0 z-20`) liền mạch ngay dưới Header của vùng nội dung chính.
   - Khi cuộn màn hình qua danh sách công việc dài, thanh điều kiện lọc và Header luôn được giữ cố định ở đầu trang, đảm bảo người dùng luôn nắm bắt được ngữ cảnh lọc hiện tại.
2. **Mục đích & Tương tác thuận tiện**:
   - Giúp người dùng tức thì nhận biết toàn bộ các tiêu chí lọc đang được kích hoạt (Dự án, Nhân sự, Trạng thái, Thời hạn, Nhóm, Từ khóa, Phạm vi cá nhân).
   - Mỗi tiêu chí hiển thị dưới dạng badge phẳng nhỏ gọn kèm nút `x` xóa nhanh (hỗ trợ hover đổi màu đỏ và vùng bấm thoải mái).
   - Nút **`+ Thêm lọc`**: Cho phép bổ sung nhanh các tiêu chí lọc (Dự án, Trạng thái, Thời hạn, Nhóm) qua popover trực tiếp ngay trên thanh ghim mà không cần cuộn trang lên trên.
   - Nút **`Xóa bộ lọc`** (icon `RotateCcw`): Đặt lại toàn bộ các điều kiện lọc về mặc định chỉ với 1 click từ bất kỳ vị trí cuộn nào.
3. **Phong cách thiết kế (EDITOR.md & Design System)**:
   - Thiết kế tinh gọn, trang nhã: nền `#fafafa`, viền dưới `#e5e7eb`, bóng mờ `shadow-2xs` tách biệt rõ nét với danh sách trượt bên dưới.
   - Font chữ chuẩn `Merriweather Sans` (`font-ui`), text súc tích, trực diện. Tự động ẩn khi không có bất kỳ điều kiện lọc nào kích hoạt để giữ không gian thoáng đãng.

---

### 4.12. Quy chuẩn Bộ lọc Dự án Left Sidebar (Project Filter Toggle)
Tại danh sách dự án thuộc Left Sidebar:
1. **Mặc định**:
   - Tiêu đề nhóm: **`Đang triển khai`** (cơ chế lấy dữ liệu bao gồm cả các dự án có trạng thái `'Đang triển khai'` và `'Chưa triển khai'`, giữ nguyên text tiêu đề và nút bấm theo đúng yêu cầu).
   - Nút chuyển chế độ bên phải: **`Tất cả (xx)`** (với `xx` là tổng số lượng dự án trong hệ thống).
2. **Khi bấm `Tất cả (xx)`**:
   - Tiêu đề nhóm chuyển thành: **`Toàn bộ dự án`**.
   - Nút chuyển chế độ bên phải đổi thành: **`Chỉ đang triển khai`** để người dùng có thể quay lại chế độ xem gọn.
3. **Quy tắc Sắp xếp Danh sách Dự án (Alphabetical Sorting & Others Pinning)**:
   - Danh sách dự án (cả ở chế độ *Đang triển khai* và *Toàn bộ dự án*) luôn được **sắp xếp theo thứ tự bảng chữ cái Alphabet (A-Z)** theo chuẩn tiếng Việt.
   - Dự án đặc biệt **"Chưa xác định (Others)"** luôn luôn được neo cố định ở **vị trí cuối cùng** của danh sách để người dùng tiện tra cứu và lọc các công việc phát sinh tự do.
4. **Quy chuẩn Kích thước & Vị trí Icon Sao ⭐ (Sidebar Width & Star Position)**:
   - Chiều rộng của Left Sidebar được tối ưu thành `w-80` (320px) để đảm bảo không gian hiển thị rộng rãi, tránh cắt cụt các tên dự án dài.
   - Biểu tượng sao ⭐ của **Dự án chiến lược** được đặt **ngay liền kề sau tiêu đề dự án** (ví dụ: `Overseas ⭐`) thay vì căn xa về mép phải, trong khi badge số lượng công việc vẫn căn mép phải, vừa đảm bảo trục đọc dọc thẳng hàng vừa nhận diện dự án chiến lược tức thì.
5. **Bỏ tiền tố Xưng hô cho Nhân sự Product & Thao tác Chọn Product Owner**:
   - Trong trang Dự án (`ProjectsManager`) và Chi tiết dự án (`ProjectDetailsDrawer`), các chức danh Product (PM, UX/UI Designer, SEO, Data, Lead) không kèm tiền tố danh xưng ("Anh", "Chị"), hiển thị dạng `"Họ và Tên - IP Phone"`.
   - Nhóm Stakeholder / Product Owner vẫn giữ nguyên tiền tố xưng hô.
   - Khi chỉnh sửa dự án, sau khi người dùng chọn xong Product Owner từ danh sách Stakeholder, hộp gợi ý lựa chọn tự động đóng lại để tối ưu hóa thao tác người dùng.
6. **Đồng bộ Lọc Thời gian theo Góc nhìn Phân vai**:
   - Các bộ đếm Quá hạn, Đến hạn hôm nay và danh sách công việc trên thanh `ReminderPanel` luôn tự động đồng bộ theo phạm vi góc nhìn đang chọn (`Của tôi`, `Dự án của tôi`, hoặc các điều kiện lọc Dự án / Thành viên đang kích hoạt).

---

### 4.13. Quy chuẩn Hệ thống Thông báo Cá nhân Có Định hướng (Targeted Notification System)
1. **Giao diện Ngăn kéo (Right Sidebar Drawer)**:
   - Module `NotificationDrawer.tsx` mở từ mép phải màn hình khi bấm vào icon Chuông (`Bell`) trên Header.
   - Hiển thị badge số lượng thông báo chưa đọc màu đỏ nổi bật.
2. **Cơ chế Định hướng Thông báo theo Phân vai Dự án (Targeted Routing)**:
   - Khi **Executive** tạo hoặc cập nhật công việc: Hệ thống tự động gửi thông báo trực tiếp đến **Product Manager** phụ trách dự án đó.
   - Khi **Product Manager** tạo hoặc phân công công việc: Hệ thống gửi thông báo trực tiếp đến **Executive** được giao việc (`assignee`).
   - Tránh việc gửi thông báo tràn lan (Spam Notifications) cho toàn bộ thành viên không liên quan.
3. **Cấu trúc Dữ liệu Bảng `notifications` (Supabase Table)**:
   - `id`: TEXT khóa chính (`notif-timestamp-hash`).
   - `recipient_name`: Họ tên người nhận thông báo (`Trần Huy Anh`, `Đặng Tiến Ngọc`, v.v.).
   - `recipient_id`: Username/ID người nhận thông báo (`huyanh`, `nguyenhieu`, `tienngoc`, v.v.).
   - `actor_name`: Họ tên người thực hiện hành động (Executive, PM hoặc Hệ thống).
   - `project_id` & `project_name`: ID và Tên dự án liên quan.
   - `task_id` & `task_title`: ID và Tiêu đề công việc liên quan.
   - `type`: Loại thông báo (`task_created`, `task_completed`, `task_blocked`, `task_assigned`, `task_updated`).
   - `title`: Tiêu đề tóm tắt ngắn gọn.
   - `content`: Chi tiết nội dung thông báo.
   - `is_read`: Boolean trạng thái đã đọc hay chưa (mặc định `false`).
   - `created_at`: Thời gian tạo (TIMESTAMPTZ).
   - *Mã SQL khởi tạo Supabase*:
     ```sql
     CREATE TABLE IF NOT EXISTS public.notifications (
       id TEXT PRIMARY KEY,
       recipient_name TEXT NOT NULL,
       recipient_id TEXT,
       actor_name TEXT,
       project_id TEXT,
       project_name TEXT,
       task_id TEXT,
       task_title TEXT,
       type TEXT NOT NULL,
       title TEXT NOT NULL,
       content TEXT NOT NULL,
       is_read BOOLEAN DEFAULT false,
       created_at TIMESTAMPTZ DEFAULT now()
     );
     CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_name);
     CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);
     ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "Allow all read on notifications" ON public.notifications FOR SELECT USING (true);
     CREATE POLICY "Allow all insert on notifications" ON public.notifications FOR INSERT WITH CHECK (true);
     CREATE POLICY "Allow all update on notifications" ON public.notifications FOR UPDATE USING (true);
     CREATE POLICY "Allow all delete on notifications" ON public.notifications FOR DELETE USING (true);
     ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
     ```
4. **Tương tác**: Cho phép click vào thông báo để mở trực tiếp Task hoặc Project tương ứng, hỗ trợ nút "Đánh dấu tất cả đã đọc".
5. **Tính năng Thông báo Đẩy Trình duyệt (Web Push Notifications)**:
   - Tích hợp chuẩn Web Notification API & Service Worker (`public/sw.js`).
   - Nhận thông báo trực tiếp trên màn hình desktop/mobile ngay cả khi người dùng đang chuyển sang tab khác hoặc thu nhỏ trình duyệt.
   - Tích hợp thanh điều khiển Web Push trong `NotificationDrawer`: Nút yêu cầu cấp quyền ("Bật ngay"), chuyển đổi Trạng thái Bật/Tắt, nút "Thử thông báo" để kiểm tra tức thì trên màn hình, và hướng dẫn khi trình duyệt chặn quyền.
   - Tự động kích hoạt thông báo đẩy khi thành viên được giao việc mới (`task_assigned`), task hoàn thành (`task_completed`), task bị nghẽn (`task_blocked`), hoặc nhắc nhở các việc đến hạn/quá hạn trong ngày khi mở ứng dụng.
   - Khi bấm vào thông báo Web Push trên màn hình hệ thống: Tự động chuyển tiêu điểm (focus) về tab WMS và mở trực tiếp chi tiết công việc liên quan.
6. **Cơ chế Kiểm tra & Hướng dẫn Cá nhân hóa theo Hệ điều hành và Trình duyệt (Personalized OS/Browser Guidance)**:
   - Hệ thống tự động kiểm tra trạng thái quyền thông báo của người dùng (`default`, `denied`, hoặc `granted`).
   - Tự động nhận diện chính xác Hệ điều hành (`macOS`, `Windows`, `iOS`, `Android`, `Linux`) và Trình duyệt (`Chrome`, `Safari`, `Edge`, `Firefox`, `Cốc Cốc`).
   - **Khi chưa bật (`default`)**: Hiển thị hướng dẫn ngắn gọn phù hợp với trình duyệt đang dùng, kèm nút "Bật ngay".
   - **Khi bị chặn (`denied`)**: Hiển thị quy trình 3 bước mở khóa trực quan riêng cho trình duyệt đó (vị trí icon ⚙️/🔒 trên thanh URL, đổi quyền sang "Cho phép", và tải lại trang).
   - **Vị trí tinh tế, không gây phiền nhiễu**:
     - *Trong NotificationDrawer*: Card `PersonalizedWebPushCard` nằm gọn trên đầu ngăn kéo thông báo.
     - *Ngoài màn hình công việc*: Banner mỏng `WebPushPromptBanner` cao 34px, có nút đóng vĩnh viễn `✕` (lưu `localStorage` để không làm phiền lại).
   - **Thông điệp súc tích**: Định dạng ngắn gọn, trực quan, có biểu tượng chỉ dẫn rõ ràng.

---

### 4.14. Quy chuẩn Thời gian làm việc & Mục Thiết lập trong Workspace (Working Time & Admin Settings Specification)
1. **Quy chuẩn Thời gian làm việc (Standard Working Schedule)**:
   - **Ngày làm việc trong tuần**: Thứ Hai đến hết thứ Sáu. Nghỉ cố định Thứ Bảy và Chủ Nhật.
   - **Khung giờ làm việc**: Từ `08:00` đến `17:30` (Nghỉ trưa: `12:00` – `13:30`, tương đương 8 giờ làm việc/ngày).
   - **Ngày lễ (National Holidays)**: Các ngày nghỉ lễ quốc gia trong năm (Tết Dương lịch, Tết Nguyên Đán, Giỗ tổ Hùng Vương, 30/4 & 1/5, Quốc khánh 2/9...).
   - **Ngày làm bù (Compensatory Workdays)**: Những ngày Thứ Bảy hoặc Chủ Nhật được chỉ định làm việc bù (tính trọng số 1.0 ngày làm việc).
   - **Nghỉ phép nhân sự (Member Leaves)**: Quản lý các ngày nghỉ phép năm, nghỉ ốm, việc gia đình cụ thể theo từng nhân sự. Hỗ trợ ghi nhận nghỉ cả ngày hoặc nửa buổi (sáng hoặc chiều = 0.5 ngày làm việc).
2. **Mục đích Tính toán & Ứng dụng**:
   - Dùng để tính toán chính xác **Số ngày triển khai công việc** thực tế của nhân sự trên từng dự án (chỉ tính ngày làm việc, loại trừ T7, CN, ngày lễ và ngày nhân sự xin nghỉ phép; cộng thêm các ngày làm bù).
   - Chuẩn hóa thông tin ngày vào làm (`joinDate`): Hiển thị dạng chuẩn `Vào: Fri, 11 Sep 2026 (xxx ngày)` tương ứng với số ngày làm việc thực tế đã cống hiến tính đến thời điểm hiện tại.
3. **Phân quyền Truy cập & Phạm vi Nhân sự (RBAC Scoped)**:
   - Mục **`Thiết lập`** trong nhóm Work Space ở Left Sidebar **dành riêng cho tài khoản Admin** (`tienngoc`).
   - Danh mục nhân sự trong đơn Nghỉ phép và Tra cứu ngày công **chỉ áp dụng đối với nhân sự thuộc bộ phận Product** (`Product Manager`, `UX/UI Designer`, `SEO`, `Data`), không hiển thị nhân sự ngoài ban.
   - Tab `Database` đã được lược bỏ khỏi giao diện người dùng sau khi hoàn tất khởi tạo các bảng trên Supabase.
4. **Cơ chế Ngày làm bù & Xin nghỉ nửa buổi (Compensatory Workdays & Half-day Leaves)**:
   - *Ngày làm bù (`compensatory_workdays`)*: Cho phép tạo ngày làm bù vào cuối tuần kèm lý do, tự động tính 1.0 ngày công.
   - *Xin nghỉ nửa buổi (`session: 'morning' | 'afternoon'`)*: Cho phép chọn buổi sáng hoặc buổi chiều, hệ thống tự động tính trừ 0.5 ngày công thay vì 1.0 ngày.
5. **Cơ chế Lưu trữ & Cấu trúc Database Supabase (Đã khởi tạo)**:
   - Dữ liệu hiện được lưu trữ và đồng bộ an toàn trên thiết bị thông qua `workingTimeService.ts` (`localStorage`).
   - Cấu trúc 4 bảng đã khởi tạo trên Supabase:
   ```sql
   -- Bảng 1: Lịch làm việc
   CREATE TABLE IF NOT EXISTS public.working_schedule_config (
     id TEXT PRIMARY KEY DEFAULT 'default',
     work_days INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5],
     start_time TEXT DEFAULT '08:00',
     end_time TEXT DEFAULT '17:30',
     lunch_break_start TEXT DEFAULT '12:00',
     lunch_break_end TEXT DEFAULT '13:30',
     note TEXT,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
   );

   -- Bảng 2: Ngày lễ
   CREATE TABLE IF NOT EXISTS public.system_holidays (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     start_date DATE NOT NULL,
     end_date DATE NOT NULL,
     days_count INTEGER NOT NULL DEFAULT 1,
     is_recurring BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
   );

   -- Bảng 3: Ngày làm bù
   CREATE TABLE IF NOT EXISTS public.compensatory_workdays (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     date DATE NOT NULL,
     note TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
   );

   -- Bảng 4: Nghỉ phép nhân sự (Hỗ trợ nghỉ nửa buổi sáng/chiều)
   CREATE TABLE IF NOT EXISTS public.member_leaves (
     id TEXT PRIMARY KEY,
     member_id TEXT,
     member_name TEXT NOT NULL,
     start_date DATE NOT NULL,
     end_date DATE NOT NULL,
     session TEXT DEFAULT 'all_day', -- 'all_day', 'morning', 'afternoon'
     days_count NUMERIC(4, 1) NOT NULL DEFAULT 1.0,
     reason TEXT DEFAULT 'Nghỉ phép năm',
     status TEXT DEFAULT 'Đã duyệt',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
   );
   ```

6. **Quản trị Master Checklist Dự án trong Thiết lập (Master Checklist Management)**:
   - Tích hợp tab **`Checklist ({count})`** trong mục Thiết lập hệ thống (`SettingsManager`).
   - Cung cấp đầy đủ các tác vụ quản trị:
     - **Thêm mới**: Bổ sung tiêu chuẩn vào bất kỳ giai đoạn nào (1 đến 5) với lựa chọn chèn vào đầu hoặc cuối giai đoạn.
     - **Sửa**: Điều chỉnh nội dung câu hỏi/tiêu chuẩn và chuyển giai đoạn nếu cần.
     - **Xoá**: Gỡ bỏ tiêu chuẩn khỏi bộ tiêu chuẩn mẫu với modal xác nhận an toàn.
     - **Thay đổi vị trí (Reorder)**: Di chuyển lên / Di chuyển xuống trực tiếp trong cùng giai đoạn bằng các nút `ArrowUp` / `ArrowDown`.
     - **Khôi phục gốc (Reset to Defaults)**: Khôi phục lại bộ 34 tiêu chuẩn chuẩn hóa ban đầu của Ban Sản phẩm bất kỳ lúc nào.
   - **Cơ chế Lưu trữ Supabase**: Dữ liệu Master Checklist Template được lưu trữ vĩnh viễn và tập trung tại bảng `system_settings` (khóa `master_checklist_template`), tự động nạp khi khởi động ứng dụng và màn hình Thiết lập, giải quyết triệt để lỗi hoàn nguyên về mặc định.
   - Khi Master Checklist thay đổi, hệ thống phát tín hiệu `wms_checklist_template_updated` để tự động cập nhật ngay trên các màn hình mở việc và chi tiết dự án.

7. **Quản trị Công việc Lặp lại Chu kỳ (Automated Recurring Tasks Engine)**:
   - Tích hợp tab **`Việc chu kỳ ({count})`** dành riêng cho Admin trong mục Thiết lập hệ thống (`SettingsManager`).
   - Quy tắc lặp được lưu trữ tập trung tại bảng `recurring_rules` trên Supabase, hỗ trợ nạp tự động qua `initFromSupabase()`.
   - Mỗi task sinh ra mang đầy đủ các trường `isRecurring`, `recurringRuleId`, `recurringFrequency` được lưu giữ trên bảng `tasks` của Supabase.
   - Khi công việc chu kỳ được đánh dấu Hoàn thành, hệ thống tự động tính toán và cập nhật `nextRunDate` của quy tắc sang chu kỳ kế tiếp.

---

### 4.15. Quy chuẩn Friendly URL & Deep Linking (Semantic Routing Specification)
1. **Mục đích & Trải nghiệm**:
   - Cung cấp định dạng đường dẫn URL ngữ nghĩa, thân thiện, ngắn gọn để thành viên chia sẻ trực tiếp cho nhau qua Chat FPT, Zalo, Teams, Slack, Email.
   - Khi người nhận mở đường dẫn, hệ thống tự động nhận diện và kích hoạt đúng trang chức năng hoặc tự động mở Right Sidebar Drawer của công việc/dự án tương ứng.
2. **Cấu trúc Đường dẫn Chuẩn hóa (Path-based URLs)**:
   - **Các lớp trang**:
     - Công việc: `/tasks` (hoặc alias `/cong-viec`)
     - Dự án: `/projects` (hoặc alias `/du-an`)
     - Nhân sự: `/members` (hoặc alias `/nhan-su`)
     - Thiết lập: `/settings` (hoặc alias `/thiet-lap`)
     - Thùng rác: `/trash` (hoặc alias `/thung-rac`)
   - **Chi tiết Công việc**: `/tasks/:taskId` (ví dụ: `/tasks/t-1`, `/tasks/task-1789...`) ➔ Mở trang Công việc kèm Right Drawer chi tiết công việc.
   - **Chi tiết Dự án**: `/projects/:codeOrId` (ví dụ: `/projects/YKIEN`, `/projects/p-1`) ➔ Mở Right Drawer chi tiết dự án.
   - **Lọc việc theo Dự án**: `/tasks?project=:codeOrId` (ví dụ: `/tasks?project=YKIEN`) ➔ Mở trang Công việc đã được kích hoạt bộ lọc dự án.
3. **Cơ chế Đồng bộ & Trình duyệt (HTML5 History API & Popstate)**:
   - Đồng bộ 2 chiều mượt mà giữa URL trên trình duyệt và trạng thái ứng dụng bằng `window.history.pushState` / `replaceState` mà không reload trang.
   - Hỗ trợ đầy đủ phím điều hướng **Quay lại (Back)** và **Tiến tới (Forward)** của trình duyệt thông qua lắng nghe sự kiện `popstate`.
   - Cấu hình rewrites SPA toàn diện trên Vercel (`vercel.json`) đảm bảo không bị lỗi 404 khi truy cập trực tiếp từ link chia sẻ.
4. **Nút Sao chép Liên kết 1-Click (Quick Share)**:
   - Tích hợp nút **"Sao chép link"** (icon `Share2`) trực tiếp trên Header của `TaskDetailDrawer` và `ProjectDetailsDrawer`.
   - Tự động sao chép Full URL vào Clipboard và hiển thị trạng thái "Đã chép link" trong 2 giây.

---

### 4.16. Quy chuẩn Cảnh báo Giai đoạn & Deadline Dự án trước 3 ngày (Project & Phase Deadline Alerts Specification)
1. **Mục đích & Ý nghĩa Nghiệp vụ**:
   - Tự động giám sát chặt chẽ các mốc bàn giao sản phẩm quan trọng: **Giai đoạn dự án (`phase.dueDate`)** và **Deadline nghiệm thu dự án (`project.targetDate`)**.
   - Cảnh báo trực diện cho **PM phụ trách dự án** và **nhân sự tham gia dự án** (Designer, SEO, Data, nhân sự có task trong dự án) trước 3 ngày để chủ động bám sát tiến độ, kiểm thử, nghiệm thu và phối hợp liên phòng ban.
2. **Quy tắc Kiểm tra & Xác định Cảnh báo**:
   - **Giai đoạn dự án (`ProjectPhase`)**:
     - Áp dụng cho các giai đoạn có ngày hạn chót `dueDate` hợp lệ và trạng thái chưa hoàn thành (`isPhaseCompleted` kiểm tra loại trừ cả `'Đã hoàn thành'`, `'Hoàn thành'`, `'completed'`, `'done'`).
     - Dự án cha chưa hoàn thành (`isProjectCompleted(project.status)` trả về `false`).
     - Thời hạn rơi vào khoảng: **Còn 1 đến 3 ngày tới** (`1 <= diffDays <= 3`), **Đến hạn hôm nay** (`diffDays === 0`), hoặc **Đã quá hạn** (`diffDays < 0`).
   - **Deadline mục tiêu dự án (`project.targetDate`)**:
     - Áp dụng cho dự án có ngày mục tiêu `targetDate` hợp lệ và trạng thái chưa hoàn thành (`isProjectCompleted(project.status)` trả về `false`).
     - Thời hạn rơi vào khoảng: Còn 1 đến 3 ngày, Đến hạn hôm nay hoặc Đã quá hạn.
3. **Phân quyền Đối tượng & Lọc Cảnh báo theo Tài khoản (Account-scoped)**:
   - **PM phụ trách dự án (`pmNames`)**:
     - Ưu tiên 1: `proj.roles.pm` được gán chính thức trong dự án.
     - Ưu tiên 2: `proj.leadName` (chỉ khi `roles.pm` chưa có hoặc nhân sự được chỉ định rõ thuộc PM).
     - Tuyệt đối không tự động gán người tạo dự án (`createdBy`) vào danh sách PM nếu dự án đã có PM phụ trách riêng.
   - **Nhân sự thuộc dự án (`allMemberNames`)**: Gồm PM, chuyên viên khai báo trong `roles.designer`, `roles.seo`, `roles.data`, `leadName` và nhân sự đang có công việc (`TaskItem`) trong dự án đó.
   - **Quy tắc lọc theo tài khoản (Account Scoping)**: Khối cảnh báo lọc trực tiếp theo tài khoản đang đăng nhập/làm việc (`effectiveMember`). Chỉ hiển thị các mốc thuộc dự án mà nhân sự đó trực tiếp phụ trách hoặc tham gia, ngăn ngừa hiển thị tràn lan các dự án không liên quan.
4. **Quy chuẩn Giao diện Khối Cảnh báo (`ProjectDeadlineAlertBanner`)**:
   - Tích hợp tại trang **Công việc (`/tasks`)** và trang **Dự án (`/projects`)**.
   - **Tiêu đề súc tích theo `EDITOR.md`**: `Cảnh báo tiến độ: {count} mốc dự án` kèm các chip đếm ngắn gọn `{x} quá hạn`, `{y} hôm nay`, `{z} sắp đến hạn`. Không dùng phụ đề rườm rà.
   - **Bố cục 2 tầng phẳng chuẩn `TaskItemRow` (Zero Layout Distortion)**:
     - **Tầng 1 (Hàng trên)**:
       - *Bên trái*: Badge tình trạng (🚨 Quá hạn X ngày / ⏰ Đến hạn hôm nay / ⚠️ Còn X ngày) + Tiêu đề mốc ngắn gọn (cắt bỏ tiền tố thừa "Giai đoạn:") + Mã dự án `[CODE]`.
       - *Bên phải (`shrink-0`)*: Cụm nút tác vụ cố định gồm **"Xem việc"** (lọc công việc dự án) và **"Chi tiết"** (mở drawer dự án). Tuyệt đối không để nút bị tràn hàng hay thụt lề sai lệch.
     - **Tầng 2 (Hàng dưới - Metadata thụt lề `pl-8` thẳng hàng với tiêu đề)**:
       - Dải thông tin dàn ngang phân tách bằng dấu chấm `•`: Tên dự án (icon `Folder`) • Phân loại mốc (`Giai đoạn` / `Deadline dự án`) • Hạn chót (dùng `formatTaskDueDisplay`: Hôm nay, Hôm qua, Ngày mai hoặc ngày chuẩn) • PM phụ trách.
   - **Tự động ẩn**: Khối cảnh báo tự động ẩn hoàn toàn khi không có mốc nào đến hạn trong phạm vi theo dõi.
5. **Kênh Thông báo Hệ thống (Notification Drawer & Web Push)**:
   - Tự động quét khi mở ứng dụng và định kỳ mỗi 10 phút.
   - Gửi thông báo đến đúng các nhân sự thuộc dự án với loại `phase_due_soon` hoặc `project_due_soon`.
   - **Chống spam**: Mỗi mốc hạn chót chỉ gửi tối đa 1 thông báo/ngày cho cùng 1 nhân sự. Bấm vào thông báo sẽ mở ngay drawer chi tiết của dự án.

---

## 📌 Quy định Cập nhật & Duy trì (Maintenance Rules)
1. Bất kỳ khi nào có sự bổ sung hoặc thay đổi nhân sự thuộc Ban Sản phẩm - Công nghệ hoặc Ban Biên tập, cập nhật trực tiếp bảng tại **Nhóm 3**.
2. Khi phát sinh dự án mới hoặc thay đổi người phụ trách, cập nhật tại bảng danh mục tại **Nhóm 2**.
3. Mọi tính năng mới hoặc điều chỉnh luồng UI/UX phải được cập nhật mô tả chi tiết tại **Nhóm 4** để làm chuẩn tham chiếu kỹ thuật thống nhất.
4. Mọi chuyển động hoặc hoạt họa mới phát triển trong hệ thống phải tuân thủ nghiêm ngặt theo quy chuẩn Framer Motion tại **Mục 4.8**.
5. Mọi quy tắc phân quyền người dùng và kiểm soát hành vi trên thực thể phải tuân thủ nghiêm ngặt theo **Mục 4.9** và **Mục 4.10**.
6. **Chuẩn hóa Biên tập Ngôn ngữ (EDITOR.md Compliance)**: Mọi trang, giao diện, bảng biểu hoặc tính năng mới thêm vào hệ thống **bắt buộc phải tuân thủ nghiêm ngặt phong cách biên tập từ `EDITOR.md`**: súc tích, trực diện, không dùng từ đệm rườm rà ("tiêu chuẩn", "danh mục các", "công cụ tra cứu"...), đặt danh từ/động từ trọng tâm lên đầu.
7. **Ghi chú Cơ sở dữ liệu (Database Schemas)**: Khi phát triển tính năng mới có nhu cầu lưu trữ dữ liệu mới, bắt buộc phải ghi chú rõ ràng kèm cấu trúc bảng SQL (schema DDL, khóa chính, khóa ngoại, kiểu dữ liệu chuẩn) trong tài liệu kỹ thuật và giao diện quản trị.
8. **Quy trình Triển khai Mã nguồn (Deployment & Git Rules)**: Tuyệt đối không tự ý chạy lệnh push Git (`git push`) hay tự động kích hoạt triển khai production (Vercel). Sau mỗi lần hoàn thiện task, luôn cung cấp đầy đủ danh sách câu lệnh Git chuẩn xác để người dùng tự chủ động kiểm tra và đẩy code lên repository khi có nhu cầu.


