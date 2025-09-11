// 載入環境變數（必須在最頂端）
require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const session = require('express-session');
const { supabase } = require('./supabase-client');
const { authenticateUser } = require('./auth');
const OpenAI = require('openai');
// 動態載入模組以支援熱重載
function getTaskFlexModule() {
  const modulePath = require.resolve('./task-flex-message');
  delete require.cache[modulePath];
  return require('./task-flex-message');
}

// 用戶任務堆疊儲存（記憶體版本）
// 資料結構: Map<userId, Array<{text: string, id: number, timestamp: string}>>
const userTaskStacks = new Map();

// 用戶收藏任務儲存（記憶體版本）
// 資料結構: Map<userId, Array<{id: string, name: string, description: string, category: string, used_count: number, created_at: string}>>
const userFavoriteTasks = new Map();

// 用戶標籤選擇狀態追蹤（記憶體版本）
// 資料結構: Map<userId, {waitingForTag: boolean, targetTaskId: number, timestamp: number}>
const userTagSelectionStates = new Map();

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
  const postbackData = event.postback?.data || event.postbackData;
  
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
      const userTags = await getUserTags(userId);
      const { createTaskStackFlexMessage } = getTaskFlexModule();
      const updatedFlexMessage = createTaskStackFlexMessage(userTasks, userTags);
      
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
  
  // 檢查是否為任務收藏事件
  if (postbackData.startsWith('favorite_task_')) {
    const taskId = parseInt(postbackData.replace('favorite_task_', ''));
    console.log(`⭐ 用戶 ${userId} 收藏任務 ID: ${taskId}`);
    
    // 取得用戶任務堆疊
    let userTasks = userTaskStacks.get(userId) || [];
    
    // 找到對應的任務
    const taskIndex = userTasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      const favoriteTask = userTasks[taskIndex];
      
      // 檢查是否已經收藏過
      if (favoriteTask.favorited) {
        console.log(`📝 任務已經收藏過: ${favoriteTask.text}`);
        return Promise.resolve(null);
      }
      
      // 標記為已收藏
      userTasks[taskIndex].favorited = true;
      userTaskStacks.set(userId, userTasks);
      
      // 添加到用戶收藏清單
      let userFavorites = userFavoriteTasks.get(userId) || [];
      const newFavorite = {
        id: Date.now().toString(),
        name: favoriteTask.text,
        description: '',
        category: '',
        used_count: 0,
        created_at: new Date().toISOString(),
        source_task_id: taskId
      };
      
      userFavorites.push(newFavorite);
      userFavoriteTasks.set(userId, userFavorites);
      
      console.log(`✅ 任務已收藏: ${favoriteTask.text}`);
      
      if (client) {
        // 設置標籤選擇狀態
        userTagSelectionStates.set(userId, {
          waitingForTag: true,
          targetTaskId: taskId,
          timestamp: Date.now()
        });
        console.log(`🏷️ [標籤選擇] 用戶 ${userId} 進入標籤選擇狀態，目標任務 ID: ${taskId}`);
        
        // 準備標籤詢問訊息（包含 Quick Reply 按鈕）
        const userTags = await getUserTags(userId);
        const { generateQuickReply } = getTaskFlexModule();
        const tagQuestionMessage = {
          type: 'text',
          text: '希望收藏到哪個標籤?',
          quickReply: generateQuickReply(userTags)
        };
        
        // 只發送詢問標籤的訊息，不更新 FLEX MESSAGE
        return client.replyMessage(event.replyToken, tagQuestionMessage);
      } else {
        console.log('測試模式：標籤詢問訊息（含 Quick Reply）', '希望收藏到哪個標籤?');
        return Promise.resolve(null);
      }
    }
  }
  
  return Promise.resolve(null);
}

// 載入用戶標籤
async function getUserTags(userId) {
  try {
    if (supabase) {
      const tablePrefix = process.env.TABLE_PREFIX || 'dev_';
      const tableName = tablePrefix + 'tags';
      
      console.log(`🔍 [標籤同步] 查詢表格: ${tableName}, 用戶: ${userId}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.error('❌ [標籤同步] 載入用戶標籤錯誤:', error);
        console.log('🔄 [標籤同步] 回退到預設標籤');
        return getDefaultUserTags();
      }
      
      if (data && data.length > 0) {
        console.log(`✅ [標籤同步] 成功載入用戶 ${userId} 的標籤，數量: ${data.length}`);
        console.log(`📋 [標籤同步] 標籤詳細:`, data.map(tag => `${tag.name}(${tag.sort_order})`));
        return data;
      } else {
        console.log(`⚠️ [標籤同步] 用戶 ${userId} 無自定義標籤，使用預設標籤`);
        return getDefaultUserTags();
      }
    } else {
      console.log('🔌 [標籤同步] 無資料庫連線，使用預設標籤');
      return getDefaultUserTags();
    }
  } catch (error) {
    console.error('💥 [標籤同步] 載入用戶標籤失敗:', error);
    return getDefaultUserTags();
  }
}

// 獲取預設用戶標籤 - 使用實際 Supabase 中的標籤資料
function getDefaultUserTags() {
  return [
    { id: 5, name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1, is_active: true },
    { id: 6, name: '學習', color: '#4ECDC4', icon: '📚', sort_order: 2, is_active: true },
    { id: 8, name: '運動', color: '#45B7D1', icon: '🏃‍♂️', sort_order: 3, is_active: true },
    { id: 7, name: 'AI', color: '#9B59B6', icon: '🤖', sort_order: 4, is_active: true },
    { id: 9, name: '日本', color: '#E74C3C', icon: '🗾', sort_order: 5, is_active: true }
  ];
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
        const userTags = await getUserTags(userId);
        const { createTaskStackFlexMessage } = getTaskFlexModule();
        const taskStackFlexMessage = createTaskStackFlexMessage(cleanedTasks, userTags);
        
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
          const userTags = await getUserTags(userId);
          const { createTaskStackFlexMessage } = getTaskFlexModule();
          const taskStackFlexMessage = createTaskStackFlexMessage(userTasks, userTags);
          
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
        const userTags = await getUserTags(userId);
        const { createTaskStackFlexMessage } = getTaskFlexModule();
        const taskStackFlexMessage = createTaskStackFlexMessage(userTasks, userTags);
        
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
  
  // 檢查用戶是否正在等待標籤選擇
  const tagSelectionState = userTagSelectionStates.get(userId);
  if (tagSelectionState && tagSelectionState.waitingForTag) {
    console.log(`🏷️ [標籤處理] 用戶 ${userId} 選擇標籤: ${userMessage}`);
    
    // 清除標籤選擇狀態
    userTagSelectionStates.delete(userId);
    
    // 取得用戶任務堆疊
    let userTasks = userTaskStacks.get(userId) || [];
    
    // 找到目標任務
    const taskIndex = userTasks.findIndex(task => task.id === tagSelectionState.targetTaskId);
    if (taskIndex !== -1) {
      const originalTask = userTasks[taskIndex];
      
      // 更新任務文字格式為 (標籤)原文字
      const taggedText = `(${userMessage})${originalTask.text}`;
      userTasks[taskIndex].text = taggedText;
      userTaskStacks.set(userId, userTasks);
      
      console.log(`✅ 任務已標記: ${originalTask.text} -> ${taggedText}`);
      
      // 同步更新收藏任務中的名稱（如果該任務已被收藏）
      if (originalTask.favorited) {
        let userFavorites = userFavoriteTasks.get(userId) || [];
        const favoriteIndex = userFavorites.findIndex(fav => fav.source_task_id === originalTask.id);
        if (favoriteIndex !== -1) {
          userFavorites[favoriteIndex].name = taggedText;
          userFavoriteTasks.set(userId, userFavorites);
          console.log(`🔄 收藏任務同步更新: ${taggedText}`);
        }
      }
      
      // 重新生成任務堆疊 Flex Message
      const userTags = await getUserTags(userId);
      const { createTaskStackFlexMessage } = getTaskFlexModule();
      const updatedFlexMessage = createTaskStackFlexMessage(userTasks, userTags);
      
      if (client) {
        return client.replyMessage(event.replyToken, updatedFlexMessage);
      } else {
        console.log('測試模式：發送標記後的任務堆疊');
        return Promise.resolve(null);
      }
    } else {
      console.log(`⚠️ 找不到目標任務 ID: ${tagSelectionState.targetTaskId}`);
      
      // 發送錯誤訊息
      const errorMessage = {
        type: 'text',
        text: '找不到要標記的任務，請重新操作'
      };
      
      if (client) {
        return client.replyMessage(event.replyToken, errorMessage);
      } else {
        console.log('測試模式：任務不存在錯誤');
        return Promise.resolve(null);
      }
    }
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
    
    console.log(`📋 [任務同步] 用戶 ${userId} 目前任務數量: ${userTasks.length}`);
    console.log('📝 [任務同步] 任務清單:', userTasks.map((task, index) => `${index + 1}. ${task.text}`));
    
    // 🔄 同步到 localStorage - 讓 FLEX MESSAGE 與全部記錄頁面保持同步
    console.log('🔄 [任務同步] 同步任務到 localStorage 以保持與全部記錄頁面一致');
    
    // 創建包含所有任務的 Flex Message
    const userTags = await getUserTags(userId);
    const { createTaskStackFlexMessage } = getTaskFlexModule();
    const flexMessage = createTaskStackFlexMessage(userTasks, userTags);
    
    // 📱 回覆 FLEX MESSAGE 時同時包含同步指令
    const syncMessage = `SYNC_TASKS:${JSON.stringify(userTasks)}`;
    console.log('📱 [任務同步] 準備發送 FLEX MESSAGE 和同步資料');
    
    // 🔍 詳細記錄 FLEX MESSAGE 結構用於診斷
    console.log('🔍 [FLEX DEBUG] FLEX MESSAGE 結構預覽:');
    console.log(`  - altText: ${flexMessage.altText}`);
    console.log(`  - type: ${flexMessage.type}`);
    console.log(`  - quickReply items: ${flexMessage.quickReply?.items?.length || 0}`);
    console.log('🔍 [FLEX DEBUG] 任務ICON結構檢查:');
    const bodyContents = flexMessage.contents?.body?.contents || [];
    
    // 檢查任務項目的ICON結構
    let taskIconCount = 0;
    bodyContents.forEach((item, idx) => {
      if (item.type === 'box' && item.layout === 'horizontal' && item.contents && item.contents.length >= 3) {
        const taskText = item.contents[0]?.text || '';
        if (taskText.match(/^\d+\./)) { // 匹配任務項目格式 "1. xxx"
          taskIconCount++;
          console.log(`  📋 任務 ${taskIconCount}:`);
          console.log(`    - 文字: ${taskText.substring(0, 20)}...`);
          console.log(`    - ICON數量: ${item.contents.length}`);
          item.contents.slice(1).forEach((icon, iconIdx) => {
            const actionType = icon.action?.type || 'none';
            const actionData = icon.action?.data || icon.action?.uri || 'none';
            console.log(`    - ICON ${iconIdx + 1}: ${icon.text} (${actionType}: ${actionData})`);
          });
        }
      }
    });
    
    // 檢查底部按鈕區域
    console.log('🔍 [FLEX DEBUG] 底部按鈕檢查:');
    const bottomButtonBox = bodyContents.find(item => 
      item.type === 'box' && 
      item.layout === 'horizontal' && 
      item.contents && 
      item.contents.some(btn => btn.text && (btn.text.includes('全部記錄') || btn.text.includes('任務收藏')))
    );
    if (bottomButtonBox) {
      console.log(`  ✅ 找到底部按鈕區域，包含 ${bottomButtonBox.contents?.length || 0} 個按鈕`);
      bottomButtonBox.contents?.forEach((btn, idx) => {
        console.log(`  📋 按鈕 ${idx + 1}: ${btn.text} -> ${btn.action?.uri}`);
      });
    } else {
      console.log('  ❌ 未找到底部按鈕區域');
    }
    
    if (client) {
      console.log('🚀 [FLEX SEND] 開始發送 FLEX MESSAGE 到 LINE...');
      return client.replyMessage(event.replyToken, flexMessage)
        .then(result => {
          console.log('✅ [FLEX SEND] FLEX MESSAGE 發送成功!', {
            requestId: result['x-line-request-id'],
            sentMessages: result.sentMessages?.length || 0
          });
          return result;
        })
        .catch(error => {
          console.error('❌ [FLEX SEND] FLEX MESSAGE 發送失敗:', error);
          console.error('❌ [FLEX ERROR] 錯誤詳情:', error.message);
          throw error;
        });
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
    let html = fs.readFileSync(path.join(__dirname, 'liff-records.html'), 'utf8');
    
    // 🔧 修復：進行 LIFF ID 動態替換
    const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
    html = html.replace(/liffId: '[^']*'/, `liffId: '${liffId}'`);
    
    console.log(`📱 [記錄頁面] 使用 LIFF ID: ${liffId}`);
    console.log(`🔗 [記錄頁面] URL 參數:`, req.url);
    
    // 強制不緩存
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(html);
  } catch (error) {
    console.error('讀取記錄頁面錯誤:', error);
    res.status(500).send('記錄頁面載入失敗');
  }
});

// 任務收藏頁面路由
app.get('/liff/favorites', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    let html = fs.readFileSync(path.join(__dirname, 'liff-favorites.html'), 'utf8');
    
    // 進行 LIFF ID 動態替換
    const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
    html = html.replace(/liffId: '[^']*'/, `liffId: '${liffId}'`);
    
    console.log(`⭐ [收藏頁面] 使用 LIFF ID: ${liffId}`);
    console.log(`🔗 [收藏頁面] URL 參數:`, req.url);
    
    // 強制不緩存
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(html);
  } catch (error) {
    console.error('讀取收藏頁面錯誤:', error);
    res.status(500).send('收藏頁面載入失敗');
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

// ==================== 標籤 API 端點 ====================

// 取得使用者標籤列表
app.get('/api/tags', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🔍 [API診斷] 取得使用者 ${userId} 的標籤列表`);
    
    if (supabase) {
      const tablePrefix = process.env.TABLE_PREFIX || '';
      const tableName = tablePrefix + 'tags';
      
      console.log(`🔍 [API診斷] 查詢表格: ${tableName}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.error('❌ [API診斷] Supabase 查詢錯誤:', error);
        return res.status(500).json({ error: 'Database query failed', details: error });
      }
      
      if (data && data.length > 0) {
        console.log(`✅ [API診斷] 查詢到 ${data.length} 個標籤:`);
        console.log(data.map(tag => `- ${tag.name}(${tag.sort_order})`));
        res.json(data);
      } else {
        console.log(`⚠️ [API診斷] 未找到標籤，返回空陣列`);
        res.json([]);
      }
    } else {
      console.log(`🔌 [API診斷] 無資料庫連線，返回預設標籤`);
      // 如果沒有資料庫連線，返回預設標籤
      const defaultTags = [
        { id: 1, name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1 },
        { id: 2, name: '學習', color: '#4ECDC4', icon: '📚', sort_order: 2 },
        { id: 3, name: '運動', color: '#45B7D1', icon: '🏃‍♂️', sort_order: 3 }
      ];
      res.json(defaultTags);
    }
  } catch (err) {
    console.error('標籤 API 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 新增標籤
app.post('/api/tags', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { name, color, icon, orderIndex } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    if (!name || name.length > 20) {
      return res.status(400).json({ error: 'Invalid tag name' });
    }
    
    console.log(`➕ 使用者 ${userId} 新增標籤: ${name}`);
    
    if (supabase) {
      const tablePrefix = process.env.TABLE_PREFIX || 'dev_';
      const tableName = tablePrefix + 'tags';
      
      console.log(`🔍 [新增標籤] 查詢表格: ${tableName}, 用戶: ${userId}`);
      
      // 檢查標籤數量限制
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (count >= 10) {
        return res.status(400).json({ error: 'Tag limit exceeded' });
      }
      
      // 檢查標籤名稱是否已存在
      const { data: existingTag } = await supabase
        .from(tableName)
        .select('id')
        .eq('user_id', userId)
        .eq('name', name)
        .eq('is_active', true)
        .single();
      
      if (existingTag) {
        return res.status(400).json({ error: 'Tag name already exists' });
      }
      
      // 獲取下一個 sort_order
      const { data: maxOrderData } = await supabase
        .from(tableName)
        .select('sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = maxOrderData && maxOrderData.length > 0 
        ? maxOrderData[0].sort_order + 1 
        : 1;

      console.log(`📋 [新增標籤] 下一個排序: ${nextOrder}`);

      // 新增標籤
      const { data, error } = await supabase
        .from(tableName)
        .insert([{
          user_id: userId,
          name,
          color: color || '#4169E1',
          icon: icon || '🏷️',
          sort_order: nextOrder,
          is_active: true
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ [新增標籤] Supabase 插入錯誤:', error);
        return res.status(500).json({ error: 'Database insert failed' });
      }
      
      console.log(`✅ [新增標籤] 標籤新增成功: ${data.name} (ID: ${data.id}, sort_order: ${data.sort_order})`);
      
      // 重新載入所有用戶標籤並記錄
      const updatedTags = await getUserTags(userId);
      console.log(`🔄 [新增標籤] 用戶現有標籤數量: ${updatedTags ? updatedTags.length : 0}`);
      if (updatedTags) {
        console.log(`📝 [新增標籤] 標籤列表:`, updatedTags.map(tag => `${tag.name}(${tag.sort_order})`));
      }
      
      res.status(201).json({ 
        newTag: data, 
        totalTags: updatedTags ? updatedTags.length : 0,
        allTags: updatedTags 
      });
    } else {
      // 沒有資料庫連線時返回模擬結果
      const newTag = {
        id: Date.now(),
        user_id: userId,
        name,
        color: color || '#4169E1',
        icon: icon || '🏷️',
        sort_order: orderIndex || 0,
        is_active: true
      };
      res.status(201).json(newTag);
    }
  } catch (err) {
    console.error('新增標籤錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 刪除標籤
app.delete('/api/tags/:tagId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const tagId = req.params.tagId;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🗑️ 使用者 ${userId} 刪除標籤: ${tagId}`);
    
    if (supabase) {
      const tablePrefix = process.env.TABLE_PREFIX || '';
      const tableName = tablePrefix + 'tags';
      
      // 軟刪除（設為不活躍）
      const { data, error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq('id', tagId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase 更新錯誤:', error);
        return res.status(500).json({ error: 'Database update failed' });
      }
      
      if (!data) {
        return res.status(404).json({ error: 'Tag not found' });
      }
      
      console.log('✅ 標籤刪除成功');
      res.json({ message: 'Tag deleted successfully' });
    } else {
      // 沒有資料庫連線時返回成功
      res.json({ message: 'Tag deleted successfully' });
    }
  } catch (err) {
    console.error('刪除標籤錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 取得使用者任務列表 API
app.get('/api/tasks', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🔍 [任務API] 取得使用者 ${userId} 的任務列表`);
    
    // 從記憶體獲取用戶任務
    const userTasks = userTaskStacks.get(userId) || [];
    
    console.log(`✅ [任務API] 成功回傳 ${userTasks.length} 個任務`);
    console.log(`📝 [任務API] 任務預覽:`, userTasks.slice(0, 3).map(task => task.text));
    
    res.json(userTasks);
  } catch (err) {
    console.error('❌ [任務API] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 收藏任務 API ====================

// 取得使用者收藏任務列表
app.get('/api/favorites', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`⭐ [收藏API] 取得使用者 ${userId} 的收藏任務`);
    
    // 從記憶體獲取用戶收藏任務
    const userFavorites = userFavoriteTasks.get(userId) || [];
    
    console.log(`✅ [收藏API] 成功回傳 ${userFavorites.length} 個收藏任務`);
    
    res.json(userFavorites);
  } catch (err) {
    console.error('❌ [收藏API] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 新增收藏任務
app.post('/api/favorites', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { name, description, category } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Missing task name' });
    }
    
    console.log(`⭐ [新增收藏] 用戶 ${userId} 新增收藏任務: ${name}`);
    
    // 創建新的收藏任務
    const newFavorite = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description ? description.trim() : '',
      category: category || '',
      used_count: 0,
      created_at: new Date().toISOString()
    };
    
    // 獲取用戶現有收藏任務
    let userFavorites = userFavoriteTasks.get(userId) || [];
    
    // 添加新收藏任務
    userFavorites.push(newFavorite);
    
    // 更新記憶體存儲
    userFavoriteTasks.set(userId, userFavorites);
    
    console.log(`✅ [新增收藏] 收藏任務新增成功，ID: ${newFavorite.id}`);
    
    res.json({ success: true, favorite: newFavorite });
  } catch (err) {
    console.error('❌ [新增收藏] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 使用收藏任務（將收藏任務加到任務列表）
app.post('/api/favorites/:id/use', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const favoriteId = req.params.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🔄 [使用收藏] 用戶 ${userId} 使用收藏任務 ID: ${favoriteId}`);
    
    // 獲取用戶收藏任務
    let userFavorites = userFavoriteTasks.get(userId) || [];
    
    // 找到指定的收藏任務
    const favoriteTask = userFavorites.find(fav => fav.id === favoriteId);
    
    if (!favoriteTask) {
      return res.status(404).json({ error: 'Favorite task not found' });
    }
    
    // 將收藏任務添加到任務列表
    const currentTasks = userTaskStacks.get(userId) || [];
    const newTask = {
      id: Date.now(),
      text: favoriteTask.name,
      timestamp: new Date().toISOString(),
      completed: false,
      fromFavorite: true
    };
    
    currentTasks.push(newTask);
    userTaskStacks.set(userId, currentTasks);
    
    // 更新收藏任務的使用次數
    favoriteTask.used_count = (favoriteTask.used_count || 0) + 1;
    userFavoriteTasks.set(userId, userFavorites);
    
    console.log(`✅ [使用收藏] 收藏任務已添加到任務列表: ${favoriteTask.name}`);
    
    res.json({ success: true, task: newTask });
  } catch (err) {
    console.error('❌ [使用收藏] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 刪除收藏任務
app.delete('/api/favorites/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const favoriteId = req.params.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🗑️ [刪除收藏] 用戶 ${userId} 刪除收藏任務 ID: ${favoriteId}`);
    
    // 獲取用戶收藏任務
    let userFavorites = userFavoriteTasks.get(userId) || [];
    
    // 過濾掉要刪除的收藏任務
    const updatedFavorites = userFavorites.filter(fav => fav.id !== favoriteId);
    
    if (updatedFavorites.length === userFavorites.length) {
      return res.status(404).json({ error: 'Favorite task not found' });
    }
    
    // 更新記憶體存儲
    userFavoriteTasks.set(userId, updatedFavorites);
    
    console.log(`✅ [刪除收藏] 收藏任務刪除成功`);
    
    res.json({ success: true });
  } catch (err) {
    console.error('❌ [刪除收藏] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 管理員 API ====================

app.post('/admin/create-tags-table', async (req, res) => {
  try {
    console.log('🔧 [管理員] 開始建立 dev_tags 表格...');
    
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase 客戶端未初始化' });
    }

    // 使用 SQL 建立表格
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS dev_tags (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#4ECDC4',
        icon TEXT DEFAULT '🏷️',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 執行 SQL（透過 Supabase RPC）
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: createTableSQL });
    
    if (error) {
      console.log('❌ [管理員] 建立表格失敗:', error);
      
      // 直接添加 5 個測試標籤到不存在的表格（強制建立）
      console.log('🔄 [管理員] 嘗試直接插入資料來建立表格...');
      
      const testTags = [
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1, is_active: true },
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: '學習', color: '#4ECDC4', icon: '📚', sort_order: 2, is_active: true },
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: '運動', color: '#45B7D1', icon: '🏃‍♂️', sort_order: 3, is_active: true },
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: 'AI', color: '#9B59B6', icon: '🤖', sort_order: 4, is_active: true },
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: '日本', color: '#E74C3C', icon: '🗾', sort_order: 5, is_active: true }
      ];

      for (const tag of testTags) {
        try {
          const { data: insertData, error: insertError } = await supabase
            .from('dev_tags')
            .insert(tag);
          
          if (insertError) {
            console.log(`❌ [管理員] 插入標籤失敗 ${tag.name}:`, insertError);
          } else {
            console.log(`✅ [管理員] 成功插入標籤: ${tag.name}`);
          }
        } catch (insertErr) {
          console.log(`💥 [管理員] 插入標籤異常 ${tag.name}:`, insertErr);
        }
      }
      
      return res.json({ 
        success: true, 
        message: '透過插入資料嘗試建立表格',
        sql_error: error 
      });
    } else {
      console.log('✅ [管理員] 表格建立成功');
      return res.json({ 
        success: true, 
        message: 'dev_tags 表格建立成功',
        data 
      });
    }
  } catch (err) {
    console.log('💥 [管理員] 建立表格異常:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== WEBHOOK 路由 ====================

app.post('/webhook', (req, res) => {
  // 簡化版本：跳過 LINE signature 驗證用於測試
  const timestamp = new Date().toISOString();
  console.log('\n=== WEBHOOK 接收到請求 ===');
  console.log(`⏰ 時間: ${timestamp}`);
  console.log('📥 完整請求 body:', JSON.stringify(req.body, null, 2));
  console.log('📊 事件數量:', req.body.events ? req.body.events.length : 0);
  
  if (!req.body.events) {
    console.log('⚠️ 沒有事件，直接返回');
    return res.status(200).json({ message: 'No events' });
  }
  
  // 詳細記錄每個事件
  req.body.events.forEach((event, index) => {
    console.log(`\n--- 事件 ${index + 1} ---`);
    console.log('📋 事件類型:', event.type);
    console.log('👤 來源:', event.source);
    if (event.message) {
      console.log('💬 訊息內容:', event.message);
    }
    if (event.postback) {
      console.log('🔄 Postback:', event.postback);
    }
  });
  
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => {
      console.log('\n✅ 所有事件處理完成:', result);
      console.log('=== WEBHOOK 處理結束 ===\n');
      res.status(200).json(result);
    })
    .catch((err) => {
      console.error('\n❌ 事件處理錯誤:', err);
      console.log('=== WEBHOOK 處理結束 (錯誤) ===\n');
      res.status(200).json({ error: 'Processing failed' });
    });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🤖 LINE Bot server running on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});