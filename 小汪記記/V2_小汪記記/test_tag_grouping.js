// 測試標籤分組功能
const { createTagGroupedFlexMessage, parseTasksByTags } = require('./task-flex-message');

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
  },
  {
    id: 7,
    text: '另一個無標籤任務',
    tag: '',
    completed: false,
    timestamp: '2025-09-28T16:00:00Z'
  }
];

// 模擬用戶標籤
const testUserTags = [
  { id: 1, name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1, is_active: true },
  { id: 2, name: '生活', color: '#4ECDC4', icon: '🏠', sort_order: 2, is_active: true },
  { id: 3, name: '娛樂', color: '#45B7D1', icon: '🎮', sort_order: 3, is_active: true }
];

console.log('🧪 [測試] 開始測試標籤分組功能');
console.log('📋 [測試資料] 任務數量:', testTasks.length);
console.log('🏷️ [測試資料] 標籤數量:', testUserTags.length);

// 測試1: 測試 parseTasksByTags 函數
console.log('\n=== 測試1: parseTasksByTags 函數 ===');
const { tagGroups, untaggedTasks } = parseTasksByTags(testTasks);

console.log(`🔍 [解析結果] 發現 ${tagGroups.length} 個標籤組:`);
tagGroups.forEach(group => {
  console.log(`  - ${group.tagName}: ${group.taskCount} 個任務`);
  group.tasks.forEach(task => {
    console.log(`    * ${task.text} (${task.completed ? '已完成' : '未完成'})`);
  });
});

console.log(`📝 [解析結果] 無標籤任務: ${untaggedTasks.length} 個`);
untaggedTasks.forEach(task => {
  console.log(`  - ${task.text} (${task.completed ? '已完成' : '未完成'})`);
});

// 測試2: 測試 createTagGroupedFlexMessage 函數
console.log('\n=== 測試2: createTagGroupedFlexMessage 函數 ===');
try {
  const flexMessage = createTagGroupedFlexMessage(testTasks, testUserTags);

  console.log('✅ [Flex Message] 生成成功');
  console.log('📄 [Flex Message] 類型:', flexMessage.type);
  console.log('📝 [Flex Message] Alt Text:', flexMessage.altText);
  console.log('🎨 [Flex Message] Bubble 內容長度:', flexMessage.contents.body.contents.length);

  // 將結果寫入檔案以便檢查
  const fs = require('fs');
  fs.writeFileSync('./test_tag_grouped_flex.json', JSON.stringify(flexMessage, null, 2));
  console.log('💾 [檔案輸出] Flex Message 已儲存至 test_tag_grouped_flex.json');

} catch (error) {
  console.error('❌ [錯誤] 生成 Flex Message 失敗:', error);
}

// 測試3: 測試 postback 資料格式
console.log('\n=== 測試3: Postback 資料格式測試 ===');
const testPostbackData = [
  'view_tag_tasks|工作',
  'view_tag_tasks|生活',
  'view_tag_tasks|娛樂',
  'view_tag_tasks|無標籤'
];

testPostbackData.forEach(data => {
  const tagName = data.split('|')[1];
  console.log(`🔗 [Postback] "${data}" -> 標籤: "${tagName}"`);
});

console.log('\n🎉 [測試完成] 標籤分組功能測試結束');