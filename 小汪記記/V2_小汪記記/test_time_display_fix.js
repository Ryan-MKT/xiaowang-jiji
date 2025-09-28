// 測試時間顯示修復
const { createTaskStackFlexMessage } = require('./task-flex-message');

// 模擬帶有時間的測試任務資料
const testTasksWithTime = [
  {
    id: 1,
    text: '吃飯',
    tag: '生活',
    completed: false,
    scheduled_date: '2025-09-28T04:05:00+08:00', // 使用下底線格式
    timestamp: '2025-09-28T10:00:00Z'
  },
  {
    id: 2,
    text: '開會',
    tag: '工作',
    completed: false,
    scheduledDate: '2025-09-28T14:30:00+08:00', // 使用駝峰格式
    timestamp: '2025-09-28T11:00:00Z'
  },
  {
    id: 3,
    text: '買垃圾袋',
    tag: null, // 無標籤任務
    completed: false,
    scheduled_date: '2025-09-28T16:15:00+08:00',
    timestamp: '2025-09-28T12:00:00Z'
  },
  {
    id: 4,
    text: '無時間任務',
    tag: '生活',
    completed: false,
    timestamp: '2025-09-28T13:00:00Z'
    // 沒有 scheduled_date 或 scheduledDate
  }
];

// 模擬用戶標籤
const testUserTags = [
  { id: 1, name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1, is_active: true },
  { id: 2, name: '生活', color: '#4ECDC4', icon: '🏠', sort_order: 2, is_active: true }
];

console.log('🧪 [測試] 開始測試時間顯示修復');

console.log('\n=== 測試1: 一般模式的時間顯示 ===');
try {
  const generalFlexMessage = createTaskStackFlexMessage(testTasksWithTime, testUserTags, 'general');
  console.log('✅ [一般模式] 生成成功');

  const fs = require('fs');
  fs.writeFileSync('./test_general_with_time.json', JSON.stringify(generalFlexMessage, null, 2));
  console.log('💾 [檔案輸出] 一般模式時間測試已儲存至 test_general_with_time.json');
} catch (error) {
  console.error('❌ [錯誤] 一般模式生成失敗:', error);
}

console.log('\n=== 測試2: 標籤模式的時間顯示 ===');
try {
  const tagsFlexMessage = createTaskStackFlexMessage(testTasksWithTime, testUserTags, 'tags');
  console.log('✅ [標籤模式] 生成成功');

  const fs = require('fs');
  fs.writeFileSync('./test_tags_with_time.json', JSON.stringify(tagsFlexMessage, null, 2));
  console.log('💾 [檔案輸出] 標籤模式時間測試已儲存至 test_tags_with_time.json');
} catch (error) {
  console.error('❌ [錯誤] 標籤模式生成失敗:', error);
}

console.log('\n🎉 [測試完成] 時間顯示修復測試結束');
console.log('🔍 [檢查] 請查看生成的 JSON 檔案，確認時間是否正確顯示：');
console.log('   - test_general_with_time.json (一般模式)');
console.log('   - test_tags_with_time.json (標籤模式)');