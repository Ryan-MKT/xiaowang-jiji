// 測試更新版本的 server
require('dotenv').config();
const express = require('express');
const { supabase } = require('./supabase-client');

const app = express();
app.use(express.json());

// 動態載入模組以支援熱重載
function getTaskFlexModule() {
  const modulePath = require.resolve('./task-flex-message');
  console.log(`🔄 [MODULE RELOAD] 清除快取: ${modulePath}`);
  delete require.cache[modulePath];
  const module = require('./task-flex-message');
  console.log(`📦 [MODULE RELOAD] 重新載入模組完成`);
  return module;
}

app.post('/webhook', async (req, res) => {
  try {
    console.log('=== 測試 WEBHOOK 接收到請求 ===');
    console.log('📥 完整請求 body:', JSON.stringify(req.body, null, 2));

    const events = req.body.events || [];
    if (events.length === 0) {
      return res.json([]);
    }

    const event = events[0];
    if (event.type === 'message' && event.message.type === 'text') {
      const messageText = event.message.text;
      console.log(`📝 收到訊息: ${messageText}`);

      // 模擬任務資料
      const userTasks = [
        { id: Date.now(), text: messageText, completed: false, favorited: false }
      ];

      console.log('🚨 [SERVER DEBUG] 準備調用 createMainTaskList');
      const { createMainTaskList } = getTaskFlexModule();

      const flexMessage = createMainTaskList(userTasks, [], 0, 0);
      console.log('✅ [SERVER DEBUG] createMainTaskList 調用完成');

      console.log('🔍 [FLEX DEBUG] 生成的 FLEX MESSAGE 類型:', flexMessage.contents.type);
      console.log('🔍 [FLEX DEBUG] altText:', flexMessage.altText);

      res.json('success');
    } else {
      res.json('not text message');
    }
  } catch (error) {
    console.error('❌ 錯誤:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

console.log('🚀 測試 server 啟動在 port 3002');
app.listen(3002, () => {
  console.log('🤖 測試 server running on port 3002');
});