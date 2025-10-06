-- Enable RLS for dev_frequent_tasks table
-- Execute this SQL in Supabase SQL Editor

-- Step 1: Enable RLS on dev_frequent_tasks table
ALTER TABLE dev_frequent_tasks ENABLE ROW LEVEL SECURITY;

-- Step 2: Create RLS policies for dev_frequent_tasks

-- Policy 1: Users can only SELECT their own frequent tasks
CREATE POLICY "Users can select their own frequent tasks"
ON dev_frequent_tasks
FOR SELECT
USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy 2: Users can only INSERT their own frequent tasks
CREATE POLICY "Users can insert their own frequent tasks"
ON dev_frequent_tasks
FOR INSERT
WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy 3: Users can only UPDATE their own frequent tasks
CREATE POLICY "Users can update their own frequent tasks"
ON dev_frequent_tasks
FOR UPDATE
USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy 4: Users can only DELETE their own frequent tasks
CREATE POLICY "Users can delete their own frequent tasks"
ON dev_frequent_tasks
FOR DELETE
USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'dev_frequent_tasks';

-- Verify policies are created
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'dev_frequent_tasks';
