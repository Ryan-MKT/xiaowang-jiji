-- 標籤資料表
-- 支援 LINE Bot Quick Reply 動態標籤功能

-- 開發環境標籤表
CREATE TABLE IF NOT EXISTS dev_tags (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name VARCHAR(20) NOT NULL, -- LINE Quick Reply 標籤長度限制
  color VARCHAR(7) DEFAULT '#4169E1', -- 十六進位顏色代碼
  icon VARCHAR(2) DEFAULT '🏷️', -- emoji 圖標
  order_index INTEGER DEFAULT 0, -- 顯示順序
  is_active BOOLEAN DEFAULT true, -- 是否啟用
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 確保每個用戶的標籤名稱唯一
  UNIQUE(user_id, name),
  
  -- 確保每個用戶最多 10 個標籤（保留 3 個位置給系統預設）
  CONSTRAINT max_tags_per_user CHECK (
    (SELECT COUNT(*) FROM dev_tags WHERE user_id = dev_tags.user_id AND is_active = true) <= 10
  )
);

-- 生產環境標籤表
CREATE TABLE IF NOT EXISTS tags (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name VARCHAR(20) NOT NULL,
  color VARCHAR(7) DEFAULT '#4169E1',
  icon VARCHAR(2) DEFAULT '🏷️',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, name),
  CONSTRAINT max_tags_per_user CHECK (
    (SELECT COUNT(*) FROM tags WHERE user_id = tags.user_id AND is_active = true) <= 10
  )
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_dev_tags_user_id ON dev_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_tags_active ON dev_tags(user_id, is_active, order_index);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(user_id, is_active, order_index);

-- 插入預設標籤（可選）
INSERT INTO dev_tags (user_id, name, color, icon, order_index) VALUES
('default', '工作', '#FF6B6B', '💼', 1),
('default', '學習', '#4ECDC4', '📚', 2),
('default', '運動', '#45B7D1', '🏃‍♂️', 3)
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO tags (user_id, name, color, icon, order_index) VALUES
('default', '工作', '#FF6B6B', '💼', 1),
('default', '學習', '#4ECDC4', '📚', 2),
('default', '運動', '#45B7D1', '🏃‍♂️', 3)
ON CONFLICT (user_id, name) DO NOTHING;