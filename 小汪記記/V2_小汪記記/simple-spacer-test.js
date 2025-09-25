// 簡化版spacer測試

function generateSimpleSpacerTest() {
  return {
    type: 'flex',
    altText: 'spacer test',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: '左側',
            backgroundColor: '#E8F4FD',
            paddingAll: 'md',
            flex: 1
          },
          {
            type: 'spacer',
            size: 'lg'
          },
          {
            type: 'text',
            text: '右側',
            backgroundColor: '#FFF4E6',
            paddingAll: 'md',
            flex: 1
          }
        ]
      }
    }
  };
}

async function sendSimpleTest() {
  console.log('🧪 [簡化測試] 準備發送簡化spacer測試訊息');

  try {
    const flexMessage = generateSimpleSpacerTest();

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
      console.log('✅ [簡化測試] 訊息發送成功:', result);
    } else {
      console.error('❌ [簡化測試] 訊息發送失敗:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ [簡化測試] 發送過程中出錯:', error);
  }
}

sendSimpleTest();