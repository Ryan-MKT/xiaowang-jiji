-- 添加 ai_tags 欄位到 dev_messages 表格
ALTER TABLE dev_messages ADD COLUMN IF NOT EXISTS ai_tags TEXT;

-- 檢查欄位是否添加成功
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_messages'
AND column_name = 'ai_tags';

-- 顯示 dev_messages 表格的所有欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_messages'
ORDER BY ordinal_position;