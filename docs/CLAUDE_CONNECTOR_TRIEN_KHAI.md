# Triển khai Connector Claude: việc cần làm

Checklist đưa connector từ nhánh `feature/claude-mcp-connector` lên production và vào sử dụng. Tài liệu tham chiếu đầy đủ: [CLAUDE_CONNECTOR.md](CLAUDE_CONNECTOR.md).

## Hiện trạng

| Hạng mục | Trạng thái |
|---|---|
| Mã nguồn connector (`api/mcp.ts`, `api/_wms/`) | Xong, nằm trên nhánh `feature/claude-mcp-connector` |
| Kiểm thử `npm run test:mcp` (15 bài, dữ liệu giả) | Đạt |
| Đọc dữ liệu thật qua connector chạy trên máy | Đạt |
| Ghi dữ liệu thật vào Supabase | Chưa thử |
| Chạy trên Vercel | Chưa thử |
| Kết nối từ claude.ai | Chưa thử |
| Lịch nhắc 08:00 | Chưa tạo |
| Chuyển việc từ file sang app | Chưa làm, chờ xác định file nguồn |

## Thứ tự thực hiện

Làm lần lượt từ bước 1. Bước 2 và 3 phải xong trước khi merge, nếu không connector trả lỗi 503.

### Bước 1. Duyệt code (Ngọc)

- [ ] Mở Pull Request từ `feature/claude-mcp-connector` vào `main` trên GitHub.
- [ ] Đọc 4 file chính: `api/mcp.ts` (xác thực), `api/_wms/tools.ts` (8 công cụ và quy tắc nghiệp vụ), `api/_wms/store.ts` (truy vấn Supabase), `vercel.json` (loại `/api/` khỏi rewrite).
- [ ] Chạy trên máy:

  ```bash
  npm run test:mcp
  ```

  ```bash
  npm run build
  ```

- [ ] Xác nhận phạm vi: connector không xoá việc, không đổi schema, không thêm bảng.

### Bước 2. Sinh token (Ngọc)

- [ ] Sinh token cho người dùng đợt đầu. Nên bắt đầu với một mình `tienngoc`:

  ```bash
  npm run mcp:token -- tienngoc
  ```

- [ ] Lưu hai thứ lệnh in ra vào trình quản lý mật khẩu: giá trị `WMS_MCP_TOKENS` và URL connector của từng người.
- [ ] Không dán token vào nhóm chat, issue, ảnh chụp màn hình. URL connector chứa token nên coi như mật khẩu.

### Bước 3. Đặt biến môi trường trên Vercel (Ngọc)

Vercel > Project > Settings > Environment Variables. Chọn cả Production và Preview.

- [ ] `WMS_MCP_TOKENS`: dòng in ra ở bước 2.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`: lấy tại Supabase > Project Settings > API > `service_role`.
- [ ] Kiểm tra lại: hai giá trị này không xuất hiện trong repo (repo public).

### Bước 4. Thử trên bản Preview (Ngọc)

Nhánh đã push nên Vercel tự dựng một bản Preview. Sau khi thêm biến môi trường, bấm Redeploy bản Preview để nhận biến mới.

- [ ] Gọi thử (đổi `<preview-url>` và `<token>`):

  ```bash
  curl -s -X POST "https://<preview-url>/api/mcp?token=<token>" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_members","arguments":{}}}'
  ```

- [ ] Kết quả đúng: danh sách 12 nhân sự và dòng "Bạn đang dùng tài khoản: Đặng Tiến Ngọc".
- [ ] Gọi sai token: nhận mã 401.

Lưu ý: nếu Preview bật Deployment Protection, `curl` bị chặn ở trang đăng nhập Vercel. Khi đó bỏ qua bước này và kiểm tra ở bước 6. Bản Preview dùng chung Supabase production nên lệnh ghi ở đây cũng ghi dữ liệu thật.

### Bước 5. Merge và deploy (Ngọc)

- [ ] Merge Pull Request vào `main`. Vercel tự deploy production.
- [ ] Mở app, kiểm tra các trang `/tasks`, `/projects` vẫn chạy bình thường (rewrite SPA đã đổi).

### Bước 6. Kiểm tra sau deploy (Ngọc)

- [ ] Gọi `list_members` trên production bằng lệnh `curl` ở mục 3 của [CLAUDE_CONNECTOR.md](CLAUDE_CONNECTOR.md).
- [ ] Thử ghi một việc thật, mở app xác nhận, rồi xoá trong app:
  - Thêm việc: tiêu đề `Thử connector Claude cho WMS`, hạn hôm nay.
  - Việc hiện ngay trên màn hình app đang mở, không cần tải lại.
  - Tab Lịch sử của việc có dòng tạo mới, tác giả đúng, ghi chú có đuôi `(qua Claude)`.
  - Chuyển `Hoàn thành` thiếu link kết quả: bị từ chối.
  - Giao một việc cho người khác: người nhận có thông báo trong app.

### Bước 7. Thêm connector trên claude.ai (Ngọc)

- [ ] claude.ai > Settings > Connectors > Add custom connector. Name: `WMS VnExpress`. URL: URL riêng in ra ở bước 2.
- [ ] Thử trong một hội thoại mới: "Việc của tôi hôm nay".
- [ ] Dán đoạn chỉ dẫn ở mục 5 của [CLAUDE_CONNECTOR.md](CLAUDE_CONNECTOR.md) vào Settings > Profile để mọi hội thoại tự ghi việc vào app.

### Bước 8. Lịch nhắc 08:00 và 16:30 (Claude làm, Ngọc xác nhận)

- [ ] Tạo tác vụ định kỳ 08:00 thứ Hai đến thứ Sáu, nội dung ở mục 6 của [CLAUDE_CONNECTOR.md](CLAUDE_CONNECTOR.md).
- [ ] Tạo tác vụ 16:30 nhắc đóng task (tuỳ chọn).
- [ ] Chạy thử một lần, đối chiếu kết quả với app.

### Bước 9. Chuyển việc từ file sang app (Claude làm, Ngọc xác nhận)

- [ ] Ngọc gửi file nguồn (đường dẫn hoặc đính kèm).
- [ ] Claude đọc file, liệt kê danh sách việc sẽ thêm để Ngọc duyệt trước khi ghi.
- [ ] Chạy `add_tasks`. Báo số việc đã thêm, số trùng, số lỗi.
- [ ] Việc đã xong mà thiếu link kết quả: Ngọc bổ sung link, không tự điền.
- [ ] Sau khi đối chiếu đủ, ngừng dùng file cũ. WMS là nguồn duy nhất.

### Bước 10. Mở cho cả bộ phận (Ngọc)

Làm sau khi Ngọc dùng ổn định vài ngày.

- [ ] Sinh token cho các nhân sự còn lại:

  ```bash
  npm run mcp:token -- huyanh nguyenhieu quangvinh duytung binhminh dinhtrung ngocson huunam haidat huutrung vantien
  ```

- [ ] Nối các mục mới vào `WMS_MCP_TOKENS` hiện có (giữ nguyên token cũ của `tienngoc`), rồi Redeploy.
- [ ] Gửi URL riêng cho từng người qua kênh riêng tư, kèm mục 4 và 5 của [CLAUDE_CONNECTOR.md](CLAUDE_CONNECTOR.md).

## Việc tồn, xử lý riêng

- [ ] **Siết RLS trên Supabase.** Anon key nằm công khai trong repo và hiện đọc, ghi được mọi bảng. Service key chỉ tăng bảo mật khi RLS được siết. Việc này ảnh hưởng cách app đăng nhập và ghi dữ liệu, cần phương án riêng.
- [ ] **Định dạng ngày.** Connector dùng định dạng của app (`Sun, 02 Aug 2026`), chưa theo Content Rules của VDS.

## Xử lý sự cố

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| 503 "Connector chưa được cấu hình" | Thiếu `WMS_MCP_TOKENS` hoặc `SUPABASE_SERVICE_ROLE_KEY`, hoặc chưa Redeploy sau khi thêm | Thêm biến, Redeploy |
| 401 "Token không hợp lệ" | Token sai, ngắn hơn 32 ký tự, hoặc đã bị gỡ | Kiểm tra URL, sinh lại token |
| 404 tại `/api/mcp` | Function chưa được deploy, hoặc `vercel.json` chưa có bản mới | Kiểm tra bản deploy đang chạy là bản đã merge |
| 405 "Chỉ hỗ trợ POST" | Mở URL bằng trình duyệt | Bình thường. Connector chỉ nhận POST |
| Thêm việc báo trùng | Người phụ trách đã có việc đang mở cùng tiêu đề | Cập nhật việc cũ bằng `update_task` |
| Sửa việc bị từ chối | Không đủ quyền theo RBAC mục 4.9 | Dùng token của người có quyền |

## Thu hồi và quay lui

- **Thu hồi một người**: xoá mục `username:token` khỏi `WMS_MCP_TOKENS`, Redeploy.
- **Tắt toàn bộ connector**: xoá biến `WMS_MCP_TOKENS`, Redeploy. Connector trả 503, app không bị ảnh hưởng.
- **Quay lui code**: Vercel > Deployments > chọn bản trước > Promote to Production, hoặc revert commit merge trên `main`.
