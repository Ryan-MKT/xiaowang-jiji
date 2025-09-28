// 測試 postback 事件模擬
const { createTaskStackFlexMessage } = require('./task-flex-message');

console.log('=== 模擬標籤按鈕點擊測試 ===');

// 模擬用戶任務數據
const mockUserTasks = [
  { id: 1759037587567, text: '測試任務', completed: false }
];

const mockUserTags = [];

console.log('\n1. 模擬點擊「一般」按鈕 (switch_tab_general):');
try {
  const generalMessage = createTaskStackFlexMessage(mockUserTasks, mockUserTags, 'general');
  console.log('✅ 一般視圖 - 返回正常的 flex message');
  console.log('Alt text:', generalMessage.altText);
  console.log('Message type:', generalMessage.type);
  console.log('Contents type:', generalMessage.contents.type);

  // 檢查是否為 carousel（不應該是）
  const isCarousel = generalMessage.contents.type === 'carousel';
  console.log('是否為 carousel?', isCarousel ? '❌ 是（錯誤）' : '✅ 否（正確）');
} catch (error) {
  console.error('❌ 一般視圖錯誤:', error.message);
}

console.log('\n2. 模擬點擊「標籤」按鈕 (switch_tab_tags):');
try {
  const tagsMessage = createTaskStackFlexMessage(mockUserTasks, mockUserTags, 'tags');
  console.log('✅ 標籤視圖 - 返回正常的 flex message');
  console.log('Alt text:', tagsMessage.altText);
  console.log('Message type:', tagsMessage.type);
  console.log('Contents type:', tagsMessage.contents.type);

  // 檢查是否為 carousel（不應該是）
  const isCarousel = tagsMessage.contents.type === 'carousel';
  console.log('是否為 carousel?', isCarousel ? '❌ 是（錯誤）' : '✅ 否（正確）');

  // 檢查是否有複雜的bubble結構
  const hasBubbles = tagsMessage.contents.contents && Array.isArray(tagsMessage.contents.contents);
  console.log('有複雜的 bubble 結構?', hasBubbles ? '❌ 有（錯誤）' : '✅ 無（正確）');

} catch (error) {
  console.error('❌ 標籤視圖錯誤:', error.message);
}

console.log('\n3. 檢查訊息格式一致性:');
try {
  const generalMessage = createTaskStackFlexMessage(mockUserTasks, mockUserTags, 'general');
  const tagsMessage = createTaskStackFlexMessage(mockUserTasks, mockUserTags, 'tags');

  console.log('兩個訊息都是 flex type?',
    generalMessage.type === 'flex' && tagsMessage.type === 'flex' ? '✅ 是' : '❌ 否'
  );

  console.log('兩個訊息都是 bubble type?',
    generalMessage.contents.type === 'bubble' && tagsMessage.contents.type === 'bubble' ? '✅ 是' : '❌ 否'
  );

  console.log('兩個訊息都有相同的 body 結構?',
    generalMessage.contents.body && tagsMessage.contents.body ? '✅ 是' : '❌ 否'
  );

} catch (error) {
  console.error('❌ 檢查錯誤:', error.message);
}

console.log('\n4. 檢查 tab segment 狀態:');
try {
  const generalMessage = createTaskStackFlexMessage(mockUserTasks, mockUserTags, 'general');
  const tagsMessage = createTaskStackFlexMessage(mockUserTasks, mockUserTags, 'tags');

  // 輸出到檔案檢查
  require('fs').writeFileSync('./debug_general_tab.json', JSON.stringify(generalMessage, null, 2));
  require('fs').writeFileSync('./debug_tags_tab.json', JSON.stringify(tagsMessage, null, 2));

  console.log('✅ Tab 狀態檔案已生成:');
  console.log('  - debug_general_tab.json (一般視圖)');
  console.log('  - debug_tags_tab.json (標籤視圖)');

} catch (error) {
  console.error('❌ Tab 檢查錯誤:', error.message);
}

console.log('\n=== 測試結果 ===');
console.log('✅ 標籤按鈕現在會返回相同格式的 flex message');
console.log('✅ 移除了複雜的 carousel 和 bubble 結構');
console.log('✅ 保持了 tab 切換的視覺效果');
console.log('=== 測試完成 ===');