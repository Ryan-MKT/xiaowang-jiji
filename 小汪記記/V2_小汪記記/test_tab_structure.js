// 測試 Tab Segment 結構
const { createTaskStackFlexMessage, createTabSegment } = require('./task-flex-message');

console.log('=== 測試 Tab Segment 結構 ===');

// 測試簡單的 tab segment
console.log('\n1. 測試單獨的 Tab Segment:');
const tabSegment = createTabSegment('general');
console.log(JSON.stringify(tabSegment, null, 2));

// 測試完整 flex message
console.log('\n2. 測試完整 Flex Message:');
const testTasks = [
  { id: 1, text: '測試任務', completed: false }
];

const flexMessage = createTaskStackFlexMessage(testTasks, null, 'general');
console.log('Flex Message altText:', flexMessage.altText);
console.log('Body contents 數量:', flexMessage.contents.body.contents.length);

// 檢查是否有重複的 tab segment
console.log('\n3. 檢查 Body Contents:');
flexMessage.contents.body.contents.forEach((content, index) => {
  console.log(`Content ${index}:`, {
    type: content.type,
    layout: content.layout,
    hasSpacers: content.contents && content.contents.some(c => c.type === 'spacer')
  });
});