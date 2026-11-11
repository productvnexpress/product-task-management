# Connector Claude cho WMS

Claude thêm, cập nhật, xem công việc thẳng trong app "Quản lý công việc bộ phận Sản phẩm". Mọi hội thoại Claude dùng chung một nguồn dữ liệu: Supabase của WMS.

- Địa chỉ connector: `https://product-task-management-qr39.vercel.app/api/mcp`
- Mã nguồn: `api/mcp.ts`, `api/_wms/`
- Giao thức: MCP Streamable HTTP, không trạng thái, chạy dạng Vercel Function
- Checklist triển khai: [CLAUDE_CONNECTOR_TRIEN_KHAI.md](CLAUDE_CONNECTOR_TRIEN_KHAI.md)

## 1. Công cụ

| Công cụ | Việc làm | Ghi dữ liệu |
|---|---|---|
| `list_tasks` | Xem việc, lọc theo người, dự án, trạng thái, hạn, từ khoá không dấu, người tạo (`created_by`), việc đã giao cho người khác (`delegated`), việc lâu không cập nhật (`stale_days`) | Không |
| `get_task` | Xem chi tiết một việc kèm lịch sử gần nhất | Không |
| `add_task` | Thêm một việc. Chỉ bắt buộc tiêu đề | Có |
| `add_tasks` | Thêm tối đa 50 việc một lần (chuyển từ file, biên bản họp) | Có |
| `update_task` | Đổi trạng thái, dời hạn, đổi người, thêm link, ước lượng, ghi chú tiến độ. Khi hoàn thành: trả kèm dữ liệu dự án để gợi ý việc tiếp theo | Có |
| `delete_task` | Chuyển việc vào Thùng rác, khôi phục được trong app | Có |
| `add_comment` | Bình luận, đôn đốc trên một việc. `@username` để nhắc đích danh | Có |
| `daily_brief` | Bản tin trong ngày: việc nên làm trước, tải hôm nay, quá hạn, đến hạn, nghẽn, lâu không cập nhật, việc đã giao cần đôn đốc | Không |
| `member_summary` | Tình hình một người, dùng trước họp 1:1 hoặc trước khi đôn đốc | Không |
| `workload_today` | Soát việc đăng ký trong ngày: tổng ước lượng so với 8 giờ, việc chưa ước lượng, tiêu đề chung chung | Không |
| `list_projects` | Dự án kèm mã, PM, hạn, số việc mở | Không |
| `list_members` | Nhân sự kèm username, nhóm chuyên môn | Không |

Connector chỉ xoá mềm: `delete_task` chuyển việc vào Thùng rác theo đúng quyền xoá của app. Xoá vĩnh viễn thực hiện trong app.

Quy tắc nghiệp vụ giữ nguyên như app:

- Mặc định khi thêm: giao cho chủ token, hạn hôm nay, trạng thái `Chưa làm`, dự án `Chưa xác định (Others)`. Việc chưa có hạn: truyền `due_date = "none"`.
- Ước lượng thời gian (`estimate_minutes`): không bắt buộc qua connector, thiếu thì connector nhắc Claude hỏi lại người dùng.
- Chuyển `Hoàn thành` bắt buộc có link kết quả là URL hợp lệ. Chuyển `Bị nghẽn` bắt buộc có lý do.
- Quyền sửa theo RBAC mục 4.9 của AGENTS.md: Executive sửa việc của mình, Manager sửa việc trong dự án phụ trách, Admin sửa mọi việc.
- Mỗi thay đổi ghi một dòng lịch sử công việc, tác giả là chủ token, ghi chú có đuôi `(qua Claude)`.
- Giao việc cho người khác: người nhận có thông báo `task_assigned` trong app.
- Chống trùng: người phụ trách đã có việc trùng tiêu đề thì không tạo thêm. Tiêu đề gần giống một việc đang mở (cùng người, cùng từ khoá) thì dừng lại, liệt kê việc nghi trùng; chỉ tạo khi gọi lại với `allow_duplicate = true`.
- `workload_today`: Executive chỉ xem của mình; Manager và Admin xem cả bộ phận.
- Ngày giờ tính theo giờ Việt Nam.

## 2. Bảo mật

- Mỗi nhân sự một token riêng, gắn với username. Token quyết định "ai đang thao tác" và quyền sửa.
- Token và service key chỉ nằm trong biến môi trường Vercel. Repo public: không đưa hai giá trị này vào code, file `.env` đã commit, issue hay ảnh chụp màn hình.
- Token truyền qua `Authorization: Bearer <token>` hoặc `?token=<token>` trên URL. claude.ai chỉ nhận URL nên dùng dạng thứ hai: coi cả URL là mật khẩu, không dán vào nhóm chat.
- Token ngắn hơn 32 ký tự bị loại. So khớp theo thời gian hằng.
- Thu hồi: xoá mục `username:token` khỏi `WMS_MCP_TOKENS` rồi Redeploy.

## 3. Triển khai (Admin làm một lần)

1. Sinh token cho từng người:

   ```bash
   npm run mcp:token -- tienngoc huyanh nguyenhieu
   ```

   Lệnh in ra giá trị `WMS_MCP_TOKENS` và URL connector của từng người.

2. Vercel > Project > Settings > Environment Variables, thêm cho Production (và Preview nếu muốn thử trên nhánh):

   | Biến | Giá trị |
   |---|---|
   | `WMS_MCP_TOKENS` | Dòng in ra ở bước 1, dạng `username:token,username:token` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > `service_role` |
   | `SUPABASE_URL` | Không bắt buộc. Mặc định project của WMS |
   | `WMS_APP_URL` | Không bắt buộc. Mặc định lấy theo tên miền đang chạy |

3. Merge nhánh `feature/claude-mcp-connector` vào `main`, Vercel tự deploy. Đổi biến môi trường sau này cần Redeploy.

4. Kiểm tra nhanh (đổi `<token>`):

   ```bash
   curl -s -X POST "https://product-task-management-qr39.vercel.app/api/mcp?token=<token>" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_members","arguments":{}}}'
   ```

   Kết quả đúng: danh sách 12 nhân sự và dòng "Bạn đang dùng tài khoản: …".

## 4. Thêm connector trên claude.ai (mỗi người làm một lần)

1. claude.ai > Settings > Connectors > Add custom connector.
2. Name: `WMS VnExpress`. URL: URL riêng Admin gửi, dạng `https://product-task-management-qr39.vercel.app/api/mcp?token=…`.
3. Bấm Add. Connector dùng được ở web, desktop, mobile và Claude Code.
4. Thử: gõ "Việc của tôi hôm nay".

Gói Team/Enterprise: Owner thêm connector ở Organization settings > Connectors. Khi đó cả tổ chức dùng chung một URL, tức một token: mọi thao tác ghi tên chủ token đó. Muốn ghi đúng tên từng người thì mỗi người tự thêm connector bằng URL riêng.

## 5. Để mọi hội thoại tự ghi việc vào app

Dán đoạn sau vào claude.ai > Settings > Profile > ô sở thích cá nhân (hoặc Project instructions của project làm việc):

```text
Công việc của tôi quản lý trong WMS VnExpress (connector "WMS VnExpress").
- Khi tôi nhận một việc, hứa một việc, hoặc hội thoại sinh ra việc cần làm: ghi ngay bằng add_task (tiêu đề bắt đầu bằng động từ, nêu rõ làm gì + cho cái gì, kèm hạn nếu tôi có nói).
- Khi tôi báo xong, dời hạn, bị kẹt: tìm việc bằng list_tasks rồi update_task. Xong việc cần link kết quả: thiếu thì hỏi tôi.
- Không lưu danh sách việc trong file hay trong hội thoại. WMS là nguồn duy nhất.
- Sau khi ghi, báo lại một dòng kèm link mở việc.
```

## 6. Nhắc việc 08:00 sáng đọc từ app

Tạo một tác vụ định kỳ trong Claude (Scheduled task), lịch 08:00 thứ Hai đến thứ Sáu, nội dung:

```text
Gọi daily_brief của connector WMS VnExpress cho tôi. Tóm tắt trong 5 dòng: việc quá hạn, việc đến hạn hôm nay, việc đang nghẽn, kèm link mở từng việc. Nếu chưa có task đến hạn hôm nay thì nhắc tôi tạo việc. Không lấy dữ liệu từ nguồn nào khác.
```

Admin, Manager muốn xem cả bộ phận: thay bằng `daily_brief` với `scope = "team"`.

Nhắc đóng task 16:30: tạo tác vụ thứ hai, lịch 16:30, cùng nội dung, thêm câu "Hỏi tôi việc nào đã xong để cập nhật, việc nào cần dời hạn".

## 7. Chuyển việc từ file sang app

Trong hội thoại đã bật connector, đính kèm file rồi gõ:

```text
Chuyển toàn bộ việc trong file này vào WMS bằng add_tasks. Giữ nguyên người phụ trách, hạn, trạng thái. Việc đã xong: đặt status "Hoàn thành", kèm result_link và completed_date. Việc thiếu link kết quả thì liệt kê ra để tôi bổ sung, đừng tự bịa link. Xong thì báo số việc đã thêm, số trùng, số lỗi.
```

Chạy lại không tạo việc trùng. Việc đã xong được coi là trùng khi cùng người phụ trách, cùng tiêu đề, cùng hạn.

## 8. Chạy thử trên máy

```bash
npm run test:mcp
```

25 kiểm thử chạy trên dữ liệu trong bộ nhớ, không chạm Supabase và không gọi API Claude. Gồm một bài mô phỏng cách Vercel nạp function (Node ESM thuần).

```bash
WMS_MCP_TOKENS="tienngoc:<token>" SUPABASE_SERVICE_ROLE_KEY="<key>" npm run mcp:dev
```

Mở connector tại `http://localhost:3939/api/mcp`, thử bằng MCP Inspector hoặc `curl`. Lưu ý: lệnh này nối Supabase thật, `add_task` và `update_task` ghi dữ liệu thật.

## 9. Cơ sở dữ liệu

Thay đổi schema nằm trong [sql/2026-11-claude-assist.sql](sql/2026-11-claude-assist.sql): cột `tasks.estimate_minutes`, cho phép `tasks.due_date` trống, bảng `ai_suggestion_log`. Chưa chạy file này thì connector vẫn hoạt động, chỉ không lưu ước lượng. Connector đọc `members`, `projects`, `project_phases`, `folders`, `tasks`, `task_logs`, `member_leaves`; ghi `tasks`, `task_logs`, `notifications`, `trash`. App nhận thay đổi qua Supabase Realtime (kênh `wms-db-sync`) nên việc thêm từ Claude hiện ngay trên màn hình đang mở.

## 10. Quy ước khi sửa code connector

- Import tương đối trong `api/` và các file `src/utils` mà `api/` dùng phải có đuôi `.js` (Vercel chạy Node ESM, không tự thêm đuôi). `npm run test:mcp` bắt lỗi này.
- Quy tắc nghiệp vụ dùng lại từ `src/utils` (`rbac`, `taskLogUtils`, `urlValidator`, `titleQuality`, `folderUtils`), không viết bản sao trong `api/`.
- Thêm công cụ mới: khai báo trong `api/_wms/tools.ts`, thêm kiểm thử trong `scripts/test-mcp-connector.ts`, cập nhật bảng mục 1.

## 11. Nhịp theo dõi và đôn đốc (Admin, Manager)

Tạo các tác vụ định kỳ trong Claude, thứ Hai đến thứ Sáu:

| Giờ | Nội dung tác vụ |
|---|---|
| 08:00 | `Gọi daily_brief của connector WMS VnExpress cho tôi. Tóm tắt vừa một màn hình điện thoại: việc nên làm trước, việc đến hạn, việc quá hạn, việc đã giao cần đôn đốc. Chỉ dùng số liệu công cụ trả về.` |
| 08:40 | `Gọi workload_today của connector WMS VnExpress. Liệt kê người cần hỏi lại kèm lý do. Với mỗi người, soạn sẵn một bình luận ngắn để tôi duyệt. Không tự gửi.` |
| 16:30 | `Gọi daily_brief với scope = "team". Liệt kê việc đến hạn hôm nay chưa đóng theo từng người. Hỏi tôi việc nào cần nhắc.` |

Thang đôn đốc: quá hạn ngày 1 app tự nhắc; từ ngày 3 hoặc 5 ngày không cập nhật, việc hiện trong `daily_brief` của người giao; từ ngày 5 đưa vào nội dung họp 1:1 (`member_summary`).

Claude chỉ gửi bình luận (`add_comment`) sau khi người dùng duyệt nội dung.

## 12. Gợi ý việc tiếp theo trong app (Claude Haiku)

Sau khi một người thêm hoặc đóng việc, app hiện tối đa 3 việc nên làm tiếp. Bấm "Thêm" mới tạo việc.

- Điểm vào: `POST /api/suggest` ([api/suggest.ts](../api/suggest.ts)). Máy chủ gom dữ liệu thật của dự án (mốc giai đoạn, checklist còn dở, thành viên và vai trò, việc đang mở, việc vừa xong) rồi gọi Claude Haiku. Kết quả được lọc lại: bỏ gợi ý trùng việc đang có, tiêu đề chung chung, người không thuộc dự án.
- Biến môi trường trên Vercel: `ANTHROPIC_API_KEY` (bắt buộc), `SUPABASE_SERVICE_ROLE_KEY` (đã có). Tuỳ chọn: `WMS_AI_MODEL` (mặc định `claude-haiku-5-5`), `WMS_AI_DAILY_PER_USER` (mặc định 30 lượt mỗi người mỗi ngày), `WMS_AI_DAILY_TOTAL` (mặc định 300).
- Bảng `ai_suggestion_log` bắt buộc phải có: máy chủ đếm lượt dùng trong bảng này để chặn chi phí, thiếu bảng thì trả 503 và app tự tắt gợi ý.
- Xác thực: app gửi username và chuỗi băm mật khẩu đang lưu, máy chủ đối chiếu với `member_credentials`. Mức bảo vệ này ngang với app hiện tại (anon key công khai, RLS mở). Nên đặt thêm hạn mức chi tiêu hằng tháng cho khoá API trong Anthropic Console.
- Tiết kiệm token: chỉ gọi Claude cho việc gắn dự án thật có mốc, thành viên hoặc checklist; thêm hay đóng nhiều việc liên tiếp chỉ tính việc cuối (chờ 6 giây sau khi thêm, 2,5 giây sau khi đóng); người dùng bấm "Tắt hôm nay" hoặc hết lượt thì ngừng gọi; tắt suy luận mở rộng, trần đầu ra 700 token. Một lượt gọi khoảng 1.200 token vào, 300 token ra.
- Thiếu khoá, thiếu bảng, hoặc API lỗi: app không hiện gợi ý, mọi thao tác khác chạy bình thường.
- Đo hiệu quả: câu truy vấn tỷ lệ chấp nhận nằm cuối file SQL. Dưới 30% thì gợi ý đang nhiễu, cần chỉnh lời nhắc trong [api/_wms/suggest.ts](../api/_wms/suggest.ts).

