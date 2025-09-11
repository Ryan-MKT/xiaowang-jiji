-- 先檢查表格是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%favorite%';

-- 檢查 dev_favorite_tasks 表格結構
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'dev_favorite_tasks';

-- 如果 dev_favorite_tasks 不存在，創建它（基於 favorite_tasks）
CREATE TABLE IF NOT EXISTS dev_favorite_tasks (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加 tag 欄位
ALTER TABLE dev_favorite_tasks ADD COLUMN IF NOT EXISTS tag VARCHAR(50);