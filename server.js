// 載入環境變數（必須在最頂端）
require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const session = require('express-session');
const { supabase } = require('./supabase-client');
const { authenticateUser } = require('./auth');
const { createMinimalFlexMessage, createTaskListFlexMessage } = require('./flex-message-builder');

// 用戶任務堆疊存儲（記憶體版本）
// 資料結構: Map<userId, Array<{text: string, completed: boolean, id: number}>>
const userTaskLists = new Map();

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
  
  // 處理 postback 事件（任務完成）
  if (event.type === 'postback') {
    return handlePostbackEvent(event);
  }
  
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;
  
  // Linus 式認證：簡單直接，沒有廢話
  const user = await authenticateUser(userId);
  
  // 特殊指令處理
  if (userMessage.toLowerCase() === 'clear' || userMessage === '清除') {
    // 清除該用戶的任務清單
    userTaskLists.delete(userId);
    const clearMessage = createMinimalFlexMessage('✨ 任務清單已清除');
    
    if (client) {
      return client.replyMessage(event.replyToken, clearMessage);
    } else {
      console.log('測試模式：任務清單已清除');
      console.log('🎨 生成的 Flex Message:', JSON.stringify(clearMessage, null, 2));
      return Promise.resolve(null);
    }
  }

  // 處理任務堆疊邏輯 - Linus 式簡潔資料結構
  let currentTasks = userTaskLists.get(userId) || [];
  const taskId = Date.now(); // 簡單的 ID 生成
  currentTasks.push({
    id: taskId,
    text: userMessage,
    completed: false
  });
  userTaskLists.set(userId, currentTasks);
  
  console.log(`📋 用戶 ${userId} 的任務清單:`, currentTasks);
  
  // 嘗試儲存到 Supabase
  if (supabase) {
    try {
      // 根據環境選擇表格名稱
      const tablePrefix = process.env.TABLE_PREFIX || '';
      const tableName = tablePrefix + 'messages';
      
      const { data, error } = await supabase
        .from(tableName)
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

  // 創建任務清單 Flex Message
  const flexMessage = createTaskListFlexMessage(currentTasks);
  
  // 添加詳細日誌
  console.log('🎨 生成的 Flex Message:', JSON.stringify(flexMessage, null, 2));
  
  // 只在有 client 時回覆
  if (client) {
    return client.replyMessage(event.replyToken, flexMessage);
  } else {
    console.log('測試模式：無法回覆訊息（缺少真實 LINE token）');
    return Promise.resolve(null);
  }
}

// 處理 postback 事件（任務完成）- 符合品味要求
async function handlePostbackEvent(event) {
  const userId = event.source.userId;
  const postbackData = JSON.parse(event.postback.data);
  
  if (postbackData.action === 'complete_task') {
    const taskId = postbackData.taskId;
    let currentTasks = userTaskLists.get(userId) || [];
    
    // 找到並標記任務為完成
    currentTasks = currentTasks.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    );
    userTaskLists.set(userId, currentTasks);
    
    // 找到完成的任務
    const completedTask = currentTasks.find(task => task.id === taskId);
    const confirmMessage = {
      type: 'text',
      text: `恭喜"${completedTask.text}"完成!`
    };
    
    // 回覆確認訊息
    if (client) {
      await client.replyMessage(event.replyToken, confirmMessage);
      
      // 延遲 1 秒後發送更新的任務清單
      setTimeout(() => {
        const updatedFlexMessage = createTaskListFlexMessage(currentTasks);
        client.pushMessage(userId, updatedFlexMessage);
      }, 1000);
    } else {
      console.log('測試模式：任務已完成', completedTask.text);
      console.log('🎨 確認訊息:', JSON.stringify(confirmMessage, null, 2));
    }
    
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
    // 根據環境選擇表格名稱
    const tablePrefix = process.env.TABLE_PREFIX || '';
    const tableName = tablePrefix + 'messages';
    
    const { data, error } = await supabase
      .from(tableName)
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