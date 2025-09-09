# 小汪記記開發環境重啟指南

## 重啟開發環境步驟

### 1. 啟動 Node.js 伺服器
```bash
node server.js
```

### 2. 啟動 ngrok (如果需要 LINE Bot 測試)
```bash
ngrok http 3001
```

### 3. 更新 LINE webhook URL (如需要)
- 取得新的 ngrok URL: `https://xxxxxx.ngrok-free.app`
- 到 LINE Developers Console 更新 webhook URL: `https://xxxxxx.ngrok-free.app/webhook`

## 環境檢查清單

- [ ] .env 檔案存在且包含必要設定
- [ ] node_modules 已安裝 (`npm install`)
- [ ] PORT 3001 沒有被其他程式佔用
- [ ] ngrok 正確轉發到 localhost:3001
- [ ] LINE Bot webhook URL 指向正確的 ngrok URL

## 重要檔案位置

- 主程式: `server.js`
- 環境設定: `.env`
- Flex Message 建構器: `flex-message-builder.js`, `task-flex-message.js`
- 資料庫設定: `supabase-client.js`

## 當前狀態 (2025-09-08)

- ✅ 最新代碼已推送到 GitHub main 分支
- ✅ Flex Message 標題已更新為「今天x件事要做」
- ✅ 所有變更已提交，工作目錄乾淨
- ✅ 伺服器程式已正常停止

## 故障排除

如果遇到問題：

1. **伺服器無法啟動**
   ```bash
   # 檢查 port 3001 是否被佔用
   netstat -an | findstr 3001
   # 或使用其他 port
   PORT=3002 node server.js
   ```

2. **ngrok 連線失敗**
   ```bash
   # 重新啟動 ngrok
   ngrok http 3001
   ```

3. **LINE Bot 無回應**
   - 檢查 webhook URL 是否正確
   - 檢查 LINE_CHANNEL_ACCESS_TOKEN 是否有效
   - 查看 server.js 的 console 輸出

## 開發環境已安全儲存！
明天可直接執行上述步驟重啟開發環境。