-- 暫時關閉 RLS 以允許 service key 存取
ALTER TABLE favorite_tasks DISABLE ROW LEVEL SECURITY;

-- 或者創建一個允許 service key 存取的新政策
-- CREATE POLICY "Allow service key access" ON favorite_tasks FOR ALL USING (true);