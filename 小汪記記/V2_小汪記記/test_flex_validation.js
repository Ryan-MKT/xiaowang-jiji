// 驗證 Flex Message 結構是否符合 LINE 規範
const { createTaskStackFlexMessage, createTabSegment } = require('./task-flex-message');

console.log('=== 測試 Tab Segment 組件 ===');
const tabSegment = createTabSegment('general');
console.log(JSON.stringify(tabSegment, null, 2));

console.log('\n=== 測試完整 Flex Message ===');
const testTasks = [
  { id: 1, text: '測試任務1', completed: false },
  { id: 2, text: '測試任務2', completed: true }
];

const flexMessage = createTaskStackFlexMessage(testTasks, null, 'general');
console.log(JSON.stringify(flexMessage, null, 2));

console.log('\n=== 檢查關鍵結構 ===');
// 檢查 header 結構
const header = flexMessage.contents.header;
console.log('Header contents 數量:', header.contents.length);
console.log('第一個元素類型:', header.contents[0].type);
console.log('第二個元素 (Tab Segment) 類型:', header.contents[1].type);

// 檢查 Tab Segment 結構
const tabInHeader = header.contents[1];
console.log('Tab Segment layout:', tabInHeader.layout);
console.log('Tab buttons 數量:', tabInHeader.contents.length);

// 檢查每個 tab button
tabInHeader.contents.forEach((button, index) => {
  console.log(`Button ${index + 1}:`, {
    type: button.type,
    text: button.text,
    hasAction: !!button.action,
    actionType: button.action?.type,
    actionData: button.action?.data
  });
});