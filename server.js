// 載入環境變數（必須在最頂端）
require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const session = require('express-session');
const { supabase } = require('./supabase-client');
const { authenticateUser } = require('./auth');
const OpenAI = require('openai');
const { createTaskFlexMessage, createTaskStackFlexMessage } = require('./task-flex-message');

// 用戶任務堆疊儲存（記憶體版本）
// 資料結構: Map<userId, Array<{text: string, id: number, timestamp: string}>>
const userTaskStacks = new Map();

const app = express();
const PORT = process.env.PORT || 3001;
console.log('🚀 小汪記記 with LINE Login starting...');

// 初始化 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-testing',
});
console.log('🤖 OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'dummy-token-for-testing',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'dummy-secret-for-testing'
};

// 只在有真實 token 時建立 client
console.log('🔑 LINE_CHANNEL_ACCESS_TOKEN exists:', !!process.env.LINE_CHANNEL_ACCESS_TOKEN);
const client = process.env.LINE_CHANNEL_ACCESS_TOKEN ? 
  new line.Client(config) : 
  null;
console.log('📱 LINE Client created:', !!client);

// Express middleware
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// Session 設定（LINE Login 需要）
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 小時
}));

// 判斷是否為問句或請求
function isQuestion(text) {
  // 問句特徵
  const questionPatterns = [
    /？$/,           // 中文問號結尾
    /\?$/,           // 英文問號結尾
    /嗎[？?]?$/,       // 嗎結尾
    /吧[？?]?$/,       // 吧結尾
    /呢[？?]?$/,       // 呢結尾
    /^幫我/,         // 「幫我」開頭
    /^請問/,         // 「請問」開頭
    /什麼/,          // 包含「什麼」
    /為什麼/,        // 包含「為什麼」
    /怎麼/,          // 包含「怎麼」
    /如何/,          // 包含「如何」
    /有沒有/,        // 包含「有沒有」
    /有哪些/,        // 包含「有哪些」
    /整理/,          // 包含「整理」
    /列出/,          // 包含「列出」
    /查詢/,          // 包含「查詢」
    /分析/           // 包含「分析」
  ];
  
  return questionPatterns.some(pattern => pattern.test(text));
}

// 處理 postback 事件（任務完成）
async function handlePostback(event) {
  console.log('Postback event:', event);
  
  const userId = event.source.userId;
  const postbackData = event.postback.data;
  
  // 檢查是否為任務完成事件
  if (postbackData.startsWith('complete_task_')) {
    const taskId = parseInt(postbackData.replace('complete_task_', ''));
    console.log(`📝 用戶 ${userId} 完成任務 ID: ${taskId}`);
    
    // 取得用戶任務堆疊
    let userTasks = userTaskStacks.get(userId) || [];
    
    // 找到對應的任務並標記為完成
    const taskIndex = userTasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      const completedTask = userTasks[taskIndex];
      userTasks[taskIndex].completed = true;
      userTaskStacks.set(userId, userTasks);
      
      console.log(`✅ 任務已完成: ${completedTask.text}`);
      
      // 發送恭喜訊息
      const congratsMessage = {
        type: 'text',
        text: `🎉 恭喜！${completedTask.text} 已完成！`
      };
      
      // 發送更新後的任務清單
      const updatedFlexMessage = createTaskStackFlexMessage(userTasks);
      
      if (client) {
        // 先發送恭喜訊息，再發送更新的任務清單
        await client.replyMessage(event.replyToken, congratsMessage);
        return client.pushMessage(userId, updatedFlexMessage);
      } else {
        console.log('測試模式：恭喜訊息', congratsMessage.text);
        console.log('測試模式：更新任務清單', JSON.stringify(updatedFlexMessage, null, 2));
        return Promise.resolve(null);
      }
    }
  }
  
  return Promise.resolve(null);
}

// 處理 LINE 事件
async function handleEvent(event) {
  console.log('Received event:', event);
  
  // 處理 postback 事件（任務完成）
  if (event.type === 'postback') {
    return handlePostback(event);
  }
  
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  let userMessage = event.message.text;
  const userId = event.source.userId;
  
  // 簡單認證
  const user = await authenticateUser(userId);
  
  // 清理訊息中的無效字元
  const cleanedMessage = userMessage
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字元
    .replace(/[\uFFFD\uFEFF]/g, '') // 移除替換字元和字節順序標記
    .trim();
    
  // 如果清理後的訊息為空，忽略此訊息
  if (!cleanedMessage) {
    console.log('⚠️ 訊息清理後為空，忽略處理');
    return Promise.resolve(null);
  }
  
  console.log('🧹 原始訊息:', userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''));
  console.log('✨ 清理後訊息:', cleanedMessage.substring(0, 100) + (cleanedMessage.length > 100 ? '...' : ''));
  
  // 更新 userMessage 為清理後的版本
  userMessage = cleanedMessage;

  // 嘗試儲存到 Supabase
  if (supabase) {
    try {
      const tablePrefix = process.env.TABLE_PREFIX || '';
      const tableName = tablePrefix + 'messages';
      
      const { data, error } = await supabase
        .from(tableName)
        .insert([
          {
            user_id: userId,
            message_text: cleanedMessage,
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error) {
        console.error('Supabase 儲存錯誤:', error);
      } else {
        console.log('✅ 訊息已儲存到 Supabase:', { userId, userMessage: cleanedMessage });
      }
    } catch (err) {
      console.error('資料庫連線錯誤:', err);
    }
  } else {
    console.log('📝 訊息記錄 (資料庫未連接):', userId, '-', cleanedMessage);
  }

  // 特殊指令：任務更新完成，重新生成任務堆疊
  if (userMessage.includes('任務更新完成') || userMessage.includes('刷新任務列表') || userMessage.includes('SYNC_TASKS')) {
    console.log('🔄 收到任務更新指令，重新生成任務堆疊');
    console.log('📥 原始指令內容:', userMessage.substring(0, 200) + '...');
    
    // 檢查是否包含 SYNC_TASKS 資料
    if (userMessage.includes('SYNC_TASKS:')) {
      try {
        // 提取 JSON 資料
        const jsonStart = userMessage.indexOf('SYNC_TASKS:') + 'SYNC_TASKS:'.length;
        const jsonData = userMessage.substring(jsonStart).trim();
        
        console.log('📄 提取的 JSON 資料 (前200字元):', jsonData.substring(0, 200));
        
        // 清理 JSON 資料中的無效字元
        const cleanedJsonData = jsonData
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字元
          .replace(/[\uFFFD\uFEFF]/g, ''); // 移除替換字元
          
        const syncedTasks = JSON.parse(cleanedJsonData);
        
        // 清理任務資料中的文字
        const cleanedTasks = syncedTasks.map(task => ({
          ...task,
          text: task.text ? task.text
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/[\uFFFD\uFEFF]/g, '')
            .trim() : '',
          notes: task.notes ? task.notes
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/[\uFFFD\uFEFF]/g, '')
            .trim() : ''
        })).filter(task => task.text); // 過濾掉沒有文字的任務
        
        console.log('📥 收到同步任務資料:', cleanedTasks.length, '個任務');
        console.log('🧹 清理後任務預覽:', cleanedTasks.map(task => task.text).slice(0, 3));
        
        // 更新伺服器端的任務堆疊
        userTaskStacks.set(userId, cleanedTasks);
        
        // 重新生成任務堆疊 Flex Message
        const taskStackFlexMessage = createTaskStackFlexMessage(cleanedTasks);
        
        console.log(`📋 任務同步完成，共 ${cleanedTasks.length} 個任務`);
        console.log('📝 更新後任務清單:', cleanedTasks.map((task, index) => `${index + 1}. ${task.text}`));
        
        if (client) {
          try {
            return client.replyMessage(event.replyToken, taskStackFlexMessage);
          } catch (replyError) {
            console.error('❌ Flex Message 發送失敗:', replyError);
            // 發送簡單文字訊息作為備用
            const fallbackMessage = {
              type: 'text',
              text: `✅ 任務已同步更新，共 ${cleanedTasks.length} 個任務`
            };
            return client.replyMessage(event.replyToken, fallbackMessage);
          }
        } else {
          console.log('測試模式：回覆同步後的任務堆疊 Flex Message');
          return Promise.resolve(null);
        }
      } catch (parseError) {
        console.error('❌ 解析同步任務資料失敗:', parseError);
        
        // 解析失敗時回到原本邏輯
        let userTasks = userTaskStacks.get(userId) || [];
        
        if (userTasks.length > 0) {
          const taskStackFlexMessage = createTaskStackFlexMessage(userTasks);
          
          if (client) {
            return client.replyMessage(event.replyToken, taskStackFlexMessage);
          } else {
            console.log('測試模式：回覆任務堆疊 Flex Message（解析失敗）');
            return Promise.resolve(null);
          }
        } else {
          // 沒有任務時的回覆
          const noTaskMessage = {
            type: 'text',
            text: '目前沒有待辦任務 📝'
          };
          
          if (client) {
            return client.replyMessage(event.replyToken, noTaskMessage);
          } else {
            console.log('測試模式：沒有任務（解析失敗）');
            return Promise.resolve(null);
          }
        }
      }
    } else {
      // 沒有 SYNC_TASKS 資料時，使用原本邏輯
      let userTasks = userTaskStacks.get(userId) || [];
      
      if (userTasks.length > 0) {
        // 重新生成任務堆疊 Flex Message
        const taskStackFlexMessage = createTaskStackFlexMessage(userTasks);
        
        console.log(`📋 重新生成任務堆疊，共 ${userTasks.length} 個任務`);
        console.log('📝 任務清單:', userTasks.map((task, index) => `${index + 1}. ${task.text}`));
        
        if (client) {
          return client.replyMessage(event.replyToken, taskStackFlexMessage);
        } else {
          console.log('測試模式：回覆任務堆疊 Flex Message');
          return Promise.resolve(null);
        }
      } else {
        // 沒有任務時的回覆
        const noTaskMessage = {
          type: 'text',
          text: '目前沒有待辦任務 📝'
        };
        
        if (client) {
          return client.replyMessage(event.replyToken, noTaskMessage);
        } else {
          console.log('測試模式：沒有任務');
          return Promise.resolve(null);
        }
      }
    }
    
    // 確保 SYNC_TASKS 處理完畢後就返回，不會繼續執行其他邏輯
    return;
  }
  
  // 判斷是問句還是任務
  const isQuestionMessage = isQuestion(userMessage);
  
  if (isQuestionMessage) {
    // 問句或請求：使用 AI 回覆
    console.log('💬 偵測到問句/請求，使用 AI 回覆');
    
    let aiResponse = `收到您的問題：${userMessage}`; // 預設回覆
    
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== '你的OpenAI_API_Key') {
      try {
        console.log('🤖 正在生成 AI 回覆...');
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "你是一個友善的助手，名字叫小汪。請用繁體中文回覆，回覆要簡潔親切。"
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          max_tokens: 150,
          temperature: 0.7,
        });
        
        aiResponse = completion.choices[0].message.content;
        console.log('✅ AI 回覆生成成功');
      } catch (error) {
        console.error('❌ OpenAI API 錯誤:', error.message);
        aiResponse = '抱歉，我現在無法處理您的請求，請稍後再試。';
      }
    } else {
      console.log('⚠️ OpenAI API Key 未設定，使用預設回覆');
    }
    
    const replyMessage = {
      type: 'text',
      text: aiResponse
    };
    
    if (client) {
      return client.replyMessage(event.replyToken, replyMessage);
    } else {
      console.log('測試模式：回覆訊息', replyMessage.text);
      return Promise.resolve(null);
    }
  } else {
    // 任務：加入任務堆疊並使用 Flex Message 記錄
    console.log('📝 偵測到任務，加入任務堆疊');
    
    // 取得或初始化用戶任務堆疊
    let userTasks = userTaskStacks.get(userId) || [];
    
    // 新增任務到堆疊
    const newTask = {
      id: Date.now(),
      text: userMessage,
      timestamp: new Date().toISOString()
    };
    
    userTasks.push(newTask);
    userTaskStacks.set(userId, userTasks);
    
    console.log(`📋 用戶 ${userId} 目前任務數量: ${userTasks.length}`);
    console.log('📝 任務清單:', userTasks.map((task, index) => `${index + 1}. ${task.text}`));
    
    // 創建包含所有任務的 Flex Message
    const flexMessage = createTaskStackFlexMessage(userTasks);
    
    if (client) {
      return client.replyMessage(event.replyToken, flexMessage);
    } else {
      console.log('測試模式：任務堆疊 Flex Message', JSON.stringify(flexMessage, null, 2));
      return Promise.resolve(null);
    }
  }
}

// LINE Login 路由（獨立模組，不影響 Bot）
const lineLoginRoutes = require('./line-login-routes');
app.use('/auth/line', lineLoginRoutes);

// LIFF 應用程式路由
app.get('/liff', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    let html = fs.readFileSync(path.join(__dirname, 'liff-app.html'), 'utf8');
    
    // 根據環境變數替換 LIFF ID
    const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
    html = html.replace(/liffId: '[^']*'/, `liffId: '${liffId}'`);
    
    res.send(html);
  } catch (error) {
    console.error('LIFF 檔案讀取錯誤:', error);
    res.status(500).send('LIFF APP 載入失敗');
  }
});

// LIFF 儲存功能測試頁面
app.get('/test', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const html = fs.readFileSync(path.join(__dirname, 'test-liff-save.html'), 'utf8');
    res.send(html);
  } catch (error) {
    console.error('讀取測試檔案錯誤:', error);
    res.status(500).send('測試檔案載入失敗');
  }
});

// 儲存功能問題診斷工具
app.get('/debug', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const html = fs.readFileSync(path.join(__dirname, 'debug-storage.html'), 'utf8');
    res.send(html);
  } catch (error) {
    console.error('讀取診斷檔案錯誤:', error);
    res.status(500).send('診斷檔案載入失敗');
  }
});

// LIFF 全部記錄頁面路由
app.get('/liff/records', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const html = fs.readFileSync(path.join(__dirname, 'liff-records.html'), 'utf8');
    res.send(html);
  } catch (error) {
    console.error('讀取記錄頁面錯誤:', error);
    res.status(500).send('記錄頁面載入失敗');
  }
});

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