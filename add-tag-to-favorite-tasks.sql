-- 為 dev_favorite_tasks 表格新增 tag 欄位
-- 日期: 2025-09-11
-- 用途: 在收藏任務中加入標籤功能

-- 新增 tag 欄位到 dev_favorite_tasks 表格
ALTER TABLE dev_favorite_tasks 
ADD COLUMN tag VARCHAR(50);

-- 新增註解說明
COMMENT ON COLUMN dev_favorite_tasks.tag IS '收藏任務的標籤';

-- 檢查表格結構（可選，用於驗證）
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'dev_favorite_tasks' 
-- ORDER BY ordinal_position;