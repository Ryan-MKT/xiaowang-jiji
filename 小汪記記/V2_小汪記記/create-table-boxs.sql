-- 建立收藏卡片卡片夾 table (類似任務標籤功能)
-- 用於儲存使用者的收藏卡片卡片夾名稱

CREATE TABLE IF NOT EXISTS dev_boxs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  box_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, box_name)
);

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_dev_boxs_user_id ON dev_boxs(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_boxs_created_at ON dev_boxs(created_at);

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_dev_boxs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dev_boxs_updated_at
BEFORE UPDATE ON dev_boxs
FOR EACH ROW
EXECUTE FUNCTION update_dev_boxs_updated_at();

-- 註解說明
COMMENT ON TABLE dev_boxs IS '收藏卡片的卡片夾名稱儲存 table，功能類似任務標籤';
COMMENT ON COLUMN dev_boxs.id IS '卡片夾 ID（主鍵）';
COMMENT ON COLUMN dev_boxs.user_id IS 'LINE 用戶 ID';
COMMENT ON COLUMN dev_boxs.box_name IS '卡片夾名稱';
COMMENT ON COLUMN dev_boxs.created_at IS '建立時間';
COMMENT ON COLUMN dev_boxs.updated_at IS '更新時間';
