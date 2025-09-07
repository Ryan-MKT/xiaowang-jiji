const express = require('express');
const line = require('@line/bot-sdk');
const { supabase } = require('./supabase-client');

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

const client = new line.Client(config);

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 處理 LINE 事件
async function handleEvent(event) {
  console.log('Received event:', event);
  
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;
  
  try {
    // 儲存訊息到 Supabase
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          user_id: userId,
          message_text: userMessage,
          created_at: new Date().toISOString()
        }
      ]);
    
    if (error) {
      console.error('Supabase error:', error);
    } else {
      console.log('Message saved to Supabase:', data);
    }
  } catch (err) {
    console.error('Database save error:', err);
  }

  const echo = { 
    type: 'text', 
    text: `✅ 已收到並儲存訊息: ${userMessage}` 
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

app.post('/webhook', (req, res) => {
  // 簡化版本：跳過 LINE signature 驗證用於測試
  console.log('Webhook called with body:', req.body);
  
  if (!req.body.events) {
    return res.status(200).json({ message: 'No events' });
  }
  
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => {
      console.log('Events processed:', result);
      res.status(200).json(result);
    })
    .catch((err) => {
      console.error('Error processing events:', err);
      res.status(200).json({ error: 'Processing failed' });
    });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🤖 LINE Bot server running on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});