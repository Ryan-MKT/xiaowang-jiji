# 小汪記記正式環境部署檢查清單

## ✅ 部署前檢查清單

### 🔑 **API 金鑰準備**
- [ ] Oen Payment 商戶 ID
- [ ] Oen Payment API 金鑰  
- [ ] Oen Payment 簽章密鑰
- [ ] LINE Channel Access Token（正式）
- [ ] LINE Channel Secret（正式）
- [ ] Supabase URL 和 Key（正式）
- [ ] OpenAI API Key

### 🌐 **域名和 SSL**
- [ ] 申請正式域名（或使用 Zeabur 提供的域名）
- [ ] 確認 HTTPS 憑證正常
- [ ] DNS 設定指向正確

### 🗄️ **資料庫準備**
- [ ] 建立正式 Supabase 專案
- [ ] 執行資料庫結構初始化
- [ ] 設定資料庫權限和安全規則
- [ ] 備份現有測試資料（如需要）

### 🤖 **LINE Bot 設定**
- [ ] 建立正式 LINE Bot Channel
- [ ] 建立正式 LINE Login Channel  
- [ ] 建立正式 LIFF App
- [ ] 設定 Webhook URL: `https://你的域名/webhook`
- [ ] 驗證 LINE Bot 連線

## 🚀 **部署步驟**

### 步驟 1: 準備環境變數
```bash
# 複製模板並填入實際值
cp .env.production.template .env.production
# 編輯 .env.production 填入所有金鑰
```

### 步驟 2: 推送程式碼到 GitHub
```bash
git add .
git commit -m "準備生產環境部署 - 真實 Oen Payment 整合"
git push origin main
```

### 步驟 3: 在 Zeabur 部署
1. 連接 GitHub 儲存庫
2. 選擇 Node.js 環境
3. 上傳環境變數（從 .env.production 複製）
4. 執行部署

### 步驟 4: 部署後驗證
- [ ] 健康檢查端點: `GET /health`
- [ ] 支付 API 端點: `POST /api/payment/create`
- [ ] LINE Webhook: `POST /webhook`
- [ ] LIFF 頁面載入: `GET /liff-account.html`

## 🧪 **真實支付測試流程**

### 小額測試（建議 1 元）
1. **建立測試訂單**
   ```bash
   POST /api/payment/create
   {
     "userId": "your_test_user_id",
     "amount": 1,
     "itemName": "測試訂單",
     "description": "1元測試支付"
   }
   ```

2. **執行真實支付**
   - 開啟支付頁面 URL
   - 使用真實信用卡/ATM 完成支付
   - 確認收到支付成功通知

3. **驗證資料同步**
   - 檢查 Supabase 訂閱狀態
   - 確認支付記錄正確
   - 測試 LINE Bot 通知

### 正常金額測試（299 元）
確認 1 元測試成功後，進行正常訂閱價格測試

## 🔍 **故障排除**

### 常見問題
1. **支付頁面打不開**
   - 檢查 Oen Payment API 金鑰
   - 確認 Webhook URL 設定
   - 檢查 HTTPS 憑證

2. **支付成功但訂閱沒更新**
   - 檢查支付回調 URL
   - 查看伺服器日誌
   - 確認簽章驗證設定

3. **LINE 通知發送失敗**
   - 確認 LINE Channel Access Token
   - 檢查用戶 ID 正確性
   - 驗證 Flex Message 格式

## 📊 **監控指標**

部署後需要監控：
- [ ] 支付成功率
- [ ] API 回應時間
- [ ] 錯誤日誌
- [ ] 用戶訂閱轉換率
- [ ] 系統可用性

## 🛡️ **安全檢查**

- [ ] API 金鑰未暴露在程式碼中
- [ ] 啟用支付簽章驗證
- [ ] 設定適當的 CORS 政策
- [ ] 啟用 Rate Limiting
- [ ] 定期檢查異常交易

---

## 📞 **完成後聯絡**

當你完成 Oen Payment 申請並獲得正式金鑰後：
1. 告訴我你的金鑰（私訊，不要公開）
2. 我會協助你完成系統配置
3. 一起進行真實支付測試
4. 確保系統穩定運行

**預計時間軸**：
- Oen Payment 申請：3-7 工作天
- 系統配置更新：1-2 小時
- 部署和測試：2-4 小時
- 總共約 1-2 週可完成真實支付功能