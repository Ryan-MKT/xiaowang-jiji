const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

// 詳細 LOG 系統
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [DATA]`, JSON.stringify(data, null, 2));
  }
}

// Webhook 端點
app.post('/webhook', line.middleware(config), async (req, res) => {
  log('INFO', '=== MVP WEBHOOK 接收到請求 ===');
  log('INFO', '請求 body', req.body);

  try {
    const results = await Promise.all(req.body.events.map(handleEvent));
    log('SUCCESS', '所有事件處理完成', results);
    res.json({ status: 'ok' });
  } catch (error) {
    log('ERROR', '事件處理失敗', error);
    res.status(500).json({ error: 'Processing failed', details: error.message });
  }
});

// 處理事件 - MVP 版本：只發送最簡單的回覆
async function handleEvent(event) {
  log('INFO', '處理事件', { type: event.type, source: event.source });

  if (event.type !== 'message' || event.message.type !== 'text') {
    log('WARN', '非文字訊息，忽略');
    return null;
  }

  const userMessage = event.message.text;
  log('INFO', '用戶訊息', { text: userMessage, userId: event.source.userId });

  // 最簡單的文字回覆
  const replyMessage = {
    type: 'text',
    text: `✅ MVP測試成功！\n您說：${userMessage}\n回覆時間：${new Date().toLocaleString('zh-TW')}`
  };

  log('INFO', '準備發送回覆', replyMessage);

  try {
    await client.replyMessage(event.replyToken, replyMessage);
    log('SUCCESS', '✅ 回覆發送成功！');
    return 'success';
  } catch (error) {
    log('ERROR', '❌ 回覆發送失敗', {
      error: error.message,
      statusCode: error.statusCode,
      replyToken: event.replyToken
    });
    throw error;
  }
}

// 健康檢查
app.get('/health', (req, res) => {
  log('INFO', 'Health check requested');
  res.json({
    status: 'ok',
    message: 'MVP Test Server is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = 3003;
app.listen(PORT, () => {
  log('INFO', `🚀 MVP Test Server running on port ${PORT}`);
  log('INFO', `📅 Started at: ${new Date().toISOString()}`);
});