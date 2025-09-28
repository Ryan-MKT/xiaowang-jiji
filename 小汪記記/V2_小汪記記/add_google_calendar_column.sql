-- 新增 google_calendar_enabled 欄位到 dev_messages 表格
-- 用於儲存「加入Google日曆」選項的是/否狀態

ALTER TABLE dev_messages
ADD COLUMN google_calendar_enabled BOOLEAN DEFAULT FALSE;

-- 為新欄位添加註解
COMMENT ON COLUMN dev_messages.google_calendar_enabled IS '是否加入Google日曆 (true=是, false=否)';

-- 檢查表格結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'dev_messages'
ORDER BY ordinal_position;