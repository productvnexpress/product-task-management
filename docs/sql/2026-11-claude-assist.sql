-- WMS: ước lượng thời gian cho công việc và gợi ý việc tiếp theo bằng Claude.
-- Chạy một lần trong Supabase > SQL Editor. Chạy lại không gây lỗi.
-- App và connector vẫn chạy khi chưa có các thay đổi này: thiếu cột thì bỏ qua ước lượng,
-- thiếu bảng thì tắt gợi ý trong app.

-- 1. Ước lượng thời gian làm một việc, tính bằng phút (30, 60, 120, 240, 480, 960...).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS estimate_minutes INTEGER
  CHECK (estimate_minutes IS NULL OR (estimate_minutes BETWEEN 5 AND 4800));

COMMENT ON COLUMN public.tasks.estimate_minutes IS 'Ước lượng thời gian làm (phút). NULL = chưa ước lượng.';

-- 2. Cho phép việc chưa có hạn (việc "làm sau"). Không ảnh hưởng nếu cột vốn đã cho phép NULL.
ALTER TABLE public.tasks ALTER COLUMN due_date DROP NOT NULL;

-- 3. Nhật ký gợi ý việc tiếp theo: đếm lượt dùng mỗi ngày để giới hạn chi phí API,
--    và đo tỷ lệ gợi ý được chấp nhận.
CREATE TABLE IF NOT EXISTS public.ai_suggestion_log (
  id TEXT PRIMARY KEY,                          -- dạng sug-<timestamp>-<hash>
  username TEXT NOT NULL,                       -- tài khoản yêu cầu gợi ý
  trigger TEXT NOT NULL,                        -- 'created' | 'completed'
  task_id TEXT,                                 -- việc gốc (không ràng buộc khoá ngoại: việc có thể bị xoá)
  task_title TEXT,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,      -- [{title, reason, assignee, dueDate, estimateMinutes}]
  accepted_titles JSONB NOT NULL DEFAULT '[]'::jsonb,  -- tiêu đề các gợi ý đã được thêm thành việc
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestion_log_created_at ON public.ai_suggestion_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_log_user_day ON public.ai_suggestion_log (username, created_at DESC);

-- Bật RLS và KHÔNG tạo policy: anon key (công khai trong repo) không đọc, ghi được bảng này.
-- Chỉ service key phía máy chủ (Vercel Function) truy cập.
ALTER TABLE public.ai_suggestion_log ENABLE ROW LEVEL SECURITY;

-- 4. Kiểm tra sau khi chạy.
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'tasks' AND column_name IN ('estimate_minutes', 'due_date');
-- SELECT count(*) FROM public.ai_suggestion_log;

-- Tỷ lệ gợi ý được chấp nhận 30 ngày gần nhất:
-- SELECT count(*) AS luot,
--        sum(jsonb_array_length(suggestions)) AS so_goi_y,
--        sum(jsonb_array_length(accepted_titles)) AS da_them,
--        sum(input_tokens) AS input_tokens, sum(output_tokens) AS output_tokens
--   FROM public.ai_suggestion_log WHERE created_at > now() - interval '30 days';
