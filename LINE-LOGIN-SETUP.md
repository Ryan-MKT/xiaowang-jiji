# LINE Login 設定指南

## 重要說明
LINE Login 是**選用功能**，不會影響 LINE Bot 的正常運作。
Bot 本身已經有使用者識別機制，LINE Login 主要用於網頁端登入。

## 設定步驟

### 1. 建立 LINE Login Channel

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Provider
3. 點擊「Create a new channel」
4. 選擇「LINE Login」
5. 填寫必要資訊：
   - Channel name: 小汪記記 Web
   - Channel description: 網頁版登入
   - App types: 選擇「Web app」

### 2. 設定 Callback URL

在 LINE Login channel 設定中：
1. 找到「Callback URL」
2. 新增以下 URL：
   - 本地測試：`http://localhost:3000/auth/line/callback`
   - 生產環境：`https://your-domain.com/auth/line/callback`

### 3. 取得 Channel ID 和 Secret

1. 在 Basic settings 頁面找到：
   - Channel ID
   - Channel secret

### 4. 設定環境變數

在 `.env` 檔案中新增：

```env
# LINE Login 設定
LINE_LOGIN_CHANNEL_ID=你的_Channel_ID
LINE_LOGIN_CHANNEL_SECRET=你的_Channel_Secret
LINE_LOGIN_REDIRECT_URI=http://localhost:3000/auth/line/callback

# Session 密鑰（請更換為隨機字串）
SESSION_SECRET=your-secret-key-change-this
```

## 使用方式

### 網頁登入
1. 訪問 `http://localhost:3000/`
2. 點擊「使用 LINE 登入」按鈕
3. 授權後會返回顯示登入資訊

### API 端點

- `GET /auth/line/login` - 開始登入流程
- `GET /auth/line/callback` - OAuth 回調（自動處理）
- `GET /auth/line/status` - 取得登入狀態
- `GET /auth/line/logout` - 登出

### 整合範例

```javascript
// 檢查登入狀態
fetch('/auth/line/status')
  .then(res => res.json())
  .then(data => {
    if (data.loggedIn) {
      console.log('已登入:', data.user);
    }
  });
```

## 注意事項

1. **Bot 和 Login 是分離的**：LINE Bot 不需要 LINE Login 就能正常運作
2. **userId 不同**：Bot 的 userId 和 Login 的 userId 可能不同
3. **Session 管理**：預設使用記憶體存儲，生產環境建議使用 Redis
4. **HTTPS 要求**：生產環境必須使用 HTTPS

## 故障排除

### 常見問題

1. **400 Invalid redirect_uri**
   - 確認 Callback URL 設定正確
   - 檢查環境變數的 `LINE_LOGIN_REDIRECT_URI`

2. **Session 未保存**
   - 確認 `SESSION_SECRET` 已設定
   - 檢查 cookie 設定

3. **登入後沒有使用者資料**
   - 確認 scope 包含 `profile`
   - 檢查 Channel 設定

## 架構說明

```
┌─────────────┐     ┌─────────────┐
│  LINE Bot   │     │ LINE Login  │
│  (Message)  │     │   (OAuth)   │
└──────┬──────┘     └──────┬──────┘
       │                    │
       ▼                    ▼
┌──────────────────────────────┐
│         server.js            │
│  ┌────────┐    ┌──────────┐ │
│  │Webhook │    │Auth Routes│ │
│  └────────┘    └──────────┘ │
└──────────────────────────────┘
```

兩個系統完全獨立，互不影響。