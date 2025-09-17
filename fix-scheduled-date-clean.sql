ALTER TABLE dev_messages
ALTER COLUMN scheduled_date TYPE TIMESTAMP WITH TIME ZONE
USING scheduled_date::TIMESTAMP WITH TIME ZONE;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_messages'
AND column_name = 'scheduled_date';