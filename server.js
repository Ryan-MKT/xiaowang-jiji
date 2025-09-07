// 載入環境變數（必須在最頂端）
require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const session = require('express-session');
const { supabase } = require('./supabase-client');
const { authenticateUser } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
console.log('🚀 小汪記記 with LINE Login starting...');

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'dummy-token-for-testing',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'dummy-secret-for-testing'
};

// 只在有真實 token 時建立 client
const client = process.env.LINE_CHANNEL_ACCESS_TOKEN ? 
  new line.Client(config) : 
  null;

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session 設定（LINE Login 需要）
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 小時
}));

// 處理 LINE 事件
async function handleEvent(event) {
  console.log('Received event:', event);
  
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;
  
  // Linus 式認證：簡單直接，沒有廢話
  const user = await authenticateUser(userId);
  
  // 嘗試儲存到 Supabase
  if (supabase) {
    try {
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
        console.error('Supabase 儲存錯誤:', error);
      } else {
        console.log('✅ 訊息已儲存到 Supabase:', { userId, userMessage });
      }
    } catch (err) {
      console.error('資料庫連線錯誤:', err);
    }
  } else {
    console.log('📝 訊息記錄 (資料庫未連接):', userId, '-', userMessage);
  }

  const echo = { 
    type: 'text', 
    text: `✅ 已收到訊息: ${userMessage}` 
  };
  
  // 只在有 client 時回覆
  if (client) {
    return client.replyMessage(event.replyToken, echo);
  } else {
    console.log('測試模式：無法回覆訊息（缺少真實 LINE token）');
    return Promise.resolve(null);
  }
}

// LINE Login 路由（獨立模組，不影響 Bot）
const lineLoginRoutes = require('./line-login-routes');
app.use('/auth/line', lineLoginRoutes);

// 路由設定
app.get('/', (req, res) => {
  const loginUrl = '/auth/line/login';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>小汪記記</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: -apple-system, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
        }
        .status { 
          background: #f0f0f0;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .login-link {
          display: inline-block;
          background: #00B900;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 10px;
        }
        .endpoints {
          background: #f9f9f9;
          padding: 15px;
          border-left: 3px solid #00B900;
          margin: 20px 0;
        }
        code {
          background: #e0e0e0;
          padding: 2px 5px;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <h1>🐕 小汪記記 LINE Bot</h1>
      
      <div class="status">
        <h2>系統狀態</h2>
        <p>✅ Bot 運行中</p>
        <p>🕐 ${new Date().toISOString()}</p>
      </div>
      
      <div class="endpoints">
        <h3>可用端點</h3>
        <ul>
          <li><code>POST /webhook</code> - LINE Bot Webhook</li>
          <li><code>GET /health</code> - 健康檢查</li>
          <li><code>GET /db-status</code> - 資料庫狀態</li>
          <li><code>GET /auth/line/login</code> - LINE 登入</li>
          <li><code>GET /auth/line/status</code> - 登入狀態 API</li>
        </ul>
      </div>
      
      <div>
        <h3>LINE Login</h3>
        <p>使用 LINE 帳號登入網頁版：</p>
        <a href="${loginUrl}" class="login-link">使用 LINE 登入</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 資料庫狀態檢查
app.get('/db-status', async (req, res) => {
  if (!supabase) {
    return res.json({ 
      database: 'disconnected',
      message: 'Supabase 環境變數未設定' 
    });
  }
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) {
      return res.json({ 
        database: 'error',
        message: error.message 
      });
    }
    
    res.json({ 
      database: 'connected',
      message: 'Supabase 連線正常',
      totalMessages: data.length
    });
  } catch (err) {
    res.json({ 
      database: 'error',
      message: err.message 
    });
  }
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