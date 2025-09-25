// 最基礎的訊息測試

const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: '8r5VgEfK/81vimXod0v74qzlhD9kcagc6UNLxCjU2Q2KwAw/x6FWXd8lUblxFtkP6P1bDnK3t1rxrGff7J9aFXwBe7U0hHQCkaPeehAkhc00Om86tjn56XLp26D+me+3lYCbzBddDsztExJQKR+dVgdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'b9e1083b0de57a8f95aa83c29d6c0e6d'
};

const client = new line.Client(config);

async function testBasic() {
  try {
    console.log('🚀 發送最基礎測試');

    const message = {
      type: 'text',
      text: 'BOT測試'
    };

    console.log('訊息內容:', JSON.stringify(message, null, 2));
    console.log('目標用戶:', 'U60a346d5ed1a7f6d29b08e1c5bd5e88b');

    const result = await client.pushMessage('U60a346d5ed1a7f6d29b08e1c5bd5e88b', message);
    console.log('✅ 發送成功！結果:', result);

  } catch (error) {
    console.error('❌ 發送失敗:');
    console.error('Status:', error.statusCode);
    console.error('Message:', error.statusMessage);
    if (error.originalError && error.originalError.response) {
      console.error('Response data:', error.originalError.response.data);
    }
  }
}

testBasic();