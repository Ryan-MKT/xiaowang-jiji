// 發送常用任務測試訊息

const line = require('@line/bot-sdk');
const { generateFrequentTasksFlexMessage } = require('./frequent-tasks-flex-message');

const config = {
  channelAccessToken: '8r5VgEfK/81vimXod0v74qzlhD9kcagc6UNLxCjU2Q2KwAw/x6FWXd8lUblxFtkP6P1bDnK3t1rxrGff7J9aFXwBe7U0hHQCkaPeehAkhc00Om86tjn56XLp26D+me+3lYCbzBddDsztExJQKR+dVgdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'b9e1083b0de57a8f95aa83c29d6c0e6d'
};

const client = new line.Client(config);

async function sendFrequentTasksTest() {
  try {
    console.log('🔍 測試發送帶複製按鈕的常用任務');

    // 模擬常用任務資料
    const mockFrequentTasks = [
      {
        task_text: '測試任務A',
        tag: '測試',
        note: '這是測試備註A'
      },
      {
        task_text: '測試任務B',
        tag: '工作',
        note: null
      }
    ];

    console.log('📝 測試資料:', mockFrequentTasks);

    // 生成 FLEX MESSAGE
    const flexMessage = generateFrequentTasksFlexMessage(mockFrequentTasks);

    console.log('🎨 FLEX MESSAGE 生成完成');
    console.log('🔍 檢查按鈕數量...');

    // 檢查按鈕數量
    let buttonCount = 0;
    const bodyContents = flexMessage.contents.body.contents;

    bodyContents.forEach(item => {
      if (item.type === 'box' && item.contents) {
        item.contents.forEach(subItem => {
          if (subItem.type === 'button') {
            buttonCount++;
            console.log(`✅ 找到按鈕: ${subItem.action.label}`);
          }
        });
      }
    });

    console.log(`📊 總共找到 ${buttonCount} 個按鈕`);

    // 發送到 LINE
    const result = await client.pushMessage('U60a346d5ed1a7f6d29b08e1c5bd5e88b', flexMessage);
    console.log('✅ 常用任務測試訊息發送成功！', result);

  } catch (error) {
    console.error('❌ 發送失敗:', error);
    if (error.originalError && error.originalError.response) {
      console.error('詳細錯誤:', error.originalError.response.data);
    }
  }
}

sendFrequentTasksTest();