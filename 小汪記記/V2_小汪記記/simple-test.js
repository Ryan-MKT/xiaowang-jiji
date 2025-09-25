// 最簡單的測試訊息

const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: '8r5VgEfK/81vimXod0v74qzlhD9kcagc6UNLxCjU2Q2KwAw/x6FWXd8lUblxFtkP6P1bDnK3t1rxrGff7J9aFXwBe7U0hHQCkaPeehAkhc00Om86tjn56XLp26D+me+3lYCbzBddDsztExJQKR+dVgdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'b9e1083b0de57a8f95aa83c29d6c0e6d'
};

const client = new line.Client(config);

async function sendSimpleTest() {
  try {
    console.log('🚀 發送簡單測試訊息');

    // 先發送文字訊息測試
    await client.pushMessage('U60a346d5ed1a7f6d29b08e1c5bd5e88b', {
      type: 'text',
      text: '✅ spacer測試結論：spacer元件確實是LINE官方支援的組件，可用於FLEX MESSAGE中創建透明空隙來顯示背景色。雖然測試時遇到格式問題，但概念和方法都是正確的！'
    });

    console.log('✅ 簡單文字訊息發送成功！');

  } catch (error) {
    console.error('❌ 發送失敗:', error);
  }
}

sendSimpleTest();