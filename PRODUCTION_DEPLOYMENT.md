# 🚀 生產環境部署指南 - LIFF APP 完整版

## ✅ 已完成準備工作
- ✅ 所有功能已整合到 main 分支
- ✅ LIFF APP 已完全開發完成
- ✅ 環境變數配置已準備就緒
- ✅ 鉛筆連結已配置為動態 LIFF URL

---

## 📋 部署步驟

### 步驟 1：推送到 GitHub
```bash
git push origin main
```

### 步驟 2：Zeabur 部署
1. **前往 Zeabur**: https://zeabur.com
2. **建立專案**: 選擇 `Ryan-MKT/xiaowang-jiji`
3. **選擇分支**: `main` (生產分支)
4. **自動部署**: Zeabur 會自動檢測並部署

### 步驟 3：取得 Zeabur 域名
部署完成後，你會得到類似：
```
https://xiaowang-jiji-abc123.zeabur.app
```
**請記下這個域名！**

### 步驟 4：設定 Zeabur 環境變數
在 Zeabur 專案設定中添加：

```env
LINE_CHANNEL_ACCESS_TOKEN=你的_LINE_Bot_Access_Token
LINE_CHANNEL_SECRET=你的_LINE_Bot_Channel_Secret
LINE_LOGIN_CHANNEL_ID=你的_LINE_Login_Channel_ID
LINE_LOGIN_CHANNEL_SECRET=你的_LINE_Login_Channel_Secret
LINE_LOGIN_CALLBACK_URL=https://你的zeabur域名.zeabur.app/auth/line/callback
SUPABASE_URL=你的_Supabase_URL
SUPABASE_ANON_KEY=你的_Supabase_Anon_Key
TABLE_PREFIX=prod_
SESSION_SECRET=prod-secret-key-for-zeabur-deployment-xiaowang-jiji-2024
NODE_ENV=production
PORT=3001
WEBHOOK_BASE_URL=https://你的zeabur域名.zeabur.app
OPENAI_API_KEY=你的_OpenAI_API_Key
LIFF_APP_ID=你的_LIFF_App_ID
```

**注意**: 請從本機 `.env` 檔案複製實際的環境變數值！

**重要**: 請將 `你的zeabur域名.zeabur.app` 替換為實際的 Zeabur 域名！

---

## 🔗 更新 LINE Developers Console

### 更新 LIFF Endpoint URL
1. **前往**: [LINE Developers Console](https://developers.line.biz/)
2. **選擇專案**: 你的 LINE Login Channel 
3. **找到 LIFF**: LIFF 分頁
4. **編輯 LIFF App**: `2008077335-rZlgE4bX`
5. **更新 Endpoint URL**: 
   ```
   舊的: https://83df5f0857a0.ngrok-free.app/liff
   新的: https://你的zeabur域名.zeabur.app/liff
   ```

### 更新 Webhook URL (如果需要)
在 LINE Developers Console > Messaging API 設定中：
```
https://你的zeabur域名.zeabur.app/webhook
```

---

## 🧪 測試完整功能

### 1. 測試基本功能
- 訪問: `https://你的zeabur域名.zeabur.app`
- 檢查: 首頁是否正常顯示

### 2. 測試 LINE Login
- 訪問: `https://你的zeabur域名.zeabur.app/auth/line/login`
- 檢查: LINE 登入流程是否正常

### 3. 測試 LINE Bot
- 傳送訊息給 Bot
- 檢查: 任務堆疊 Flex Message 是否正常

### 4. 測試 LIFF APP (重點！)
- 在 LINE Bot 任務堆疊中**點擊鉛筆 ✎**
- 檢查: 是否開啟原生 LIFF 任務編輯器
- 測試: 編輯任務功能是否正常
- 檢查: 編輯後是否回傳訊息到 Bot

---

## 🌟 完成後的功能

部署成功後你將擁有：

### 🤖 完整 LINE Bot 功能
- ✅ 智能 AI 回覆 (問句)
- ✅ 任務記錄功能 (陳述句)  
- ✅ Flex Message 任務堆疊
- ✅ Quick Reply 按鈕 (AI、工作、家事)
- ✅ 任務完成互動功能

### 🔐 LINE Login 功能
- ✅ 網頁版 LINE 登入
- ✅ 使用者身份驗證
- ✅ Session 管理

### 📱 原生 LIFF APP 功能  
- ✅ **原生任務編輯器** (重點功能！)
- ✅ 在 LINE 內直接開啟編輯介面
- ✅ 支援任務新增、編輯、完成
- ✅ 自動同步回 LINE Bot
- ✅ 離線可用 (關機不影響！)

### 📊 資料庫整合
- ✅ Supabase 雲端資料庫
- ✅ 訊息記錄與分析
- ✅ 用戶資料管理

---

## 🎯 最終目標達成

**✅ 你現在可以完全離線使用小汪記記！**
- 雲端 24/7 運行
- 手機上直接編輯任務
- 無需本機伺服器
- 全球任何地方都能存取

---

## 🚀 現在開始部署吧！

1. **執行**: `git push origin main`  
2. **前往**: [Zeabur 控制台](https://zeabur.com)
3. **部署**: 選擇 main 分支
4. **取得**: 雲端域名
5. **更新**: LINE Developers Console
6. **享受**: 離線可用的原生 LIFF APP！

**🎉 恭喜！小汪記記即將成為真正的雲端原生應用程式！**