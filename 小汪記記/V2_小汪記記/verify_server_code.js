// 驗證server.js代碼是否真的修改了
const fs = require('fs');

console.log('=== 驗證 server.js 代碼修改 ===');

try {
  const serverCode = fs.readFileSync('./server.js', 'utf8');

  console.log('\n1. 檢查 switch_tab_tags 是否使用 createTaskStackFlexMessage:');

  // 找到switch_tab_tags的完整代碼塊
  const switchTagsRegex = /if \(postbackData === 'switch_tab_tags'\) \{[\s\S]*?\n  \}/;
  const switchTagsMatch = serverCode.match(switchTagsRegex);

  if (switchTagsMatch) {
    const switchTagsCode = switchTagsMatch[0];
    console.log('找到 switch_tab_tags 代碼塊');

    // 檢查是否使用createTaskStackFlexMessage
    if (switchTagsCode.includes('createTaskStackFlexMessage')) {
      console.log('✅ 使用 createTaskStackFlexMessage');
    } else {
      console.log('❌ 未使用 createTaskStackFlexMessage');
    }

    // 檢查是否還有createDynamicTagCarousel
    if (switchTagsCode.includes('createDynamicTagCarousel')) {
      console.log('❌ 仍然使用 createDynamicTagCarousel');
    } else {
      console.log('✅ 已移除 createDynamicTagCarousel');
    }

    // 檢查是否有正確的'tags'參數
    if (switchTagsCode.includes("'tags'")) {
      console.log('✅ 包含 \'tags\' 參數');
    } else {
      console.log('❌ 缺少 \'tags\' 參數');
    }

    console.log('\n代碼片段:');
    console.log(switchTagsCode.substring(0, 300) + '...');

  } else {
    console.log('❌ 未找到 switch_tab_tags 代碼塊');
  }

  console.log('\n2. 全域檢查是否還有 createDynamicTagCarousel 的引用:');
  const allCarouselMatches = serverCode.match(/createDynamicTagCarousel/g);
  if (allCarouselMatches) {
    console.log('❌ 仍有', allCarouselMatches.length, '個 createDynamicTagCarousel 引用');
  } else {
    console.log('✅ 無 createDynamicTagCarousel 引用');
  }

  console.log('\n3. 檢查 createTaskStackFlexMessage 的使用:');
  const stackMessageMatches = serverCode.match(/createTaskStackFlexMessage/g);
  if (stackMessageMatches) {
    console.log('✅ 有', stackMessageMatches.length, '個 createTaskStackFlexMessage 引用');
  } else {
    console.log('❌ 無 createTaskStackFlexMessage 引用');
  }

} catch (error) {
  console.error('❌ 讀取 server.js 錯誤:', error.message);
}

console.log('\n=== 驗證完成 ===');