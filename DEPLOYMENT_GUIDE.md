# 小汪記記 LINE Bot - 生產環境部署指南

## 部署前準備清單

### 1. LINE 開發者設定
- [ ] 註冊 LINE Business Account
- [ ] 建立正式的 LINE Bot Channel
- [ ] 建立正式的 LINE Login Channel
- [ ] 建立正式的 LIFF App

### 2. 第三方服務設定
- [ ] 申請 Oen Payment 商戶帳號
- [ ] 獲取 Oen Payment API 金鑰和密鑰
- [ ] 建立正式的 Supabase 專案
- [ ] 獲取 OpenAI API 金鑰

### 3. 資料庫設定
- [ ] 在 Supabase 建立以下資料表：
  - `prod_subscriptions` (訂閱管理)
  - `prod_payment_orders` (支付訂單)
  - `prod_todos` (待辦事項)
  - `prod_usage_stats` (使用統計)

## Zeabur 部署步驟

### 1. 上傳程式碼
```bash
# 推送程式碼到 GitHub
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 2. 在 Zeabur 中設定專案
1. 連接 GitHub 儲存庫
2. 選擇 Node.js 環境
3. 設定以下環境變數：

```bash
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=你的正式Channel_Access_Token
LINE_CHANNEL_SECRET=你的正式Channel_Secret

# LINE Login 設定  
LINE_LOGIN_CHANNEL_ID=你的正式Login_Channel_ID
LINE_LOGIN_CHANNEL_SECRET=你的正式Login_Channel_Secret
LINE_LOGIN_CALLBACK_URL=https://your-domain.zeabur.app/auth/line/callback

# Supabase 設定
SUPABASE_URL=你的正式Supabase_URL
SUPABASE_ANON_KEY=你的正式Supabase_Anon_Key

# 表格前綴
TABLE_PREFIX=prod_

# Session 設定
SESSION_SECRET=your-super-secure-session-secret

# 環境設定
NODE_ENV=production
PORT=3001

# Webhook URL
WEBHOOK_BASE_URL=https://your-domain.zeabur.app

# OpenAI API
OPENAI_API_KEY=你的OpenAI_API_Key

# LIFF 設定
LIFF_BASE_URL=https://your-domain.zeabur.app
LIFF_APP_ID=你的正式LIFF_App_ID

# Oen Payment 設定
OEN_PAYMENT_API_URL=https://payment.oen.tw
OEN_PAYMENT_MERCHANT_ID=你的商戶ID
OEN_PAYMENT_API_KEY=你的API金鑰
OEN_PAYMENT_SECRET_KEY=你的簽章密鑰

# 支付設定
PAYMENT_SIGNATURE_VERIFICATION=true
PAYMENT_SUCCESS_URL=https://your-domain.zeabur.app/payment/success
PAYMENT_CANCEL_URL=https://your-domain.zeabur.app/payment/cancel
PAYMENT_CALLBACK_URL=https://your-domain.zeabur.app/api/payment/callback

# 安全設定
CORS_ORIGIN=https://liff.line.me,https://your-domain.zeabur.app

# 功能設定
PREMIUM_SUBSCRIPTION_PRICE=299
PREMIUM_SUBSCRIPTION_DURATION_MONTHS=1
ENABLE_PAYMENT_NOTIFICATIONS=true
```

### 3. 部署後設定

1. **設定 Webhook URL**
   - 在 LINE Developers Console 中設定 Webhook URL：
     `https://your-domain.zeabur.app/api/webhook`

2. **設定 LIFF Endpoint URL**
   - 在 LINE Developers Console 中設定 LIFF Endpoint URL：
     `https://your-domain.zeabur.app/liff-account.html`

3. **測試部署**
   - 訪問健康檢查端點：`https://your-domain.zeabur.app/health`
   - 測試 LINE Bot 基本功能
   - 測試付費訂閱流程

## 資料庫設定 SQL

```sql
-- 訂閱管理表
CREATE TABLE prod_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  subscription_type VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支付訂單表
CREATE TABLE prod_payment_orders (
  id BIGSERIAL PRIMARY KEY,
  order_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'TWD',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(100),
  transaction_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_subscriptions_user_id ON prod_subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON prod_subscriptions(status);
CREATE INDEX idx_payment_orders_user_id ON prod_payment_orders(user_id);
CREATE INDEX idx_payment_orders_status ON prod_payment_orders(status);
CREATE INDEX idx_payment_orders_order_id ON prod_payment_orders(order_id);
```

## 監控與維護

### 1. 日誌監控
- 監控 Zeabur 應用程式日誌
- 設定錯誤警報

### 2. 資料庫監控
- 監控 Supabase 使用量
- 設定資料庫備份

### 3. 付費功能監控
- 監控支付成功率
- 監控訂閱轉換率
- 追蹤收入統計

## 安全檢查清單

- [ ] 所有 API 金鑰都已設定為環境變數
- [ ] 啟用簽章驗證 (`PAYMENT_SIGNATURE_VERIFICATION=true`)
- [ ] CORS 設定正確
- [ ] Session secret 夠強
- [ ] 資料庫存取權限設定正確
- [ ] HTTPS 強制啟用

## 功能測試清單

### 基本功能
- [ ] LINE Bot 回應正常
- [ ] 待辦事項 CRUD 功能
- [ ] 使用者驗證功能

### 付費功能
- [ ] 帳戶頁面顯示正常
- [ ] 訂閱狀態查詢正常
- [ ] 支付頁面開啟正常
- [ ] 支付回調處理正常
- [ ] 訂閱升級正常
- [ ] LINE 通知發送正常

## 故障排除

### 常見問題
1. **LINE Bot 無回應**
   - 檢查 Webhook URL 設定
   - 檢查 Channel Access Token

2. **支付功能異常**
   - 檢查 Oen Payment API 設定
   - 檢查簽章驗證設定

3. **資料庫連線失敗**
   - 檢查 Supabase URL 和 Key
   - 檢查資料表名稱前綴

4. **LIFF 頁面無法載入**
   - 檢查 LIFF App ID 設定
   - 檢查 CORS 設定