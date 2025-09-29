// 任務 Flex Message 建構器 - 統計卡片功能版本 2025-09-11-23:50-STATS-CARD-LATEST

// 生成帶日期的標題函數
function generateDateTitle(dayOffset = 0) {
  // 獲取台灣當前日期和星期，並加上偏移天數
  const now = new Date();
  const taipeiDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));

  // 加上偏移天數
  taipeiDate.setDate(taipeiDate.getDate() + dayOffset);

  const month = taipeiDate.getMonth() + 1;
  const day = taipeiDate.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[taipeiDate.getDay()];

  console.log(`📅 [日期生成] 台灣時間+${dayOffset}天: ${month}/${day} (${weekday})`);

  return {
    dateText: `${month}/${day}`,
    weekdayText: ` (${weekday})`
  };
}

function generateTomorrowTitle(taskCount) {
  // 獲取台灣明天日期和星期
  const now = new Date();
  const taipeiDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
  taipeiDate.setDate(taipeiDate.getDate() + 1);
  const month = taipeiDate.getMonth() + 1;
  const day = taipeiDate.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[taipeiDate.getDay()];

  return {
    dateText: `${month}/${day}`,
    weekdayText: ` (${weekday})`
  };
}

function generateDayAfterTomorrowTitle(taskCount) {
  // 獲取台灣後天日期和星期
  const now = new Date();
  const taipeiDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
  taipeiDate.setDate(taipeiDate.getDate() + 2);
  const month = taipeiDate.getMonth() + 1;
  const day = taipeiDate.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[taipeiDate.getDay()];

  return {
    dateText: `${month}/${day}`,
    weekdayText: ` (${weekday})`
  };
}


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

// 任務堆疊 Flex Message - 支援動態標籤 Quick Reply 和 Tab Segment
function createTaskStackFlexMessage(tasks, userTags = null, activeTab = 'general', dayOffset = 0) {
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

  // 創建任務清單內容，針對標籤模式添加分組邏輯
  const taskContents = [];

  if (activeTab === 'tags') {
    // 標籤模式：按標籤分組顯示
    const { parseTasksByTags } = require('./task-flex-message');
    const { tagGroups, untaggedTasks } = parseTasksByTags(displayTasks);

    // 顯示各標籤組
    tagGroups.forEach(group => {
      // 添加標籤標題
      taskContents.push({
        type: 'text',
        text: group.tagName,
        weight: 'bold',
        size: 'md',
        color: '#333333',
        margin: 'lg'
      });

      // 添加該標籤組的所有任務到一個框架中
      const groupTaskContents = [];
      group.tasks.forEach((task, taskIndex) => {
        const isCompleted = task.completed || false;

        // 建立任務文字和時間的水平佈局容器
        const taskAndTimeBox = [
          {
            type: 'text',
            text: task.text,
            size: 'sm',
            color: isCompleted ? '#999999' : '#333333',
            flex: 1,
            wrap: true,
            decoration: isCompleted ? 'line-through' : 'none',
            action: {
              type: 'uri',
              uri: `https://138b00c20997.ngrok.app/liff-app.html?taskId=${task.id}&taskText=${encodeURIComponent(task.text)}`
            }
          }
        ];

        // 如果有預定時間，在任務同行右邊顯示
        if (task.scheduled_date || task.scheduledDate) {
          const timeField = task.scheduled_date || task.scheduledDate;
          console.log(`⏰ [FLEX 標籤時間] 任務 ${task.id} 顯示預定時間: ${timeField}`);
          // 將時間格式轉換為較易閱讀的格式
          const date = new Date(timeField);
          const formattedTime = date.toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
          });
          taskAndTimeBox.push({
            type: 'text',
            text: formattedTime,
            size: 'xs',
            color: isCompleted ? '#CCCCCC' : '#666666',
            flex: 0,
            align: 'end'
          });
        }

        groupTaskContents.push({
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: isCompleted ? '🅥' : '○',
              size: 'lg',
              color: '#000000',
              flex: 0,
              align: 'center'
            },
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'sm',
              contents: taskAndTimeBox,
              flex: 1
            }
          ]
        });

        // 任務之間添加分隔線（除了最後一個）
        if (taskIndex < group.tasks.length - 1) {
          groupTaskContents.push({
            type: 'separator',
            margin: 'sm'
          });
        }
      });

      // 添加帶框架的標籤組
      taskContents.push({
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        margin: 'md',
        paddingAll: 'md',
        backgroundColor: '#F8F8F8',
        cornerRadius: '8px',
        contents: groupTaskContents
      });
    });

    // 顯示無標籤任務
    if (untaggedTasks.length > 0) {
      taskContents.push({
        type: 'text',
        text: '無標籤',
        weight: 'bold',
        size: 'md',
        color: '#333333',
        margin: 'lg'
      });

      const untaggedContents = [];
      untaggedTasks.forEach((task, taskIndex) => {
        const isCompleted = task.completed || false;

        // 建立任務文字和時間的水平佈局容器
        const untaggedTaskAndTimeBox = [
          {
            type: 'text',
            text: task.text,
            size: 'sm',
            color: isCompleted ? '#999999' : '#333333',
            flex: 1,
            wrap: true,
            decoration: isCompleted ? 'line-through' : 'none',
            action: {
              type: 'uri',
              uri: `https://138b00c20997.ngrok.app/liff-app.html?taskId=${task.id}&taskText=${encodeURIComponent(task.text)}`
            }
          }
        ];

        // 如果有預定時間，在任務同行右邊顯示
        if (task.scheduled_date || task.scheduledDate) {
          const timeField = task.scheduled_date || task.scheduledDate;
          console.log(`⏰ [FLEX 無標籤時間] 任務 ${task.id} 顯示預定時間: ${timeField}`);
          // 將時間格式轉換為較易閱讀的格式
          const date = new Date(timeField);
          const formattedTime = date.toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
          });
          untaggedTaskAndTimeBox.push({
            type: 'text',
            text: formattedTime,
            size: 'xs',
            color: isCompleted ? '#CCCCCC' : '#666666',
            flex: 0,
            align: 'end'
          });
        }

        untaggedContents.push({
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: isCompleted ? '🅥' : '○',
              size: 'lg',
              color: '#000000',
              flex: 0,
              align: 'center'
            },
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'sm',
              contents: untaggedTaskAndTimeBox,
              flex: 1
            }
          ]
        });

        if (taskIndex < untaggedTasks.length - 1) {
          untaggedContents.push({
            type: 'separator',
            margin: 'sm'
          });
        }
      });

      taskContents.push({
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        margin: 'md',
        paddingAll: 'md',
        backgroundColor: '#F8F8F8',
        cornerRadius: '8px',
        contents: untaggedContents
      });
    }
  } else {
    // 一般模式：原本的顯示方式
    displayTasks.forEach((task, index) => {
    const isCompleted = task.completed || false;

    // 調試：檢查每個任務的備註資料
    console.log(`🔍 [FLEX 調試] 任務 ${task.id} (${task.text}):`, {
      hasNote: !!task.note,
      noteContent: task.note,
      noteLength: task.note ? task.note.length : 0
    });

    // 添加任務項目 - 支援備註顯示
    // 建立任務文字和時間的水平佈局容器
    const taskAndTimeBox = [
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

    // 如果有預定時間，在任務同行右邊顯示
    if (task.scheduled_date || task.scheduledDate) {
      const timeField = task.scheduled_date || task.scheduledDate;
      console.log(`⏰ [FLEX 時間] 任務 ${task.id} 顯示預定時間: ${timeField}`);
      // 將時間格式轉換為較易閱讀的格式
      const date = new Date(timeField);
      const formattedTime = date.toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      });
      taskAndTimeBox.push({
        type: 'text',
        text: formattedTime,
        size: 'xs',
        color: '#0084ff',
        flex: 0,
        wrap: false,
        align: 'end',
        margin: 'sm'
      });
    }

    // 建立任務主要內容區塊（包含任務文字/時間的水平佈局）
    const taskBoxContents = [
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
          contents: taskAndTimeBox
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
  }

  // 生成帶日期的標題
  const titleData = generateDateTitle(dayOffset);
  const altText = titleData.dateText + titleData.weekdayText;

  // Linus 風格：資料結構簡單，直接附加 Quick Reply
  const flexMessage = {
    type: 'flex',
    altText: altText,
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        backgroundColor: '#FFFFFF',
        contents: [
          createTabSegment(activeTab),
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: titleData.dateText + titleData.weekdayText,
                size: 'lg',
                weight: 'bold',
                color: '#333333',
                align: 'center',
                flex: 1
              }
            ]
          }
        ].concat(taskContents).concat([
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
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#E8E8E8',
                cornerRadius: '8px',
                paddingTop: 'xs',
                paddingBottom: 'xs',
                paddingStart: 'md',
                paddingEnd: 'md',
                flex: 0,
                action: {
                  type: 'postback',
                  label: '常用任務',
                  data: 'frequent_tasks'
                },
                contents: [
                  {
                    type: 'text',
                    text: '常用',
                    size: 'sm',
                    color: '#666666',
                    align: 'center'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#E8E8E8',
                cornerRadius: '8px',
                paddingTop: 'xs',
                paddingBottom: 'xs',
                paddingStart: 'md',
                paddingEnd: 'md',
                flex: 0,
                margin: 'md',
                action: {
                  type: 'postback',
                  label: '卡片',
                  data: 'card_collection'
                },
                contents: [
                  {
                    type: 'text',
                    text: '卡片',
                    size: 'sm',
                    color: '#666666',
                    align: 'center'
                  }
                ]
              },
              {
                type: 'text',
                text: '近7天 »',
                size: 'sm',
                color: '#000000',
                align: 'end',
                weight: 'regular',
                flex: 1,
                action: {
                  type: 'postback',
                  label: '近7天',
                  data: `expand_frequent_tasks_pages_${activeTab}`
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

// 創建 Tab Segment 組件
function createTabSegment(activeTab = 'general') {
  console.log(`🔄 [Tab Segment] 生成 tab segment，當前活躍: ${activeTab}`);

  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'sm',
    contents: [
      {
        type: 'filler'
      },
      {
        type: 'box',
        layout: 'horizontal',
        backgroundColor: '#E8E8E8',
        cornerRadius: '8px',
        paddingAll: 'xs',
        flex: 2,
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            ...(activeTab === 'general' ? { backgroundColor: '#CD853F' } : {}),
            cornerRadius: '6px',
            paddingAll: 'xs',
            flex: 1,
            action: {
              type: 'postback',
              label: '切換到一般視圖',
              data: 'switch_tab_general'
            },
            contents: [
              {
                type: 'text',
                text: '一般',
                size: 'sm',
                weight: activeTab === 'general' ? 'bold' : 'regular',
                color: activeTab === 'general' ? '#FFFFFF' : '#666666',
                align: 'center'
              }
            ]
          },
          {
            type: 'box',
            layout: 'vertical',
            ...(activeTab === 'tags' ? { backgroundColor: '#CD853F' } : {}),
            cornerRadius: '6px',
            paddingAll: 'xs',
            flex: 1,
            action: {
              type: 'postback',
              label: '切換到標籤視圖',
              data: 'switch_tab_tags'
            },
            contents: [
              {
                type: 'text',
                text: '標籤',
                size: 'sm',
                weight: activeTab === 'tags' ? 'bold' : 'regular',
                color: activeTab === 'tags' ? '#FFFFFF' : '#666666',
                align: 'center'
              }
            ]
          }
        ]
      },
      {
        type: 'filler'
      }
    ]
  };
}

// 生成動態 Quick Reply
function generateQuickReply(userTags) {
  console.log(`🔍 [Quick Reply] 生成固定的四個按鈕：日曆、收藏、分析、我的`);

  // 固定的四個Quick Reply按鈕
  const quickReplyItems = [
    {
      type: 'action',
      action: {
        type: 'uri',
        label: '日曆',
        uri: 'https://138b00c20997.ngrok.app/liff/records'
      }
    },
    {
      type: 'action',
      action: {
        type: 'uri',
        label: '收藏',
        uri: 'https://138b00c20997.ngrok.app/liff/collections'
      }
    },
    {
      type: 'action',
      action: {
        type: 'uri',
        label: '分析',
        uri: 'https://138b00c20997.ngrok.app/liff-analytics.html'
      }
    },
    {
      type: 'action',
      action: {
        type: 'uri',
        label: '我的',
        uri: 'https://138b00c20997.ngrok.app/liff/account'
      }
    }
  ];

  console.log(`🎯 [Quick Reply] 生成 ${quickReplyItems.length} 個固定按鈕`);

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


// 解析任務中的標籤，並按標籤分組 - 使用 dev_messages.tag 欄位
function parseTasksByTags(tasks) {
  console.log('🏷️ [標籤解析] 開始解析任務標籤 - 使用 dev_messages.tag 欄位');

  const tagGroups = new Map();
  const untaggedTasks = [];

  if (!tasks || !Array.isArray(tasks)) {
    console.log('❌ [標籤解析] 無有效任務資料');
    return { tagGroups: [], untaggedTasks: [] };
  }

  tasks.forEach((task, index) => {
    // 使用 dev_messages 表的 tag 欄位
    const tagName = task.tag && task.tag.trim() !== '' && task.tag !== '無' ? task.tag.trim() : null;
    console.log(`🔍 [標籤解析] 任務 "${task.text}" 的標籤: "${tagName || '無標籤'}"`);

    if (tagName) {
      if (!tagGroups.has(tagName)) {
        tagGroups.set(tagName, []);
      }

      // 創建新的任務對象，保留原本的任務資料
      const taggedTask = {
        ...task,
        tagName: tagName,
        index: index + 1
      };

      tagGroups.get(tagName).push(taggedTask);
      console.log(`📋 [標籤解析] 任務"${task.text}"歸類到標籤"${tagName}"`);
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
  let tagIcon = '𕸘🏷️';
  let tagColor = '#4169E1';

  if (userTags && Array.isArray(userTags)) {
    const userTag = userTags.find(tag => tag.name === tagName);
    if (userTag) {
      tagIcon = userTag.icon || '𕸘🏷️';
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
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          contents: taskBoxContents
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
      type: 'separator',
      margin: 'md',
      color: '#E0E0E0'
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

  // 生成帶日期的標題
  const titleData = generateDateTitle(dayOffset);
  const altText = titleData.dateText + titleData.weekdayText;

  return {
    type: 'flex',
    altText: altText,
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        backgroundColor: '#FFFFFF',
        contents: taskContents
      }
    }
  };
}

// 創建基於標籤分組的 FLEX Message - 顯示各標籤及其任務
function createTagGroupedFlexMessage(tasks, userTags = null) {
  console.log('🏷️ [標籤分組] 開始生成標籤分組訊息');

  // 解析任務標籤
  const { tagGroups, untaggedTasks } = parseTasksByTags(tasks);

  // 創建主要內容
  const contents = [];

  // 標題 - 修改為 (一般)(標籤) 切換樣式，100%像圖2
  contents.push({
    type: 'box',
    layout: 'horizontal',
    spacing: 'none',
    margin: 'md',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#E8E8E8',
        cornerRadius: '20px 0px 0px 20px',
        paddingAll: 'sm',
        action: {
          type: 'postback',
          label: '一般',
          data: 'switch_tab_general'
        },
        contents: [
          {
            type: 'text',
            text: '一般',
            align: 'center',
            color: '#666666',
            size: 'sm'
          }
        ],
        flex: 1
      },
      {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#00C851',
        cornerRadius: '0px 20px 20px 0px',
        paddingAll: 'sm',
        action: {
          type: 'postback',
          label: '標籤',
          data: 'switch_tab_tags'
        },
        contents: [
          {
            type: 'text',
            text: '標籤',
            align: 'center',
            color: '#FFFFFF',
            size: 'sm'
          }
        ],
        flex: 1
      }
    ]
  });

  contents.push({
    type: 'text',
    text: `${new Date().toLocaleDateString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    })}`,
    size: 'sm',
    color: '#666666',
    margin: 'md'
  });

  // 為每個標籤組創建區塊
  tagGroups.forEach(group => {
    // 分隔線
    contents.push({
      type: 'separator',
      margin: 'md'
    });

    // 標籤標題
    let tagIcon = '🏷️';
    let tagColor = '#4169E1';

    if (userTags && Array.isArray(userTags)) {
      const userTag = userTags.find(tag => tag.name === group.tagName);
      if (userTag) {
        tagIcon = userTag.icon || '🏷️';
        tagColor = userTag.color || '#4169E1';
      }
    }

    // 標籤標題 - 移除數量顯示，只顯示標籤名稱
    contents.push({
      type: 'text',
      text: group.tagName,
      weight: 'bold',
      size: 'md',
      color: '#333333',
      margin: 'md'
    });

    // 創建標籤組邊框容器
    const tagGroupContents = [];

    // 任務預覽（顯示所有任務，改為 ○ 格式）
    group.tasks.forEach(task => {
      tagGroupContents.push({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        margin: 'xs',
        contents: [
          {
            type: 'text',
            text: '○',
            color: '#666666',
            flex: 0
          },
          {
            type: 'text',
            text: task.text,
            size: 'sm',
            color: '#333333',
            flex: 1,
            wrap: true
          }
        ]
      });
    });

    // 添加帶邊框的標籤組 (移除不支援的 borderWidth 和 borderColor)
    contents.push({
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      margin: 'md',
      paddingAll: 'md',
      backgroundColor: '#F8F8F8',
      cornerRadius: '8px',
      contents: tagGroupContents
    });

  });

  // 如果有無標籤任務
  if (untaggedTasks.length > 0) {
    // 無標籤標題
    contents.push({
      type: 'text',
      text: '無標籤',
      weight: 'bold',
      size: 'md',
      color: '#333333',
      margin: 'md'
    });

    // 創建無標籤任務邊框容器
    const untaggedContents = [];

    untaggedTasks.forEach(task => {
      untaggedContents.push({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        margin: 'xs',
        contents: [
          {
            type: 'text',
            text: '○',
            color: '#666666',
            flex: 0
          },
          {
            type: 'text',
            text: task.text,
            size: 'sm',
            color: '#333333',
            flex: 1,
            wrap: true
          }
        ]
      });
    });

    // 添加帶邊框的無標籤組
    contents.push({
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      margin: 'md',
      paddingAll: 'md',
      backgroundColor: '#FFFFFF',
      borderWidth: '1px',
      borderColor: '#E0E0E0',
      cornerRadius: '8px',
      contents: untaggedContents
    });
  }

  // 添加底部按鈕
  contents.push({
    type: 'separator',
    margin: 'xl'
  });

  contents.push({
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    margin: 'lg',
    contents: [
      {
        type: 'button',
        style: 'secondary',
        height: 'sm',
        action: {
          type: 'uri',
          label: '常用',
          uri: `${process.env.LIFF_BASE_URL || 'https://liff.line.me/2008077335-rZlgE4bX'}/liff-app.html?view=collections`
        },
        flex: 1
      },
      {
        type: 'button',
        style: 'secondary',
        height: 'sm',
        action: {
          type: 'uri',
          label: '卡片',
          uri: `${process.env.LIFF_BASE_URL || 'https://liff.line.me/2008077335-rZlgE4bX'}/liff-app.html?view=cards`
        },
        flex: 1
      }
    ]
  });

  return {
    type: 'flex',
    altText: `標籤視圖 - ${tagGroups.length}個標籤分類`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: contents
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

  // 第1個bubble: 主任務清單 (包含所有任務) - 標籤視圖
  const mainBubble = createTaskStackFlexMessage(tasks, userTags, 'tags');
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
                    text: '𕸘🏷️ AI 智能標籤',
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
                paddingTop: 'xs',
                paddingBottom: 'xs',
                paddingStart: 'md',
                paddingEnd: 'md',
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
  createTabSegment,
  createQuickActionCard,
  create3BubbleCarousel,
  createMainTaskList,
  parseTasksByTags,
  createTagBubble,
  createTagGroupedFlexMessage,
  createDynamicTagCarousel,
  createCollectionsBubble,
  generateTomorrowTitle,
  generateDayAfterTomorrowTitle,
  generateDateTitle
};
