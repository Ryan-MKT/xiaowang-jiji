const express = require('express');
const line = require('@line/bot-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

const client = new line.Client(config);

// 處理 LINE 事件
function handleEvent(event) {
  console.log('Received event:', event);
  
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const echo = { 
    type: 'text', 
    text: `收到訊息: ${event.message.text}` 
  };
  
  return client.replyMessage(event.replyToken, echo);
}

// 路由設定
app.get('/', (req, res) => {
  res.json({ 
    message: 'LINE Bot is running!', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => {
      console.log('Events processed:', result);
      res.json(result);
    })
    .catch((err) => {
      console.error('Error processing events:', err);
      res.status(500).end();
    });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🤖 LINE Bot server running on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});