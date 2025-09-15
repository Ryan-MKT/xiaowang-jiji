ALTER TABLE dev_messages
ADD COLUMN note TEXT;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'dev_messages'
ORDER BY ordinal_position;