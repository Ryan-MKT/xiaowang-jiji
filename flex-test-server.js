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

// 創建簡化版 FLEX Message
function createSimpleFlexMessage(userMessage) {
  const flexMessage = {
    type: 'flex',
    altText: '任務已記錄',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅ 任務已記錄',
            weight: 'bold',
            size: 'lg',
            color: '#00B900'
          },
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'text',
            text: userMessage,
            wrap: true,
            size: 'md',
            color: '#333333',
            margin: 'md'
          },
          {
            type: 'text',
            text: new Date().toLocaleString('zh-TW'),
            size: 'xs',
            color: '#999999',
            margin: 'sm'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'message',
              label: '完成任務',
              text: `完成任務：${userMessage}`
            },
            style: 'primary'
          }
        ]
      }
    }
  };

  log('INFO', 'FLEX Message 已生成', flexMessage);
  return flexMessage;
}

// Webhook 端點
app.post('/webhook', line.middleware(config), async (req, res) => {
  log('INFO', '=== FLEX TEST WEBHOOK 接收到請求 ===');
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

// 處理事件 - FLEX Message 版本
async function handleEvent(event) {
  log('INFO', '處理事件', { type: event.type, source: event.source });

  if (event.type !== 'message' || event.message.type !== 'text') {
    log('WARN', '非文字訊息，忽略');
    return null;
  }

  const userMessage = event.message.text;
  log('INFO', '用戶訊息', { text: userMessage, userId: event.source.userId });

  try {
    // 嘗試發送 FLEX Message
    const flexMessage = createSimpleFlexMessage(userMessage);
    log('INFO', '準備發送 FLEX Message');

    await client.replyMessage(event.replyToken, flexMessage);
    log('SUCCESS', '✅ FLEX Message 發送成功！');
    return 'success';

  } catch (error) {
    log('ERROR', '❌ FLEX Message 發送失敗，嘗試發送簡單文字', {
      error: error.message,
      statusCode: error.statusCode
    });

    // 如果 FLEX Message 失敗，發送簡單文字
    try {
      const fallbackMessage = {
        type: 'text',
        text: `⚠️ FLEX Message 失敗\n✅ 任務已記錄：${userMessage}\n時間：${new Date().toLocaleString('zh-TW')}`
      };

      await client.replyMessage(event.replyToken, fallbackMessage);
      log('SUCCESS', '✅ 後備文字訊息發送成功');
      return 'fallback_success';
    } catch (fallbackError) {
      log('ERROR', '❌ 後備訊息也失敗了', fallbackError);
      throw fallbackError;
    }
  }
}

// 健康檢查
app.get('/health', (req, res) => {
  log('INFO', 'Health check requested');
  res.json({
    status: 'ok',
    message: 'FLEX Test Server is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = 3004;
app.listen(PORT, () => {
  log('INFO', `🚀 FLEX Test Server running on port ${PORT}`);
  log('INFO', `📅 Started at: ${new Date().toISOString()}`);
});