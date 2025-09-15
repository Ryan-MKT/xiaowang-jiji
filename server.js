// 載入環境變數（必須在最頂端）
require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const session = require('express-session');
const { supabase } = require('./supabase-client');
const { authenticateUser } = require('./auth');
const OpenAI = require('openai');
const fs = require('fs-extra');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');
const OenPaymentCorrect = require('./payment-correct');
const oenPayment = new OenPaymentCorrect();
const { subscriptionService } = require('./subscription-service');
// 動態載入模組以支援熱重載
function getTaskFlexModule() {
  const modulePath = require.resolve('./task-flex-message');
  console.log(`🔄 [MODULE RELOAD] 清除快取: ${modulePath}`);
  delete require.cache[modulePath];
  const module = require('./task-flex-message');
  console.log(`📦 [MODULE RELOAD] 重新載入模組完成`);
  return module;
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
const PORT = process.env.PORT || 3000;
console.log('🚀 小汪記記 with LINE Login starting - TAG FIXED VERSION 2025-09-11-15:50...');

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

// 靜態文件服務 - 支援直接訪問 HTML 檔案
app.use(express.static(__dirname));

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
      
      // 發送更新後的任務清單 (預設顯示主任務清單)
      const userTags = await getUserTags(userId);
      const { createMainTaskList } = getTaskFlexModule();
      const completedCount = userTasks.filter(task => task.completed).length;
      const favoriteCount = userTasks.filter(task => task.favorited).length;
      const updatedFlexMessage = createMainTaskList(userTasks, userTags, completedCount, favoriteCount);
      
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
    console.log(`🔍 [任務搜尋] 用戶 ${userId} 目前有 ${userTasks.length} 個任務`);
    console.log(`🔍 [任務搜尋] 任務ID清單:`, userTasks.map(task => `ID:${task.id}("${task.text}")`));
    console.log(`🔍 [任務搜尋] 要找的任務ID: ${taskId}`);
    
    // 找到對應的任務
    const taskIndex = userTasks.findIndex(task => task.id === taskId);
    console.log(`🔍 [任務搜尋] 找到的任務索引: ${taskIndex}`);
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
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('favorite_tasks')
            .insert([
              {
                user_id: userId,
                name: favoriteTask.text,
                description: '',
                category: '',
                used_count: 0
              }
            ])
            .select()
            .single();
          
          if (error) {
            console.error('❌ [收藏任務] Supabase 儲存錯誤:', error);
          } else {
            console.log(`✅ [收藏任務] 已儲存至 Supabase，ID: ${data.id}`);
          }
        } catch (dbError) {
          console.error('❌ [收藏任務] 資料庫連線錯誤:', dbError);
        }
      } else {
        // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
        console.log('⚠️ [收藏任務] Supabase 未連接，使用記憶體儲存');
        
        let userFavorites = userFavoriteTasks.get(userId) || [];
        const newFavorite = {
          id: Date.now().toString(),
          name: favoriteTask.text,
          description: '',
          category: '',
          tag: null, // 標籤將在用戶選擇後更新
          used_count: 0,
          created_at: new Date().toISOString(),
          source_task_id: taskId
        };
        
        userFavorites.push(newFavorite);
        userFavoriteTasks.set(userId, userFavorites);
      }
      
      console.log(`✅ 任務已收藏: ${favoriteTask.text}`);
      
      // 🔧 關鍵修復：無論是否有 client 都要設置標籤選擇狀態
      userTagSelectionStates.set(userId, {
        waitingForTag: true,
        targetTaskId: taskId,
        timestamp: Date.now()
      });
      console.log(`🏷️ [標籤選擇] 用戶 ${userId} 進入標籤選擇狀態，目標任務 ID: ${taskId}`);
      
      if (client) {
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

  // 檢查是否為展開標籤事件
  if (postbackData === 'expand_tags') {
    console.log(`🏷️ 用戶 ${userId} 點擊展開標籤`);

    // 取得用戶任務和標籤資料
    const userTasks = userTaskStacks.get(userId) || [];
    const userTags = await getUserTags(userId);
    const completedCount = userTasks.filter(task => task.completed).length;
    const favoriteCount = userTasks.filter(task => task.favorited).length;

    // 使用動態標籤輪播 FLEX Message
    const { createDynamicTagCarousel } = getTaskFlexModule();
    const tagCarouselMessage = createDynamicTagCarousel(userTasks, userTags, completedCount, favoriteCount);

    if (client) {
      return client.replyMessage(event.replyToken, tagCarouselMessage);
    } else {
      console.log('測試模式：展開標籤輪播訊息', JSON.stringify(tagCarouselMessage, null, 2));
      return Promise.resolve(null);
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

// 語音轉文字處理函數
async function processAudioMessage(event) {
  console.log('🎤 [語音處理] 開始處理語音訊息');
  
  try {
    // 獲取語音訊息 ID
    const messageId = event.message.id;
    const userId = event.source.userId;
    
    console.log(`🎤 [語音處理] 訊息ID: ${messageId}, 使用者ID: ${userId}`);
    
    // 從 LINE API 下載語音檔案
    const audioBuffer = await client.getMessageContent(messageId);
    
    // 建立暫存檔案路徑
    const tempDir = path.join(__dirname, 'temp');
    await fs.ensureDir(tempDir);
    const tempFilePath = path.join(tempDir, `voice_${messageId}.m4a`);
    
    console.log(`🎤 [語音處理] 暫存檔案路徑: ${tempFilePath}`);
    
    // 將音頻資料寫入暫存檔案
    const chunks = [];
    for await (const chunk of audioBuffer) {
      chunks.push(chunk);
    }
    const audioData = Buffer.concat(chunks);
    await fs.writeFile(tempFilePath, audioData);
    
    console.log(`🎤 [語音處理] 音頻檔案已儲存，大小: ${audioData.length} bytes`);
    
    // 使用 OpenAI Whisper API 進行語音轉文字
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-testing') {
      throw new Error('OpenAI API Key 未設定');
    }
    
    console.log('🎤 [語音處理] 正在呼叫 OpenAI Whisper API...');
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'zh',  // 指定中文
      prompt: '請使用繁體中文輸出。'  // 提示使用繁體中文
    });
    
    let transcribedText = transcription.text;
    console.log(`🎤 [語音處理] 原始轉換結果: "${transcribedText}"`);
    
    // 如果需要，使用 OpenAI API 將簡體中文轉換為繁體中文
    if (transcribedText && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key-for-testing') {
      try {
        const conversionResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "請將以下文字轉換為繁體中文，保持原意不變，只輸出轉換後的文字，不要添加任何解釋或額外內容。"
            },
            {
              role: "user",
              content: transcribedText
            }
          ],
          max_tokens: 500,
          temperature: 0
        });
        
        const convertedText = conversionResponse.choices[0].message.content.trim();
        if (convertedText && convertedText !== transcribedText) {
          console.log(`🔄 [繁體轉換] 簡體: "${transcribedText}" → 繁體: "${convertedText}"`);
          transcribedText = convertedText;
        }
      } catch (conversionError) {
        console.warn('⚠️ [繁體轉換] 轉換失敗，使用原始結果:', conversionError.message);
      }
    }
    
    console.log(`🎤 [語音處理] 最終轉換結果: "${transcribedText}"`);
    
    // 清理暫存檔案
    try {
      await fs.remove(tempFilePath);
      console.log('🎤 [語音處理] 暫存檔案已清理');
    } catch (cleanupError) {
      console.warn('🎤 [語音處理] 清理暫存檔案失敗:', cleanupError.message);
    }
    
    return transcribedText;
    
  } catch (error) {
    console.error('❌ [語音處理] 處理失敗:', error);
    
    // 嘗試清理可能的暫存檔案
    try {
      const messageId = event.message.id;
      const tempFilePath = path.join(__dirname, 'temp', `voice_${messageId}.m4a`);
      await fs.remove(tempFilePath);
    } catch (cleanupError) {
      // 忽略清理錯誤
    }
    
    throw error;
  }
}

// 處理 LINE 事件
async function handleEvent(event) {
  console.log('Received event:', event);
  
  // 處理 postback 事件（任務完成）
  if (event.type === 'postback') {
    return handlePostback(event);
  }
  
  // 只處理訊息事件
  if (event.type !== 'message') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  let userMessage = '';
  let isVoiceMessage = false;

  // 處理不同類型的訊息
  if (event.message.type === 'text') {
    // 文字訊息
    userMessage = event.message.text;
    console.log('📝 [訊息類型] 文字訊息');
  } else if (event.message.type === 'audio') {
    // 語音訊息
    console.log('🎤 [訊息類型] 語音訊息');
    isVoiceMessage = true;
    
    try {
      // 處理語音轉文字
      userMessage = await processAudioMessage(event);
      console.log(`🎤 [語音轉文字] 成功轉換: "${userMessage}"`);
    } catch (error) {
      console.error('❌ [語音轉文字] 轉換失敗:', error);
      
      // 回覆錯誤訊息給使用者
      const errorReply = {
        type: 'text',
        text: '抱歉，語音轉文字功能暫時無法使用，請嘗試發送文字訊息。'
      };
      
      return client.replyMessage(event.replyToken, errorReply);
    }
  } else {
    // 其他類型訊息不處理
    console.log(`⚠️ [訊息類型] 不支援的訊息類型: ${event.message.type}`);
    return Promise.resolve(null);
  }
  
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

  // 嘗試儲存到 Supabase - 加入標籤資訊
  if (supabase) {
    try {
      const tablePrefix = process.env.TABLE_PREFIX || '';
      const tableName = tablePrefix + 'messages';
      
      // 檢測是否為標籤選擇或任務包含標籤資訊
      let detectedTag = null;
      
      // 檢查用戶是否正在等待標籤選擇
      const tagSelectionState = userTagSelectionStates.get(userId);
      if (tagSelectionState && tagSelectionState.waitingForTag) {
        detectedTag = cleanedMessage; // 用戶回覆的就是標籤
      } 
      // 檢查任務文字是否包含標籤格式 (標籤)任務內容
      else if (cleanedMessage.match(/^\((.+?)\)/)) {
        const tagMatch = cleanedMessage.match(/^\((.+?)\)/);
        detectedTag = tagMatch[1];
      }
      
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
        console.log('✅ 訊息已儲存到 Supabase:', { 
          userId, 
          userMessage: cleanedMessage, 
          tag: detectedTag || '無標籤' 
        });
      }
    } catch (err) {
      console.error('資料庫連線錯誤:', err);
    }
  } else {
    console.log('📝 訊息記錄 (資料庫未連接):', userId, '-', cleanedMessage);
  }

  // 特殊指令：收藏任務
  if (userMessage.startsWith('收藏任務_')) {
    const taskId = parseInt(userMessage.replace('收藏任務_', ''));
    console.log(`⭐ 用戶 ${userId} 點擊收藏任務 ID: ${taskId}`);
    
    // 建立模擬的 postback 事件
    const mockPostbackEvent = {
      type: 'postback',
      postback: { data: `favorite_task_${taskId}` },
      source: { userId: userId },
      replyToken: event.replyToken
    };
    
    return handlePostback(mockPostbackEvent);
  }
  
  // 特殊指令：完成任務
  if (userMessage.startsWith('完成任務_')) {
    const taskId = parseInt(userMessage.replace('完成任務_', ''));
    console.log(`✅ 用戶 ${userId} 點擊完成任務 ID: ${taskId}`);
    
    // 建立模擬的 postback 事件
    const mockPostbackEvent = {
      type: 'postback',
      postback: { data: `complete_task_${taskId}` },
      source: { userId: userId },
      replyToken: event.replyToken
    };
    
    return handlePostback(mockPostbackEvent);
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
        
        // 重新生成任務堆疊 Flex Message (預設顯示主任務清單)
        const userTags = await getUserTags(userId);
        const { createMainTaskList } = getTaskFlexModule();
        const completedCount = cleanedTasks.filter(task => task.completed).length;
        const favoriteCount = cleanedTasks.filter(task => task.favorited).length;
        const taskStackFlexMessage = createMainTaskList(cleanedTasks, userTags, completedCount, favoriteCount);
        
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
          const { createMainTaskList } = getTaskFlexModule();
          const completedCount = userTasks.filter(task => task.completed).length;
          const favoriteCount = userTasks.filter(task => task.favorited).length;
          const taskStackFlexMessage = createMainTaskList(userTasks, userTags, completedCount, favoriteCount);
          
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
        // 重新生成任務堆疊 Flex Message (預設顯示主任務清單)
        const userTags = await getUserTags(userId);
        const { createMainTaskList } = getTaskFlexModule();
        const completedCount = userTasks.filter(task => task.completed).length;
        const favoriteCount = userTasks.filter(task => task.favorited).length;
        const taskStackFlexMessage = createMainTaskList(userTasks, userTags, completedCount, favoriteCount);
        
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
      
      // 🔧 關鍵修復：在修改前先保存原始名稱
      const originalTaskText = originalTask.text;
      
      // 更新任務文字格式為 (標籤)原文字
      const taggedText = `(${userMessage})${originalTaskText}`;
      userTasks[taskIndex].text = taggedText;
      userTaskStacks.set(userId, userTasks);
      
      console.log(`✅ 任務已標記: ${originalTaskText} -> ${taggedText}`);
      console.log(`🔍 [標籤流程] 用戶選擇標籤: ${userMessage}`);
      console.log(`🔍 [標籤流程] 原任務已收藏: ${originalTask.favorited}`);
      
      // 同步更新收藏任務中的名稱和標籤（如果該任務已被收藏）
      if (originalTask.favorited) {
        console.log(`🚀 [標籤流程] 開始更新收藏任務的標籤...`);
        // 更新 Supabase 中的收藏記錄
        if (supabase) {
          try {
            // 🔧 關鍵修復：同時更新 name 和 tag 在同一個 SQL 操作中
            console.log(`🔍 [標籤更新] 使用表格: favorite_tasks`);
            console.log(`🔍 [標籤更新] 更新條件 - 用戶ID: ${userId}, 原任務名稱: ${originalTaskText}`);
            console.log(`🔍 [標籤更新] 新任務名稱: ${taggedText}, 標籤: ${userMessage}`);
            
            const { error: updateError } = await supabase
              .from('favorite_tasks')
              .update({
                name: taggedText,
                tag: userMessage,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
              .eq('name', originalTaskText);

            if (updateError) {
              console.error('❌ [標籤更新] 更新失敗:', updateError);
            } else {
              console.log(`✅ [標籤更新] 任務名稱和標籤已成功更新: ${taggedText} -> 標籤: ${userMessage}`);
            }
          } catch (dbError) {
            console.error('❌ [標籤更新] 資料庫連線錯誤:', dbError);
          }
        }
        
        // 更新記憶體儲存
        let userFavorites = userFavoriteTasks.get(userId) || [];
        const favoriteIndex = userFavorites.findIndex(fav => fav.source_task_id === originalTask.id);
        if (favoriteIndex !== -1) {
          userFavorites[favoriteIndex].name = taggedText;
          userFavorites[favoriteIndex].tag = userMessage;
          userFavoriteTasks.set(userId, userFavorites);
          console.log(`🔄 記憶體收藏任務同步更新: ${taggedText}, 標籤: ${userMessage}`);
        }
      }
      
      // 重新生成任務堆疊 Flex Message (預設顯示主任務清單)
      const userTags = await getUserTags(userId);
      const { createMainTaskList } = getTaskFlexModule();
      const completedCount = userTasks.filter(task => task.completed).length;
      const favoriteCount = userTasks.filter(task => task.favorited).length;
      const updatedFlexMessage = createMainTaskList(userTasks, userTags, completedCount, favoriteCount);
      
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
    
    // 為語音訊息添加特殊前綴
    let finalResponse = aiResponse;
    if (isVoiceMessage) {
      finalResponse = `🎤 語音轉文字: "${userMessage}"\n\n${aiResponse}`;
    }
    
    const replyMessage = {
      type: 'text',
      text: finalResponse
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
      timestamp: new Date().toISOString(),
      note: '' // 備註欄位初始化為空字串
    };
    
    console.log(`🆔 [任務ID] 新任務已生成，ID: ${newTask.id}, 內容: "${newTask.text}"`);
    
    userTasks.push(newTask);
    userTaskStacks.set(userId, userTasks);
    
    console.log(`📋 [任務同步] 用戶 ${userId} 目前任務數量: ${userTasks.length}`);
    console.log('📝 [任務同步] 任務清單:', userTasks.map((task, index) => `${index + 1}. ${task.text}`));
    
    // 🔄 同步到 localStorage - 讓 FLEX MESSAGE 與全部記錄頁面保持同步
    console.log('🔄 [任務同步] 同步任務到 localStorage 以保持與全部記錄頁面一致');
    
    // 創建包含所有任務的 Flex Message (預設顯示主任務清單，包含展開標籤按鈕)
    const userTags = await getUserTags(userId);
    const { createMainTaskList } = getTaskFlexModule();

    // 計算統計資料
    const completedCount = userTasks.filter(task => task.completed).length;
    const favoriteCount = userTasks.filter(task => task.favorited).length;

    console.log('🚨 [SERVER DEBUG] 準備調用 createMainTaskList');
    const flexMessage = createMainTaskList(userTasks, userTags, completedCount, favoriteCount);
    console.log('✅ [SERVER DEBUG] createMainTaskList 調用完成');
    
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
      console.log('🚀 [FLEX SEND] 開始發送 3頁輪播 FLEX MESSAGE 到 LINE...');
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

// 帳戶頁面路由
app.get('/liff/account', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    let html = fs.readFileSync(path.join(__dirname, 'liff-account.html'), 'utf8');
    
    // 進行 LIFF ID 動態替換
    const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
    html = html.replace(/liffId: '[^']*'/, `liffId: '${liffId}'`);
    
    console.log(`👤 [帳戶頁面] 使用 LIFF ID: ${liffId}`);
    console.log(`🔗 [帳戶頁面] URL 參數:`, req.url);
    
    // 強制不緩存
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(html);
  } catch (error) {
    console.error('讀取帳戶頁面錯誤:', error);
    res.status(500).send('帳戶頁面載入失敗');
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
// 任務切換完成狀態 API
app.post('/api/tasks/toggle', async (req, res) => {
  try {
    const { taskId, userId } = req.body;

    if (!taskId || !userId) {
      return res.status(400).json({ error: 'Missing taskId or userId' });
    }

    console.log(`🔄 [Toggle Task] 用戶 ${userId} 切換任務 ${taskId} 狀態`);

    // 從記憶體中獲取用戶任務
    const userTasks = userTaskStacks.get(userId) || [];
    const taskIndex = userTasks.findIndex(task => task.id == taskId);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 切換任務完成狀態
    const task = userTasks[taskIndex];
    task.completed = !task.completed;
    task.updatedAt = new Date().toISOString();

    // 更新記憶體中的任務
    userTaskStacks.set(userId, userTasks);

    // 注意：此系統使用記憶體儲存任務，不依賴資料庫中的 tasks 表
    // 任務資料已經在記憶體中更新，無需額外的資料庫操作
    console.log('ℹ️ [Toggle Task] 系統使用記憶體儲存，任務已在 userTaskStacks 中更新');

    console.log(`✅ [Toggle Task] 任務 ${taskId} 狀態已更新: ${task.completed ? '完成' : '未完成'}`);

    res.json({
      success: true,
      taskId: taskId,
      completed: task.completed,
      message: task.completed ? '任務已完成！' : '任務已取消完成'
    });

  } catch (error) {
    console.error('❌ [Toggle Task] API 錯誤:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
    const dateFilter = req.query.date; // 新增：取得日期查詢參數

    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    console.log(`🔍 [任務API] 取得使用者 ${userId} 的任務列表${dateFilter ? ` (日期: ${dateFilter})` : ''}`);

    // 從記憶體獲取用戶任務
    let userTasks = userTaskStacks.get(userId) || [];

    // 如果記憶體中沒有任務，嘗試從資料庫載入歷史任務
    if (userTasks.length === 0 && supabase) {
      try {
        console.log('🔄 [任務API] 記憶體中無任務，從資料庫載入歷史訊息...');

        const { data: messages, error } = await supabase
          .from('dev_messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (!error && messages && messages.length > 0) {
          // 將歷史訊息轉換為任務格式
          userTasks = messages.map((msg, index) => ({
            id: msg.id || Date.now() + index,
            text: msg.message_text,
            completed: false, // 預設為未完成
            timestamp: msg.created_at,
            userId: userId,
            favorited: false,
            tag: msg.tag || null
          }));

          // 載入到記憶體中
          userTaskStacks.set(userId, userTasks);
          console.log(`✅ [任務API] 從資料庫載入 ${userTasks.length} 個歷史任務到記憶體`);
        }
      } catch (dbError) {
        console.error('❌ [任務API] 從資料庫載入任務失敗:', dbError);
      }
    }

    // 新增：如果有日期篩選參數，過濾任務
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const filterDateString = filterDate.toISOString().split('T')[0]; // YYYY-MM-DD 格式

      userTasks = userTasks.filter(task => {
        if (!task.timestamp) return false;

        // 處理時間戳格式，確保比較的是同一天
        const taskDate = new Date(task.timestamp);
        const taskDateString = taskDate.toISOString().split('T')[0];

        const isMatch = taskDateString === filterDateString;

        if (isMatch) {
          console.log(`📅 [日期篩選] 匹配任務: ${task.text} (${taskDateString})`);
        }

        return isMatch;
      });

      console.log(`📅 [日期篩選] 篩選日期 ${dateFilter}: 找到 ${userTasks.length} 個任務`);
    }

    console.log(`✅ [任務API] 成功回傳 ${userTasks.length} 個任務`);
    if (userTasks.length > 0) {
      console.log(`📝 [任務API] 任務預覽:`, userTasks.slice(0, 3).map(task => task.text));
    }

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
    
    // 使用 Supabase 查詢收藏任務
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('favorite_tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ [收藏API] Supabase 查詢錯誤:', error);
          return res.status(500).json({ error: 'Database error' });
        }
        
        // 格式化數據以保持相容性
        const formattedFavorites = data.map(item => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description,
          category: item.category,
          tag: item.tag,
          used_count: item.used_count,
          created_at: item.created_at
        }));
        
        console.log(`✅ [收藏API] 成功回傳 ${formattedFavorites.length} 個收藏任務（從 Supabase）`);
        console.log('🔍 [收藏API] 回傳資料樣本:', formattedFavorites.slice(0, 2));
        res.json(formattedFavorites);
      } catch (dbError) {
        console.error('❌ [收藏API] 資料庫連線錯誤:', dbError);
        return res.status(500).json({ error: 'Database connection error' });
      }
    } else {
      // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
      console.log('⚠️ [收藏API] Supabase 未連接，使用記憶體儲存');
      const userFavorites = userFavoriteTasks.get(userId) || [];
      console.log(`✅ [收藏API] 成功回傳 ${userFavorites.length} 個收藏任務（從記憶體）`);
      res.json(userFavorites);
    }
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
    
    // 使用 Supabase 儲存收藏任務
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('favorite_tasks')
          .insert([
            {
              user_id: userId,
              name: name.trim(),
              description: description ? description.trim() : '',
              category: category || '',
              used_count: 0
            }
          ])
          .select()
          .single();
        
        if (error) {
          console.error('❌ [新增收藏] Supabase 儲存錯誤:', error);
          return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`✅ [新增收藏] 收藏任務新增成功，ID: ${data.id}`);
        
        // 格式化返回數據以保持相容性
        const formattedFavorite = {
          id: data.id.toString(),
          name: data.name,
          description: data.description,
          category: data.category,
          used_count: data.used_count,
          created_at: data.created_at
        };
        
        res.json({ success: true, favorite: formattedFavorite });
      } catch (dbError) {
        console.error('❌ [新增收藏] 資料庫連線錯誤:', dbError);
        return res.status(500).json({ error: 'Database connection error' });
      }
    } else {
      // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
      console.log('⚠️ [新增收藏] Supabase 未連接，使用記憶體儲存');
      
      const newFavorite = {
        id: Date.now().toString(),
        name: name.trim(),
        description: description ? description.trim() : '',
        category: category || '',
        used_count: 0,
        created_at: new Date().toISOString()
      };
      
      let userFavorites = userFavoriteTasks.get(userId) || [];
      userFavorites.push(newFavorite);
      userFavoriteTasks.set(userId, userFavorites);
      
      console.log(`✅ [新增收藏] 收藏任務新增成功（記憶體），ID: ${newFavorite.id}`);
      res.json({ success: true, favorite: newFavorite });
    }
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
    
    let favoriteTask = null;
    
    // 使用 Supabase 查詢和更新收藏任務
    if (supabase) {
      try {
        // 先查詢收藏任務
        const { data: queryData, error: queryError } = await supabase
          .from('favorite_tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('id', parseInt(favoriteId))
          .single();
        
        if (queryError || !queryData) {
          console.error('❌ [使用收藏] 查詢錯誤:', queryError);
          return res.status(404).json({ error: 'Favorite task not found' });
        }
        
        favoriteTask = queryData;
        
        // 更新使用次數
        const { data: updateData, error: updateError } = await supabase
          .from('favorite_tasks')
          .update({ used_count: (favoriteTask.used_count || 0) + 1 })
          .eq('user_id', userId)
          .eq('id', parseInt(favoriteId))
          .select();
        
        if (updateError) {
          console.error('❌ [使用收藏] 更新使用次數錯誤:', updateError);
        } else {
          console.log(`✅ [使用收藏] 使用次數已更新（從 Supabase）`);
        }
      } catch (dbError) {
        console.error('❌ [使用收藏] 資料庫連線錯誤:', dbError);
        return res.status(500).json({ error: 'Database connection error' });
      }
    } else {
      // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
      console.log('⚠️ [使用收藏] Supabase 未連接，使用記憶體儲存');
      
      let userFavorites = userFavoriteTasks.get(userId) || [];
      favoriteTask = userFavorites.find(fav => fav.id === favoriteId);
      
      if (!favoriteTask) {
        return res.status(404).json({ error: 'Favorite task not found' });
      }
      
      // 更新使用次數
      favoriteTask.used_count = (favoriteTask.used_count || 0) + 1;
      userFavoriteTasks.set(userId, userFavorites);
    }
    
    // 將收藏任務添加到任務列表
    const currentTasks = userTaskStacks.get(userId) || [];
    const newTask = {
      id: Date.now(),
      text: favoriteTask.name,
      timestamp: new Date().toISOString(),
      completed: false,
      fromFavorite: true,
      note: '' // 備註欄位初始化為空字串
    };
    
    currentTasks.push(newTask);
    userTaskStacks.set(userId, currentTasks);
    
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
    
    // 使用 Supabase 刪除收藏任務
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('favorite_tasks')
          .delete()
          .eq('user_id', userId)
          .eq('id', parseInt(favoriteId))
          .select();
        
        if (error) {
          console.error('❌ [刪除收藏] Supabase 刪除錯誤:', error);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!data || data.length === 0) {
          return res.status(404).json({ error: 'Favorite task not found' });
        }
        
        console.log(`✅ [刪除收藏] 收藏任務刪除成功（從 Supabase）`);
      } catch (dbError) {
        console.error('❌ [刪除收藏] 資料庫連線錯誤:', dbError);
        return res.status(500).json({ error: 'Database connection error' });
      }
    } else {
      // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
      console.log('⚠️ [刪除收藏] Supabase 未連接，使用記憶體儲存');
      
      let userFavorites = userFavoriteTasks.get(userId) || [];
      const updatedFavorites = userFavorites.filter(fav => fav.id !== favoriteId);
      
      if (updatedFavorites.length === userFavorites.length) {
        return res.status(404).json({ error: 'Favorite task not found' });
      }
      
      userFavoriteTasks.set(userId, updatedFavorites);
      console.log(`✅ [刪除收藏] 收藏任務刪除成功（從記憶體）`);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('❌ [刪除收藏] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 任務備註 API ====================

// 取得任務備註
app.get('/api/task-note/:taskId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const taskId = req.params.taskId;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`📝 [取得備註] 用戶 ${userId} 取得任務 ${taskId} 的備註`);
    
    // 從記憶體中的任務堆疊尋找對應的任務並取得備註
    const userTasks = userTaskStacks.get(userId) || [];
    const task = userTasks.find(t => t.id.toString() === taskId.toString());
    
    if (task && task.note) {
      console.log(`✅ [取得備註] 找到備註: ${task.note}`);
      res.json({ note: task.note });
    } else {
      console.log(`📝 [取得備註] 任務 ${taskId} 沒有備註`);
      res.json({ note: '' });
    }
    
  } catch (err) {
    console.error('❌ [取得備註] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 儲存任務備註
app.post('/api/task-note', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { taskId, taskText, note } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    if (!taskId) {
      return res.status(400).json({ error: 'Missing task ID' });
    }
    
    console.log(`💾 [儲存備註] 用戶 ${userId} 儲存任務 ${taskId} 的備註: ${note}`);
    
    // 從記憶體中的任務堆疊尋找對應的任務並更新備註
    const userTasks = userTaskStacks.get(userId) || [];
    const taskIndex = userTasks.findIndex(t => t.id.toString() === taskId.toString());

    if (taskIndex !== -1) {
      // 更新現有任務的備註
      userTasks[taskIndex].note = note.trim();
      userTaskStacks.set(userId, userTasks);
      console.log(`✅ [儲存備註] 任務 ${taskId} 備註已更新`);
    } else {
      // 任務不存在，自動創建新任務
      console.log(`⚠️ [儲存備註] 任務 ${taskId} 不存在，自動創建新任務`);

      const newTask = {
        id: parseInt(taskId),
        text: taskText || '未命名任務',
        note: note.trim(),
        completed: false,
        favorited: false,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      userTasks.push(newTask);
      userTaskStacks.set(userId, userTasks);
      console.log(`✅ [儲存備註] 已自動創建並儲存任務 ${taskId} 的備註`);
    }
    
    res.json({ success: true, note: note.trim() });
    
  } catch (err) {
    console.error('❌ [儲存備註] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 儲存任務完整資料
app.post('/api/save-task', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { taskId, title, note, tag, date, reminder, repeat } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    if (!taskId || !title) {
      return res.status(400).json({ error: 'Missing required fields: taskId and title' });
    }

    console.log(`💾 [儲存任務] 用戶 ${userId} 儲存任務 ${taskId}:`, { title, note, tag, date, reminder, repeat });

    // 從記憶體中的任務堆疊尋找對應的任務並更新
    const userTasks = userTaskStacks.get(userId) || [];
    const taskIndex = userTasks.findIndex(t => t.id.toString() === taskId.toString());

    if (taskIndex !== -1) {
      // 更新現有任務的所有資料
      userTasks[taskIndex] = {
        ...userTasks[taskIndex],
        text: title,
        note: note || '',
        tag: tag || null,
        date: date || null,
        reminder: reminder || null,
        repeat: repeat || null,
        updated_at: new Date().toISOString()
      };

      userTaskStacks.set(userId, userTasks);
      console.log(`✅ [儲存任務] 任務 ${taskId} 已成功更新`);

      res.json({
        success: true,
        task: userTasks[taskIndex],
        message: '任務已成功儲存並同步更新到 TODO LIST'
      });
    } else {
      // 任務不存在，自動創建新任務
      console.log(`⚠️ [儲存任務] 任務 ${taskId} 不存在，自動創建新任務`);

      const newTask = {
        id: parseInt(taskId),
        text: title,
        note: note || '',
        tag: tag || null,
        date: date || null,
        reminder: reminder || null,
        repeat: repeat || null,
        completed: false,
        favorited: false,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      userTasks.push(newTask);
      userTaskStacks.set(userId, userTasks);

      console.log(`✅ [儲存任務] 已自動創建並儲存任務 ${taskId}: "${title}"`);

      res.json({
        success: true,
        task: newTask,
        message: '任務已成功創建並儲存到 TODO LIST'
      });
    }

  } catch (err) {
    console.error('❌ [儲存任務] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 刪除任務
app.delete('/api/delete-task/:taskId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const taskId = req.params.taskId;

    if (!userId || !taskId) {
      return res.status(400).json({ error: 'Missing required fields: userId and taskId' });
    }

    console.log(`🗑️ [刪除任務] 用戶 ${userId} 刪除任務 ${taskId}`);

    // 1. 從記憶體中的任務堆疊中移除任務
    const userTasks = userTaskStacks.get(userId) || [];
    const taskIndex = userTasks.findIndex(t => t.id.toString() === taskId.toString());

    let deletedTask = null;
    if (taskIndex !== -1) {
      deletedTask = userTasks[taskIndex];
      userTasks.splice(taskIndex, 1);
      userTaskStacks.set(userId, userTasks);
      console.log(`✅ [刪除任務] 已從記憶體中刪除任務 ${taskId}: "${deletedTask.text}"`);
    } else {
      console.log(`⚠️ [刪除任務] 任務 ${taskId} 在記憶體中不存在`);
    }

    // 2. 從 Supabase 資料庫中刪除任務（如果存在的話）
    if (supabase) {
      try {
        const tablePrefix = process.env.TABLE_PREFIX || '';
        const { error: deleteError } = await supabase
          .from(`${tablePrefix}tasks`)
          .delete()
          .eq('id', parseInt(taskId))
          .eq('user_id', userId);

        if (deleteError) {
          console.error('⚠️ [刪除任務] Supabase 刪除錯誤:', deleteError);
          // 不阻止操作，因為記憶體已經刪除成功
        } else {
          console.log(`✅ [刪除任務] 已從 Supabase 刪除任務 ${taskId}`);
        }
      } catch (supabaseError) {
        console.error('⚠️ [刪除任務] Supabase 操作失敗:', supabaseError);
        // 不阻止操作，因為記憶體已經刪除成功
      }
    }

    // 3. 返回成功響應
    res.json({
      success: true,
      message: '任務已成功刪除並同步更新到 TODO LIST',
      deletedTask: deletedTask,
      remainingTasksCount: userTasks.length
    });

  } catch (err) {
    console.error('❌ [刪除任務] 錯誤:', err);
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

// Webhook GET 端點 - 供 LINE 驗證使用
app.get('/webhook', (req, res) => {
  console.log('🔍 [Webhook GET] LINE 驗證請求');
  res.status(200).send('OK');
});

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

// 新增 API：從 Supabase 查詢訊息記錄（支援日期篩選）
app.get('/api/messages', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const dateFilter = req.query.date; // YYYY-MM-DD 格式
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    console.log(`🔍 [訊息API] 查詢使用者 ${userId} 的訊息記錄${dateFilter ? ` (日期: ${dateFilter})` : ''}`);
    
    let query = supabase
      .from('dev_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // 如果有日期篩選，加入日期條件
    if (dateFilter) {
      const startDate = `${dateFilter}T00:00:00.000Z`;
      const endDate = `${dateFilter}T23:59:59.999Z`;
      
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ [訊息API] Supabase 查詢錯誤:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // 轉換格式以符合前端預期
    const formattedMessages = data.map(msg => ({
      text: msg.message_text,
      timestamp: msg.created_at,
      completed: false, // 訊息記錄預設為未完成狀態
      id: msg.id
    }));
    
    console.log(`✅ [訊息API] 成功回傳 ${formattedMessages.length} 筆訊息記錄`);
    console.log(`📝 [訊息API] 訊息預覽:`, formattedMessages.slice(0, 3).map(msg => msg.text));
    
    res.json(formattedMessages);
    
  } catch (err) {
    console.error('❌ [訊息API] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === 支付 API 端點 ===

// 訂閱狀態查詢 API
app.post('/api/subscription/status', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: '缺少用戶 ID' });
        }
        
        console.log(`📋 [訂閱API] 查詢用戶訂閱狀態: ${userId}`);
        
        const subscription = await subscriptionService.getUserSubscription(userId);
        
        console.log(`✅ [訂閱API] 返回訂閱狀態:`, {
            type: subscription.subscription_type,
            status: subscription.status,
            expires: subscription.expires_at
        });
        
        res.json(subscription);
        
    } catch (error) {
        console.error('❌ [訂閱API] 查詢訂閱狀態失敗:', error);
        res.status(500).json({ error: '查詢訂閱狀態失敗' });
    }
});

// 創建支付訂單
app.post('/api/payment/create', async (req, res) => {
  try {
    const { userId, userName, amount, itemName, description } = req.body;
    
    console.log('💳 [付款API] 收到建立訂單請求:', { userId, amount, itemName });
    
    // 驗證必要欄位
    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        error: '缺少必要欄位：userId 和 amount'
      });
    }
    
    // 建立支付訂單
    const orderResult = await oenPayment.createPaymentOrder({
      userId,
      userName: userName || '小汪記記用戶',
      amount: parseInt(amount),
      itemName: itemName || '小汪記記 - 訂閱升級',
      description: description || '解鎖進階功能，享受更好的記事體驗'
    });
    
    console.log('✅ [付款API] 訂單建立成功:', orderResult.orderId);
    
    res.json({
      success: true,
      orderId: orderResult.orderId,
      paymentUrl: orderResult.paymentUrl
    });
    
  } catch (error) {
    console.error('❌ [付款API] 建立訂單失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 處理付款回調
app.post('/payment/callback', async (req, res) => {
  try {
    console.log('📞 [付款回調] 收到 Oen Payment 回調:', req.body);
    
    // 處理付款結果
    const paymentResult = oenPayment.processWebhook(req.body);
    
    if (paymentResult.success) {
      console.log('🎉 [付款成功] 訂單支付成功:', paymentResult.orderId);
      
      // 自動更新用戶訂閱狀態
      try {
        const subscriptionResult = await subscriptionService.processSuccessfulPayment(paymentResult);
        console.log('✅ [訂閱更新] 用戶訂閱已自動更新:', {
          userId: subscriptionResult.userId,
          type: subscriptionResult.subscription_type,
          status: subscriptionResult.status,
          expiresAt: subscriptionResult.expires_at
        });
      } catch (subscriptionError) {
        console.error('❌ [訂閱更新] 自動更新訂閱失敗:', subscriptionError.message);
        // 付款成功但訂閱更新失敗，需要手動處理
      }
      
    } else {
      console.log('❌ [付款失敗] 訂單支付失敗:', paymentResult.orderId);
    }
    
    // 返回成功回應給 Oen Payment
    res.send('OK');
    
  } catch (error) {
    console.error('❌ [付款回調] 處理回調失敗:', error);
    res.status(400).send('ERROR');
  }
});

// Token Webhook 處理端點
app.post('/api/payment/token-webhook', async (req, res) => {
  try {
    console.log('📞 [Token Webhook] 收到 Oen Payment Token 回調:', req.body);
    
    const webhookData = req.body;
    
    // 驗證是否為 Token 相關回調
    if (webhookData.purpose === 'token' && webhookData.success) {
      console.log('🎫 [Token Webhook] Token 綁卡成功:', {
        token: webhookData.token,
        transactionId: webhookData.transactionId,
        customId: webhookData.customId
      });
      
      // 處理 customId 中的用戶資訊
      try {
        const customData = JSON.parse(webhookData.customId);
        console.log('👤 [Token Webhook] 用戶資訊:', customData);
        
        // TODO: 將 Token 儲存到資料庫，與用戶 ID 關聯
        // 這裡可以儲存 Token 供後續交易使用
        
        console.log('✅ [Token Webhook] Token 處理完成');
      } catch (parseError) {
        console.error('❌ [Token Webhook] customId 解析失敗:', parseError);
      }
      
    } else {
      console.log('❌ [Token Webhook] Token 綁卡失敗或非 Token 回調');
    }
    
    // 返回成功回應給 Oen Payment
    res.json({ success: true, message: 'Token webhook processed' });
    
  } catch (error) {
    console.error('❌ [Token Webhook] 處理 Token 回調失敗:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Token 成功頁面
app.get('/payment/token-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>綁卡成功 - 小汪記記</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                margin: 0; 
                padding: 20px; 
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { 
                background: white; 
                padding: 40px; 
                border-radius: 15px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
                width: 100%;
            }
            .success-icon { 
                font-size: 64px; 
                color: #28a745; 
                margin-bottom: 20px;
            }
            h1 { 
                color: #28a745; 
                margin-bottom: 20px;
                font-size: 28px;
            }
            p { 
                color: #666; 
                line-height: 1.6;
                margin-bottom: 15px;
            }
            .highlight { 
                background: #e7f5e7; 
                padding: 15px; 
                border-radius: 8px; 
                margin: 20px 0;
                border-left: 4px solid #28a745;
            }
            .btn { 
                display: inline-block; 
                background: #28a745; 
                color: white; 
                padding: 12px 30px; 
                text-decoration: none; 
                border-radius: 25px; 
                margin-top: 20px;
                transition: background 0.3s;
            }
            .btn:hover { 
                background: #218838; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">🎉</div>
            <h1>信用卡綁定成功！</h1>
            <p>恭喜您成功綁定信用卡到小汪記記系統！</p>
            
            <div class="highlight">
                <strong>✅ 綁卡完成</strong><br>
                您的信用卡已安全綁定，可以開始使用 Premium 功能
            </div>
            
            <p>系統已自動處理您的綁卡資訊，您現在可以：</p>
            <p>• 享受無限制任務管理</p>
            <p>• 使用自定義標籤功能</p>
            <p>• 存取任務收藏功能</p>
            
            <a href="#" class="btn" onclick="window.close()">關閉頁面</a>
        </div>
    </body>
    </html>
  `);
});

// Token 失敗頁面
app.get('/payment/token-failure', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>綁卡失敗 - 小汪記記</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
                margin: 0; 
                padding: 20px; 
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { 
                background: white; 
                padding: 40px; 
                border-radius: 15px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
                width: 100%;
            }
            .error-icon { 
                font-size: 64px; 
                color: #dc3545; 
                margin-bottom: 20px;
            }
            h1 { 
                color: #dc3545; 
                margin-bottom: 20px;
                font-size: 28px;
            }
            p { 
                color: #666; 
                line-height: 1.6;
                margin-bottom: 15px;
            }
            .highlight { 
                background: #f8d7da; 
                padding: 15px; 
                border-radius: 8px; 
                margin: 20px 0;
                border-left: 4px solid #dc3545;
            }
            .btn { 
                display: inline-block; 
                background: #dc3545; 
                color: white; 
                padding: 12px 30px; 
                text-decoration: none; 
                border-radius: 25px; 
                margin-top: 20px;
                transition: background 0.3s;
            }
            .btn:hover { 
                background: #c82333; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error-icon">❌</div>
            <h1>信用卡綁定失敗</h1>
            <p>很抱歉，您的信用卡綁定過程中發生了問題。</p>
            
            <div class="highlight">
                <strong>可能的原因：</strong><br>
                • 信用卡資訊輸入錯誤<br>
                • 信用卡餘額不足進行驗證<br>
                • 網路連線問題<br>
                • 銀行系統暫時不可用
            </div>
            
            <p>請稍後再試，或聯絡客服協助解決問題。</p>
            
            <a href="#" class="btn" onclick="window.close()">關閉頁面</a>
        </div>
    </body>
    </html>
  `);
});

// 模擬支付頁面
app.get('/payment/create', (req, res) => {
  const { 
    store_id, 
    order_id, 
    amount, 
    currency, 
    item_name, 
    item_description, 
    customer_id, 
    customer_name,
    callback_url,
    return_url,
    timestamp,
    signature 
  } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Oen Payment - 測試支付</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0; 
                padding: 20px; 
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .payment-container { 
                background: white; 
                padding: 30px; 
                border-radius: 15px; 
                max-width: 500px; 
                margin: 0 auto; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .logo { 
                text-align: center; 
                color: #667eea; 
                font-size: 2rem; 
                margin-bottom: 30px; 
                font-weight: bold;
            }
            .order-info { 
                background: #f8f9fa; 
                padding: 20px; 
                border-radius: 10px; 
                margin-bottom: 20px; 
            }
            .info-row { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 10px; 
                padding: 5px 0;
                border-bottom: 1px solid #eee;
            }
            .info-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .amount { 
                font-size: 1.5rem; 
                color: #28a745; 
                font-weight: bold; 
            }
            .buttons { 
                display: flex; 
                gap: 15px; 
                margin-top: 25px; 
            }
            .btn { 
                flex: 1; 
                padding: 15px; 
                border: none; 
                border-radius: 8px; 
                font-size: 1rem; 
                cursor: pointer; 
                font-weight: bold;
                transition: all 0.3s ease;
            }
            .btn-success { 
                background: #28a745; 
                color: white; 
            }
            .btn-success:hover { 
                background: #218838; 
                transform: translateY(-2px);
            }
            .btn-danger { 
                background: #dc3545; 
                color: white; 
            }
            .btn-danger:hover { 
                background: #c82333; 
                transform: translateY(-2px);
            }
            .notice {
                background: #fff3cd;
                color: #856404;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #ffc107;
            }
        </style>
    </head>
    <body>
        <div class="payment-container">
            <div class="logo">💳 Oen Payment 測試環境</div>
            
            <div class="notice">
                ⚠️ 這是測試環境，不會產生實際交易
            </div>
            
            <div class="order-info">
                <h3 style="margin-top: 0; color: #333;">訂單資訊</h3>
                <div class="info-row">
                    <span class="label">商品名稱:</span>
                    <span class="value">${decodeURIComponent(item_name || '')}</span>
                </div>
                <div class="info-row">
                    <span class="label">商品描述:</span>
                    <span class="value">${decodeURIComponent(item_description || '')}</span>
                </div>
                <div class="info-row">
                    <span class="label">訂單編號:</span>
                    <span class="value">${order_id}</span>
                </div>
                <div class="info-row">
                    <span class="label">客戶名稱:</span>
                    <span class="value">${decodeURIComponent(customer_name || '')}</span>
                </div>
                <div class="info-row">
                    <span class="label">支付金額:</span>
                    <span class="value amount">NT$ ${amount}</span>
                </div>
            </div>
            
            <div class="buttons">
                <button class="btn btn-success" onclick="simulatePaymentSuccess()">
                    ✅ 模擬付款成功
                </button>
                <button class="btn btn-danger" onclick="simulatePaymentFail()">
                    ❌ 模擬付款失敗
                </button>
            </div>
        </div>

        <script>
            function simulatePaymentSuccess() {
                // 顯示處理中狀態
                const btn = event.target;
                btn.disabled = true;
                btn.innerHTML = '⏳ 處理中...';
                
                // 模擬支付成功，發送回調到 callback_url
                fetch('/payment/callback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        order_id: '${order_id}',
                        trade_status: 'TRADE_SUCCESS',
                        amount: '${amount}.00',
                        trade_no: 'OEN_TEST_' + Date.now(),
                        customer_id: '${customer_id}',
                        timestamp: Math.floor(Date.now() / 1000),
                        signature: '${signature}' // 使用相同簽名用於測試
                    })
                }).then(response => {
                    if (response.ok) {
                        // 顯示成功訊息並跳轉
                        btn.innerHTML = '✅ 成功！跳轉中...';
                        setTimeout(() => {
                            window.location.href = '${decodeURIComponent(return_url)}?orderId=${order_id}&status=success&customerName=${encodeURIComponent(customer_name)}';
                        }, 1000);
                    } else {
                        throw new Error('服務器回應錯誤: ' + response.status);
                    }
                }).catch(error => {
                    console.error('支付處理失敗:', error);
                    btn.disabled = false;
                    btn.innerHTML = '✅ 模擬付款成功';
                    alert('⚠️ 支付處理失敗: ' + error.message + '\\n請稍後重試或聯繫客服。');
                });
            }
            
            function simulatePaymentFail() {
                // 模擬支付失敗
                alert('😔 支付失敗！這是模擬的失敗情況。');
                // 可以加入失敗回調邏輯
            }
        </script>
    </body>
    </html>
  `);
});

// 付款成功頁面
app.get('/payment/success', (req, res) => {
  const { orderId, status, customerName } = req.query;
  const displayName = customerName ? decodeURIComponent(customerName) : '用戶';
  
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>付款成功 - 小汪記記</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0; 
                padding: 20px; 
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .success-card { 
                background: white; 
                padding: 40px; 
                border-radius: 20px; 
                max-width: 500px; 
                margin: 0 auto; 
                box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                text-align: center;
            }
            .success-icon { 
                font-size: 5rem; 
                margin-bottom: 20px;
                animation: bounce 1s ease-out;
            }
            .success-title { 
                color: #28a745; 
                font-size: 2rem; 
                margin-bottom: 15px;
                font-weight: 600;
            }
            .customer-name {
                color: #667eea;
                font-size: 1.2rem;
                margin-bottom: 20px;
                font-weight: 500;
            }
            .success-message { 
                color: #555; 
                margin-bottom: 25px;
                line-height: 1.6;
                font-size: 1.1rem;
            }
            .order-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 25px;
                border-left: 4px solid #28a745;
            }
            .order-id {
                color: #666;
                font-size: 0.9rem;
                margin-bottom: 5px;
            }
            .features {
                text-align: left;
                margin-bottom: 25px;
            }
            .feature-item {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                color: #555;
            }
            .feature-icon {
                color: #28a745;
                margin-right: 10px;
                font-weight: bold;
            }
            .buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            .btn {
                padding: 12px 25px;
                border: none;
                border-radius: 25px;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
            }
            .btn-primary {
                background: #007bff;
                color: white;
            }
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            @keyframes bounce {
                0%, 20%, 60%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                80% { transform: translateY(-10px); }
            }
        </style>
    </head>
    <body>
        <div class="success-card">
            <div class="success-icon">🎉</div>
            <h1 class="success-title">付款成功！</h1>
            <div class="customer-name">歡迎 ${displayName}！</div>
            
            <div class="order-info">
                <div class="order-id">訂單編號：${orderId || 'N/A'}</div>
                <div style="color: #28a745; font-weight: 600;">✅ 小汪記記 Premium 會員已啟用</div>
            </div>
            
            <div class="success-message">
                恭喜您成功訂閱小汪記記進階功能！<br>
                現在您可以享受完整的記事體驗，包括：
            </div>
            
            <div class="features">
                <div class="feature-item">
                    <span class="feature-icon">∞</span>
                    <span>無限制任務數量</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">🏷️</span>
                    <span>自定義標籤管理</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">⭐</span>
                    <span>任務收藏功能</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">📊</span>
                    <span>進階統計報表</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">💬</span>
                    <span>優先客服支援</span>
                </div>
            </div>
            
            <div class="buttons">
                <button class="btn btn-primary" onclick="returnToApp()">
                    🏠 返回小汪記記
                </button>
                <button class="btn btn-secondary" onclick="closeWindow()">
                    ✖️ 關閉頁面
                </button>
            </div>
        </div>
        <script>
            function closeWindow() {
                if (window.opener) {
                    window.close();
                } else {
                    alert('請手動關閉此頁面返回小汪記記');
                }
            }
            
            function returnToApp() {
                // 如果是從 LIFF 或應用內開啟，嘗試回到應用
                try {
                    if (window.opener && window.opener.location) {
                        window.opener.location.reload(); // 重新載入父頁面以刷新訂閱狀態
                        window.close();
                    } else {
                        // 嘗試打開 LINE Bot 對話
                        window.open('https://line.me/R/ti/p/@小汪記記', '_blank');
                        window.close();
                    }
                } catch (error) {
                    alert('請手動返回小汪記記應用，您的進階功能已啟用！');
                    closeWindow();
                }
            }
            
            // 3秒後自動顯示返回提示
            setTimeout(() => {
                if (document.querySelector('.btn-primary')) {
                    document.querySelector('.btn-primary').style.animation = 'pulse 1s infinite';
                }
            }, 3000);
        </script>
        <style>
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
                100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
            }
        </style>
    </body>
    </html>
  `);
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🤖 LINE Bot server running on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});