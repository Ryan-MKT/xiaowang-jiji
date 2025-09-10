// 任務 Flex Message 建構器

// 單一任務 Flex Message
function createTaskFlexMessage(taskText) {
  const timestamp = new Date().toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    type: 'flex',
    altText: `已記錄任務：${taskText}`,
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
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: taskText,
                wrap: true,
                size: 'md',
                color: '#333333'
              },
              {
                type: 'text',
                text: timestamp,
                size: 'xs',
                color: '#999999',
                margin: 'md'
              }
            ]
          }
        ]
      }
    }
  };
}

// 任務堆疊 Flex Message - 支援動態標籤 Quick Reply
function createTaskStackFlexMessage(tasks, userTags = null) {
  console.log('🚨 [FLEX MESSAGE] 函數被調用 - 版本: 2025-09-10-19:17');
  console.log('🔍 [FLEX 生成] 收到任務資料:', tasks ? tasks.length : 0, '個');
  console.log('📝 [FLEX 生成] 任務預覽:', tasks ? tasks.slice(0, 3).map(task => task.text) : '無任務');
  
  const totalTasks = tasks ? tasks.length : 0;
  const completedTasks = tasks ? tasks.filter(task => task.completed).length : 0;
  const pendingTasks = totalTasks - completedTasks;

  // 創建任務清單內容，每個任務之間加上分隔線
  const taskContents = [];
  
  tasks.forEach((task, index) => {
    const isCompleted = task.completed || false;
    
    // 添加任務項目
    taskContents.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      paddingAll: 'md',
      alignItems: 'center',
      contents: [
        {
          type: 'text',
          text: `${index + 1}. ${task.text}`,
          size: 'sm',
          color: isCompleted ? '#999999' : '#333333',
          flex: 1,
          wrap: true,
          decoration: isCompleted ? 'line-through' : 'none',
          margin: 'none',
          action: {
            type: 'uri',
            uri: `https://e15a3f219d53.ngrok-free.app/liff?task=${encodeURIComponent(task.text)}&taskId=${task.id}`
          }
        },
        {
          type: 'text',
          text: task.favorited ? '★' : '☆',
          size: 'md',
          color: '#000000',
          flex: 0,
          margin: 'xs',
          action: {
            type: 'postback',
            data: `favorite_task_${task.id}`
          }
        },
        {
          type: 'text',
          text: isCompleted ? '☑' : '□',
          size: 'lg',
          color: '#000000',
          flex: 0,
          align: 'center',
          action: {
            type: 'postback',
            data: `complete_task_${task.id}`
          }
        }
      ]
    });
    
    // 如果不是最後一個任務，添加筆記本風格分隔線
    if (index < tasks.length - 1) {
      taskContents.push({
        type: 'separator',
        margin: 'xs',
        color: '#C0C0C0'
      });
    }
  });

  // Linus 風格：資料結構簡單，直接附加 Quick Reply
  return {
    type: 'flex',
    altText: `今天 ${totalTasks} 件事要做`,
    contents: {
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
            text: `今天 ${totalTasks} 件事要做`,
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
        contents: taskContents.concat([
          {
            type: 'separator',
            margin: 'md',
            color: '#E0E0E0'
          },
          {
            type: 'text',
            text: `已完成 ${completedTasks} 件，待完成 ${pendingTasks} 件`,
            size: 'xs',
            color: '#999999',
            align: 'center',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'md',
            color: '#E0E0E0'
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '📚 全部記錄',
                size: 'sm',
                color: '#4169E1',
                align: 'center',
                flex: 1,
                action: {
                  type: 'uri',
                  uri: 'https://e15a3f219d53.ngrok-free.app/liff/records'
                }
              },
              {
                type: 'text',
                text: '⭐ 任務收藏',
                size: 'sm',
                color: '#FF6B6B',
                align: 'center',
                flex: 1,
                action: {
                  type: 'uri',
                  uri: 'https://e15a3f219d53.ngrok-free.app/liff/favorites'
                }
              }
            ]
          }
        ])
      }
    },
    // 動態標籤 Quick Reply：根據用戶設定的標籤生成
    quickReply: generateQuickReply(userTags)
  };
}

// 生成動態 Quick Reply
function generateQuickReply(userTags) {
  console.log(`🔍 [Quick Reply] 輸入標籤數據:`, userTags);
  let quickReplyItems = [];
  
  if (userTags && Array.isArray(userTags) && userTags.length > 0) {
    // 使用用戶自定義標籤
    console.log(`✅ [Quick Reply] 使用用戶標籤生成，原始數量: ${userTags.length}`);
    
    // 按 sort_order 排序，最多取 13 個標籤（LINE Quick Reply 限制）
    const sortedTags = userTags
      .filter(tag => tag.is_active !== false) // 過濾掉已刪除的標籤
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .slice(0, 13);
    
    console.log(`📋 [Quick Reply] 過濾排序後標籤數量: ${sortedTags.length}`);
    console.log(`📝 [Quick Reply] 最終標籤列表:`, sortedTags.map(tag => `${tag.name}(${tag.sort_order})`));
    
    quickReplyItems = sortedTags.map(tag => ({
      type: 'action',
      action: {
        type: 'message',
        label: `${tag.icon || '🏷️'} ${tag.name}`,
        text: tag.name
      }
    }));
    
    console.log(`🎯 [Quick Reply] 生成 ${quickReplyItems.length} 個按鈕`);
  } else {
    // 使用完整預設標籤（與 server.js 的 getDefaultUserTags() 同步）
    console.log('⚠️ [Quick Reply] 無用戶標籤，使用預設標籤生成');
    const defaultTags = [
      { id: 5, name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1, is_active: true },
      { id: 6, name: '學習', color: '#4ECDC4', icon: '📚', sort_order: 2, is_active: true },
      { id: 8, name: '運動', color: '#45B7D1', icon: '🏃‍♂️', sort_order: 3, is_active: true },
      { id: 7, name: 'AI', color: '#9B59B6', icon: '🤖', sort_order: 4, is_active: true },
      { id: 9, name: '日本', color: '#E74C3C', icon: '🗾', sort_order: 5, is_active: true }
    ];
    
    quickReplyItems = defaultTags.map(tag => ({
      type: 'action',
      action: {
        type: 'message',
        label: `${tag.icon} ${tag.name}`,
        text: tag.name
      }
    }));
    
    console.log(`🎯 [Quick Reply] 使用完整預設標籤，生成 ${quickReplyItems.length} 個按鈕`);
  }
  
  return {
    items: quickReplyItems
  };
}

module.exports = {
  createTaskFlexMessage,
  createTaskStackFlexMessage
};