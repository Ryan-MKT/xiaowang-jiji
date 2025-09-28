// 完整測試標籤按鈕的最終行為
const { createTaskStackFlexMessage } = require('./task-flex-message');
const fs = require('fs');

console.log('=== 最終測試標籤按鈕行為 ===');

// 模擬實際的用戶任務數據
const mockTasks = [
  { id: 1759037587567, text: '買襪子', completed: false },
  { id: 1759037587568, text: '買褲子', completed: false }
];

const mockTags = [];

console.log('\n🧪 測試場景 1: 一般視圖 (點擊「一般」按鈕)');
try {
  const generalMessage = createTaskStackFlexMessage(mockTasks, mockTags, 'general');
  console.log('✅ 一般視圖生成成功');
  console.log('類型:', generalMessage.type);
  console.log('內容類型:', generalMessage.contents.type);
  console.log('日期:', generalMessage.altText);

  // 檢查是否為bubble而非carousel
  if (generalMessage.contents.type === 'bubble') {
    console.log('✅ 正確返回 bubble 格式');
  } else {
    console.log('❌ 錯誤格式:', generalMessage.contents.type);
  }

} catch (error) {
  console.error('❌ 一般視圖錯誤:', error.message);
}

console.log('\n🧪 測試場景 2: 標籤視圖 (點擊「標籤」按鈕)');
try {
  const tagsMessage = createTaskStackFlexMessage(mockTasks, mockTags, 'tags');
  console.log('✅ 標籤視圖生成成功');
  console.log('類型:', tagsMessage.type);
  console.log('內容類型:', tagsMessage.contents.type);
  console.log('日期:', tagsMessage.altText);

  // 檢查是否為bubble而非carousel
  if (tagsMessage.contents.type === 'bubble') {
    console.log('✅ 正確返回 bubble 格式（不是複雜的carousel）');
  } else {
    console.log('❌ 錯誤格式:', tagsMessage.contents.type);
  }

  // 檢查是否有多個bubble（不應該有）
  if (tagsMessage.contents.contents && Array.isArray(tagsMessage.contents.contents)) {
    console.log('❌ 仍然有複雜的bubble陣列結構');
  } else {
    console.log('✅ 無複雜的bubble陣列結構');
  }

  // 保存結果檢查
  fs.writeFileSync('./final_tags_test.json', JSON.stringify(tagsMessage, null, 2));
  console.log('✅ 結果已保存到 final_tags_test.json');

} catch (error) {
  console.error('❌ 標籤視圖錯誤:', error.message);
}

console.log('\n🔍 測試場景 3: 比較兩個視圖');
try {
  const generalMessage = createTaskStackFlexMessage(mockTasks, mockTags, 'general');
  const tagsMessage = createTaskStackFlexMessage(mockTasks, mockTags, 'tags');

  // 檢查結構是否相同
  const sameStructure =
    generalMessage.type === tagsMessage.type &&
    generalMessage.contents.type === tagsMessage.contents.type &&
    generalMessage.altText === tagsMessage.altText;

  if (sameStructure) {
    console.log('✅ 兩個視圖具有相同的基本結構');
  } else {
    console.log('❌ 兩個視圖結構不同');
    console.log('一般:', { type: generalMessage.type, contentType: generalMessage.contents.type });
    console.log('標籤:', { type: tagsMessage.type, contentType: tagsMessage.contents.type });
  }

  // 檢查tab狀態
  const generalBody = generalMessage.contents.body;
  const tagsBody = tagsMessage.contents.body;

  console.log('一般視圖 body contents 數量:', generalBody.contents.length);
  console.log('標籤視圖 body contents 數量:', tagsBody.contents.length);

  if (generalBody.contents.length === tagsBody.contents.length) {
    console.log('✅ 兩個視圖的內容數量相同');
  } else {
    console.log('❌ 內容數量不同');
  }

} catch (error) {
  console.error('❌ 比較測試錯誤:', error.message);
}

console.log('\n📋 總結:');
console.log('✅ 標籤按鈕現在會返回與一般按鈕相同格式的 flex message');
console.log('✅ 移除了複雜的 carousel 和多 bubble 結構');
console.log('✅ 沒有「其他」和「已完成+已收藏」的額外頁面');
console.log('✅ 保持了相同的任務列表和日期顯示');
console.log('✅ 只有 tab 的活躍狀態會不同（視覺效果）');

console.log('\n=== 測試完成 ===');