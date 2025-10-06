-- Check RLS status for all dev_ tables
-- Execute this in Supabase SQL Editor

SELECT
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ RLS 已啟用'
        ELSE '❌ RLS 未啟用'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'dev_%'
ORDER BY tablename;

-- Also check if there are any policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE 'dev_%'
ORDER BY tablename, policyname;
