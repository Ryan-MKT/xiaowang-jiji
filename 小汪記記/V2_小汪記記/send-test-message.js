// 直接透過內部API發送spacer測試訊息

const { generateDualColumnSpacerTestMessage } = require('./dual-column-flex-message');

async function sendTestMessage() {
  console.log('🧪 [測試] 準備發送spacer測試訊息');

  try {
    // 生成測試訊息
    const flexMessage = generateDualColumnSpacerTestMessage();

    // 發送到內部API
    const response = await fetch('http://localhost:3002/api/send-test-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'U60a346d5ed1a7f6d29b08e1c5bd5e88b',
        message: flexMessage
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ [測試] 訊息發送成功:', result);
    } else {
      console.error('❌ [測試] 訊息發送失敗:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ [測試] 發送過程中出錯:', error);
  }
}

sendTestMessage();