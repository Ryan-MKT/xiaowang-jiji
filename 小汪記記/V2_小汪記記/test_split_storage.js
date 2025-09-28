// 測試分離式資料儲存
console.log('🧪 [測試] 開始測試分離式資料儲存功能');

// 模擬測試用例
const testCases = [
  {
    name: '帶時間的任務',
    input: '19:00 上床',
    expected: {
      message_text: '上床',
      scheduled_date: '2025-09-28T19:00:00+08:00'
    }
  },
  {
    name: '早上時間任務',
    input: '09:30 晨跑',
    expected: {
      message_text: '晨跑',
      scheduled_date: '2025-09-28T09:30:00+08:00'
    }
  },
  {
    name: '沒有時間的任務',
    input: '買菜',
    expected: {
      message_text: '買菜',
      scheduled_date: null
    }
  },
  {
    name: '帶標籤和時間的任務',
    input: '(工作)15:00 開會',
    expected: {
      message_text: '開會',
      scheduled_date: '2025-09-28T15:00:00+08:00',
      tag: '工作'
    }
  }
];

console.log('📋 [測試案例] 準備測試以下案例:');
testCases.forEach((testCase, index) => {
  console.log(`  ${index + 1}. ${testCase.name}: "${testCase.input}"`);
  console.log(`     預期 message_text: "${testCase.expected.message_text}"`);
  console.log(`     預期 scheduled_date: ${testCase.expected.scheduled_date || 'null'}`);
  if (testCase.expected.tag) {
    console.log(`     預期 tag: "${testCase.expected.tag}"`);
  }
  console.log('');
});

console.log('✅ [說明] 測試檔案建立完成！');
console.log('🔍 [提醒] 請實際輸入測試訊息到LINE Bot來驗證:');
console.log('   1. 輸入 "19:00 上床" 確認分離式儲存');
console.log('   2. 輸入 "09:30 晨跑" 確認早上時間解析');
console.log('   3. 輸入 "買菜" 確認無時間任務');
console.log('   4. 輸入 "(工作)15:00 開會" 確認標籤+時間解析');
console.log('\n🎯 [預期結果] 資料庫的 dev_messages 表應該會有:');
console.log('   - message_text: 只有任務文字（去除時間和標籤）');
console.log('   - scheduled_date: AI解析的完整時間資訊');
console.log('   - tag: 偵測到的標籤（如果有的話）');
console.log('\n🔍 [重要] 查看日誌中的新格式:');
console.log('   ✅ [資料庫儲存] 任務已儲存到資料庫: {');
console.log('     原始訊息: "19:00 上床",');
console.log('     message_text: "上床",');
console.log('     scheduled_date: "2025-09-28T19:00:00+08:00"');
console.log('   }');