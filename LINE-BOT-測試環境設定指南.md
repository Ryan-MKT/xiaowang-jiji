# LINE Bot 測試環境設定指南

## 📱 步驟一：建立測試用 LINE Bot

### 1. 登入 LINE Developers Console
- 網址：https://developers.line.biz/console/
- 使用你的 LINE 帳號登入

### 2. 建立新的 Provider（如果需要）
- 點選「Create New Provider」
- 名稱建議：`你的名字-Dev` 或使用現有的 Provider

### 3. 建立測試用 Messaging API Channel
- 點選「Create a new channel」
- 選擇「Messaging API」
- 填寫資訊：
  - Channel name: `小汪記記-測試版`
  - Channel description: `開發測試專用`
  - Category: 選擇適合的類別
  - Subcategory: 選擇適合的子類別

### 4. 取得測試 Bot 的認證資訊
Channel 建立後，記錄以下資訊：

1. **Basic settings** 頁面：
   - Channel ID
   - Channel secret（點選 Issue 產生）

2. **Messaging API** 頁面：
   - Channel access token（點選 Issue 產生）
   - 記下你的 Bot basic ID 或 QR code（用來加好友）

### 5. 設定 Webhook（暫時）
- Webhook URL: 先留空，稍後會設定 ngrok 網址
- Use webhook: 開啟
- Auto-reply messages: 關閉（Disabled）
- Greeting messages: 關閉（Disabled）

## 📝 步驟二：記錄你的測試 Bot 資訊

請將以下資訊保存好（不要上傳到 GitHub）：

```
測試 Bot 資訊：
Channel ID: [你的測試 Channel ID]
Channel Secret: [你的測試 Channel Secret]
Channel Access Token: [你的測試 Access Token]
Bot Basic ID: @[你的測試 Bot ID]
```

## ⚠️ 重要提醒

1. **測試 Bot 與正式 Bot 完全分開**
   - 測試 Bot：開發測試用
   - 正式 Bot：使用者使用（不要動）

2. **不要混淆 Token**
   - 測試環境用測試 Bot 的 token
   - 生產環境用正式 Bot 的 token

3. **加好友測試**
   - 只將測試 Bot 加為好友
   - 不要讓其他人加測試 Bot

## 下一步

完成以上設定後，我們將：
1. 設定環境變數檔案
2. 安裝 ngrok 進行本機測試
3. 建立 Git 分支管理策略