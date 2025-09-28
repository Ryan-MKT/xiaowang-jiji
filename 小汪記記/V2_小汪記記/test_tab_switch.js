// 測試標籤切換功能
const { createTaskStackFlexMessage } = require('./task-flex-message');

console.log('=== 測試標籤切換功能 ===');

// 測試任務數據
const testTasks = [
  { id: 1, text: '測試任務1', completed: false },
  { id: 2, text: '測試任務2', completed: false }
];

const testTags = [];

console.log('\n1. 測試一般視圖 (general):');
try {
  const generalMessage = createTaskStackFlexMessage(testTasks, testTags, 'general');
  console.log('✅ 一般視圖生成成功');
  console.log('Alt text:', generalMessage.altText);

  // 檢查tab segment中的一般按鈕樣式
  const body = generalMessage.contents.body;
  const tabSegment = body.contents.find(c => c.type === 'box' && c.contents && c.contents.length === 3);
  if (tabSegment) {
    const tabContainer = tabSegment.contents[1]; // 中間的tab container
    const generalTab = tabContainer.contents[0]; // 一般按鈕
    console.log('一般按鈕背景色:', generalTab.backgroundColor || '未設定');
  }
} catch (error) {
  console.error('❌ 一般視圖錯誤:', error.message);
}

console.log('\n2. 測試標籤視圖 (tags):');
try {
  const tagsMessage = createTaskStackFlexMessage(testTasks, testTags, 'tags');
  console.log('✅ 標籤視圖生成成功');
  console.log('Alt text:', tagsMessage.altText);

  // 檢查tab segment中的標籤按鈕樣式
  const body = tagsMessage.contents.body;
  const tabSegment = body.contents.find(c => c.type === 'box' && c.contents && c.contents.length === 3);
  if (tabSegment) {
    const tabContainer = tabSegment.contents[1]; // 中間的tab container
    const tagsTab = tabContainer.contents[1]; // 標籤按鈕
    console.log('標籤按鈕背景色:', tagsTab.backgroundColor || '未設定');
  }
} catch (error) {
  console.error('❌ 標籤視圖錯誤:', error.message);
}

console.log('\n3. 比較兩個訊息:');
try {
  const generalMessage = createTaskStackFlexMessage(testTasks, testTags, 'general');
  const tagsMessage = createTaskStackFlexMessage(testTasks, testTags, 'tags');

  console.log('訊息結構相同?',
    generalMessage.type === tagsMessage.type &&
    generalMessage.contents.type === tagsMessage.contents.type
  );

  console.log('任務內容相同?',
    JSON.stringify(generalMessage.contents.body.contents.slice(1)) ===
    JSON.stringify(tagsMessage.contents.body.contents.slice(1))
  );

} catch (error) {
  console.error('❌ 比較錯誤:', error.message);
}

console.log('\n=== 測試完成 ===');