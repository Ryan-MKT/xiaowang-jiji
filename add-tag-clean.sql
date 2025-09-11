ALTER TABLE dev_favorite_tasks ADD COLUMN tag VARCHAR(50);
COMMENT ON COLUMN dev_favorite_tasks.tag IS 'Task tag for favorites';