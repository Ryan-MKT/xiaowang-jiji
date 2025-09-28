// 測試完整的資料庫儲存流程
console.log('🧪 [測試] 開始測試資料庫儲存流程');

// 模擬測試用例
const testCases = [
  {
    name: '帶時間的任務',
    input: '15:30 喝茶',
    expected: {
      message_text: '15:30 喝茶',
      scheduled_date: '應該有AI解析的時間資訊'
    }
  },
  {
    name: '沒有時間的任務',
    input: '買垃圾袋',
    expected: {
      message_text: '買垃圾袋',
      scheduled_date: null
    }
  },
  {
    name: '帶標籤的任務',
    input: '(工作)開會討論專案',
    expected: {
      message_text: '(工作)開會討論專案',
      tag: '工作'
    }
  }
];

console.log('📋 [測試案例] 準備測試以下案例:');
testCases.forEach((testCase, index) => {
  console.log(`  ${index + 1}. ${testCase.name}: "${testCase.input}"`);
});

console.log('\n✅ [說明] 測試檔案建立完成！');
console.log('🔍 [提醒] 請實際輸入測試訊息到LINE Bot來驗證:');
console.log('   1. 輸入 "15:30 喝茶" 確認完整訊息和時間都有儲存');
console.log('   2. 輸入 "買垃圾袋" 確認完整訊息有儲存但時間為null');
console.log('   3. 輸入 "(工作)開會討論專案" 確認標籤偵測功能');
console.log('\n🎯 [預期結果] 資料庫的 dev_messages 表應該會有:');
console.log('   - message_text: 完整的原始訊息');
console.log('   - scheduled_date: AI解析的時間（如果有的話）');
console.log('   - tag: 偵測到的標籤（如果有的話）');