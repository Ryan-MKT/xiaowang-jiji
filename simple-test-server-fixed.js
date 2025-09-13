const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const app = express();
app.use(express.json());

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

// Webhook 端點 (跳過簽名驗證用於測試)
app.post('/webhook', (req, res) => {
  console.log('=== SIMPLE WEBHOOK 接收到請求 ===');
  console.log('📥 請求 body:', JSON.stringify(req.body, null, 2));

  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => {
      console.log('✅ 處理完成:', result);
      res.json({ status: 'ok' });
    })
    .catch((err) => {
      console.error('❌ 處理錯誤:', err);
      res.status(500).json({ error: 'Processing failed' });
    });
});

// 處理事件
function handleEvent(event) {
  console.log('📋 處理事件:', event.type);

  if (event.type !== 'message' || event.message.type !== 'text') {
    console.log('⚠️ 非文字訊息，忽略');
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  console.log('📝 用戶訊息:', userMessage);

  // 簡單的文字回覆
  const replyMessage = {
    type: 'text',
    text: `您說：${userMessage}\n✅ 我收到您的訊息了！這是簡單測試回覆。`
  };

  console.log('📤 準備回覆:', replyMessage);

  return client.replyMessage(event.replyToken, replyMessage)
    .then(() => {
      console.log('✅ 回覆成功！');
    })
    .catch((error) => {
      console.error('❌ 回覆失敗:', error);
    });
}

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Simple test server is running' });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 Simple Test Server (Fixed) running on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});