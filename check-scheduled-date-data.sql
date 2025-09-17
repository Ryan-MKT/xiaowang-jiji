-- 檢查 scheduled_date 欄位的實際資料
SELECT
  id,
  message_text,
  scheduled_date,
  pg_typeof(scheduled_date) as data_type
FROM dev_messages
WHERE id IN (1757946000000, 1757950000000)
ORDER BY id;