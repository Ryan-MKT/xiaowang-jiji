-- 小汪記記 LINE Bot 資料庫結構
-- 執行此 SQL 在您的 Supabase 專案中

-- 建立 messages 資料表
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 啟用 Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 建立政策允許所有操作（因為這是內部使用的 LINE Bot）
CREATE POLICY "Allow all operations on messages" ON messages
    FOR ALL USING (true);

-- 驗證表格結構
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;