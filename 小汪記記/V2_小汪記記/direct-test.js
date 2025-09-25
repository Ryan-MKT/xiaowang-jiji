// 直接觸發postback事件來測試spacer

const { generateDualColumnSpacerTestMessage } = require('./dual-column-flex-message');

// 模擬postback事件
const mockEvent = {
  type: 'postback',
  postback: {
    data: 'spacer_test'
  },
  source: {
    userId: 'U60a346d5ed1a7f6d29b08e1c5bd5e88b'
  },
  replyToken: 'test-reply-token'
};

async function triggerDirectTest() {
  console.log('🧪 [直接測試] 觸發spacer測試postback');

  try {
    // 發送postback到webhook
    const response = await fetch('http://localhost:3002/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': 'test-signature'
      },
      body: JSON.stringify({
        events: [mockEvent]
      })
    });

    if (response.ok) {
      console.log('✅ [直接測試] Postback事件觸發成功');
    } else {
      console.error('❌ [直接測試] Postback觸發失敗:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ [直接測試] 觸發過程中出錯:', error);
  }
}

triggerDirectTest();