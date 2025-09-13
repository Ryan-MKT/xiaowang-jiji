// 修復版任務 Flex Message 建構器 - 2025-09-13
// 基於簡化版本，保持與原始功能的兼容性

// 主要的任務 FLEX Message 生成函數
function createTaskCarouselFlexMessage(tasks, statsData = {}, tags = [], ngrokUrl = '') {
  console.log('🚨 [FLEX MESSAGE FIXED] 函數被調用 - 版本: 2025-09-13-FIXED');
  console.log('🔍 [FLEX 生成] 收到任務資料:', tasks.length, '個');
  console.log('📝 [FLEX 生成] 任務預覽:', tasks);

  try {
    // 生成主要任務 bubble
    const taskBubble = createMainTaskBubble(tasks, ngrokUrl);

    // 生成統計卡片 bubble
    const statsBubble = createStatsBubble(statsData);

    // 組合為 carousel
    const flexMessage = {
      type: 'flex',
      altText: `今天 ${tasks.length} 件事要做`,
      contents: {
        type: 'carousel',
        contents: [taskBubble, statsBubble]
      }
    };

    console.log('✅ [FLEX MESSAGE FIXED] FLEX MESSAGE 生成成功');
    return flexMessage;

  } catch (error) {
    console.error('❌ [FLEX MESSAGE FIXED] 生成失敗:', error);
    // 回退到單一 bubble
    return createFallbackFlexMessage(tasks[0] || '未知任務');
  }
}

// 主要任務 bubble
function createMainTaskBubble(tasks, ngrokUrl) {
  const taskContents = tasks.slice(0, 5).map((task, index) => {
    return {
      type: 'text',
      text: `${index + 1}. ${task}`,
      size: 'sm',
      color: '#333333',
      wrap: true,
      margin: 'sm'
    };
  });

  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'md',
      backgroundColor: '#CD853F',
      contents: [
        {
          type: 'text',
          text: `今天 ${tasks.length} 件事要做`,
          color: '#FFFFFF',
          size: 'md',
          weight: 'bold',
          align: 'center'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'lg',
      backgroundColor: '#FFF8DC',
      contents: [
        ...taskContents,
        {
          type: 'separator',
          margin: 'md',
          color: '#E0E0E0'
        },
        {
          type: 'text',
          text: `已完成 0 件，待完成 ${tasks.length} 件`,
          size: 'xs',
          color: '#999999',
          align: 'center',
          margin: 'md'
        }
      ]
    }
  };
}

// 統計卡片 bubble
function createStatsBubble(statsData) {
  const completedCount = statsData.completedCount || 0;
  const favoritesCount = statsData.favoritesCount || 0;

  return {
    type: 'bubble',
    size: 'nano',
    body: {
      type: 'box',
      layout: 'horizontal',
      paddingAll: 'md',
      backgroundColor: '#F8F9FA',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          alignItems: 'center',
          contents: [
            {
              type: 'text',
              text: '已完成',
              size: 'xs',
              color: '#6C757D',
              align: 'center'
            },
            {
              type: 'text',
              text: String(completedCount),
              size: 'xl',
              weight: 'bold',
              color: '#28A745',
              align: 'center'
            },
            {
              type: 'text',
              text: '件',
              size: 'xs',
              color: '#6C757D',
              align: 'center'
            }
          ]
        },
        {
          type: 'separator',
          color: '#DEE2E6'
        },
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          alignItems: 'center',
          contents: [
            {
              type: 'text',
              text: '已收藏',
              size: 'xs',
              color: '#6C757D',
              align: 'center'
            },
            {
              type: 'text',
              text: String(favoritesCount),
              size: 'xl',
              weight: 'bold',
              color: '#FFC107',
              align: 'center'
            },
            {
              type: 'text',
              text: '件',
              size: 'xs',
              color: '#6C757D',
              align: 'center'
            }
          ]
        }
      ]
    }
  };
}

// 後備單一 bubble (當出錯時使用)
function createFallbackFlexMessage(taskText) {
  console.log('⚠️ [FLEX MESSAGE FIXED] 使用後備 FLEX Message');

  return {
    type: 'flex',
    altText: '任務已記錄',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅ 任務已記錄',
            weight: 'bold',
            size: 'lg',
            color: '#00B900'
          },
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'text',
            text: taskText,
            wrap: true,
            size: 'md',
            color: '#333333',
            margin: 'md'
          },
          {
            type: 'text',
            text: new Date().toLocaleString('zh-TW'),
            size: 'xs',
            color: '#999999',
            margin: 'sm'
          }
        ]
      }
    }
  };
}

// 相容性函數 - 保持與原始程式碼的兼容
function createTaskFlexMessage(taskText) {
  return createFallbackFlexMessage(taskText);
}

// 匯出函數
module.exports = {
  createTaskCarouselFlexMessage,
  createTaskFlexMessage,
  createFallbackFlexMessage
};

// 如果直接執行，則匯出到全域
if (typeof global !== 'undefined') {
  global.createTaskCarouselFlexMessage = createTaskCarouselFlexMessage;
  global.createTaskFlexMessage = createTaskFlexMessage;
}