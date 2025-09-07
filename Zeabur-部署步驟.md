# 🚀 Zeabur 部署步驟 - 立即執行

## ✅ 已完成
- GitHub 儲存庫：https://github.com/Ryan-MKT/xiaowang-jiji
- 程式碼已推送，包含 LINE Login 功能

---

## 📋 立即執行步驟

### 步驟 1：前往 Zeabur
```
網址：https://zeabur.com/
點擊：Get Started 或 Sign In
使用：GitHub 帳號登入
```

### 步驟 2：建立新專案
```
1. 點擊 "New Project" 
2. 專案名稱：xiaowang-jiji
3. 點擊 "Create Project"
```

### 步驟 3：新增服務
```
1. 點擊 "Add Service"
2. 選擇 "Git"
3. 選擇儲存庫：Ryan-MKT/xiaowang-jiji
4. 點擊 "Deploy"
```

### 步驟 4：Zeabur 會自動
```
✅ 檢測到 Node.js 專案
✅ 自動執行 npm install
✅ 自動執行 npm start
✅ 分配域名
```

### 步驟 5：設定環境變數
在 Zeabur 專案設定中加入：

```env
LINE_CHANNEL_ACCESS_TOKEN=您的_Bot_Access_Token
LINE_CHANNEL_SECRET=您的_Bot_Channel_Secret
LINE_LOGIN_CHANNEL_ID=2008069913
LINE_LOGIN_CHANNEL_SECRET=58c1a4055341077eae554124b709ad4e
SESSION_SECRET=f8e7d6c5b4a3926170859483726150398462740183759284637495a1b2c3d4e5f6
```

⚠️ **重要**：`LINE_LOGIN_REDIRECT_URI` 需要等部署完成後才能設定

---

## 🌐 部署完成後

您會得到類似這樣的網址：
```
https://xiaowang-jiji-xxx.zeabur.app
```

### 步驟 6：設定 Callback URL
```env
LINE_LOGIN_REDIRECT_URI=https://您的zeabur網址/auth/line/callback
```

### 步驟 7：更新 LINE Console
```
前往：LINE Developers Console
找到：您的 LINE Login Channel
LINE Login 設定 > Add callback URL
新增：https://您的zeabur網址/auth/line/callback
```

---

## 🧪 測試步驟

1. **訪問雲端網站**
   ```
   開啟：https://您的zeabur網址/
   ```

2. **測試 LINE Login**
   ```
   點擊：使用 LINE 登入
   授權後應該顯示使用者資訊
   ```

3. **測試 Bot 功能**
   ```
   webhook：https://您的zeabur網址/webhook
   健康檢查：https://您的zeabur網址/health
   ```

---

## ⚡ 預期結果

部署成功後：
- ✅ **24/7 運行** - 關機不影響
- ✅ **全球訪問** - 任何人都能用
- ✅ **HTTPS 加密** - 安全性保證
- ✅ **自動部署** - Git 推送自動更新

---

## 🔧 故障排除

### 如果部署失敗
1. 檢查 package.json 的 start 腳本
2. 確認所有環境變數都已設定
3. 查看部署日誌找出錯誤

### 如果 LINE Login 失敗
1. 確認 Callback URL 完全正確
2. 檢查環境變數是否正確設定
3. 確認 LINE Console 的 Channel 狀態為 Published

---

## 現在開始吧！

**前往 Zeabur，開始部署！** 🚀