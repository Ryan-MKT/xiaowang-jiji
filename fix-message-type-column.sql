-- 修復 dev_messages 表格缺少 message_type 欄位的問題
-- 2025-09-12

-- 檢查現有表格結構
\d dev_messages;

-- 添加 message_type 欄位
ALTER TABLE dev_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- 更新現有記錄的 message_type
UPDATE dev_messages 
SET message_type = 'text' 
WHERE message_type IS NULL;

-- 檢查表格結構是否正確
\d dev_messages;

-- 顯示修復結果
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'dev_messages' 
ORDER BY ordinal_position;