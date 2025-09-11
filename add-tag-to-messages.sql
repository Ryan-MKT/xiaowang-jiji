-- 為 messages 表格新增 tag 欄位以記錄任務標籤
-- 執行此 SQL 在您的 Supabase 專案中

-- 新增 tag 欄位到 messages 表格
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS tag VARCHAR(100);

-- 新增索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_messages_tag ON messages(tag);

-- 新增複合索引以支援按用戶和標籤查詢
CREATE INDEX IF NOT EXISTS idx_messages_user_tag ON messages(user_id, tag);

-- 顯示更新後的表格結構
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;