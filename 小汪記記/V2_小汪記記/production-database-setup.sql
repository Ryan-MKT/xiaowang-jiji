-- ============================================
-- 小汪記記 V2 - 生產環境資料庫建立腳本
-- ============================================
-- 執行說明：
-- 1. 前往 Supabase Dashboard
-- 2. 選擇生產環境專案
-- 3. 進入 SQL Editor
-- 4. 複製此腳本並執行
-- ============================================

-- ============================================
-- 1. 建立所有資料表
-- ============================================

-- 1.1 任務表 (tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_date DATE,
    scheduled_time TIME,
    location TEXT,
    notes TEXT,
    priority TEXT,
    image_url TEXT,
    collection_id BIGINT,
    is_favorite BOOLEAN DEFAULT FALSE,
    google_calendar_event_id TEXT,
    ai_tags TEXT[]
);

-- 1.2 分類/標籤表 (collections)
CREATE TABLE IF NOT EXISTS collections (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 收藏任務表 (favorites)
CREATE TABLE IF NOT EXISTS favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, task_id)
);

-- 1.4 用戶會話表 (user_sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    session_data JSONB,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 常用任務表 (frequent_tasks)
CREATE TABLE IF NOT EXISTS frequent_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_text TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_used TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, task_text)
);

-- 1.6 箱子表 (boxes)
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

-- 1.7 訪客表 (guests)
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

-- 1.8 Google Calendar 授權表 (google_calendar_tokens)
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 建立索引（提升查詢效能）
-- ============================================

-- tasks 表索引
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_collection_id ON tasks(collection_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, scheduled_date);

-- collections 表索引
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- favorites 表索引
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_task_id ON favorites(task_id);

-- user_sessions 表索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active);

-- frequent_tasks 表索引
CREATE INDEX IF NOT EXISTS idx_frequent_tasks_user_id ON frequent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_frequent_tasks_frequency ON frequent_tasks(frequency DESC);

-- boxes 表索引
CREATE INDEX IF NOT EXISTS idx_boxes_user_id ON boxes(user_id);

-- guests 表索引
CREATE INDEX IF NOT EXISTS idx_guests_user_id ON guests(user_id);

-- google_calendar_tokens 表索引
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);

-- ============================================
-- 3. 啟用 RLS (Row Level Security)
-- ============================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. 建立 RLS 策略
-- ============================================

-- 4.1 tasks 表策略
CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 4.2 collections 表策略
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

-- 4.3 favorites 表策略
CREATE POLICY "Users can view their own favorites"
    ON favorites FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own favorites"
    ON favorites FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own favorites"
    ON favorites FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 4.4 user_sessions 表策略
CREATE POLICY "Users can view their own sessions"
    ON user_sessions FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own sessions"
    ON user_sessions FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own sessions"
    ON user_sessions FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 4.5 frequent_tasks 表策略
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

-- 4.6 boxes 表策略
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

-- 4.7 guests 表策略
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

-- 4.8 google_calendar_tokens 表策略
CREATE POLICY "Users can view their own tokens"
    ON google_calendar_tokens FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own tokens"
    ON google_calendar_tokens FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own tokens"
    ON google_calendar_tokens FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own tokens"
    ON google_calendar_tokens FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================
-- 5. 建立觸發器（自動更新 updated_at）
-- ============================================

-- 建立更新時間戳的函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為各資料表建立觸發器
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boxes_updated_at
    BEFORE UPDATE ON boxes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_calendar_tokens_updated_at
    BEFORE UPDATE ON google_calendar_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成！
-- ============================================
-- 所有資料表、索引、RLS 策略和觸發器已建立完成
--
-- 注意事項：
-- 1. 確認 Vercel 環境變數 TABLE_PREFIX 為空字串
-- 2. 使用 SUPABASE_SERVICE_ROLE_KEY 時會繞過 RLS
-- 3. 目前不需要 Storage buckets（圖片使用外部 URL）
-- ============================================
