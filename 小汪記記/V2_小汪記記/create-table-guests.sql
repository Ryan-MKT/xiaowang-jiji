-- 建立與會人 table
-- 用於儲存使用者的與會人資訊(姓名和Gmail)

CREATE TABLE IF NOT EXISTS dev_guest (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, guest_email)
);

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_dev_guest_user_id ON dev_guest(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_guest_email ON dev_guest(guest_email);
CREATE INDEX IF NOT EXISTS idx_dev_guest_created_at ON dev_guest(created_at);

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_dev_guest_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dev_guest_updated_at
BEFORE UPDATE ON dev_guest
FOR EACH ROW
EXECUTE FUNCTION update_dev_guest_updated_at();

-- 註解說明
COMMENT ON TABLE dev_guest IS '與會人資訊儲存table，儲存姓名和Gmail';
COMMENT ON COLUMN dev_guest.id IS '與會人 ID（主鍵）';
COMMENT ON COLUMN dev_guest.user_id IS 'LINE 用戶 ID';
COMMENT ON COLUMN dev_guest.guest_name IS '與會人姓名';
COMMENT ON COLUMN dev_guest.guest_email IS '與會人Gmail地址';
COMMENT ON COLUMN dev_guest.created_at IS '建立時間';
COMMENT ON COLUMN dev_guest.updated_at IS '更新時間';
