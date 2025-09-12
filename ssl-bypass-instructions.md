# SSL 憑證問題解決方案

## 🔒 遇到的問題

你看到的錯誤 `net::ERR_CERT_COMMON_NAME_INVALID` 表示：
- 測試環境的 SSL 憑證與域名不匹配
- 這是 Oen Payment 測試環境的常見問題
- 不影響實際功能，只是瀏覽器安全檢查

## 💡 解決方案

### 方案 1: 手動繞過 SSL 警告 (推薦)

1. **點擊 "進階" 或 "Advanced"**
2. **點擊 "繼續前往 mktersalon.test.oen.tw (不安全)" 或 "Proceed to mktersalon.test.oen.tw (unsafe)"**
3. 這是測試環境，可以安全地繞過這個警告

### 方案 2: 使用不同瀏覽器

有些瀏覽器對測試憑證較寬鬆：
- **Firefox**: 通常更容易繞過
- **Edge**: 也可以嘗試
- **Chrome 無痕模式**: 有時會有不同行為

### 方案 3: 創建新的結帳連結

讓我們創建一個新的測試連結：