-- ============================================
-- 小汪記記 V2 - 生產環境補充資料表
-- ============================================
-- 補充 5 個必要資料表
-- ============================================

-- 1. boxes 表（箱子）
CREATE TABLE IF NOT EXISTS boxes (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. collections 表（分類/標籤）
CREATE TABLE IF NOT EXISTS collections (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. frequent_tasks 表（常用任務）
CREATE TABLE IF NOT EXISTS frequent_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_text TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_used TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    tag TEXT,
    UNIQUE(user_id, task_text)
);

-- 4. guests 表（訪客）
CREATE TABLE IF NOT EXISTS guests (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. messages 表（訊息記錄）
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_text TEXT NOT NULL,
    note TEXT,
    tag TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. tags 表（標籤）
CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- ============================================
-- 建立索引
-- ============================================

-- boxes 索引
CREATE INDEX IF NOT EXISTS idx_boxes_user_id ON boxes(user_id);

-- collections 索引
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- frequent_tasks 索引
CREATE INDEX IF NOT EXISTS idx_frequent_tasks_user_id ON frequent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_frequent_tasks_frequency ON frequent_tasks(frequency DESC);

-- guests 索引
CREATE INDEX IF NOT EXISTS idx_guests_user_id ON guests(user_id);

-- messages 索引
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- tags 索引
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- ============================================
-- 啟用 RLS
-- ============================================

ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 建立 RLS 策略
-- ============================================

-- boxes 策略
CREATE POLICY "Users can view their own boxes"
    ON boxes FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own boxes"
    ON boxes FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own boxes"
    ON boxes FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own boxes"
    ON boxes FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- collections 策略
CREATE POLICY "Users can view their own collections"
    ON collections FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own collections"
    ON collections FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own collections"
    ON collections FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own collections"
    ON collections FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- frequent_tasks 策略
CREATE POLICY "Users can view their own frequent tasks"
    ON frequent_tasks FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own frequent tasks"
    ON frequent_tasks FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own frequent tasks"
    ON frequent_tasks FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own frequent tasks"
    ON frequent_tasks FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- guests 策略
CREATE POLICY "Users can view their own guests"
    ON guests FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own guests"
    ON guests FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own guests"
    ON guests FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own guests"
    ON guests FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- messages 策略
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own messages"
    ON messages FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own messages"
    ON messages FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- tags 策略
CREATE POLICY "Users can view their own tags"
    ON tags FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own tags"
    ON tags FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own tags"
    ON tags FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own tags"
    ON tags FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================
-- 建立觸發器
-- ============================================

CREATE TRIGGER update_boxes_updated_at
    BEFORE UPDATE ON boxes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成！
-- ============================================
