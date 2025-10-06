-- ========================================
-- 步驟 1：檢查所有 dev_ 表是否有 user_id 欄位
-- ========================================
-- 請在 Supabase SQL Editor 執行此腳本

-- ========================================
-- 快速檢查：哪些表缺少 user_id 欄位
-- ========================================
SELECT
    t.table_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns c
            WHERE c.table_name = t.table_name
              AND c.column_name = 'user_id'
              AND c.table_schema = 'public'
        ) THEN '✅ 有 user_id'
        ELSE '❌ 缺少 user_id'
    END as status
FROM (
    VALUES
        ('dev_messages'),
        ('dev_collections'),
        ('dev_tags'),
        ('dev_boxs'),
        ('dev_guest'),
        ('dev_frequent_tasks')
) AS t(table_name)
ORDER BY t.table_name;

-- ========================================
-- 詳細檢查每個表的欄位
-- ========================================

-- dev_messages
SELECT 'dev_messages' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_messages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- dev_collections
SELECT 'dev_collections' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_collections' AND table_schema = 'public'
ORDER BY ordinal_position;

-- dev_tags
SELECT 'dev_tags' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_tags' AND table_schema = 'public'
ORDER BY ordinal_position;

-- dev_boxs
SELECT 'dev_boxs' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_boxs' AND table_schema = 'public'
ORDER BY ordinal_position;

-- dev_guest
SELECT 'dev_guest' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_guest' AND table_schema = 'public'
ORDER BY ordinal_position;

-- dev_frequent_tasks
SELECT 'dev_frequent_tasks' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_frequent_tasks' AND table_schema = 'public'
ORDER BY ordinal_position;
