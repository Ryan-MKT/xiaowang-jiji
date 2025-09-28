// 測試 createTaskStackFlexMessage 的標籤模式功能
const { createTaskStackFlexMessage } = require('./task-flex-message');

// 模擬測試任務資料
const testTasks = [
  {
    id: 1,
    text: '開會',
    tag: '工作',
    completed: false,
    timestamp: '2025-09-28T10:00:00Z'
  },
  {
    id: 2,
    text: '加班',
    tag: '工作',
    completed: false,
    timestamp: '2025-09-28T11:00:00Z'
  },
  {
    id: 3,
    text: '出去玩',
    tag: '生活',
    completed: false,
    timestamp: '2025-09-28T12:00:00Z'
  },
  {
    id: 4,
    text: '買垃圾袋',
    tag: '生活',
    completed: true,
    timestamp: '2025-09-28T13:00:00Z'
  },
  {
    id: 5,
    text: '遊樂園',
    tag: '娛樂',
    completed: false,
    timestamp: '2025-09-28T14:00:00Z'
  },
  {
    id: 6,
    text: '無標籤任務',
    tag: null,
    completed: false,
    timestamp: '2025-09-28T15:00:00Z'
  }
];

// 模擬用戶標籤
const testUserTags = [
  { id: 1, name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1, is_active: true },
  { id: 2, name: '生活', color: '#4ECDC4', icon: '🏠', sort_order: 2, is_active: true },
  { id: 3, name: '娛樂', color: '#45B7D1', icon: '🎮', sort_order: 3, is_active: true }
];

console.log('🧪 [測試] 開始測試 createTaskStackFlexMessage 功能');

console.log('\n=== 測試1: 一般模式 ===');
try {
  const generalFlexMessage = createTaskStackFlexMessage(testTasks, testUserTags, 'general');
  console.log('✅ [一般模式] 生成成功');
  console.log('📄 [一般模式] 類型:', generalFlexMessage.type);
  console.log('📝 [一般模式] Alt Text:', generalFlexMessage.altText);

  const fs = require('fs');
  fs.writeFileSync('./test_general_flex.json', JSON.stringify(generalFlexMessage, null, 2));
  console.log('💾 [檔案輸出] 一般模式 Flex Message 已儲存至 test_general_flex.json');
} catch (error) {
  console.error('❌ [錯誤] 一般模式生成失敗:', error);
}

console.log('\n=== 測試2: 標籤模式 ===');
try {
  const tagsFlexMessage = createTaskStackFlexMessage(testTasks, testUserTags, 'tags');
  console.log('✅ [標籤模式] 生成成功');
  console.log('📄 [標籤模式] 類型:', tagsFlexMessage.type);
  console.log('📝 [標籤模式] Alt Text:', tagsFlexMessage.altText);

  const fs = require('fs');
  fs.writeFileSync('./test_tags_flex.json', JSON.stringify(tagsFlexMessage, null, 2));
  console.log('💾 [檔案輸出] 標籤模式 Flex Message 已儲存至 test_tags_flex.json');
} catch (error) {
  console.error('❌ [錯誤] 標籤模式生成失敗:', error);
}

console.log('\n🎉 [測試完成] createTaskStackFlexMessage 測試結束');