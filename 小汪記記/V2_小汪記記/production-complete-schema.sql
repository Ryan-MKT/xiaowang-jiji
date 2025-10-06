-- ============================================
-- 小汪記記 V2 - 完整生產環境資料庫建立腳本
-- ============================================
-- 根據開發環境實際欄位結構建立
-- 執行前請先刪除之前建立的不完整表格
-- ============================================

-- ============================================
-- 1. 刪除舊的不完整表格（如果存在）
-- ============================================

DROP TABLE IF EXISTS boxes CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS frequent_tasks CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- ============================================
-- 2. 建立完整的資料表
-- ============================================

-- 2.1 boxes 表（箱子 - 目前開發環境沒有資料）
CREATE TABLE boxes (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 collections 表（分類/收藏）
CREATE TABLE collections (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    description TEXT,
    category TEXT,
    content TEXT,
    tags TEXT[],
    color TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    social_platform TEXT,
    social_account_name TEXT,
    social_profile_image TEXT,
    social_account_url TEXT,
    ai_summary TEXT,
    preview_image TEXT,
    preview_title TEXT,
    preview_description TEXT
);

-- 2.3 frequent_tasks 表（常用任務）
CREATE TABLE frequent_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_text TEXT NOT NULL,
    tag TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    note TEXT,
    UNIQUE(user_id, task_text)
);

-- 2.4 guests 表（訪客）
CREATE TABLE guests (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 messages 表（訊息/任務記錄）
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    tag TEXT,
    scheduled_date DATE,
    repeat_pattern TEXT,
    reminder_minutes TEXT,
    continuous_reminder BOOLEAN DEFAULT FALSE,
    reminder_time TIME,
    google_calendar_enabled BOOLEAN DEFAULT FALSE,
    google_calendar_who TEXT,
    completed BOOLEAN DEFAULT FALSE,
    email_name TEXT
);

-- 2.6 tags 表（標籤）
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- ============================================
-- 3. 建立索引（提升查詢效能）
-- ============================================

-- boxes 索引
CREATE INDEX idx_boxes_user_id ON boxes(user_id);

-- collections 索引
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_category ON collections(category);
CREATE INDEX idx_collections_is_active ON collections(is_active);
CREATE INDEX idx_collections_tags ON collections USING GIN(tags);

-- frequent_tasks 索引
CREATE INDEX idx_frequent_tasks_user_id ON frequent_tasks(user_id);
CREATE INDEX idx_frequent_tasks_usage_count ON frequent_tasks(usage_count DESC);
CREATE INDEX idx_frequent_tasks_last_used ON frequent_tasks(last_used_at DESC);

-- guests 索引
CREATE INDEX idx_guests_user_id ON guests(user_id);

-- messages 索引
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_scheduled_date ON messages(scheduled_date);
CREATE INDEX idx_messages_completed ON messages(completed);
CREATE INDEX idx_messages_tag ON messages(tag);

-- tags 索引
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_is_active ON tags(is_active);
CREATE INDEX idx_tags_sort_order ON tags(sort_order);

-- ============================================
-- 4. 啟用 RLS (Row Level Security)
-- ============================================

ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. 建立 RLS 策略
-- ============================================

-- 5.1 boxes 策略
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

-- 5.2 collections 策略
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

-- 5.3 frequent_tasks 策略
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

-- 5.4 guests 策略
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

-- 5.5 messages 策略
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own messages"
    ON messages FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own messages"
    ON messages FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own messages"
    ON messages FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 5.6 tags 策略
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
-- 6. 建立觸發器（自動更新 updated_at）
-- ============================================

-- 建立或替換更新時間戳函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為各資料表建立觸發器
CREATE TRIGGER update_boxes_updated_at
    BEFORE UPDATE ON boxes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_frequent_tasks_updated_at
    BEFORE UPDATE ON frequent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成！
-- ============================================
-- 已建立 6 個表，欄位完全對應開發環境：
-- 1. boxes (箱子)
-- 2. collections (分類/收藏) - 20 個欄位
-- 3. frequent_tasks (常用任務) - 9 個欄位
-- 4. guests (訪客) - 6 個欄位
-- 5. messages (訊息/任務) - 15 個欄位
-- 6. tags (標籤) - 9 個欄位
-- ============================================
