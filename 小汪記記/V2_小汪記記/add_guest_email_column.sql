-- 新增 guest_email 欄位到 dev_messages 表格
-- 用於儲存「跟誰?」訪客郵件地址

ALTER TABLE dev_messages
ADD COLUMN guest_email TEXT DEFAULT NULL;

-- 為新欄位添加註解
COMMENT ON COLUMN dev_messages.guest_email IS '訪客郵件地址，用於Google日曆邀請';

-- 檢查表格結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'dev_messages'
ORDER BY ordinal_position;