# 🗄️ Supabase 資料庫設定指引

## 步驟 1: 建立 Supabase 專案
1. 前往 [supabase.com](https://supabase.com)
2. 點擊 "Start your project"
3. 建立新專案，選擇適當的資料庫密碼

## 步驟 2: 執行資料庫設定
1. 在 Supabase Dashboard，前往 "SQL Editor"
2. 建立新查詢，貼上 `database-setup.sql` 的內容
3. 執行 SQL 以建立 `messages` 資料表

## 步驟 3: 獲取連接資訊
從 Supabase Dashboard 的 "Settings" → "API" 頁面獲取：
- **Project URL**: `https://xxx.supabase.co`
- **anon public**: `eyJhbGc...` (匿名公開金鑰)

## 步驟 4: 設定 Zeabur 環境變數
在 Zeabur 專案設定中新增：
```
SUPABASE_URL=https://你的專案ID.supabase.co
SUPABASE_ANON_KEY=你的匿名公開金鑰
```

## 步驟 5: 重新部署
Zeabur 會自動偵測環境變數變更並重新部署

## 驗證設定
部署完成後，訪問：
- `https://gigi.zeabur.app/db-status` - 檢查資料庫連線狀態

## 資料表結構
```sql
messages (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

完成後，LINE Bot 將自動儲存所有收到的訊息到 Supabase 資料庫！