// 測試標籤按鈕postback處理
const fs = require('fs');

console.log('=== 檢查標籤按鈕修改是否生效 ===');

// 檢查server.js中的switch_tab_tags部分
console.log('\n1. 檢查server.js中的修改:');
try {
  const serverCode = fs.readFileSync('./server.js', 'utf8');

  // 搜尋switch_tab_tags相關代碼
  const switchTagsMatch = serverCode.match(/if \(postbackData === 'switch_tab_tags'\)[^}]+createTaskStackFlexMessage[^}]+/);

  if (switchTagsMatch) {
    console.log('✅ 找到修改後的switch_tab_tags代碼');
    console.log('代碼片段:', switchTagsMatch[0].substring(0, 200) + '...');

    // 檢查是否還有createDynamicTagCarousel的調用
    const hasCarousel = switchTagsMatch[0].includes('createDynamicTagCarousel');
    if (hasCarousel) {
      console.log('❌ 仍然使用createDynamicTagCarousel');
    } else {
      console.log('✅ 已移除createDynamicTagCarousel');
    }

    // 檢查是否使用createTaskStackFlexMessage
    const hasStackMessage = switchTagsMatch[0].includes('createTaskStackFlexMessage');
    if (hasStackMessage) {
      console.log('✅ 已使用createTaskStackFlexMessage');
    } else {
      console.log('❌ 未使用createTaskStackFlexMessage');
    }

  } else {
    console.log('❌ 未找到switch_tab_tags代碼或修改不正確');
  }

} catch (error) {
  console.error('❌ 讀取server.js錯誤:', error.message);
}

console.log('\n2. 檢查task-flex-message.js導出:');
try {
  // 檢查是否有正確導出createTaskStackFlexMessage
  const { createTaskStackFlexMessage } = require('./task-flex-message');

  if (typeof createTaskStackFlexMessage === 'function') {
    console.log('✅ createTaskStackFlexMessage函數可用');

    // 測試函數是否正常工作
    const testTasks = [{ id: 1, text: '測試', completed: false }];
    const result = createTaskStackFlexMessage(testTasks, [], 'tags');

    if (result && result.type === 'flex' && result.contents.type === 'bubble') {
      console.log('✅ createTaskStackFlexMessage返回正確的flex message');
      console.log('Message type:', result.type);
      console.log('Contents type:', result.contents.type);
    } else {
      console.log('❌ createTaskStackFlexMessage返回格式不正確');
    }

  } else {
    console.log('❌ createTaskStackFlexMessage函數不可用');
  }

} catch (error) {
  console.error('❌ 測試createTaskStackFlexMessage錯誤:', error.message);
}

console.log('\n3. 確認標籤視圖不會產生carousel:');
try {
  const { createTaskStackFlexMessage } = require('./task-flex-message');

  const testTasks = [
    { id: 1, text: '任務1', completed: false },
    { id: 2, text: '任務2', completed: false }
  ];

  const tagsMessage = createTaskStackFlexMessage(testTasks, [], 'tags');

  // 檢查是否為carousel
  const isCarousel = tagsMessage.contents.type === 'carousel';
  console.log('是否為carousel?', isCarousel ? '❌ 是' : '✅ 否');

  // 檢查是否有contents array (carousel特徵)
  const hasContentsArray = Array.isArray(tagsMessage.contents.contents);
  console.log('有contents陣列?', hasContentsArray ? '❌ 有' : '✅ 無');

  // 輸出結果到檔案
  fs.writeFileSync('./debug_tags_check.json', JSON.stringify(tagsMessage, null, 2));
  console.log('✅ 標籤視圖結果已保存到debug_tags_check.json');

} catch (error) {
  console.error('❌ 測試標籤視圖錯誤:', error.message);
}

console.log('\n=== 檢查完成 ===');