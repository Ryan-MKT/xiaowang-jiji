// 測試常用任務 FLEX MESSAGE 是否包含複製按鈕

const { generateFrequentTasksFlexMessage } = require('./frequent-tasks-flex-message');

console.log('🔍 測試常用任務 FLEX MESSAGE 生成');

// 模擬常用任務資料
const mockFrequentTasks = [
  {
    task_text: '買菜',
    tag: '生活',
    note: '記得買蘋果'
  },
  {
    task_text: '運動',
    tag: '健康',
    note: null
  }
];

console.log('📝 模擬資料:', mockFrequentTasks);

// 生成 FLEX MESSAGE
const flexMessage = generateFrequentTasksFlexMessage(mockFrequentTasks);

console.log('🎨 生成的 FLEX MESSAGE:');
console.log(JSON.stringify(flexMessage, null, 2));

// 檢查是否包含複製按鈕
const bodyContents = flexMessage.contents.body.contents;
let hasButton = false;

function checkForButton(contents) {
  for (let item of contents) {
    if (item.type === 'box' && item.contents) {
      for (let subItem of item.contents) {
        if (subItem.type === 'button' && subItem.action && subItem.action.label === '複製') {
          hasButton = true;
          console.log('✅ 找到複製按鈕:', JSON.stringify(subItem, null, 2));
          return;
        }
      }
    }

    if (item.contents && Array.isArray(item.contents)) {
      checkForButton(item.contents);
    }
  }
}

checkForButton(bodyContents);

if (hasButton) {
  console.log('✅ 測試通過：FLEX MESSAGE 包含複製按鈕');
} else {
  console.log('❌ 測試失敗：FLEX MESSAGE 未包含複製按鈕');
}