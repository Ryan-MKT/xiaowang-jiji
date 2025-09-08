-- 建立測試環境資料表
-- 在 Supabase SQL Editor 執行

-- 先刪除如果存在（如果需要重建）
-- DROP TABLE IF EXISTS dev_messages;

-- 建立測試訊息表格
CREATE TABLE IF NOT EXISTS dev_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 確保表格有正確的權限（給 anon 和 authenticated 角色）
ALTER TABLE dev_messages ENABLE ROW LEVEL SECURITY;

-- 建立基本的 RLS 政策（允許插入和讀取）
CREATE POLICY "Enable insert for all users" ON dev_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for all users" ON dev_messages FOR SELECT USING (true);

-- 顯示確認訊息
SELECT 'dev_messages table created successfully' as status;