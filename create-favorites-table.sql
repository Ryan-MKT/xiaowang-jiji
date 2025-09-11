-- 創建收藏任務表格
CREATE TABLE IF NOT EXISTS favorite_tasks (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_favorite_tasks_user_id ON favorite_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_tasks_category ON favorite_tasks(category);
CREATE INDEX IF NOT EXISTS idx_favorite_tasks_created_at ON favorite_tasks(created_at);

-- 創建更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_favorite_tasks_updated_at
    BEFORE UPDATE ON favorite_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 增加行級安全策略（RLS）
ALTER TABLE favorite_tasks ENABLE ROW LEVEL SECURITY;

-- 創建策略：用戶只能存取自己的收藏任務
CREATE POLICY "Users can only access their own favorite tasks" ON favorite_tasks
  FOR ALL USING (auth.uid()::text = user_id);