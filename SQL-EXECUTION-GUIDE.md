# 🛠️ 如何執行 database-setup.sql

## 📖 詳細步驟教學

### Step 1: 登入 Supabase
1. 開啟瀏覽器，前往 https://supabase.com
2. 點擊右上角 "Sign in" 登入
3. 如果沒有帳號，請先註冊

### Step 2: 建立或選擇專案
- **建立新專案**: 點擊 "New project"
  - 選擇組織 (Organization)
  - 輸入專案名稱，例如：`xiaowang-jiji`
  - 設定資料庫密碼（記住這個密碼！）
  - 選擇地區（建議選擇亞洲地區）
  - 點擊 "Create new project"

### Step 3: 開啟 SQL Editor
1. 等待專案建立完成（約1-2分鐘）
2. 在左側選單找到並點擊 "SQL Editor" 📝
3. 點擊 "New query" 建立新的查詢

### Step 4: 貼上並執行 SQL
1. 開啟 `database-setup.sql` 檔案
2. 複製檔案中的所有內容：

\`\`\`sql
-- 小汪記記 LINE Bot 資料庫結構
-- 執行此 SQL 在您的 Supabase 專案中

-- 建立 messages 資料表
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 啟用 Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 建立政策允許所有操作（因為這是內部使用的 LINE Bot）
CREATE POLICY "Allow all operations on messages" ON messages
    FOR ALL USING (true);
\`\`\`

3. 貼上到 SQL Editor 的查詢視窗中
4. 點擊右下角的 "Run" 按鈕 ▶️

### Step 5: 確認執行結果
執行成功後，您應該會看到：
- ✅ "Success. No rows returned" 或類似訊息
- 可以在左側的 "Table Editor" 中看到新建立的 `messages` 表

### Step 6: 獲取連接資訊
1. 點擊左側選單的 "Settings" ⚙️
2. 選擇 "API" 頁籤
3. 記下這兩個重要資訊：
   - **Project URL**: `https://xxxxxxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (很長的字串)

## ⚠️ 常見問題

**Q: 看不到 SQL Editor？**
A: 確保專案已完全載入完成，重新整理頁面試試

**Q: 執行 SQL 出現錯誤？**
A: 檢查是否完整複製了所有 SQL 內容，包含註解

**Q: 找不到 Settings 頁面？**
A: Settings 在左側選單最下方，可能需要向下滾動

## 🎯 下一步
執行完成後，請將獲取的連接資訊設定到 Zeabur 環境變數中！