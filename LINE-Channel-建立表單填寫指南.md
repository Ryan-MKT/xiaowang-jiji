# LINE Login Channel 建立表單填寫指南

## 📝 **表單欄位逐一填寫**

### 第一步：Channel type（頻道類型）
```
選擇：LINE Login
✅ 點選 LINE Login（不是 Messaging API）
```

### 第二步：Provider（提供者）
```
如果已有：選擇現有的 Provider
如果沒有：點擊 "Create a new provider"
```

如果要建立新 Provider：
```
Provider name: 小汪記記
Provider name (English): XiaoWang JiJi  
```

### 第三步：Basic information（基本資訊）

#### Channel name（頻道名稱）
```
Channel name: 小汪記記 Web Login
或
Channel name: 小汪記記網頁版
```

#### Channel description（頻道描述）
```
Channel description: 小汪記記筆記應用程式的網頁版登入功能
或
Channel description: Web login for XiaoWang JiJi note-taking application
```

#### App types（應用程式類型）
```
✅ Web app（必選）
⬜ Native app（不選）
```

#### Region（地區）
```
選擇：Taiwan
或
選擇：Japan（如果沒有 Taiwan 選項）
```

#### Category（分類）
```
選擇：Productivity（生產力工具）
或
選擇：Utilities（實用工具）
```

#### Subcategory（子分類）
```
選擇：Note-taking（筆記）
或
選擇：Other（其他）
```

#### Email address（聯絡信箱）
```
填入您的真實信箱
例如：your-email@gmail.com
```

#### Privacy policy URL（隱私政策網址）
```
如果有網站：https://您的域名/privacy
暫時可填：https://example.com/privacy
稍後可以修改
```

#### Terms of use URL（使用條款網址）
```
如果有網站：https://您的域名/terms
暫時可填：https://example.com/terms  
稍後可以修改
```

### 第四步：Agreement（同意條款）
```
✅ I have read and agree to the LINE Developers Agreement
✅ I have read and agree to the LINE Official Account Terms of Use
```

---

## 🎯 **快速複製貼上版本**

```
Channel type: LINE Login

Channel name: 小汪記記 Web Login

Channel description: 小汪記記筆記應用程式的網頁版登入功能

App types: ✅ Web app

Region: Taiwan

Category: Productivity

Email: 您的信箱@gmail.com

Privacy policy URL: https://example.com/privacy

Terms of use URL: https://example.com/terms
```

---

## 📋 **建立後的下一步**

建立成功後，您會看到：

### 1. 取得認證資訊
```
前往：Basic settings 頁面
複製：Channel ID（例如：1234567890）
點擊：Channel secret 旁的 "Show" 按鈕
複製：Channel secret（例如：abcdef1234567890...）
```

### 2. 設定 Callback URL
```
前往：LINE Login 頁籤
點擊：Add callback URL
輸入：http://localhost:3000/auth/line/callback（本地測試用）
```

### 3. 發布 Channel
```
前往：LINE Login 頁籤
將狀態改為：Published（發布）
確認：Channel 狀態為綠色 "Published"
```

---

## ⚠️ **常見問題解決**

### Q: 沒有 Taiwan 選項怎麼辦？
```
A: 選擇 Japan，功能完全相同
```

### Q: Privacy Policy 和 Terms 網址要真實存在嗎？
```
A: 測試階段可以填 https://example.com/privacy
   正式使用前建議建立真實頁面
```

### Q: Channel name 可以用中文嗎？
```
A: 可以，LINE 支援中文頻道名稱
```

### Q: 建立失敗怎麼辦？
```
A: 檢查信箱格式是否正確
   確認所有必填欄位都已填寫
   同意條款是否都有勾選
```

---

## 🚀 **建立完成後立即執行**

```bash
# 1. 記下這些資訊
Channel ID: ________________
Channel Secret: ________________

# 2. 更新 .env 檔案
cd 小汪記記
echo "LINE_LOGIN_CHANNEL_ID=您的Channel_ID" >> .env
echo "LINE_LOGIN_CHANNEL_SECRET=您的Channel_Secret" >> .env

# 3. 測試
node server.js
```

---

## Linus 提醒

"填表單是最無聊的部分，但也是最重要的。"
"一個字母錯誤就會導致整個 OAuth 流程失敗。"
"仔細填寫，仔細檢查，一次做對。"

**現在開始填寫表單吧！** 📝