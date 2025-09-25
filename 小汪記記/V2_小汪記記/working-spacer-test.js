// 確定能工作的spacer測試訊息

const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: '8r5VgEfK/81vimXod0v74qzlhD9kcagc6UNLxCjU2Q2KwAw/x6FWXd8lUblxFtkP6P1bDnK3t1rxrGff7J9aFXwBe7U0hHQCkaPeehAkhc00Om86tjn56XLp26D+me+3lYCbzBddDsztExJQKR+dVgdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'b9e1083b0de57a8f95aa83c29d6c0e6d'
};

const client = new line.Client(config);

const workingSpacerMessage = {
  type: 'flex',
  altText: 'spacer測試成功',
  contents: {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '左側',
          backgroundColor: '#E3F2FD',
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
          backgroundColor: '#FFF3E0',
          paddingAll: 'md',
          flex: 1
        }
      ]
    }
  }
};

async function sendWorkingTest() {
  try {
    console.log('🚀 [確定能工作的測試] 發送spacer測試訊息');

    await client.pushMessage('U60a346d5ed1a7f6d29b08e1c5bd5e88b', workingSpacerMessage);

    console.log('✅ [確定能工作的測試] spacer測試訊息發送成功！');
  } catch (error) {
    console.error('❌ [確定能工作的測試] 發送失敗:', error);
  }
}

sendWorkingTest();