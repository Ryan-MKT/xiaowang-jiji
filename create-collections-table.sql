-- 建立 DEV_COLLECTIONS 表
-- 用於儲存用戶的收藏卡數據

CREATE TABLE dev_collections (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  content JSONB,
  tags TEXT[],
  color VARCHAR(20) DEFAULT '#4169E1',
  icon VARCHAR(10) DEFAULT '📋',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_dev_collections_user_id ON dev_collections(user_id);
CREATE INDEX idx_dev_collections_category ON dev_collections(category);
CREATE INDEX idx_dev_collections_is_active ON dev_collections(is_active);
CREATE INDEX idx_dev_collections_created_at ON dev_collections(created_at DESC);

-- 建立更新時間自動更新的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dev_collections_updated_at
  BEFORE UPDATE ON dev_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解說明
COMMENT ON TABLE dev_collections IS '用戶收藏卡儲存表';
COMMENT ON COLUMN dev_collections.user_id IS 'LINE 用戶 ID';
COMMENT ON COLUMN dev_collections.title IS '收藏卡標題';
COMMENT ON COLUMN dev_collections.description IS '收藏卡描述';
COMMENT ON COLUMN dev_collections.category IS '收藏卡分類';
COMMENT ON COLUMN dev_collections.content IS '收藏卡內容 (JSON格式)';
COMMENT ON COLUMN dev_collections.tags IS '標籤陣列';
COMMENT ON COLUMN dev_collections.color IS '收藏卡顏色';
COMMENT ON COLUMN dev_collections.icon IS '收藏卡圖示';
COMMENT ON COLUMN dev_collections.is_active IS '是否啟用';