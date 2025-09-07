# LINE Login 完整設定指南（繁體中文版）

## 📋 目前進度
- ✅ 已完成：程式碼實作
- ✅ 已完成：本地測試
- 🔄 進行中：真實環境設定
- ⏳ 待執行：生產環境部署

---

## 第一步：建立 LINE Login Channel

### 1.1 登入 LINE Developers Console
```
網址：https://developers.line.biz/console/
使用您的 LINE 帳號登入
```

### 1.2 建立新的 Channel
1. 選擇您的 Provider（或建立新的）
2. 點擊「Create a new channel」
3. 選擇「LINE Login」類型

### 1.3 填寫 Channel 基本資訊
```
Channel name: 小汪記記 Web
Channel description: 小汪記記網頁版登入功能
App types: ✅ Web app
```

### 1.4 設定 Callback URL
在「LINE Login settings」中加入：
```
本地測試：
http://localhost:3000/auth/line/callback

生產環境（根據您的域名）：
https://your-domain.com/auth/line/callback
https://your-app.onrender.com/auth/line/callback
https://your-app.zeabur.app/auth/line/callback
```

---

## 第二步：取得認證資訊

### 2.1 從 Basic settings 頁面複製
- **Channel ID**: `複製您的 Channel ID`
- **Channel secret**: `複製您的 Channel secret`

### 2.2 記下這些資訊
```bash
# 範例格式
LINE_LOGIN_CHANNEL_ID=1234567890
LINE_LOGIN_CHANNEL_SECRET=abcdef1234567890abcdef1234567890
```

---

## 第三步：設定環境變數

### 3.1 建立 .env 檔案
```bash
cd 小汪記記
cp .env.example .env
```

### 3.2 編輯 .env 檔案
```env
# LINE Bot 設定（原有的）
LINE_CHANNEL_ACCESS_TOKEN=您的_Bot_Access_Token
LINE_CHANNEL_SECRET=您的_Bot_Channel_Secret

# LINE Login 設定（新增的）
LINE_LOGIN_CHANNEL_ID=您在步驟2.1取得的ID
LINE_LOGIN_CHANNEL_SECRET=您在步驟2.1取得的Secret
LINE_LOGIN_REDIRECT_URI=http://localhost:3000/auth/line/callback

# Session 密鑰（請更換為隨機字串）
SESSION_SECRET=請產生一個隨機的32字元字串

# Supabase 設定（如果有使用）
SUPABASE_URL=您的_Supabase_URL
SUPABASE_ANON_KEY=您的_Supabase_Key

# 伺服器設定
PORT=3000
```

### 3.3 產生隨機 Session Secret
```bash
# Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 第四步：測試真實登入流程

### 4.1 啟動伺服器
```bash
cd 小汪記記
npm install
node server.js
```

### 4.2 測試登入
1. 開啟瀏覽器，訪問：`http://localhost:3000`
2. 點擊「使用 LINE 登入」按鈕
3. 您會被導向 LINE 的授權頁面
4. 使用您的 LINE 帳號登入並授權
5. 成功後會返回並顯示您的：
   - 名稱
   - User ID
   - 大頭貼（如果有）

### 4.3 檢查登入狀態
```bash
# 使用 API 檢查
curl http://localhost:3000/auth/line/status

# 成功登入後應該返回
{
  "loggedIn": true,
  "user": {
    "userId": "Uxxxxx",
    "displayName": "您的名稱"
  }
}
```

---

## 第五步：生產環境部署準備

### 5.1 更新生產環境的 Callback URL
在 LINE Developers Console 中加入您的生產環境網址：
```
https://您的域名.com/auth/line/callback
```

### 5.2 設定生產環境變數

#### Render 部署
```yaml
# 在 Render Dashboard 設定環境變數
LINE_LOGIN_CHANNEL_ID=您的ID
LINE_LOGIN_CHANNEL_SECRET=您的Secret
LINE_LOGIN_REDIRECT_URI=https://您的app.onrender.com/auth/line/callback
SESSION_SECRET=生產環境的隨機密鑰
```

#### Zeabur 部署
```bash
# 在 Zeabur 控制台設定
# 或使用 zeabur.json
{
  "env": {
    "LINE_LOGIN_CHANNEL_ID": "@",
    "LINE_LOGIN_CHANNEL_SECRET": "@",
    "LINE_LOGIN_REDIRECT_URI": "@",
    "SESSION_SECRET": "@"
  }
}
```

### 5.3 HTTPS 要求
⚠️ **重要**：生產環境必須使用 HTTPS，LINE Login 不接受 HTTP 的 Callback URL（localhost 除外）

---

## 📝 檢查清單

部署前請確認：

- [ ] LINE Login Channel 已建立
- [ ] Callback URL 已正確設定（本地和生產環境）
- [ ] Channel ID 和 Secret 已取得
- [ ] .env 檔案已正確配置
- [ ] SESSION_SECRET 已更換為隨機值
- [ ] 本地測試成功
- [ ] 生產環境使用 HTTPS
- [ ] 生產環境變數已設定

---

## 🔧 故障排除

### 問題 1：400 Bad Request (Invalid redirect_uri)
**解決方案**：
1. 檢查 LINE Console 的 Callback URL 設定
2. 確保 .env 的 `LINE_LOGIN_REDIRECT_URI` 完全一致
3. 注意結尾不要有多餘的斜線

### 問題 2：無法保持登入狀態
**解決方案**：
1. 確認 `SESSION_SECRET` 已設定
2. 檢查 cookie 設定（生產環境可能需要 secure: true）
3. 考慮使用 Redis 儲存 session

### 問題 3：無法取得使用者資料
**解決方案**：
1. 確認 scope 包含 `profile`
2. 檢查 Channel 是否已發布（Published）

---

## 📊 目前系統架構

```
使用者
  ├── LINE App
  │   └── Bot (Messaging API) ← 原有功能
  └── 瀏覽器
      └── Web App (LINE Login) ← 新增功能
          ├── /auth/line/login     (登入頁面)
          ├── /auth/line/callback  (OAuth 回調)
          ├── /auth/line/status    (狀態 API)
          └── /auth/line/logout    (登出)
```

---

## 下一步行動

1. **立即執行**：前往 LINE Developers Console 建立 Channel
2. **設定環境**：配置 .env 檔案
3. **本地測試**：確認登入流程正常
4. **部署上線**：更新生產環境設定

---

## Linus 的技術建議

"現在你有了完整的設定指南。記住這些原則："

1. **測試優先**：先在本地完整測試，再部署到生產環境
2. **安全第一**：絕對不要把 Secret 提交到 Git
3. **簡單維護**：保持設定簡單，避免過度配置
4. **監控錯誤**：記錄所有 OAuth 錯誤以便除錯

"程式碼已經準備好了，現在就看你的設定是否正確。"