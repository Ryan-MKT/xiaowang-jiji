-- 修改 scheduled_date 欄位類型以支援時間儲存
-- 從 DATE 改為 TIMESTAMP WITH TIME ZONE

ALTER TABLE dev_messages
ALTER COLUMN scheduled_date TYPE TIMESTAMP WITH TIME ZONE
USING scheduled_date::TIMESTAMP WITH TIME ZONE;

-- 檢查修改結果
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_messages'
AND column_name = 'scheduled_date';