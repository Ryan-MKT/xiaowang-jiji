// 任務 Flex Message 建構器 - 統計卡片功能版本 2025-09-11-23:50-STATS-CARD-LATEST

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
    },
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '📦 加入收藏卡',
            text: `加入收藏卡_${taskText.substring(0, 50)}`
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '👍 不用謝謝!',
            text: '不用謝謝!'
          }
        }
      ]
    }
  };
}

// 任務堆疊 Flex Message - 支援動態標籤 Quick Reply
function createTaskStackFlexMessage(tasks, userTags = null) {
  console.log('🚨 [FLEX MESSAGE] 函數被調用 - 版本: 2025-09-11-23:50-STATS-CARD-LATEST');
  console.log('🔍 [FLEX 生成] 收到任務資料:', tasks ? tasks.length : 0, '個');
  console.log('📝 [FLEX 生成] 任務預覽:', tasks ? tasks.slice(0, 3).map(task => task.text) : '無任務');

  // 顯示所有任務，讓 LINE 的大小限制自然生效
  let displayTasks = tasks || [];
  console.log(`📋 [FLEX MESSAGE] 顯示全部 ${displayTasks.length} 個任務`);

  // 使用顯示的任務數量（而非全部任務數量）
  const displayedTotal = displayTasks.length;
  const displayedCompleted = displayTasks.filter(task => task.completed).length;
  const displayedPending = displayedTotal - displayedCompleted;

  console.log(`📋 [FLEX MESSAGE] 實際顯示 ${displayTasks.length} 個任務`);

  // 創建任務清單內容，每個任務之間加上分隔線
  const taskContents = [];

  displayTasks.forEach((task, index) => {
    const isCompleted = task.completed || false;

    // 調試：檢查每個任務的備註資料
    console.log(`🔍 [FLEX 調試] 任務 ${task.id} (${task.text}):`, {
      hasNote: !!task.note,
      noteContent: task.note,
      noteLength: task.note ? task.note.length : 0
    });

    // 添加任務項目 - 支援備註顯示
    const taskBoxContents = [
      {
        type: 'text',
        text: task.text,
        size: 'sm',
        color: isCompleted ? '#999999' : '#333333',
        flex: 1,
        wrap: true,
        decoration: isCompleted ? 'line-through' : 'none',
        margin: 'none',
        action: {
          type: 'uri',
          uri: `https://138b00c20997.ngrok.app/liff-app.html?taskId=${task.id}&taskText=${encodeURIComponent(task.text)}`
        }
      }
    ];

    // 如果有備註，在任務下方顯示
    if (task.note && task.note.trim()) {
      console.log(`💬 [FLEX 備註] 任務 ${task.id} 正在顯示備註: "${task.note}"`);
      taskBoxContents.push({
        type: 'text',
        text: `💬 ${task.note}`,
        size: 'xs',
        color: '#666666',
        flex: 1,
        wrap: true,
        margin: 'xs'
      });
    } else {
      console.log(`❌ [FLEX 備註] 任務 ${task.id} 沒有備註或備註為空: "${task.note}"`);
    }

    taskContents.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      paddingAll: 'md',
      alignItems: 'flex-start',
      contents: [
        {
          type: 'text',
          text: isCompleted ? '🅥' : '○',
          size: 'lg',
          color: '#000000',
          flex: 0,
          align: 'center',
          margin: 'xs',
          action: {
            type: 'message',
            label: '完成任務',
            text: `完成任務_${task.id}`
          }
        },
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          contents: taskBoxContents
        },
        {
          type: 'text',
          text: '🖼️',
          size: 'md',
          color: '#ff4757',
          flex: 0,
          margin: 'xs',
          action: {
            type: 'message',
            label: '發送圓角圖片',
            text: `圓角圖片_${task.id}`
          }
        },
        {
          type: 'text',
          text: '𖤘',
          size: 'md',
          color: '#000000',
          flex: 0,
          margin: 'xs'
        },
        {
          type: 'text',
          text: '❏',
          size: 'md',
          color: '#000000',
          flex: 0,
          margin: 'xs',
          action: {
            type: 'message',
            label: '加入收藏卡',
            text: `加入收藏卡_${task.id}`
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
            type: 'message',
            label: '收藏任務',
            text: `收藏任務_${task.id}`
          }
        }
      ]
    });
    
    // 如果不是最後一個任務，添加筆記本風格分隔線
    if (index < displayTasks.length - 1) {
      taskContents.push({
        type: 'separator',
        margin: 'xs',
        color: '#C0C0C0'
      });
    }
  });

  // Linus 風格：資料結構簡單，直接附加 Quick Reply
  const flexMessage = {
    type: 'flex',
    altText: `顯示 ${displayedTotal} 件事`,
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
            text: `顯示 ${displayedTotal} 件事`,
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
            text: `已完成 ${displayedCompleted} 件，待完成 ${displayedPending} 件`,
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
                text: '日歷',
                size: 'sm',
                color: '#000000',
                align: 'center',
                flex: 1,
                action: {
                  type: 'uri',
                  uri: 'https://138b00c20997.ngrok.app/liff/records'
                }
              },
              {
                type: 'text',
                text: '收藏',
                size: 'sm',
                color: '#000000',
                align: 'center',
                flex: 1,
                action: {
                  type: 'uri',
                  uri: 'https://138b00c20997.ngrok.app/liff/favorites'
                }
              },
              {
                type: 'text',
                text: '我的',
                size: 'sm',
                color: '#000000',
                align: 'center',
                flex: 1,
                action: {
                  type: 'uri',
                  uri: 'https://138b00c20997.ngrok.app/liff/account'
                }
              },
              {
                type: 'text',
                text: '收藏卡',
                size: 'sm',
                color: '#000000',
                align: 'center',
                flex: 1,
                action: {
                  type: 'uri',
                  uri: 'https://138b00c20997.ngrok.app/liff/collections'
                }
              }
            ]
          },
          {
            type: 'separator',
            margin: 'md',
            color: '#E0E0E0'
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'none',
            margin: 'md',
            paddingAll: 'sm',
            backgroundColor: '#667eea',
            cornerRadius: '8px',
            contents: [
              {
                type: 'text',
                text: '🏷️ 展開標籤',
                size: 'sm',
                color: '#FFFFFF',
                align: 'center',
                weight: 'bold',
                flex: 1,
                action: {
                  type: 'postback',
                  label: '展開標籤',
                  data: 'expand_tags'
                }
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'none',
            margin: 'md',
            paddingAll: 'sm',
            backgroundColor: '#f765a3',
            cornerRadius: '8px',
            contents: [
              {
                type: 'text',
                text: '📋 卡片收藏',
                size: 'sm',
                color: '#FFFFFF',
                align: 'center',
                weight: 'bold',
                flex: 1,
                action: {
                  type: 'postback',
                  label: '卡片收藏',
                  data: 'card_collection'
                }
              }
            ]
          }
        ])
      }
    }
  };

  // 生成並附加 Quick Reply
  const quickReply = generateQuickReply(userTags);
  if (quickReply && quickReply.items && quickReply.items.length > 0) {
    flexMessage.quickReply = quickReply;
    console.log(`🎯 [FLEX MESSAGE] 附加 Quick Reply，共 ${quickReply.items.length} 個標籤按鈕`);
  } else {
    console.log('⚠️ [FLEX MESSAGE] 無 Quick Reply 標籤按鈕');
  }

  return flexMessage;
}

// 生成任務統計卡片
function createTaskStatsCard(completedCount, favoriteCount) {
  console.log(`📊 [統計卡片] 生成統計卡片 - 已完成: ${completedCount}, 已收藏: ${favoriteCount}`);
  
  return {
    type: 'flex',
    altText: `統計：已完成 ${completedCount} 件，已收藏 ${favoriteCount} 件`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'horizontal',
        paddingAll: 'md',
        backgroundColor: '#F8F9FA',
        cornerRadius: '8px',
        spacing: 'none',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            flex: 1,
            alignItems: 'center',
            spacing: 'xs',
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
                text: completedCount.toString(),
                size: 'xxl',
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
            spacing: 'xs',
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
                text: favoriteCount.toString(),
                size: 'xxl',
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
    }
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

// 創建第3個 bubble - 快捷功能卡片
function createQuickActionCard() {
  console.log('🎯 [快捷卡片] 生成快捷功能卡片');
  
  return {
    type: 'flex',
    altText: '快捷功能：語音輸入、設定、幫助',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'sm',
        backgroundColor: '#667eea',
        contents: [
          {
            type: 'text',
            text: '⚡ 快捷功能',
            color: '#FFFFFF',
            size: 'sm',
            weight: 'bold',
            align: 'center'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        backgroundColor: '#f7fafc',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: '🎙️',
                size: 'lg',
                flex: 0,
                action: {
                  type: 'message',
                  label: '語音輸入',
                  text: '語音輸入'
                }
              },
              {
                type: 'text',
                text: '⚙️',
                size: 'lg',
                flex: 0,
                action: {
                  type: 'message',
                  label: '設定',
                  text: '設定'
                }
              },
              {
                type: 'text',
                text: '❓',
                size: 'lg',
                flex: 0,
                action: {
                  type: 'message',
                  label: '幫助',
                  text: '幫助'
                }
              }
            ]
          }
        ]
      }
    }
  };
}


// 解析任務中的標籤，並按標籤分組
function parseTasksByTags(tasks) {
  console.log('🏷️ [標籤解析] 開始解析任務標籤');

  const tagGroups = new Map();
  const untaggedTasks = [];

  if (!tasks || !Array.isArray(tasks)) {
    console.log('❌ [標籤解析] 無有效任務資料');
    return { tagGroups: [], untaggedTasks: [] };
  }

  tasks.forEach((task, index) => {
    // 解析標籤格式: (標籤名稱)任務內容
    const tagMatch = task.text.match(/^\(([^)]+)\)(.*)$/);

    if (tagMatch) {
      const tagName = tagMatch[1].trim();
      const taskContent = tagMatch[2].trim();

      if (!tagGroups.has(tagName)) {
        tagGroups.set(tagName, []);
      }

      // 創建新的任務對象，移除標籤前綴
      const cleanTask = {
        ...task,
        text: taskContent,
        originalText: task.text,
        tagName: tagName,
        index: index + 1
      };

      tagGroups.get(tagName).push(cleanTask);
      console.log(`📋 [標籤解析] 任務"${taskContent}"歸類到標籤"${tagName}"`);
    } else {
      untaggedTasks.push({
        ...task,
        index: index + 1
      });
      console.log(`📝 [標籤解析] 任務"${task.text}"無標籤`);
    }
  });

  // 轉換為數組格式，方便處理
  const tagGroupsArray = Array.from(tagGroups.entries()).map(([tagName, tasks]) => ({
    tagName,
    tasks,
    taskCount: tasks.length
  }));

  console.log(`🎯 [標籤解析] 完成 - 發現${tagGroupsArray.length}個標籤組，${untaggedTasks.length}個無標籤任務`);

  return {
    tagGroups: tagGroupsArray,
    untaggedTasks
  };
}

// 創建單個標籤專屬的 BUBBLE 頁面
function createTagBubble(tagName, tasks, userTags = null) {
  console.log(`🏷️ [標籤BUBBLE] 為標籤"${tagName}"生成BUBBLE頁面，包含${tasks.length}個任務`);

  // 尋找標籤的圖標和顏色
  let tagIcon = '🏷️';
  let tagColor = '#4169E1';

  if (userTags && Array.isArray(userTags)) {
    const userTag = userTags.find(tag => tag.name === tagName);
    if (userTag) {
      tagIcon = userTag.icon || '🏷️';
      tagColor = userTag.color || '#4169E1';
    }
  }

  // 創建任務內容列表
  const taskContents = [];

  tasks.forEach((task, index) => {
    const isCompleted = task.completed || false;

    // 任務內容結構
    const taskBoxContents = [
      {
        type: 'text',
        text: `${task.index}. ${task.text}`,
        size: 'sm',
        color: isCompleted ? '#999999' : '#333333',
        flex: 1,
        wrap: true,
        decoration: isCompleted ? 'line-through' : 'none',
        margin: 'none',
        action: {
          type: 'uri',
          uri: `https://138b00c20997.ngrok.app/liff-app.html?taskId=${task.id}&taskText=${encodeURIComponent(task.originalText || task.text)}`
        }
      }
    ];

    // 如果有備註，在任務下方顯示
    if (task.note && task.note.trim()) {
      taskBoxContents.push({
        type: 'text',
        text: `💬 ${task.note}`,
        size: 'xs',
        color: '#666666',
        flex: 1,
        wrap: true,
        margin: 'xs'
      });
    }

    taskContents.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      paddingAll: 'md',
      alignItems: 'flex-start',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          contents: taskBoxContents
        },
        {
          type: 'text',
          text: '🖼️',
          size: 'md',
          color: '#ff4757',
          flex: 0,
          margin: 'xs',
          action: {
            type: 'message',
            label: '發送圓角圖片',
            text: `圓角圖片_${task.id}`
          }
        },
        {
          type: 'text',
          text: '𖤘',
          size: 'md',
          color: '#000000',
          flex: 0,
          margin: 'xs'
        },
        {
          type: 'text',
          text: '❏',
          size: 'md',
          color: '#000000',
          flex: 0,
          margin: 'xs',
          action: {
            type: 'message',
            label: '加入收藏卡',
            text: `加入收藏卡_${task.id}`
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
            type: 'message',
            label: '收藏任務',
            text: `收藏任務_${task.id}`
          }
        },
        {
          type: 'text',
          text: isCompleted ? '🅥' : '○',
          size: 'lg',
          color: '#000000',
          flex: 0,
          align: 'center',
          action: {
            type: 'message',
            label: '完成任務',
            text: `完成任務_${task.id}`
          }
        }
      ]
    });

    // 如果不是最後一個任務，添加分隔線
    if (index < tasks.length - 1) {
      taskContents.push({
        type: 'separator',
        margin: 'xs',
        color: '#E0E0E0'
      });
    }
  });

  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'md',
      backgroundColor: tagColor,
      contents: [
        {
          type: 'text',
          text: `${tagIcon} ${tagName}`,
          color: '#FFFFFF',
          size: 'md',
          weight: 'bold',
          align: 'center'
        },
        {
          type: 'text',
          text: `${tasks.length} 個任務`,
          color: '#FFFFFF',
          size: 'xs',
          align: 'center',
          margin: 'xs'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'lg',
      backgroundColor: '#FFF8DC',
      contents: taskContents.length > 0 ? taskContents : [
        {
          type: 'text',
          text: '此標籤暫無任務',
          color: '#999999',
          align: 'center',
          size: 'sm'
        }
      ]
    }
  };
}

// 創建主任務清單（帶展開標籤按鈕）
function createMainTaskList(tasks, userTags = null, completedCount = 0, favoriteCount = 0) {
  console.log('🚨 [MAIN TASK LIST] createMainTaskList 函數被調用 - 單一 BUBBLE 版本');

  // 顯示所有今天的任務，讓 LINE 的大小限制自然生效
  let displayTasks = tasks || [];
  console.log(`📋 [MAIN TASK LIST] 顯示全部 ${displayTasks.length} 個今天任務`);

  // 使用顯示的任務數量為統計基礎
  const displayedTotal = displayTasks.length;
  const displayedCompleted = displayTasks.filter(task => task.completed).length;
  const displayedPending = displayedTotal - displayedCompleted;

  console.log(`📋 [MAIN TASK LIST] 實際顯示 ${displayTasks.length} 個任務`);

  // 創建任務清單內容
  const taskContents = [];

  if (displayTasks) {
    displayTasks.forEach((task, index) => {
      const isCompleted = task.completed || false;

      // 添加任務項目
      const taskBoxContents = [
        {
          type: 'text',
          text: task.text,
          size: 'sm',
          color: isCompleted ? '#999999' : '#333333',
          flex: 1,
          wrap: true,
          decoration: isCompleted ? 'line-through' : 'none',
          margin: 'none',
          action: {
            type: 'uri',
            uri: `https://138b00c20997.ngrok.app/liff-app.html?taskId=${task.id}&taskText=${encodeURIComponent(task.text)}`
          }
        }
      ];

      // 如果有備註，在任務下方顯示
      if (task.note && task.note.trim()) {
        console.log(`💬 [MAIN TASK LIST 備註] 任務 ${task.id} 正在顯示備註: "${task.note}"`);
        taskBoxContents.push({
          type: 'text',
          text: `💬 ${task.note}`,
          size: 'xs',
          color: '#666666',
          flex: 1,
          wrap: true,
          margin: 'xs'
        });
      } else {
        console.log(`❌ [MAIN TASK LIST 備註] 任務 ${task.id} 沒有備註或備註為空: "${task.note}"`);
      }

      taskContents.push({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        paddingAll: 'md',
        alignItems: 'flex-start',
        contents: [
          {
            type: 'text',
            text: isCompleted ? '🅥' : '○',
            size: 'lg',
            color: '#000000',
            flex: 0,
            align: 'center',
            margin: 'xs',
            action: {
              type: 'message',
              label: '完成任務',
              text: `完成任務_${task.id}`
            }
          },
          {
            type: 'box',
            layout: 'vertical',
            flex: 1,
            contents: taskBoxContents
          },
          {
            type: 'text',
            text: task.favorited ? '★' : '☆',
            size: 'md',
            color: '#000000',
            flex: 0,
            margin: 'xs',
            action: {
              type: 'message',
              label: '收藏任務',
              text: `收藏任務_${task.id}`
            }
          }
        ]
      });

      // 如果不是最後一個任務，添加分隔線
      if (index < displayTasks.length - 1) {
        taskContents.push({
          type: 'separator',
          margin: 'xs',
          color: '#C0C0C0'
        });
      }
    });
  }

  // 添加統計訊息、快捷功能區塊和展開標籤按鈕
  taskContents.push(
    {
      type: 'separator',
      margin: 'md',
      color: '#E0E0E0'
    },
    {
      type: 'text',
      text: `已完成 ${displayedCompleted} 件，待完成 ${displayedPending} 件`,
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
      spacing: 'sm',
      margin: 'md',
      contents: [
        {
          type: 'text',
          text: '日歷',
          size: 'xs',
          color: '#000000',
          align: 'center',
          flex: 1,
          action: {
            type: 'uri',
            uri: 'https://138b00c20997.ngrok.app/liff/records'
          }
        },
        {
          type: 'text',
          text: '收藏',
          size: 'xs',
          color: '#000000',
          align: 'center',
          flex: 1,
          action: {
            type: 'uri',
            uri: 'https://138b00c20997.ngrok.app/liff/favorites'
          }
        },
        {
          type: 'text',
          text: '收藏卡',
          size: 'xs',
          color: '#000000',
          align: 'center',
          flex: 1,
          action: {
            type: 'uri',
            uri: 'https://138b00c20997.ngrok.app/liff/collections'
          }
        },
        {
          type: 'text',
          text: '我的',
          size: 'xs',
          color: '#000000',
          align: 'center',
          flex: 1,
          action: {
            type: 'uri',
            uri: 'https://138b00c20997.ngrok.app/liff/account'
          }
        }
      ]
    },
    {
      type: 'separator',
      margin: 'md',
      color: '#E0E0E0'
    },
    {
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      margin: 'md',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'none',
          paddingAll: 'sm',
          backgroundColor: '#667eea',
          cornerRadius: '8px',
          flex: 1,
          contents: [
            {
              type: 'text',
              text: '🏷️ 展開標籤',
              size: 'sm',
              color: '#FFFFFF',
              align: 'center',
              weight: 'bold',
              flex: 1,
              action: {
                type: 'postback',
                label: '展開標籤',
                data: 'expand_tags'
              }
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'none',
          paddingAll: 'sm',
          backgroundColor: '#ff6b6b',
          cornerRadius: '8px',
          flex: 1,
          contents: [
            {
              type: 'text',
              text: '📦 展開收藏卡',
              size: 'sm',
              color: '#FFFFFF',
              align: 'center',
              weight: 'bold',
              flex: 1,
              action: {
                type: 'postback',
                label: '展開收藏卡',
                data: 'expand_collections'
              }
            }
          ]
        }
      ]
    }
  );

  return {
    type: 'flex',
    altText: `顯示 ${displayedTotal} 件事`,
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
            text: `顯示 ${displayedTotal} 件事`,
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
        contents: taskContents
      }
    }
  };
}

// 創建動態標籤 Carousel FLEX Message
function createDynamicTagCarousel(tasks, userTags = null, completedCount = 0, favoriteCount = 0) {
  console.log('🎠 [動態標籤CAROUSEL] 開始生成動態標籤輪播訊息');

  // 解析任務標籤
  const { tagGroups, untaggedTasks } = parseTasksByTags(tasks);

  const bubbles = [];

  // 第1個bubble: 主任務清單 (包含所有任務)
  const mainBubble = createTaskStackFlexMessage(tasks, userTags);
  bubbles.push(mainBubble.contents);

  // 為每個標籤創建專屬 BUBBLE 頁面
  tagGroups.forEach(group => {
    const tagBubble = createTagBubble(group.tagName, group.tasks, userTags);
    bubbles.push(tagBubble);
  });

  // 如果有無標籤任務，創建一個「其他」分類的 BUBBLE
  if (untaggedTasks.length > 0) {
    const otherBubble = createTagBubble('其他', untaggedTasks, [{ name: '其他', icon: '📝', color: '#999999' }]);
    bubbles.push(otherBubble);
  }

  // 最後加入統計卡片
  const statsBubble = createTaskStatsCard(completedCount, favoriteCount);
  bubbles.push(statsBubble.contents);

  console.log(`🎯 [動態標籤CAROUSEL] 生成完成 - 總共${bubbles.length}個BUBBLE頁面`);

  const tagCount = tagGroups.length + (untaggedTasks.length > 0 ? 1 : 0);

  return {
    type: 'flex',
    altText: `今天 ${tasks ? tasks.length : 0} 件事要做 - ${tagCount}個標籤分類`,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}

// 創建3個Bubble的Carousel FLEX Message (保留原功能)
function create3BubbleCarousel(tasks, userTags = null, completedCount = 0, favoriteCount = 0) {
  console.log('🎠 [CAROUSEL] 生成3個Bubble輪播訊息');

  // 第1個bubble: 主任務清單
  const mainBubble = createTaskStackFlexMessage(tasks, userTags);

  // 第2個bubble: 統計卡片
  const statsBubble = createTaskStatsCard(completedCount, favoriteCount);

  // 第3個bubble: 快捷功能卡片
  const quickActionBubble = createQuickActionCard();

  return {
    type: 'flex',
    altText: `今天 ${tasks ? tasks.length : 0} 件事要做 - 3頁輪播`,
    contents: {
      type: 'carousel',
      contents: [
        mainBubble.contents,
        statsBubble.contents,
        quickActionBubble.contents
      ]
    }
  };
}

// 創建收藏卡展開 BUBBLE
function createCollectionsBubble() {
  console.log('📦 [收藏卡BUBBLE] 生成收藏卡展開頁面');

  return {
    type: 'flex',
    altText: '收藏卡展開頁面',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        backgroundColor: '#ff6b6b',
        contents: [
          {
            type: 'text',
            text: '📦 收藏卡',
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            align: 'center'
          },
          {
            type: 'text',
            text: '您珍貴的收藏品',
            color: '#FFFFFF',
            size: 'xs',
            align: 'center',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        backgroundColor: '#FFF5F5',
        contents: [
          {
            type: 'text',
            text: '🚧 功能開發中',
            size: 'xl',
            weight: 'bold',
            color: '#ff6b6b',
            align: 'center',
            margin: 'lg'
          },
          {
            type: 'separator',
            margin: 'lg',
            color: '#ffcccb'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: '即將推出的功能：',
                size: 'md',
                weight: 'bold',
                color: '#333333'
              },
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '🌐 智能網址收藏',
                    size: 'sm',
                    color: '#666666'
                  },
                  {
                    type: 'text',
                    text: '📱 社群媒體快照',
                    size: 'sm',
                    color: '#666666'
                  },
                  {
                    type: 'text',
                    text: '🏷️ AI 智能標籤',
                    size: 'sm',
                    color: '#666666'
                  },
                  {
                    type: 'text',
                    text: '🔍 快速搜尋過濾',
                    size: 'sm',
                    color: '#666666'
                  },
                  {
                    type: 'text',
                    text: '📊 收藏統計分析',
                    size: 'sm',
                    color: '#666666'
                  }
                ]
              }
            ]
          },
          {
            type: 'separator',
            margin: 'lg',
            color: '#ffcccb'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: '🎯 前往收藏卡',
                size: 'sm',
                color: '#FFFFFF',
                align: 'center',
                weight: 'bold',
                flex: 1,
                paddingAll: 'md',
                backgroundColor: '#ff6b6b',
                cornerRadius: '8px',
                action: {
                  type: 'uri',
                  uri: 'https://138b00c20997.ngrok.app/liff/collections'
                }
              }
            ]
          }
        ]
      }
    }
  };
}

module.exports = {
  createTaskFlexMessage,
  createTaskStackFlexMessage,
  createTaskStatsCard,
  generateQuickReply,
  createQuickActionCard,
  create3BubbleCarousel,
  createDynamicTagCarousel,
  createMainTaskList,
  parseTasksByTags,
  createTagBubble,
  createCollectionsBubble
};
