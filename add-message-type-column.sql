-- 為 dev_messages 表添加 message_type 欄位
-- 執行此SQL來修復資料庫schema問題

ALTER TABLE dev_messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- 更新現有記錄的 message_type
UPDATE dev_messages
SET message_type = 'text'
WHERE message_type IS NULL;

-- 添加註釋
COMMENT ON COLUMN dev_messages.message_type IS '訊息類型：text(文字), image(圖片), sticker(貼圖)等';