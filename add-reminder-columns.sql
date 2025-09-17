-- 為 dev_messages 表格添加 reminder_time 和 repeat_pattern 欄位

-- 先檢查並刪除錯誤類型的 reminder_time 欄位（如果存在）
ALTER TABLE dev_messages DROP COLUMN IF EXISTS reminder_time;

-- 重新添加 reminder_time 欄位 (存儲提醒時間，如：5分鐘、10分鐘等)
ALTER TABLE dev_messages
ADD COLUMN reminder_time TEXT;

-- 添加 repeat_pattern 欄位 (存儲重複模式，如：每日、每週等)
ALTER TABLE dev_messages
ADD COLUMN IF NOT EXISTS repeat_pattern TEXT;

-- 檢查欄位是否成功添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_messages'
AND column_name IN ('reminder_time', 'repeat_pattern');

-- 查看表格結構
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dev_messages'
ORDER BY ordinal_position;