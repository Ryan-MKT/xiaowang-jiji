// 載入環境變數（必須在最頂端）
require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const session = require('express-session');
const supabase = require('./supabase-client');
const { authenticateUser } = require('./auth');
const OpenAI = require('openai');
const fs = require('fs-extra');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');
const { google } = require('googleapis');
const { setupRoundedImageRoute, generateRoundedImageUrl, clearImageCache } = require('./realtime-rounded-image-api');
const { createBookmarkSuccessFlexMessage } = require('./flex-message-builder');
// 動態載入frequent-tasks-flex-message模組以支援熱重載（和其他FLEX MESSAGE一樣）
function getFrequentTasksFlexModule() {
  const modulePath = require.resolve('./frequent-tasks-flex-message');
  delete require.cache[modulePath];
  return require('./frequent-tasks-flex-message');
}

// 直接內嵌的常用任務FLEX MESSAGE生成函數（包含複製按鈕）
function generateFrequentTasksFlexMessageInline(frequentTasks) {
  console.log(`🎨 [常用任務FLEX內嵌] 開始生成 ${frequentTasks.length} 個常用任務的 FLEX MESSAGE`);

  // 如果沒有常用任務
  if (!frequentTasks || frequentTasks.length === 0) {
    return {
      type: 'flex',
      altText: '您還沒有常用任務',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '⭐ 常用任務',
              weight: 'bold',
              size: 'xl',
              color: '#333333'
            }
          ],
          paddingBottom: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '您還沒有設定任何常用任務',
              size: 'md',
              color: '#666666',
              wrap: true,
              align: 'center'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'text',
              text: '💡 提示：在編輯任務時開啟「加入常用」開關，即可將任務加入常用列表',
              size: 'sm',
              color: '#999999',
              wrap: true,
              margin: 'md'
            }
          ]
        }
      }
    };
  }

  // 生成任務項目
  const taskContents = [];

  frequentTasks.forEach((task, index) => {
    // 任務標題行（包含複製按鈕）
    taskContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${index + 1}.`,
          size: 'sm',
          color: '#666666',
          flex: 0,
          margin: 'none'
        },
        {
          type: 'text',
          text: task.task_text || '未命名任務',
          size: 'md',
          color: '#333333',
          weight: 'bold',
          wrap: true,
          flex: 1,
          margin: 'sm',
          action: {
            type: 'postback',
            label: '新增任務',
            data: `create_task_from_frequent|${task.task_text}|${task.tag || ''}|${task.note || ''}`
          }
        },
        {
          type: 'text',
          text: '📋 複製',
          size: 'xs',
          color: '#0084ff',
          flex: 0,
          align: 'center',
          action: {
            type: 'postback',
            label: '複製任務',
            data: `copy_frequent_task|${task.task_text}|${task.tag || ''}|${task.note || ''}`
          }
        }
      ],
      margin: index === 0 ? 'none' : 'md'
    });

    // 標籤（如果有的話）
    if (task.tag && task.tag !== '無') {
      taskContents.push({
        type: 'text',
        text: `🏷️ ${task.tag}`,
        size: 'xs',
        color: '#0084ff',
        margin: 'xs'
      });
    }

    // 備註（如果有的話）
    if (task.note && task.note.trim() !== '') {
      taskContents.push({
        type: 'text',
        text: `📝 ${task.note}`,
        size: 'xs',
        color: '#666666',
        wrap: true,
        margin: 'xs'
      });
    }

    // 分隔線（除了最後一個項目）
    if (index < frequentTasks.length - 1) {
      taskContents.push({
        type: 'separator',
        margin: 'md'
      });
    }
  });

  const flexMessage = {
    type: 'flex',
    altText: `⭐ 您的 ${frequentTasks.length} 個常用任務`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '⭐ 常用任務',
                weight: 'bold',
                size: 'xl',
                color: '#333333',
                flex: 1
              },
              {
                type: 'text',
                text: '➜',
                size: 'xl',
                color: '#0084ff',
                weight: 'bold',
                flex: 0,
                gravity: 'center',
                action: {
                  type: 'postback',
                  label: '展開更多頁面',
                  data: 'expand_frequent_tasks_pages'
                }
              }
            ]
          },
          {
            type: 'text',
            text: `共 ${frequentTasks.length} 個常用任務`,
            size: 'sm',
            color: '#666666',
            margin: 'xs'
          }
        ],
        paddingBottom: 'md'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '點擊任務名稱即可快速新增到待辦清單：',
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'none'
          },
          {
            type: 'separator',
            margin: 'md'
          },
          ...taskContents
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '🔄 重新整理',
              data: 'frequent_tasks'
            }
          }
        ]
      }
    }
  };

  console.log('✅ [常用任務FLEX內嵌] FLEX MESSAGE 生成完成');
  return flexMessage;
}

// 生成多頁常用任務 FLEX MESSAGE（1個原有頁面 + 3個新頁面）
function generateExpandedFrequentTasksFlexMessage(frequentTasks) {
  console.log(`🎨 [多頁常用任務FLEX] 開始生成多頁 FLEX MESSAGE，包含 ${frequentTasks ? frequentTasks.length : 0} 個常用任務`);

  // 第一頁：原有的常用任務頁面（修改為 carousel 格式）
  const originalBubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '⭐ 常用任務',
              weight: 'bold',
              size: 'xl',
              color: '#333333',
              flex: 1
            },
            {
              type: 'text',
              text: '第 1/4 頁',
              size: 'sm',
              color: '#666666',
              flex: 0,
              align: 'end'
            }
          ]
        },
        {
          type: 'text',
          text: `共 ${frequentTasks ? frequentTasks.length : 0} 個常用任務`,
          size: 'sm',
          color: '#666666',
          margin: 'xs'
        }
      ],
      paddingBottom: 'md'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: frequentTasks && frequentTasks.length > 0 ?
        createFrequentTasksContent(frequentTasks.slice(0, 6)) : // 顯示前6個任務
        [
          {
            type: 'text',
            text: '您還沒有設定任何常用任務',
            size: 'md',
            color: '#666666',
            wrap: true,
            align: 'center'
          }
        ]
    }
  };

  // 第二頁：統計頁面
  const statsPage = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '📊 任務統計',
              weight: 'bold',
              size: 'xl',
              color: '#333333',
              flex: 1
            },
            {
              type: 'text',
              text: '第 2/4 頁',
              size: 'sm',
              color: '#666666',
              flex: 0,
              align: 'end'
            }
          ]
        }
      ],
      paddingBottom: 'md',
      backgroundColor: '#f8f9fa'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '今日任務概覽',
          size: 'lg',
          weight: 'bold',
          color: '#333333',
          margin: 'none'
        },
        {
          type: 'separator',
          margin: 'md'
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '📝 總任務數',
              size: 'sm',
              color: '#666666',
              flex: 1
            },
            {
              type: 'text',
              text: frequentTasks ? frequentTasks.length.toString() : '0',
              size: 'sm',
              color: '#333333',
              weight: 'bold',
              flex: 0
            }
          ],
          margin: 'md'
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '⏰ 本週使用',
              size: 'sm',
              color: '#666666',
              flex: 1
            },
            {
              type: 'text',
              text: '12 次',
              size: 'sm',
              color: '#333333',
              weight: 'bold',
              flex: 0
            }
          ],
          margin: 'sm'
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '🔥 最熱門',
              size: 'sm',
              color: '#666666',
              flex: 1
            },
            {
              type: 'text',
              text: frequentTasks && frequentTasks.length > 0 ? frequentTasks[0].task_text.substring(0, 10) + '...' : '暫無',
              size: 'sm',
              color: '#333333',
              weight: 'bold',
              flex: 0
            }
          ],
          margin: 'sm'
        }
      ]
    }
  };

  // 第三頁：快捷操作頁面
  const quickActionsPage = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '⚡ 快捷操作',
              weight: 'bold',
              size: 'xl',
              color: '#333333',
              flex: 1
            },
            {
              type: 'text',
              text: '第 3/4 頁',
              size: 'sm',
              color: '#666666',
              flex: 0,
              align: 'end'
            }
          ]
        }
      ],
      paddingBottom: 'md',
      backgroundColor: '#e8f5e8'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          action: {
            type: 'uri',
            label: '📝 編輯常用任務',
            uri: 'https://138b00c20997.ngrok.app/liff-app.html'
          },
          margin: 'none'
        },
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'postback',
            label: '🔄 重新載入',
            data: 'frequent_tasks'
          },
          margin: 'md'
        },
        {
          type: 'separator',
          margin: 'lg'
        },
        {
          type: 'text',
          text: '🎯 快速新增',
          size: 'md',
          weight: 'bold',
          color: '#333333',
          margin: 'md'
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'message',
                label: '工作',
                text: '(工作)'
              },
              flex: 1
            },
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'message',
                label: '生活',
                text: '(生活)'
              },
              flex: 1,
              margin: 'sm'
            }
          ],
          margin: 'md'
        }
      ]
    }
  };

  // 第四頁：設定頁面
  const settingsPage = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '⚙️ 設定',
              weight: 'bold',
              size: 'xl',
              color: '#333333',
              flex: 1
            },
            {
              type: 'text',
              text: '第 4/4 頁',
              size: 'sm',
              color: '#666666',
              flex: 0,
              align: 'end'
            }
          ]
        }
      ],
      paddingBottom: 'md',
      backgroundColor: '#fff5ee'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '📱 應用設定',
          size: 'lg',
          weight: 'bold',
          color: '#333333',
          margin: 'none'
        },
        {
          type: 'separator',
          margin: 'md'
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔔 提醒設定',
              size: 'sm',
              color: '#666666',
              action: {
                type: 'message',
                label: '提醒設定',
                text: '提醒設定'
              }
            },
            {
              type: 'text',
              text: '🎨 介面主題',
              size: 'sm',
              color: '#666666',
              margin: 'md',
              action: {
                type: 'message',
                label: '介面主題',
                text: '介面主題'
              }
            },
            {
              type: 'text',
              text: '📊 資料匯出',
              size: 'sm',
              color: '#666666',
              margin: 'md',
              action: {
                type: 'message',
                label: '資料匯出',
                text: '資料匯出'
              }
            },
            {
              type: 'text',
              text: '❓ 說明文件',
              size: 'sm',
              color: '#666666',
              margin: 'md',
              action: {
                type: 'uri',
                label: '說明文件',
                uri: 'https://138b00c20997.ngrok.app/help'
              }
            }
          ],
          margin: 'md'
        }
      ]
    }
  };

  const carouselMessage = {
    type: 'flex',
    altText: '⭐ 常用任務多頁檢視 (1/4)',
    contents: {
      type: 'carousel',
      contents: [originalBubble, statsPage, quickActionsPage, settingsPage]
    }
  };

  console.log('✅ [多頁常用任務FLEX] 4頁 FLEX MESSAGE 生成完成');
  return carouselMessage;
}

// 創建常用任務內容的輔助函數
function createFrequentTasksContent(tasks) {
  const taskContents = [];

  taskContents.push({
    type: 'text',
    text: '點擊任務名稱即可快速新增到待辦清單：',
    size: 'sm',
    color: '#666666',
    wrap: true,
    margin: 'none'
  });

  taskContents.push({
    type: 'separator',
    margin: 'md'
  });

  tasks.forEach((task, index) => {
    // 任務標題行
    taskContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${index + 1}.`,
          size: 'sm',
          color: '#666666',
          flex: 0,
          margin: 'none'
        },
        {
          type: 'text',
          text: task.task_text || '未命名任務',
          size: 'md',
          color: '#333333',
          weight: 'bold',
          wrap: true,
          flex: 1,
          margin: 'sm',
          action: {
            type: 'postback',
            label: '新增任務',
            data: `create_task_from_frequent|${task.task_text}|${task.tag || ''}|${task.note || ''}`
          }
        },
        {
          type: 'text',
          text: '📋',
          size: 'sm',
          color: '#0084ff',
          flex: 0,
          align: 'center',
          action: {
            type: 'postback',
            label: '複製任務',
            data: `copy_frequent_task|${task.task_text}|${task.tag || ''}|${task.note || ''}`
          }
        }
      ],
      margin: index === 0 ? 'none' : 'md'
    });

    // 分隔線（除了最後一個項目）
    if (index < tasks.length - 1) {
      taskContents.push({
        type: 'separator',
        margin: 'md'
      });
    }
  });

  return taskContents;
}

// 動態載入模組以支援熱重載
function getTaskFlexModule() {
  const modulePath = require.resolve('./task-flex-message');
  delete require.cache[modulePath];
  return require('./task-flex-message');
}


// 用戶任務堆疊儲存（記憶體版本）
// 資料結構: Map<userId, Array<{text: string, id: number, timestamp: string}>>
const userTaskStacks = new Map();

// 🗓️ 日期過濾幫助函數：只返回今天的任務
function filterTodayTasks(allTasks) {
  console.log(`📅 [日期過濾] 開始過濾，總任務數: ${allTasks.length}`);

  // 獲取台灣當前時間的日期字符串 (YYYY-MM-DD)
  const now = new Date();
  const taiwanNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayDateString = taiwanNow.toISOString().split('T')[0];

  console.log(`📅 [日期過濾] 今天日期: ${todayDateString}`);

  const todayTasks = allTasks.filter(task => {
    // 如果沒有預定時間，視為今天的任務
    if (!task.scheduledDate) {
      console.log(`📅 [日期過濾] "${task.text}": 無時間 ✅今天`);
      return true;
    }

    // 正確解析台灣時區的日期
    // task.scheduledDate 格式: "2025-09-28T00:00:00+08:00"
    const taskDateStr = task.scheduledDate;

    // 從 ISO 字符串中提取日期部分
    let taskDateString;
    if (taskDateStr.includes('+08:00')) {
      // 如果已經包含台灣時區，直接提取日期部分
      taskDateString = taskDateStr.split('T')[0];
    } else {
      // 如果沒有時區信息，當作 UTC 處理
      const taskDate = new Date(taskDateStr);
      const taiwanTaskDate = new Date(taskDate.getTime() + 8 * 60 * 60 * 1000);
      taskDateString = taiwanTaskDate.toISOString().split('T')[0];
    }

    const isToday = taskDateString === todayDateString;
    console.log(`📅 [日期過濾] "${task.text}": ${taskDateString} ${isToday ? '✅今天' : '❌非今天'} (原始: ${taskDateStr})`);
    return isToday;
  });

  console.log(`📅 [日期過濾] 過濾結果：總任務數 ${allTasks.length} → 今天任務數 ${todayTasks.length}`);
  console.log(`📅 [日期過濾] 今天的任務: ${todayTasks.map(t => t.text).join(', ')}`);

  return todayTasks;
}

// 過濾明天的任務
function filterTomorrowTasks(allTasks) {
  console.log(`📅 [明天過濾] 開始過濾，總任務數: ${allTasks.length}`);

  // 獲取台灣明天的日期字符串 (YYYY-MM-DD)
  const now = new Date();
  const taiwanNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const tomorrowDate = new Date(taiwanNow.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateString = tomorrowDate.toISOString().split('T')[0];

  console.log(`📅 [明天過濾] 明天日期: ${tomorrowDateString}`);

  const tomorrowTasks = allTasks.filter(task => {
    // 如果沒有預定時間，不是明天的任務
    if (!task.scheduledDate) {
      return false;
    }

    // 正確解析台灣時區的日期
    const taskDateStr = task.scheduledDate;
    let taskDateString;
    if (taskDateStr.includes('+08:00')) {
      taskDateString = taskDateStr.split('T')[0];
    } else {
      const taskDate = new Date(taskDateStr);
      const taiwanTaskDate = new Date(taskDate.getTime() + 8 * 60 * 60 * 1000);
      taskDateString = taiwanTaskDate.toISOString().split('T')[0];
    }

    const isTomorrow = taskDateString === tomorrowDateString;
    console.log(`📅 [明天過濾] "${task.text}": ${taskDateString} ${isTomorrow ? '✅明天' : '❌非明天'}`);
    return isTomorrow;
  });

  console.log(`📅 [明天過濾] 過濾結果：總任務數 ${allTasks.length} → 明天任務數 ${tomorrowTasks.length}`);
  console.log(`📅 [明天過濾] 明天的任務: ${tomorrowTasks.map(t => t.text).join(', ')}`);

  return tomorrowTasks;
}

// 過濾後天的任務
function filterDayAfterTomorrowTasks(allTasks) {
  console.log(`📅 [後天過濾] 開始過濾，總任務數: ${allTasks.length}`);

  // 獲取台灣後天的日期字符串 (YYYY-MM-DD)
  const now = new Date();
  const taiwanNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const dayAfterTomorrowDate = new Date(taiwanNow.getTime() + 48 * 60 * 60 * 1000);
  const dayAfterTomorrowDateString = dayAfterTomorrowDate.toISOString().split('T')[0];

  console.log(`📅 [後天過濾] 後天日期: ${dayAfterTomorrowDateString}`);

  const dayAfterTomorrowTasks = allTasks.filter(task => {
    // 如果沒有預定時間，不是後天的任務
    if (!task.scheduledDate) {
      return false;
    }

    // 正確解析台灣時區的日期
    const taskDateStr = task.scheduledDate;
    let taskDateString;
    if (taskDateStr.includes('+08:00')) {
      taskDateString = taskDateStr.split('T')[0];
    } else {
      const taskDate = new Date(taskDateStr);
      const taiwanTaskDate = new Date(taskDate.getTime() + 8 * 60 * 60 * 1000);
      taskDateString = taiwanTaskDate.toISOString().split('T')[0];
    }

    const isDayAfterTomorrow = taskDateString === dayAfterTomorrowDateString;
    console.log(`📅 [後天過濾] "${task.text}": ${taskDateString} ${isDayAfterTomorrow ? '✅後天' : '❌非後天'}`);
    return isDayAfterTomorrow;
  });

  console.log(`📅 [後天過濾] 過濾結果：總任務數 ${allTasks.length} → 後天任務數 ${dayAfterTomorrowTasks.length}`);
  console.log(`📅 [後天過濾] 後天的任務: ${dayAfterTomorrowTasks.map(t => t.text).join(', ')}`);

  return dayAfterTomorrowTasks;
}

// 通用日期過濾函數：過濾指定天數偏移的任務
function filterTasksByDaysOffset(allTasks, daysOffset) {
  const dayName = ['今天', '明天', '後天', '第3天', '第4天', '第5天', '第6天'][daysOffset] || `第${daysOffset}天`;
  console.log(`📅 [${dayName}過濾] 開始過濾，總任務數: ${allTasks.length}`);

  // 獲取台灣指定天數後的日期字符串 (YYYY-MM-DD)
  const now = new Date();
  const taiwanNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const targetDate = new Date(taiwanNow.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  const targetDateString = targetDate.toISOString().split('T')[0];

  console.log(`📅 [${dayName}過濾] ${dayName}日期: ${targetDateString}`);

  const filteredTasks = allTasks.filter(task => {
    // 檢查任務是否有預定時間
    if (task.scheduledDate) {
      // 解析任務的預定日期
      const taskDate = new Date(task.scheduledDate);
      const taskDateString = taskDate.toISOString().split('T')[0];

      if (taskDateString === targetDateString) {
        console.log(`📅 [${dayName}過濾] "${task.text}": ${taskDateString} ✅${dayName}`);
        return true;
      } else {
        console.log(`📅 [${dayName}過濾] "${task.text}": ${taskDateString} ❌非${dayName} (原始: ${task.scheduledDate})`);
        return false;
      }
    } else {
      // 沒有預定時間的任務，只在今天顯示
      if (daysOffset === 0) {
        console.log(`📅 [${dayName}過濾] "${task.text}": 無時間 ✅${dayName}`);
        return true;
      } else {
        return false;
      }
    }
  });

  console.log(`📅 [${dayName}過濾] 過濾結果：總任務數 ${allTasks.length} → ${dayName}任務數 ${filteredTasks.length}`);

  if (filteredTasks.length > 0) {
    console.log(`📅 [${dayName}過濾] ${dayName}的任務: ${filteredTasks.map(t => t.text).join(', ')}`);
  } else {
    console.log(`📅 [${dayName}過濾] ${dayName}的任務: 無`);
  }

  return filteredTasks;
}

// 用戶收藏任務儲存（記憶體版本）
// 資料結構: Map<userId, Array<{id: string, name: string, description: string, category: string, used_count: number, created_at: string}>>
const userFavoriteTasks = new Map();

// 用戶標籤選擇狀態追蹤（記憶體版本）
// 資料結構: Map<userId, {waitingForTag: boolean, targetTaskId: number, timestamp: number}>
const userTagSelectionStates = new Map();

// 創建收藏卡片 FLEX MESSAGE 函數
async function createFavoritesFlexMessage(favorites) {
  if (!favorites || favorites.length === 0) {
    return {
      type: 'text',
      text: '📋 今天還沒有收藏任何卡片'
    };
  }

  // 限制最多顯示 10 張卡片
  const displayFavorites = favorites.slice(0, 10);

  if (displayFavorites.length === 1) {
    // 單張卡片，使用 bubble
    const favorite = displayFavorites[0];
    return createSingleFavoriteBubble(favorite);
  } else {
    // 多張卡片，使用 carousel
    return createFavoritesCarousel(displayFavorites);
  }
}

// 創建單張收藏卡片 bubble
function createSingleFavoriteBubble(favorite) {
  // 使用收藏頁相同的標題欄位
  const displayTitle = favorite.preview_title || favorite.social_account_name || favorite.title || '無標題';
  const title = displayTitle.length > 40 ? displayTitle.substring(0, 40) + '...' : displayTitle;

  // 🚀 與收藏頁面完全一致的圖片優先級邏輯
  let displayImage = null;

  // 第一優先：根層級 preview_image（新版本主要存放位置）
  if (favorite.preview_image) {
    displayImage = favorite.preview_image;
    console.log(`🖼️ [收藏卡片-單張] 使用根層級 preview_image:`, displayImage.substring(0, 100) + '...');
  }
  // 第二優先：content.preview_image（新版本內容欄位）
  else if (favorite.content && favorite.content.preview_image) {
    displayImage = favorite.content.preview_image;
    console.log(`🖼️ [收藏卡片-單張] 使用 content.preview_image:`, displayImage.substring(0, 100) + '...');
  }
  // 第三優先：content.image（舊架構）
  else if (favorite.content && favorite.content.image) {
    displayImage = favorite.content.image;
    console.log(`🖼️ [收藏卡片-單張] 使用 content.image:`, displayImage.substring(0, 100) + '...');
  }

  // 🚀 針對 scontent.fbcdn.net 直接使用，其他使用代理
  if (displayImage) {
    if (displayImage.includes('scontent') && displayImage.includes('fbcdn.net')) {
      // scontent 直接圖片不需要代理
      console.log(`🖼️ [收藏卡片-單張] 直接使用 scontent URL:`, displayImage);
    } else {
      // lookaside 等其他圖片使用代理
      displayImage = `${process.env.BASE_URL}/api/image-proxy?url=${encodeURIComponent(displayImage)}`;
      console.log(`🖼️ [收藏卡片-單張] 使用圖片代理 URL:`, displayImage);
    }
    console.log(`🔍 [收藏卡片-單張] 原始圖片 URL:`, favorite.preview_image || favorite.content?.preview_image || favorite.content?.image);
  } else {
    displayImage = 'https://picsum.photos/400/300';
    console.log(`🖼️ [收藏卡片-單張] 無圖片，使用預設圖片`);
  }

  return {
    type: 'flex',
    altText: `今天收藏：${title}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📋 今天的收藏',
            weight: 'bold',
            size: 'md',
            color: '#1DB446'
          }
        ],
        paddingAll: 'sm'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'image',
            url: displayImage,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          {
            type: 'text',
            text: title,
            wrap: true,
            size: 'sm',
            color: '#333333',
            margin: 'md'
          },
          {
            type: 'text',
            text: new Date(favorite.created_at).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            size: 'xs',
            color: '#888888',
            margin: 'sm'
          }
        ],
        paddingAll: 'lg'
      }
    }
  };
}

// 創建多張收藏卡片 carousel
function createFavoritesCarousel(favorites) {
  const bubbles = favorites.map((favorite, index) => {
    console.log(`🔍 [收藏卡片-輪播] 項目 ${index + 1}:`, {
      id: favorite.id,
      preview_image: favorite.preview_image,
      content_preview_image: favorite.content?.preview_image,
      content_image: favorite.content?.image,
      title: favorite.preview_title || favorite.title
    });

    const displayTitle = favorite.preview_title || favorite.social_account_name || favorite.title || '無標題';
    const title = displayTitle.length > 30
      ? displayTitle.substring(0, 30) + '...'
      : displayTitle;

    // 🚀 與收藏頁面完全一致的圖片優先級邏輯
    let displayImage = null;

    // 第一優先：根層級 preview_image（新版本主要存放位置）
    if (favorite.preview_image) {
      displayImage = favorite.preview_image;
      console.log(`🖼️ [收藏卡片-輪播] 項目 ${index + 1} 使用根層級 preview_image:`, displayImage.substring(0, 100) + '...');
    }
    // 第二優先：content.preview_image（新版本內容欄位）
    else if (favorite.content && favorite.content.preview_image) {
      displayImage = favorite.content.preview_image;
      console.log(`🖼️ [收藏卡片-輪播] 項目 ${index + 1} 使用 content.preview_image:`, displayImage.substring(0, 100) + '...');
    }
    // 第三優先：content.image（舊架構）
    else if (favorite.content && favorite.content.image) {
      displayImage = favorite.content.image;
      console.log(`🖼️ [收藏卡片-輪播] 項目 ${index + 1} 使用 content.image:`, displayImage.substring(0, 100) + '...');
    }

    // 🚀 針對 scontent.fbcdn.net 直接使用，其他使用代理
    if (displayImage) {
      if (displayImage.includes('scontent') && displayImage.includes('fbcdn.net')) {
        // scontent 直接圖片不需要代理
        console.log(`🖼️ [收藏卡片-輪播] 項目 ${index + 1} 直接使用 scontent URL:`, displayImage);
      } else {
        // lookaside 等其他圖片使用代理
        displayImage = `${process.env.BASE_URL}/api/image-proxy?url=${encodeURIComponent(displayImage)}`;
        console.log(`🖼️ [收藏卡片-輪播] 項目 ${index + 1} 使用圖片代理 URL:`, displayImage);
      }
    } else {
      displayImage = 'https://picsum.photos/400/300';
      console.log(`🖼️ [收藏卡片-輪播] 項目 ${index + 1} 無圖片，使用預設圖片`);
      console.log(`🎯 [修改確認] aspectRatio 1:1 已添加到輪播卡片 ${index + 1}`);
    }

    return {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'image',
            url: displayImage,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          {
            type: 'text',
            text: title,
            wrap: true,
            size: 'sm',
            color: '#333333',
            margin: 'md'
          },
          {
            type: 'text',
            text: new Date(favorite.created_at).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            size: 'xs',
            color: '#888888',
            margin: 'sm'
          }
        ],
        paddingAll: 'md'
      }
    };
  });

  return {
    type: 'flex',
    altText: `今天收藏了 ${favorites.length} 張卡片`,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}

const app = express();
const PORT = 3002;
console.log('🚀 小汪記記 with LINE Login starting...');

// 初始化 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-testing',
});
console.log('🤖 OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'dummy-token-for-testing',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'dummy-secret-for-testing'
};

// 只在有真實 token 時建立 client
console.log('🔑 LINE_CHANNEL_ACCESS_TOKEN exists:', !!process.env.LINE_CHANNEL_ACCESS_TOKEN);
const client = process.env.LINE_CHANNEL_ACCESS_TOKEN ? 
  new line.Client(config) : 
  null;
console.log('📱 LINE Client created:', !!client);

// Google Calendar OAuth2 設定
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL || 'https://138b00c20997.ngrok.app'}/api/google-calendar/callback`
);

console.log('📅 Google OAuth2 Client initialized:', !!process.env.GOOGLE_CLIENT_ID);

// Express middleware with UTF-8 encoding support
app.use(express.json({
  extended: true,
  limit: '50mb',
  charset: 'utf8',
  verify: function(req, res, buf) {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: '50mb',
  charset: 'utf8'
}));

// Session 設定（LINE Login 需要）
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 小時
}));

// 靜態檔案服務 - 提供截圖預覽圖片
app.use('/screenshots', express.static(path.join(__dirname, 'public', 'screenshots')));
console.log('📁 Static files enabled for screenshots at /screenshots');

// 靜態檔案服務 - 提供JavaScript文件
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
console.log('📁 Static files enabled for JS files');

// 判斷是否為問句或請求
function isQuestion(text) {
  // 問句特徵
  const questionPatterns = [
    /？$/,           // 中文問號結尾
    /\?$/,           // 英文問號結尾
    /嗎[？?]?$/,       // 嗎結尾
    /吧[？?]?$/,       // 吧結尾
    /呢[？?]?$/,       // 呢結尾
    /^幫我/,         // 「幫我」開頭
    /^請問/,         // 「請問」開頭
    /什麼/,          // 包含「什麼」
    /為什麼/,        // 包含「為什麼」
    /怎麼/,          // 包含「怎麼」
    /如何/,          // 包含「如何」
    /有沒有/,        // 包含「有沒有」
    /有哪些/,        // 包含「有哪些」
    /整理/,          // 包含「整理」
    /列出/,          // 包含「列出」
    /查詢/,          // 包含「查詢」
    /分析/           // 包含「分析」
  ];
  
  return questionPatterns.some(pattern => pattern.test(text));
}

// 判斷是否為連結
function isLink(text) {
  const linkPatterns = [
    /^https?:\/\//i,           // http:// 或 https:// 開頭
    /^www\./i,                 // www. 開頭
    /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/,  // 包含域名格式
    /facebook\.com/i,          // Facebook 連結
    /instagram\.com/i,         // Instagram 連結
    /youtube\.com/i,           // YouTube 連結
    /youtu\.be/i,             // YouTube 短連結
    /twitter\.com/i,          // Twitter 連結
    /x\.com/i,                // X (Twitter) 連結
    /linkedin\.com/i,         // LinkedIn 連結
    /tiktok\.com/i,           // TikTok 連結
    /github\.com/i,           // GitHub 連結
    /medium\.com/i,           // Medium 連結
    /pinterest\.com/i         // Pinterest 連結
  ];

  return linkPatterns.some(pattern => pattern.test(text.trim()));
}

// 處理 postback 事件（任務完成）
async function handlePostback(event) {
  console.log('Postback event:', event);
  
  const userId = event.source.userId;
  const postbackData = event.postback?.data || event.postbackData;
  
  // 檢查是否為任務完成事件
  if (postbackData.startsWith('complete_task_')) {
    const taskId = parseInt(postbackData.replace('complete_task_', ''));
    console.log(`📝 用戶 ${userId} 完成任務 ID: ${taskId}`);
    
    // 取得用戶任務堆疊
    let userTasks = userTaskStacks.get(userId) || [];
    
    // 找到對應的任務並標記為完成
    const taskIndex = userTasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      const completedTask = userTasks[taskIndex];
      userTasks[taskIndex].completed = true;
      userTaskStacks.set(userId, userTasks);
      
      console.log(`✅ 任務已完成: ${completedTask.text}`);
      
      // 發送恭喜訊息
      const congratsMessage = {
        type: 'text',
        text: `🎉 恭喜！${completedTask.text} 已完成！`
      };
      
      // 發送更新後的任務清單（只顯示今天的任務）
      const userTags = await getUserTags(userId);
      const { createTaskStackFlexMessage } = getTaskFlexModule();
      const todayTasks = filterTodayTasks(userTasks);
      const updatedFlexMessage = createTaskStackFlexMessage(todayTasks, userTags);
      
      if (client) {
        // 先發送恭喜訊息，再發送更新的任務清單
        await replyWithQuickReply(client, event.replyToken, congratsMessage, userId);
        return client.pushMessage(userId, updatedFlexMessage);
      } else {
        console.log('測試模式：恭喜訊息', congratsMessage.text);
        console.log('測試模式：更新任務清單', JSON.stringify(updatedFlexMessage, null, 2));
        return Promise.resolve(null);
      }
    }
  }
  
  // 檢查是否為任務收藏事件
  if (postbackData.startsWith('favorite_task_')) {
    const taskId = parseInt(postbackData.replace('favorite_task_', ''));
    console.log(`⭐ 用戶 ${userId} 收藏任務 ID: ${taskId}`);
    
    // 取得用戶任務堆疊
    let userTasks = userTaskStacks.get(userId) || [];
    
    // 找到對應的任務
    const taskIndex = userTasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      const favoriteTask = userTasks[taskIndex];
      
      // 檢查是否已經收藏過
      if (favoriteTask.favorited) {
        console.log(`📝 任務已經收藏過: ${favoriteTask.text}`);
        return Promise.resolve(null);
      }
      
      // 標記為已收藏
      userTasks[taskIndex].favorited = true;
      userTaskStacks.set(userId, userTasks);
      
      // 添加到用戶收藏清單
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('favorite_tasks')
            .insert([
              {
                user_id: userId,
                name: favoriteTask.text,
                description: '',
                category: '',
                used_count: 0
              }
            ])
            .select()
            .single();
          
          if (error) {
            console.error('❌ [收藏任務] Supabase 儲存錯誤:', error);
          } else {
            console.log(`✅ [收藏任務] 已儲存至 Supabase，ID: ${data.id}`);
          }
        } catch (dbError) {
          console.error('❌ [收藏任務] 資料庫連線錯誤:', dbError);
        }
      } else {
        // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
        console.log('⚠️ [收藏任務] Supabase 未連接，使用記憶體儲存');
        
        let userFavorites = userFavoriteTasks.get(userId) || [];
        const newFavorite = {
          id: Date.now().toString(),
          name: favoriteTask.text,
          description: '',
          category: '',
          used_count: 0,
          created_at: new Date().toISOString(),
          source_task_id: taskId
        };
        
        userFavorites.push(newFavorite);
        userFavoriteTasks.set(userId, userFavorites);
      }
      
      console.log(`✅ 任務已收藏: ${favoriteTask.text}`);
      
      if (client) {
        // 設置標籤選擇狀態
        userTagSelectionStates.set(userId, {
          waitingForTag: true,
          targetTaskId: taskId,
          timestamp: Date.now()
        }, userId);
        console.log(`🏷️ [標籤選擇] 用戶 ${userId} 進入標籤選擇狀態，目標任務 ID: ${taskId}`);
        
        // 準備標籤詢問訊息（包含 Quick Reply 按鈕）
        const userTags = await getUserTags(userId);
        const { generateQuickReply } = getTaskFlexModule();
        const tagQuestionMessage = {
          type: 'text',
          text: '希望收藏到哪個標籤?',
          quickReply: generateQuickReply(userTags)
        };
        
        // 只發送詢問標籤的訊息，不更新 FLEX MESSAGE
        return replyWithQuickReply(client, event.replyToken, tagQuestionMessage, userId);
      } else {
        console.log('測試模式：標籤詢問訊息（含 Quick Reply）', '希望收藏到哪個標籤?');
        return Promise.resolve(null);
      }
    }
  }

  // 檢查是否為卡片收藏事件
  if (postbackData === 'card_collection') {
    console.log(`📋 用戶 ${userId} 點擊卡片收藏`);

    try {
      // 獲取今天的收藏資料
      let todayFavorites = [];

      if (supabase) {
        // 使用台灣時區 (UTC+8) 計算今天的日期範圍
        const now = new Date();
        const taiwanOffset = 8 * 60; // 台灣比 UTC 快8小時
        const taiwanNow = new Date(now.getTime() + taiwanOffset * 60 * 1000);
        const today = taiwanNow.toISOString().split('T')[0]; // YYYY-MM-DD 格式

        // 計算台灣時區的今天開始和結束時間（以UTC格式儲存）
        const taiwanStartOfDay = new Date(`${today}T00:00:00+08:00`).toISOString();
        const taiwanEndOfDay = new Date(`${today}T23:59:59.999+08:00`).toISOString();

        console.log(`🔍 [收藏卡片] 台灣日期: ${today}`);
        console.log(`🔍 [收藏卡片] 查詢範圍: ${taiwanStartOfDay} ~ ${taiwanEndOfDay}`);

        const { data, error } = await supabase
          .from('dev_collections')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', taiwanStartOfDay)
          .lt('created_at', taiwanEndOfDay)
          .order('created_at', { ascending: false });

        console.log(`📊 [收藏卡片] Supabase 查詢結果:`, {
          error: error?.message || null,
          dataCount: data?.length || 0,
          firstItem: data?.[0] || null
        }, userId);

        if (!error && data) {
          todayFavorites = data;
        }
      }

      console.log(`📋 [收藏卡片] 用戶 ${userId} 今天收藏了 ${todayFavorites.length} 個項目`);

      // 如果今天沒有收藏，顯示提示訊息
      if (todayFavorites.length === 0) {
        const noFavoritesMessage = {
          type: 'flex',
          altText: '今天還沒有收藏任何卡片',
          contents: {
            type: 'bubble',
            size: 'kilo',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '📋 今天還沒有收藏',
                  weight: 'bold',
                  size: 'lg',
                  align: 'center'
                },
                {
                  type: 'text',
                  text: '快去收藏一些有趣的內容吧！',
                  size: 'sm',
                  color: '#666666',
                  align: 'center',
                  margin: 'md'
                }
              ],
              spacing: 'md',
              paddingAll: 'xl'
            }
          }
        };

        if (client) {
          return replyWithQuickReply(client, event.replyToken, noFavoritesMessage, userId);
        } else {
          console.log('測試模式：無收藏訊息', JSON.stringify(noFavoritesMessage, null, 2));
          return Promise.resolve(null);
        }
      }

      // 創建收藏卡片 FLEX MESSAGE
      const favoritesFlexMessage = await createFavoritesFlexMessage(todayFavorites);

      if (client) {
        return replyWithQuickReply(client, event.replyToken, favoritesFlexMessage, userId);
      } else {
        console.log('測試模式：收藏卡片 FLEX MESSAGE', JSON.stringify(favoritesFlexMessage, null, 2));
        return Promise.resolve(null);
      }

    } catch (error) {
      console.error('❌ [收藏卡片] 處理錯誤:', error);

      const errorMessage = {
        type: 'text',
        text: '⚠️ 獲取收藏資料時發生錯誤，請稍後再試。'
      };

      if (client) {
        return replyWithQuickReply(client, event.replyToken, errorMessage, userId);
      } else {
        return Promise.resolve(null);
      }
    }
  }

  // 處理日曆按鈕點擊
  if (postbackData === 'calendar_view') {
    console.log(`📅 用戶 ${userId} 點擊日曆按鈕`);

    const calendarMessage = {
      type: 'text',
      text: '📅 日曆功能\n\n您可以通過以下連結使用日曆功能：\nhttps://138b00c20997.ngrok.app/liff/calendar'
    };

    if (client) {
      return replyWithQuickReply(client, event.replyToken, calendarMessage, userId);
    } else {
      console.log('測試模式：日曆訊息', calendarMessage.text);
      return Promise.resolve(null);
    }
  }

  // 處理收藏按鈕點擊
  if (postbackData === 'show_favorites') {
    console.log(`⭐ 用戶 ${userId} 點擊收藏按鈕`);

    // 這裡直接複用現有的收藏邏輯
    try {
      let todayFavorites = [];

      if (supabase) {
        const now = new Date();
        const taiwanTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const today = taiwanTime.toISOString().split('T')[0];
        const taiwanStartOfDay = today + 'T16:00:00.000Z';
        const taiwanEndOfDay = new Date(taiwanTime.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T16:00:00.000Z';

        const { data, error } = await supabase
          .from('dev_collections')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', taiwanStartOfDay)
          .lt('created_at', taiwanEndOfDay)
          .order('created_at', { ascending: false });

        if (!error && data) {
          todayFavorites = data;
        }
      }

      if (todayFavorites.length === 0) {
        const noFavoritesMessage = {
          type: 'flex',
          altText: '今天還沒有收藏',
          contents: {
            type: 'bubble',
            size: 'kilo',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '📋 今天還沒有收藏',
                  weight: 'bold',
                  size: 'lg',
                  align: 'center'
                },
                {
                  type: 'text',
                  text: '快去收藏一些有趣的內容吧！',
                  size: 'sm',
                  color: '#666666',
                  align: 'center',
                  margin: 'md'
                }
              ],
              spacing: 'md',
              paddingAll: 'xl'
            }
          }
        };

        if (client) {
          return replyWithQuickReply(client, event.replyToken, noFavoritesMessage, userId);
        } else {
          console.log('測試模式：無收藏訊息', JSON.stringify(noFavoritesMessage, null, 2));
          return Promise.resolve(null);
        }
      }

      const favoritesFlexMessage = await createFavoritesFlexMessage(todayFavorites);

      if (client) {
        return replyWithQuickReply(client, event.replyToken, favoritesFlexMessage, userId);
      } else {
        console.log('測試模式：收藏卡片 FLEX MESSAGE', JSON.stringify(favoritesFlexMessage, null, 2));
        return Promise.resolve(null);
      }
    } catch (error) {
      console.error('❌ [收藏卡片] 處理錯誤:', error);

      const errorMessage = {
        type: 'text',
        text: '⚠️ 獲取收藏資料時發生錯誤，請稍後再試。'
      };

      if (client) {
        return replyWithQuickReply(client, event.replyToken, errorMessage, userId);
      } else {
        return Promise.resolve(null);
      }
    }
  }

  // 處理我的按鈕點擊
  if (postbackData === 'my_account') {
    console.log(`👤 用戶 ${userId} 點擊我的按鈕`);

    const accountMessage = {
      type: 'text',
      text: '👤 我的帳戶\n\n您可以通過以下連結管理帳戶：\nhttps://138b00c20997.ngrok.app/liff/account'
    };

    if (client) {
      return replyWithQuickReply(client, event.replyToken, accountMessage, userId);
    } else {
      console.log('測試模式：帳戶訊息', accountMessage.text);
      return Promise.resolve(null);
    }
  }

  // 處理常用任務按鈕點擊
  if (postbackData === 'frequent_tasks') {
    console.log(`⭐ 用戶 ${userId} 點擊常用任務按鈕`);

    try {
      // 獲取用戶的常用任務
      const response = await fetch(`http://localhost:3002/api/frequent-tasks/${userId}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result = await response.json();
      console.log(`📋 [常用任務] 獲取到 ${result.count} 個常用任務`);

      // 生成多則獨立常用任務訊息
      if (!result.data || result.data.length === 0) {
        const emptyMessage = {
          type: 'text',
          text: '您還沒有設定任何常用任務\n\n💡 提示：在編輯任務時開啟「加入常用」開關，即可將任務加入常用列表'
        };

        if (client) {
          return client.replyMessage(event.replyToken, emptyMessage);
        } else {
          console.log('測試模式：無常用任務訊息', emptyMessage);
          return Promise.resolve(null);
        }
      } else {
        // 生成純任務文字，直接從資料庫原封不動顯示
        let taskListText = '';

        result.data.forEach((task, index) => {
          if (index > 0) taskListText += '\n\n';
          taskListText += task.task_text;
        });

        const simpleMessage = {
          type: 'text',
          text: taskListText
        };

        console.log(`📨 [常用任務] 準備發送簡單文字訊息`);

        if (client) {
          const result = await client.replyMessage(event.replyToken, simpleMessage);
          console.log(`✅ [常用任務] 成功發送文字訊息`, result);
          return result;
        } else {
          console.log('測試模式：常用任務文字訊息', simpleMessage.text);
          return Promise.resolve(null);
        }
      }

    } catch (error) {
      console.error('❌ [常用任務] 獲取常用任務失敗:', error);

      const errorMessage = {
        type: 'text',
        text: '⚠️ 獲取常用任務失敗，請稍後再試'
      };

      if (client) {
        return client.replyMessage(event.replyToken, errorMessage);
      } else {
        console.log('測試模式：錯誤訊息', errorMessage.text);
        return Promise.resolve(null);
      }
    }
  }

  // 處理從常用任務創建新任務
  if (postbackData.startsWith('create_task_from_frequent|')) {
    console.log(`📝 用戶 ${userId} 從常用任務創建新任務`);

    try {
      const parts = postbackData.split('|');
      const taskText = parts[1] || '';
      const tag = parts[2] || '';
      const note = parts[3] || '';

      console.log(`📝 [從常用創建] 任務: "${taskText}", 標籤: "${tag}", 備註: "${note}"`);

      // 創建新任務ID
      const taskId = Date.now();
      const timestamp = new Date().toISOString();

      // 添加到用戶任務堆疊
      const userTasks = userTaskStacks.get(userId) || [];
      userTasks.push({
        text: taskText,
        id: taskId,
        timestamp: timestamp,
        tag: tag || '無',
        note: note || ''
      });
      userTaskStacks.set(userId, userTasks);

      console.log(`✅ [從常用創建] 任務已添加，用戶 ${userId} 目前有 ${userTasks.length} 個任務`);

      // 生成更新後的任務 FLEX MESSAGE
      const { generateTaskFlexMessage } = getTaskFlexModule();
      const userTags = await getUserTags(userId);
      const flexMessage = generateTaskFlexMessage(userTasks, userTags);

      const successMessage = {
        type: 'text',
        text: `✅ 已從常用任務創建新任務：\n"${taskText}"\n\n🏷️ 標籤：${tag || '無'}\n📝 備註：${note || '無'}`
      };

      if (client) {
        // 先發送成功訊息，再發送更新的任務列表
        await client.replyMessage(event.replyToken, successMessage);
        return client.pushMessage(userId, flexMessage);
      } else {
        console.log('測試模式：成功創建任務訊息', successMessage.text);
        console.log('測試模式：更新任務列表', flexMessage);
        return Promise.resolve(null);
      }

    } catch (error) {
      console.error('❌ [從常用創建] 創建任務失敗:', error);

      const errorMessage = {
        type: 'text',
        text: '⚠️ 從常用任務創建新任務失敗，請稍後再試'
      };

      if (client) {
        return client.replyMessage(event.replyToken, errorMessage);
      } else {
        console.log('測試模式：錯誤訊息', errorMessage.text);
        return Promise.resolve(null);
      }
    }
  }

  // 處理複製常用任務
  if (postbackData.startsWith('copy_frequent_task|')) {
    console.log(`📋 用戶 ${userId} 點擊複製常用任務按鈕`);

    try {
      const parts = postbackData.split('|');
      const taskText = parts[1] || '';
      const tag = parts[2] || '';
      const note = parts[3] || '';

      console.log(`📋 [複製常用] 準備複製任務: "${taskText}", 標籤: "${tag}", 備註: "${note}"`);

      // 複製到剪貼簿的文字內容
      let copyText = taskText;
      if (tag && tag !== '') {
        copyText += `\n🏷️ ${tag}`;
      }
      if (note && note !== '') {
        copyText += `\n📝 ${note}`;
      }

      const copyMessage = {
        type: 'text',
        text: `📋 已複製常用任務內容：\n\n${copyText}\n\n💡 提示：您可以將此內容貼到其他地方使用`
      };

      if (client) {
        return client.replyMessage(event.replyToken, copyMessage);
      } else {
        console.log('測試模式：複製訊息', copyMessage.text);
        return Promise.resolve(null);
      }

    } catch (error) {
      console.error('❌ [複製常用] 複製任務失敗:', error);

      const errorMessage = {
        type: 'text',
        text: '⚠️ 複製常用任務失敗，請稍後再試'
      };

      if (client) {
        return client.replyMessage(event.replyToken, errorMessage);
      } else {
        console.log('測試模式：錯誤訊息', errorMessage.text);
        return Promise.resolve(null);
      }
    }
  }

  // 處理展開常用任務多頁檢視 - 7天任務頁面
  if (postbackData === 'expand_frequent_tasks_pages') {
    console.log(`🎨 用戶 ${userId} 點擊展開7天任務頁面`);

    try {
      // 獲取用戶任務資料
      let userTasks = userTaskStacks.get(userId) || [];
      const userTags = await getUserTags(userId);

      // 使用task-flex-message.js的函數生成各頁面
      const { createTaskStackFlexMessage, generateDateTitle, generateQuickReply } = getTaskFlexModule();

      // 生成7天的任務數據和Flex Messages
      const sevenDaysBubbles = [];
      const taskCounts = [];

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        // 過濾指定天的任務
        const dayTasks = filterTasksByDaysOffset(userTasks, dayOffset);
        taskCounts.push(dayTasks.length);

        // 生成該天的Flex Message
        const dayFlexMessage = createTaskStackFlexMessage(dayTasks, userTags);

        // 修改該天頁面的標題
        const dayTitle = generateDateTitle(dayOffset);
        dayFlexMessage.contents.header.contents[0].contents[0].text = dayTitle.dateText;
        dayFlexMessage.contents.header.contents[0].contents[1].text = dayTitle.weekdayText;
        dayFlexMessage.altText = dayTitle.dateText + dayTitle.weekdayText;

        // 添加到carousel中
        sevenDaysBubbles.push({
          type: 'bubble',
          header: dayFlexMessage.contents.header,
          body: dayFlexMessage.contents.body
        });
      }

      // 生成7個BUBBLE的carousel FLEX MESSAGE
      const sevenDaysFlexMessage = {
        type: 'flex',
        altText: '未來7天任務',
        contents: {
          type: 'carousel',
          contents: sevenDaysBubbles
        }
      };

      // 添加 Quick Reply 按鈕 - 確保4個固定按鈕永遠顯示
      const quickReply = generateQuickReply(userTags);
      if (quickReply && quickReply.items && quickReply.items.length > 0) {
        sevenDaysFlexMessage.quickReply = quickReply;
        console.log('🎯 [7天任務] 附加 Quick Reply 按鈕，確保永遠顯示');
      }

      console.log(`📨 [7天任務] 準備發送7天任務頁面`);
      console.log(`📊 [7天任務] 任務數量: ${taskCounts.map((count, i) => `第${i}天: ${count}件`).join(', ')}`);

      // 調試：輸出完整的JSON結構
      console.log('🔍 [7天任務 DEBUG] 完整JSON:', JSON.stringify(sevenDaysFlexMessage, null, 2));

      if (client) {
        return client.replyMessage(event.replyToken, sevenDaysFlexMessage);
      } else {
        console.log('測試模式：7天任務 FLEX MESSAGE', JSON.stringify(sevenDaysFlexMessage, null, 2));
        return Promise.resolve(null);
      }

    } catch (error) {
      console.error('❌ [7天任務] 展開任務頁面失敗:', error);

      const errorMessage = {
        type: 'text',
        text: '⚠️ 展開7天任務頁面失敗，請稍後再試'
      };

      if (client) {
        return client.replyMessage(event.replyToken, errorMessage);
      } else {
        console.log('測試模式：錯誤訊息', errorMessage.text);
        return Promise.resolve(null);
      }
    }
  }

  // 處理 Tab 切換事件
  if (postbackData === 'switch_tab_general') {
    console.log(`🔄 用戶 ${userId} 切換到一般視圖`);

    try {
      // 使用記憶體中的任務堆疊（用戶真正的活躍任務）
      const userTasks = userTaskStacks.get(userId) || [];
      console.log(`🔍 [一般視圖] 從記憶體載入 ${userTasks.length} 個活躍任務`);

      const userTags = await getUserTags(userId);

      // 生成一般視圖的任務清單（顯示今天的任務）
      const { createTaskStackFlexMessage } = getTaskFlexModule();
      const generalFlexMessage = createTaskStackFlexMessage(userTasks, userTags, 'general');

      if (client) {
        return client.replyMessage(event.replyToken, generalFlexMessage);
      } else {
        console.log('測試模式：一般視圖', JSON.stringify(generalFlexMessage, null, 2));
        return Promise.resolve(null);
      }
    } catch (error) {
      console.error('❌ [Tab切換] 一般視圖生成錯誤:', error);

      const errorMessage = {
        type: 'text',
        text: '😅 切換視圖時發生錯誤，請重試'
      };

      if (client) {
        return client.replyMessage(event.replyToken, errorMessage);
      } else {
        console.log('測試模式：錯誤訊息', errorMessage.text);
        return Promise.resolve(null);
      }
    }
  }

  if (postbackData === 'switch_tab_tags') {
    console.log(`🏷️ 用戶 ${userId} 切換到標籤視圖`);

    try {
      // 使用記憶體中的任務堆疊（用戶真正的活躍任務）
      const userTasks = userTaskStacks.get(userId) || [];
      console.log(`🔍 [標籤視圖] 從記憶體載入 ${userTasks.length} 個活躍任務`);

      userTasks.forEach(task => {
        console.log(`  - "${task.text}" 標籤: "${task.tag || '無標籤'}"`);
      });

      const userTags = await getUserTags(userId);

      // 將任務按標籤分組重新排序
      const { parseTasksByTags } = getTaskFlexModule();
      const { tagGroups, untaggedTasks } = parseTasksByTags(userTasks);

      // 重新組織任務順序：先顯示各標籤組的任務，最後顯示無標籤任務
      let reorderedTasks = [];
      tagGroups.forEach(group => {
        reorderedTasks = reorderedTasks.concat(group.tasks);
      });
      reorderedTasks = reorderedTasks.concat(untaggedTasks);

      console.log(`🏷️ [標籤視圖] 按標籤重新排序，共 ${reorderedTasks.length} 個任務`);

      // 使用和一般視圖完全相同的UI，只是改為'tags'模式以顯示正確的按鈕狀態
      const { createTaskStackFlexMessage } = getTaskFlexModule();
      const tagFlexMessage = createTaskStackFlexMessage(reorderedTasks, userTags, 'tags');

      console.log(`🏷️ [標籤視圖] 生成了與一般視圖相同格式的 Flex Message`);

      if (client) {
        return client.replyMessage(event.replyToken, tagFlexMessage);
      } else {
        console.log('測試模式：標籤視圖', JSON.stringify(tagFlexMessage, null, 2));
        return Promise.resolve(null);
      }
    } catch (error) {
      console.error('❌ [Tab切換] 標籤視圖生成錯誤:', error);

      const errorMessage = {
        type: 'text',
        text: '😅 切換視圖時發生錯誤，請重試'
      };

      if (client) {
        return client.replyMessage(event.replyToken, errorMessage);
      } else {
        console.log('測試模式：錯誤訊息', errorMessage.text);
        return Promise.resolve(null);
      }
    }
  }

  // 處理標籤任務查看事件
  if (postbackData.startsWith('view_tag_tasks|')) {
    const tagName = postbackData.split('|')[1];
    console.log(`🏷️ 用戶 ${userId} 查看標籤"${tagName}"的任務`);

    try {
      // 使用記憶體中的任務堆疊（用戶真正的活躍任務）
      const userTasks = userTaskStacks.get(userId) || [];
      console.log(`🔍 [標籤任務查看] 從記憶體載入 ${userTasks.length} 個活躍任務`);

      const userTags = await getUserTags(userId);

      // 根據標籤篩選任務
      let filteredTasks = [];

      if (tagName === '無標籤') {
        // 顯示無標籤的任務
        filteredTasks = userTasks.filter(task =>
          !task.tag || task.tag.trim() === '' || task.tag === '無'
        );
      } else {
        // 顯示特定標籤的任務
        filteredTasks = userTasks.filter(task =>
          task.tag && task.tag.trim() === tagName
        );
      }

      console.log(`🔍 [標籤篩選] 標籤"${tagName}"共有 ${filteredTasks.length} 個任務`);

      // 如果沒有符合的任務
      if (filteredTasks.length === 0) {
        const noTasksMessage = {
          type: 'flex',
          altText: `${tagName}標籤沒有任務`,
          contents: {
            type: 'bubble',
            size: 'kilo',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '🏷️ 標籤檢視',
                  weight: 'bold',
                  size: 'lg',
                  color: '#333333'
                },
                {
                  type: 'text',
                  text: `標籤：${tagName}`,
                  size: 'md',
                  color: '#666666',
                  margin: 'md'
                },
                {
                  type: 'separator',
                  margin: 'md'
                },
                {
                  type: 'text',
                  text: '📝 此標籤目前沒有任務',
                  size: 'sm',
                  color: '#999999',
                  align: 'center',
                  margin: 'lg'
                },
                {
                  type: 'button',
                  action: {
                    type: 'postback',
                    label: '返回標籤視圖',
                    data: 'switch_tab_tags'
                  },
                  style: 'secondary',
                  margin: 'lg'
                }
              ]
            }
          }
        };

        if (client) {
          return client.replyMessage(event.replyToken, noTasksMessage);
        } else {
          console.log('測試模式：空標籤訊息', JSON.stringify(noTasksMessage, null, 2));
          return Promise.resolve(null);
        }
      }

      // 生成該標籤的任務清單
      const { createTaskStackFlexMessage } = getTaskFlexModule();

      // 創建標籤專用的 flex message
      const tagTasksMessage = {
        type: 'flex',
        altText: `${tagName}標籤 - ${filteredTasks.length}個任務`,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🏷️ 標籤檢視',
                weight: 'bold',
                size: 'lg',
                color: '#333333'
              },
              {
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: `${userTags.find(tag => tag.name === tagName)?.icon || '🏷️'} ${tagName}`,
                    weight: 'bold',
                    color: userTags.find(tag => tag.name === tagName)?.color || '#4169E1',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: `${filteredTasks.length}項`,
                    size: 'sm',
                    color: '#999999',
                    align: 'end'
                  }
                ]
              },
              {
                type: 'separator',
                margin: 'md'
              }
            ]
          }
        }
      };

      // 添加任務列表
      filteredTasks.forEach((task, index) => {
        const taskBox = {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          margin: index === 0 ? 'md' : 'sm',
          contents: [
            {
              type: 'text',
              text: task.completed ? '✅' : '⭕',
              flex: 0
            },
            {
              type: 'text',
              text: task.text,
              size: 'sm',
              color: task.completed ? '#999999' : '#333333',
              flex: 1,
              wrap: true,
              decoration: task.completed ? 'line-through' : 'none'
            }
          ]
        };

        // 如果任務未完成，添加點擊完成的動作
        if (!task.completed) {
          taskBox.action = {
            type: 'postback',
            label: `完成${task.text}`,
            data: `complete_task_${task.id}`
          };
        }

        tagTasksMessage.contents.body.contents.push(taskBox);
      });

      // 添加返回按鈕
      tagTasksMessage.contents.body.contents.push(
        {
          type: 'separator',
          margin: 'lg'
        },
        {
          type: 'button',
          action: {
            type: 'postback',
            label: '返回標籤視圖',
            data: 'switch_tab_tags'
          },
          style: 'secondary',
          margin: 'md'
        }
      );

      if (client) {
        return client.replyMessage(event.replyToken, tagTasksMessage);
      } else {
        console.log('測試模式：標籤任務列表', JSON.stringify(tagTasksMessage, null, 2));
        return Promise.resolve(null);
      }

    } catch (error) {
      console.error('❌ [標籤任務查看] 生成錯誤:', error);

      const errorMessage = {
        type: 'text',
        text: '😅 查看標籤任務時發生錯誤，請重試'
      };

      if (client) {
        return client.replyMessage(event.replyToken, errorMessage);
      } else {
        console.log('測試模式：錯誤訊息', errorMessage.text);
        return Promise.resolve(null);
      }
    }
  }

  return Promise.resolve(null);
}

// 載入用戶標籤
async function getUserTags(userId) {
  try {
    if (supabase) {
      const tablePrefix = process.env.TABLE_PREFIX || 'dev_';
      const tableName = tablePrefix + 'tags';
      
      console.log(`🔍 [標籤同步] 查詢表格: ${tableName}, 用戶: ${userId}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.error('❌ [標籤同步] 載入用戶標籤錯誤:', error);
        console.log('🔄 [標籤同步] 回退到預設標籤');
        return getDefaultUserTags();
      }
      
      if (data && data.length > 0) {
        console.log(`✅ [標籤同步] 成功載入用戶 ${userId} 的標籤，數量: ${data.length}`);
        console.log(`📋 [標籤同步] 標籤詳細:`, data.map(tag => `${tag.name}(${tag.sort_order})`));
        return data;
      } else {
        console.log(`⚠️ [標籤同步] 用戶 ${userId} 無自定義標籤，使用預設標籤`);
        return getDefaultUserTags();
      }
    } else {
      console.log('🔌 [標籤同步] 無資料庫連線，使用預設標籤');
      return getDefaultUserTags();
    }
  } catch (error) {
    console.error('💥 [標籤同步] 載入用戶標籤失敗:', error);
    return getDefaultUserTags();
  }
}

// 獲取預設用戶標籤 - 使用實際 Supabase 中的標籤資料
function getDefaultUserTags() {
  return [
    { id: 5, name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1, is_active: true },
    { id: 6, name: '學習', color: '#4ECDC4', icon: '📚', sort_order: 2, is_active: true },
    { id: 8, name: '運動', color: '#45B7D1', icon: '🏃‍♂️', sort_order: 3, is_active: true },
    { id: 7, name: 'AI', color: '#9B59B6', icon: '🤖', sort_order: 4, is_active: true },
    { id: 9, name: '日本', color: '#E74C3C', icon: '🗾', sort_order: 5, is_active: true }
  ];
}

// 通用的回覆函數，自動添加 Quick Reply 按鈕 - 100% 強制顯示
async function replyWithQuickReply(client, replyToken, message, userId) {
  try {
    // 💪 強制添加 Quick Reply 按鈕 - 永遠覆蓋現有設定
    const userTags = await getUserTags(userId);
    const { generateQuickReply } = getTaskFlexModule();
    const quickReply = generateQuickReply(userTags);

    if (quickReply && quickReply.items && quickReply.items.length > 0) {
      message.quickReply = quickReply;
      console.log('🎯 [Quick Reply] 強制添加 Quick Reply 按鈕，確保永遠顯示');
    } else {
      console.log('⚠️ [Quick Reply] 無法生成 Quick Reply 按鈕');
    }

    return client.replyMessage(replyToken, message);
  } catch (error) {
    console.error('❌ [Quick Reply] 添加失敗:', error);
    // 即使失敗，也嘗試添加基本的 Quick Reply
    try {
      message.quickReply = {
        items: [
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '📅 日曆',
              data: 'calendar_view'
            }
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '⭐ 收藏',
              data: 'show_favorites'
            }
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '👤 我的',
              data: 'my_account'
            }
          }
        ]
      };
      console.log('🛟 [Quick Reply] 使用備用 Quick Reply 按鈕');
    } catch (backupError) {
      console.error('❌ [Quick Reply] 備用按鈕也失敗:', backupError);
    }
    return client.replyMessage(replyToken, message);
  }
}

// 語音轉文字處理函數
async function processAudioMessage(event) {
  console.log('🎤 [語音處理] 開始處理語音訊息');
  
  try {
    // 獲取語音訊息 ID
    const messageId = event.message.id;
    const userId = event.source.userId;
    
    console.log(`🎤 [語音處理] 訊息ID: ${messageId}, 使用者ID: ${userId}`);
    
    // 從 LINE API 下載語音檔案
    const audioBuffer = await client.getMessageContent(messageId);
    
    // 建立暫存檔案路徑
    const tempDir = path.join(__dirname, 'temp');
    await fs.ensureDir(tempDir);
    const tempFilePath = path.join(tempDir, `voice_${messageId}.m4a`);
    
    console.log(`🎤 [語音處理] 暫存檔案路徑: ${tempFilePath}`);
    
    // 將音頻資料寫入暫存檔案
    const chunks = [];
    for await (const chunk of audioBuffer) {
      chunks.push(chunk);
    }
    const audioData = Buffer.concat(chunks);
    await fs.writeFile(tempFilePath, audioData);
    
    console.log(`🎤 [語音處理] 音頻檔案已儲存，大小: ${audioData.length} bytes`);
    
    // 使用 OpenAI Whisper API 進行語音轉文字
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-testing') {
      throw new Error('OpenAI API Key 未設定');
    }
    
    console.log('🎤 [語音處理] 正在呼叫 OpenAI Whisper API...');
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'zh',  // 指定中文
      prompt: '請使用繁體中文輸出。'  // 提示使用繁體中文
    });
    
    let transcribedText = transcription.text;
    console.log(`🎤 [語音處理] 原始轉換結果: "${transcribedText}"`);
    
    // 如果需要，使用 OpenAI API 將簡體中文轉換為繁體中文
    if (transcribedText && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key-for-testing') {
      try {
        const conversionResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "請將以下文字轉換為繁體中文，保持原意不變，只輸出轉換後的文字，不要添加任何解釋或額外內容。"
            },
            {
              role: "user",
              content: transcribedText
            }
          ],
          max_tokens: 500,
          temperature: 0
        }, userId);
        
        const convertedText = conversionResponse.choices[0].message.content.trim();
        if (convertedText && convertedText !== transcribedText) {
          console.log(`🔄 [繁體轉換] 簡體: "${transcribedText}" → 繁體: "${convertedText}"`);
          transcribedText = convertedText;
        }
      } catch (conversionError) {
        console.warn('⚠️ [繁體轉換] 轉換失敗，使用原始結果:', conversionError.message);
      }
    }
    
    console.log(`🎤 [語音處理] 最終轉換結果: "${transcribedText}"`);
    
    // 清理暫存檔案
    try {
      await fs.remove(tempFilePath);
      console.log('🎤 [語音處理] 暫存檔案已清理');
    } catch (cleanupError) {
      console.warn('🎤 [語音處理] 清理暫存檔案失敗:', cleanupError.message);
    }
    
    return transcribedText;
    
  } catch (error) {
    console.error('❌ [語音處理] 處理失敗:', error);
    
    // 嘗試清理可能的暫存檔案
    try {
      const messageId = event.message.id;
      const tempFilePath = path.join(__dirname, 'temp', `voice_${messageId}.m4a`);
      await fs.remove(tempFilePath);
    } catch (cleanupError) {
      // 忽略清理錯誤
    }
    
    throw error;
  }
}

// 處理 LINE 事件
async function handleEvent(event) {
  console.log('Received event:', event);
  
  // 處理 postback 事件（任務完成）
  if (event.type === 'postback') {
    return handlePostback(event);
  }
  
  // 只處理訊息事件
  if (event.type !== 'message') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  let userMessage = '';
  let isVoiceMessage = false;

  // 處理不同類型的訊息
  if (event.message.type === 'text') {
    // 文字訊息
    userMessage = event.message.text;
    console.log('📝 [訊息類型] 文字訊息');
  } else if (event.message.type === 'audio') {
    // 語音訊息
    console.log('🎤 [訊息類型] 語音訊息');
    isVoiceMessage = true;
    
    try {
      // 處理語音轉文字
      userMessage = await processAudioMessage(event);
      console.log(`🎤 [語音轉文字] 成功轉換: "${userMessage}"`);
    } catch (error) {
      console.error('❌ [語音轉文字] 轉換失敗:', error);
      
      // 回覆錯誤訊息給使用者
      const errorReply = {
        type: 'text',
        text: '抱歉，語音轉文字功能暫時無法使用，請嘗試發送文字訊息。'
      };
      
      return replyWithQuickReply(client, event.replyToken, errorReply, userId);
    }
  } else {
    // 其他類型訊息不處理
    console.log(`⚠️ [訊息類型] 不支援的訊息類型: ${event.message.type}`);
    return Promise.resolve(null);
  }
  
  // 簡單認證
  const user = await authenticateUser(userId);
  
  // 清理訊息中的無效字元
  const cleanedMessage = userMessage
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字元
    .replace(/[\uFFFD\uFEFF]/g, '') // 移除替換字元和字節順序標記
    .trim();
    
  // 如果清理後的訊息為空，忽略此訊息
  if (!cleanedMessage) {
    console.log('⚠️ 訊息清理後為空，忽略處理');
    return Promise.resolve(null);
  }

  // 特殊指令：測試高級卡片設計 (88測試) - 不保存到資料庫，不觸發任務堆疊
  if (userMessage === '88測試' || userMessage === '99測試') {
    console.log(`🎨 用戶 ${userId} 請求測試高級卡片設計 (跳過所有其他處理)`);

    const imageUrl = "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=center";

    const premiumCardMessage = {
      type: "flex",
      altText: "Premium Card Design - MKT演講大師",
      contents: {
        type: "bubble",
        size: "kilo",
        hero: {
          type: "image",
          url: imageUrl,
          size: "full",
          aspectRatio: "1.51:1",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "MKT 演講大師",
              weight: "bold",
              size: "xl",
              color: "#000000",
              wrap: true
            },
            {
              type: "text",
              text: "Master the Marketing",
              size: "sm",
              color: "#999999",
              wrap: true,
              margin: "xs"
            },
            {
              type: "text",
              text: "專業演講者，透過深度洞察與實戰經驗，啟發您的行銷思維突破。",
              size: "sm",
              color: "#666666",
              wrap: true,
              margin: "md"
            }
          ],
          spacing: "sm",
          paddingAll: "20px"
        },
        footer: {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: "$299",
              weight: "bold",
              size: "xl",
              color: "#000000",
              flex: 1,
              gravity: "center"
            },
            {
              type: "button",
              style: "primary",
              height: "sm",
              action: {
                type: "message",
                text: "立即預約演講 🎤"
              },
              color: "#000000",
              flex: 2
            }
          ],
          spacing: "sm",
          paddingAll: "20px"
        }
      }
    };

    return replyWithQuickReply(client, event.replyToken, premiumCardMessage, userId);
  }
  
  console.log('🧹 原始訊息:', userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''));
  console.log('✨ 清理後訊息:', cleanedMessage.substring(0, 100) + (cleanedMessage.length > 100 ? '...' : ''));
  
  // 更新 userMessage 為清理後的版本
  userMessage = cleanedMessage;

  // 🔧 優先檢查特殊指令：圓角圖片 (在儲存訊息之前)
  if (userMessage.startsWith('圓角圖片_')) {
    const taskId = parseInt(userMessage.replace('圓角圖片_', ''));
    console.log(`🎨 用戶 ${userId} 點擊圓角圖片任務 ID: ${taskId}`);

    try {
      console.log(`🔍 [圓角圖片] 開始查詢任務 ID: ${taskId}, 用戶: ${userId}`);

      // ⚠️ 由於 Flex Message 使用時間戳 ID，但資料庫使用自增 ID，先嘗試從記憶體中的任務堆疊查找
      let taskData = null;
      const userTasks = userTaskStacks.get(userId) || [];
      const memoryTask = userTasks.find(task => task.id === taskId);

      if (memoryTask) {
        console.log(`🎯 [圓角圖片] 從記憶體找到任務: ${memoryTask.text}`);

        // 根據任務內容從資料庫查詢實際的任務記錄
        const { data: taskDataArray, error: taskError } = await supabase
          .from('dev_messages')
          .select('id, message_text, user_id, created_at')
          .eq('message_text', memoryTask.text)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (taskError) {
          console.error('❌ 查詢任務失敗:', taskError);
          throw taskError;
        }

        if (taskDataArray && taskDataArray.length > 0) {
          taskData = taskDataArray[0];
          console.log(`📋 [圓角圖片] 從資料庫找到對應任務: ID ${taskData.id}`);
        }
      }

      // 如果記憶體中沒找到，直接嘗試用 ID 查詢資料庫
      if (!taskData) {
        console.log(`🔍 [圓角圖片] 記憶體中未找到，嘗試直接查詢資料庫 ID: ${taskId}`);
        const { data: taskDataArray, error: taskError } = await supabase
          .from('dev_messages')
          .select('id, message_text, user_id, created_at')
          .eq('id', taskId)
          .eq('user_id', userId);

        if (taskError) {
          console.error('❌ 查詢任務失敗:', taskError);
          throw taskError;
        }

        if (taskDataArray && taskDataArray.length > 0) {
          taskData = taskDataArray[0];
          console.log(`📋 [圓角圖片] 直接從資料庫找到任務:`, taskData);
        }
      }

      if (!taskData) {
        console.log('⚠️ 未找到任務或無權限');
        // 讓我們查詢最近的一些任務來調試
        console.log(`🔍 [調試] 查詢用戶 ${userId} 最近的10個任務...`);
        const { data: recentTasks, error: recentError } = await supabase
          .from('dev_messages')
          .select('id, message_text, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!recentError && recentTasks) {
          console.log(`📋 [調試] 最近任務列表:`, recentTasks.map(t => ({ id: t.id, text: t.message_text.substring(0, 50) })));
        }

        return replyWithQuickReply(client, event.replyToken, {
          type: 'text',
          text: '❌ 找不到指定的任務'
        }, userId);
      }

      console.log(`📝 找到任務: ${taskData.message_text}`);

      // 🚀 使用 Open Graph API 直接獲取圖片（取代從收藏卡查詢）
      let imageUrl = 'https://picsum.photos/400/400'; // 預設圖片（有效的圖片服務）

      // 檢測任務內容是否為 URL
      const taskText = taskData.message_text;
      const isTaskUrl = taskText && taskText.includes('http');

      if (isTaskUrl) {
        console.log(`🔍 [圓角圖片] 偵測到 URL 任務，使用 Open Graph API: ${taskText}`);

        try {
          // 使用 Open Graph API 獲取圖片
          const openGraphResult = await openGraphAPI.getPreview(taskText);

          if (openGraphResult && openGraphResult.image) {
            imageUrl = openGraphResult.image;
            console.log(`🎯 [圓角圖片] Open Graph API 獲取圖片成功: ${imageUrl}`);
          } else {
            console.log(`⚠️ [圓角圖片] Open Graph API 無圖片，使用預設圖片`);
          }

        } catch (error) {
          console.error(`❌ [圓角圖片] Open Graph API 失敗: ${error.message}`);
          console.log(`🔄 [圓角圖片] 備用方案：查詢收藏卡圖片`);

          // 備用方案：查詢收藏卡
          const { data: collectionDataArray, error: collectionError } = await supabase
            .from('dev_collections')
            .select('id, title, content')
            .eq('title', taskData.message_text)
            .eq('user_id', userId);

          if (!collectionError && collectionDataArray && collectionDataArray.length > 0) {
            const collection = collectionDataArray[0];
            if (collection.content && collection.content.image) {
              imageUrl = collection.content.image;
              console.log(`🖼️ [備用] 找到收藏卡圖片: ${imageUrl}`);
            } else if (collection.content && collection.content.preview_image) {
              imageUrl = collection.content.preview_image;
              console.log(`🖼️ [備用] 找到收藏卡預覽圖片: ${imageUrl}`);
            }
          }
        }
      } else {
        console.log(`📝 [圓角圖片] 非 URL 任務，使用預設圖片: ${taskText}`);
      }

      console.log(`🎨 最終使用圖片URL: ${imageUrl}`);

      // 生成單一 30px 圓角圖片，正方形尺寸
      const roundedImageUrl = generateRoundedImageUrl(imageUrl, { radius: 30, size: '600x338' });

      // 建構 Flex Message - 單一 bubble 版本 with 左下角小圖示
      const flexMessage = {
        type: 'flex',
        altText: `📸 ${taskData.message_text || '任務'} - 圓角圖片`,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            spacing: 'md',
            contents: [
              {
                type: 'image',
                url: roundedImageUrl,
                size: 'full',
                aspectRatio: '1:1',
                aspectMode: 'cover',
                margin: 'md'
              },
              {
                type: 'text',
                text: '在人人斜槓、資訊爆炸的時代，你是否也想透過自媒體斜槓變現，但卻總是靈感枯竭、時間不夠',
                size: 'sm',
                color: '#666666',
                align: 'start',
                wrap: true,
                margin: 'xs'
              },
              {
                type: 'box',
                layout: 'horizontal',
                spacing: 'md',
                margin: 'md',
                contents: [
                  {
                    type: 'filler'
                  },
                  {
                    type: 'button',
                    style: 'primary',
                    height: 'sm',
                    action: {
                      type: 'message',
                      label: '功能',
                      text: `功能選單_${taskId}`
                    }
                  }
                ]
              },
              {
                type: 'image',
                url: 'https://picsum.photos/30/30',
                size: 'xxs',
                position: 'absolute',
                offsetBottom: '10px',
                offsetStart: '10px'
              },
              {
                type: 'box',
                layout: 'vertical',
                position: 'absolute',
                offsetTop: '15px',
                offsetEnd: '15px',
                backgroundColor: '#FF4B4B',
                cornerRadius: '8px',
                paddingAll: 'xs',
                contents: [
                  {
                    type: 'text',
                    text: '科技',
                    size: 'xs',
                    color: '#FFFFFF',
                    weight: 'bold',
                    align: 'center'
                  }
                ]
              }
            ]
          }
        }
      };

      // 發送 Flex Message
      await replyWithQuickReply(client, event.replyToken, flexMessage, userId);
      console.log(`✅ 圓角圖片 Flex Message 發送成功`);

    } catch (error) {
      console.error('❌ 圓角圖片處理失敗:', error);
      await replyWithQuickReply(client, event.replyToken, {
        type: 'text',
        text: '❌ 圓角圖片處理失敗，請稍後再試'
      });
    }

    return Promise.resolve(null);
  }

  // 根據內容類型進行條件式儲存
  if (isLink(cleanedMessage)) {
    // 連結類型：直接儲存到 DEV_COLLECTIONS 並回傳 FLEX MESSAGE
    console.log('🔗 [連結識別] 偵測到連結，直接儲存到收藏卡');

    if (supabase) {
      try {
        // 建立收藏卡資料
        const collectionData = {
          user_id: userId,
          title: cleanedMessage,
          content: {
            url: cleanedMessage,
            type: 'url'
          },
          is_active: true,
          category: 'link',
          color: '#4169E1',
          icon: '🔗'
        };

        // 嘗試獲取 Open Graph 資料
        try {
          const { openGraphAPI } = require('./open-graph-api');
          console.log('🔍 [Open Graph] 開始獲取網頁預覽資料:', cleanedMessage);
          const previewResult = await openGraphAPI.getPreview(cleanedMessage);

          if (previewResult && previewResult.success) {
            console.log('✅ [Open Graph] 成功獲取預覽資料');
            // 填充 Open Graph 資料
            collectionData.preview_title = previewResult.title;
            collectionData.preview_description = previewResult.description;
            collectionData.preview_image = previewResult.image;
            collectionData.social_platform = previewResult.domain || 'web';
          } else {
            console.log('⚠️ [Open Graph] 無法獲取預覽資料，使用基本資料');
          }
        } catch (ogError) {
          console.error('❌ [Open Graph] 獲取失敗:', ogError.message);
        }

        // 呼叫收藏卡 API
        const { createCollection } = require('./collections-api');
        const result = await createCollection(collectionData);

        // createCollection 成功時直接回傳 data 物件
        if (result && result.id) {
          console.log(`✅ [自動收藏] 連結已成功儲存到收藏卡: ${cleanedMessage}`);

          // 直接回傳 FLEX MESSAGE
          return replyWithQuickReply(client, event.replyToken,
            createBookmarkSuccessFlexMessage(cleanedMessage)
          );
        } else {
          throw new Error('收藏卡創建失敗');
        }
      } catch (error) {
        console.error('❌ [自動收藏] 收藏失敗:', error);
        return replyWithQuickReply(client, event.replyToken, {
          type: 'text',
          text: '❌ 連結收藏失敗，請稍後再試'
        }, userId);
      }
    } else {
      console.log('📝 [自動收藏] 資料庫未連接，無法收藏連結');
      return replyWithQuickReply(client, event.replyToken, {
        type: 'text',
        text: '❌ 資料庫未連接，無法收藏連結'
      });
    }
  } else {
    // 非連結類型：繼續原有邏輯，稍後在AI解析完成後儲存到資料庫
    console.log('📝 [非連結] 一般訊息，將在AI解析後儲存到 DEV_MESSAGES');

    // 非連結訊息繼續原有的處理邏輯（任務堆疊、問句判斷等）
    // 注意：不要 return，讓程式繼續執行後面的邏輯
  }


  // 特殊指令：加入收藏卡
  if (userMessage.startsWith('加入收藏卡_')) {
    const taskId = parseInt(userMessage.replace('加入收藏卡_', ''));
    console.log(`📋 用戶 ${userId} 點擊加入收藏卡任務 ID: ${taskId}`);

    try {
      let task = null;

      // 先嘗試直接用ID查詢資料庫
      const { data: directTask, error: directError } = await supabase
        .from('dev_messages')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

      if (directTask && !directError) {
        task = directTask;
        console.log('✅ [收藏卡] 直接找到任務:', task.message_text);
      } else {
        // 如果直接查詢失敗，嘗試從記憶體任務堆疊中找到對應的任務文字
        console.log('🔍 [收藏卡] 直接查詢失敗，嘗試從記憶體查找任務文字');
        const userTasks = userTaskStacks.get(userId) || [];
        const memoryTask = userTasks.find(t => t.id === taskId);

        if (memoryTask) {
          console.log(`🔍 [收藏卡] 從記憶體找到任務文字: "${memoryTask.text}"`);

          // 用任務文字查詢資料庫最新的匹配任務
          const { data: textTask, error: textError } = await supabase
            .from('dev_messages')
            .select('*')
            .eq('user_id', userId)
            .eq('message_text', memoryTask.text)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (textTask && !textError) {
            task = textTask;
            console.log('✅ [收藏卡] 通過文字找到任務:', task.message_text, 'ID:', task.id);
          }
        }
      }

      if (!task) {
        console.error('❌ [收藏卡] 無法找到任務');
        return replyWithQuickReply(client, event.replyToken, {
          type: 'text',
          text: '❌ 找不到該任務，無法加入收藏卡'
        }, userId);
      }

      // 建立收藏卡資料
      const isUrl = task.message_text && (task.message_text.includes('http') || task.message_text.includes('www.'));

      const collectionData = {
        title: task.message_text,
        description: task.note || '',
        category: isUrl ? 'url' : 'text', // 🔥 修復：正確分類URL任務
        content: {
          originalTaskId: task.id, // 使用資料庫的真實ID
          createdAt: task.created_at,
          // 🔥 修復：確保所有URL都設置content.url以觸發預覽處理
          url: isUrl ? task.message_text : null,
          type: isUrl ? 'url' : 'text',
          text: isUrl ? '' : task.message_text,
          manual: false
        },
        tags: task.tag ? [task.tag] : [],
        color: '#4169E1',
        icon: '📋'
      };

      // 呼叫收藏卡 API
      const { createCollection } = require('./collections-api');
      const result = await createCollection(userId, collectionData);

      if (result.success) {
        // 🔧 自動處理URL預覽生成（LINE Bot路徑）
        const title = collectionData.title || '';
        const content = collectionData.content || {};
        const url = content.url || title;

        console.log(`🔍 [LINE Bot自動預覽調試] 收藏卡 ${result.data.id} 檢測資料:`);
        console.log(`  - title: ${title}`);
        console.log(`  - content.url: ${content.url}`);
        console.log(`  - 最終url: ${url}`);

        // 檢測是否為需要預覽的URL（所有HTTP/HTTPS URLs）
        const needsPreview = url && url.includes('http');

        if (needsPreview) {
          // 背景處理URL預覽，不阻塞LINE Bot回應
          setImmediate(async () => {
            try {
              // 統一使用 Open Graph API 處理所有 URL
              const { openGraphAPI } = require('./open-graph-api');
              const previewResult = await openGraphAPI.getPreview(url);

              if (previewResult.image) {
                  // 🤖 生成AI標籤（與前端保持一致）
                  let aiTags = [];
                  try {
                    console.log('🤖 [LINE Bot AI標籤] 開始生成AI標籤...');

                    // 直接調用URL預覽API獲取AI標籤（與前端保持一致）
                    const response = await fetch('http://localhost:3011/api/url-preview', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: url })
                    }, userId);

                    if (response.ok) {
                      const apiResult = await response.json();
                      if (apiResult.success && apiResult.data && apiResult.data.autoTags && apiResult.data.autoTags.length > 0) {
                        aiTags = apiResult.data.autoTags.slice(0, 5); // 最多5個標籤
                        console.log(`✅ [LINE Bot AI標籤] 生成標籤: ${aiTags.join(', ')}`);
                      }
                    }
                  } catch (aiError) {
                    console.log(`⚠️ [LINE Bot AI標籤] AI分析失敗: ${aiError.message}`);
                  }

                  const updateData = {
                    content: {
                      ...content,
                      url: url,
                      preview_image: previewResult.image,
                      preview_title: previewResult.title || '預覽標題',
                      preview_description: previewResult.description || '預覽描述',
                      extraction_method: previewResult.type,
                      auto_processed: true,
                      linebot_processed: true,
                      extraction_date: new Date().toISOString(),
                      autoTags: aiTags // 存儲AI標籤到content.autoTags
                    },
                    tags: aiTags // 同時存儲到主要tags欄位
                  };

                  const collectionsAPI = require('./collections-api');
                  const updateResult = await collectionsAPI.updateCollection(userId, result.data.id, updateData);

                  if (!updateResult.success) {
                    console.error(`LINE Bot預覽更新失敗 (${result.data.id}): ${updateResult.error}`);
                  } else if (aiTags.length > 0) {
                    console.log(`✅ [LINE Bot AI標籤] 收藏卡 ${result.data.id} 已更新AI標籤: [${aiTags.join(', ')}]`);
                  }
                }

                await preview.cleanup();
            } catch (autoError) {
              console.error(`LINE Bot自動預覽背景處理失敗: ${autoError.message}`);
            }
          }, userId);
        }

        return replyWithQuickReply(client, event.replyToken,
          createBookmarkSuccessFlexMessage(task.message_text)
        );
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ [收藏卡] 加入失敗:', error);
      return replyWithQuickReply(client, event.replyToken, {
        type: 'text',
        text: '❌ 加入收藏卡失敗，請稍後再試'
      });
    }
  }

  // 特殊指令：收藏任務
  if (userMessage.startsWith('收藏任務_')) {
    const taskId = parseInt(userMessage.replace('收藏任務_', ''));
    console.log(`⭐ 用戶 ${userId} 點擊收藏任務 ID: ${taskId}`);
    
    // 建立模擬的 postback 事件
    const mockPostbackEvent = {
      type: 'postback',
      postback: { data: `favorite_task_${taskId}` },
      source: { userId: userId },
      replyToken: event.replyToken
    };
    
    return handlePostback(mockPostbackEvent);
  }
  
  // 特殊指令：完成任務
  if (userMessage.startsWith('完成任務_')) {
    const taskId = parseInt(userMessage.replace('完成任務_', ''));
    console.log(`✅ 用戶 ${userId} 點擊完成任務 ID: ${taskId}`);

    // 建立模擬的 postback 事件
    const mockPostbackEvent = {
      type: 'postback',
      postback: { data: `complete_task_${taskId}` },
      source: { userId: userId },
      replyToken: event.replyToken
    };

    return handlePostback(mockPostbackEvent);
  }

  // 特殊指令：功能選單
  if (userMessage.startsWith('功能選單_')) {
    const taskId = parseInt(userMessage.replace('功能選單_', ''));
    console.log(`🎛️ 用戶 ${userId} 點擊功能選單 ID: ${taskId}`);

    // 發送功能選單回覆
    const functionMenuMessage = {
      type: 'text',
      text: `🎛️ 任務功能選單 (ID: ${taskId})\n\n請選擇要執行的功能：\n• 編輯任務內容\n• 設定提醒時間\n• 移動到其他分類\n• 複製任務\n• 分享任務`
    };

    return replyWithQuickReply(client, event.replyToken, functionMenuMessage, userId);
  }

  // 特殊指令：任務更新完成，重新生成任務堆疊
  if (userMessage.includes('任務更新完成') || userMessage.includes('刷新任務列表') || userMessage.includes('SYNC_TASKS')) {
    console.log('🔄 收到任務更新指令，重新生成任務堆疊');
    console.log('📥 原始指令內容:', userMessage.substring(0, 200) + '...');
    
    // 檢查是否包含 SYNC_TASKS 資料
    if (userMessage.includes('SYNC_TASKS:')) {
      try {
        // 提取 JSON 資料
        const jsonStart = userMessage.indexOf('SYNC_TASKS:') + 'SYNC_TASKS:'.length;
        const jsonData = userMessage.substring(jsonStart).trim();
        
        console.log('📄 提取的 JSON 資料 (前200字元):', jsonData.substring(0, 200));
        
        // 清理 JSON 資料中的無效字元
        const cleanedJsonData = jsonData
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字元
          .replace(/[\uFFFD\uFEFF]/g, ''); // 移除替換字元
          
        const syncedTasks = JSON.parse(cleanedJsonData);
        
        // 清理任務資料中的文字
        const cleanedTasks = syncedTasks.map(task => ({
          ...task,
          text: task.text ? task.text
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/[\uFFFD\uFEFF]/g, '')
            .trim() : '',
          notes: task.notes ? task.notes
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/[\uFFFD\uFEFF]/g, '')
            .trim() : ''
        })).filter(task => task.text); // 過濾掉沒有文字的任務
        
        console.log('📥 收到同步任務資料:', cleanedTasks.length, '個任務');
        console.log('🧹 清理後任務預覽:', cleanedTasks.map(task => task.text).slice(0, 3));
        
        // 更新伺服器端的任務堆疊
        userTaskStacks.set(userId, cleanedTasks);
        
        // 重新生成任務堆疊 Flex Message（只顯示今天的任務）
        const userTags = await getUserTags(userId);
        const { createTaskStackFlexMessage } = getTaskFlexModule();
        const todayTasks = filterTodayTasks(cleanedTasks);
        const taskStackFlexMessage = createTaskStackFlexMessage(todayTasks, userTags);
        
        console.log(`📋 任務同步完成，共 ${cleanedTasks.length} 個任務`);
        console.log('📝 更新後任務清單:', cleanedTasks.map((task, index) => `${index + 1}. ${task.text}`));
        
        if (client) {
          try {
            return replyWithQuickReply(client, event.replyToken, taskStackFlexMessage, userId);
          } catch (replyError) {
            console.error('❌ Flex Message 發送失敗:', replyError);
            // 發送簡單文字訊息作為備用
            const fallbackMessage = {
              type: 'text',
              text: `✅ 任務已同步更新，共 ${cleanedTasks.length} 個任務`
            };
            return replyWithQuickReply(client, event.replyToken, fallbackMessage, userId);
          }
        } else {
          console.log('測試模式：回覆同步後的任務堆疊 Flex Message');
          return Promise.resolve(null);
        }
      } catch (parseError) {
        console.error('❌ 解析同步任務資料失敗:', parseError);
        
        // 解析失敗時回到原本邏輯
        let userTasks = userTaskStacks.get(userId) || [];
        
        if (userTasks.length > 0) {
          const userTags = await getUserTags(userId);
          const { createTaskStackFlexMessage } = getTaskFlexModule();
          const todayTasks = filterTodayTasks(userTasks);
          const taskStackFlexMessage = createTaskStackFlexMessage(todayTasks, userTags);
          
          if (client) {
            return replyWithQuickReply(client, event.replyToken, taskStackFlexMessage, userId);
          } else {
            console.log('測試模式：回覆任務堆疊 Flex Message（解析失敗）');
            return Promise.resolve(null);
          }
        } else {
          // 沒有任務時的回覆
          const noTaskMessage = {
            type: 'text',
            text: '目前沒有待辦任務 📝'
          };
          
          if (client) {
            return replyWithQuickReply(client, event.replyToken, noTaskMessage, userId);
          } else {
            console.log('測試模式：沒有任務（解析失敗）');
            return Promise.resolve(null);
          }
        }
      }
    } else {
      // 沒有 SYNC_TASKS 資料時，使用原本邏輯
      let userTasks = userTaskStacks.get(userId) || [];
      
      if (userTasks.length > 0) {
        // 重新生成任務堆疊 Flex Message（只顯示今天的任務）
        const userTags = await getUserTags(userId);
        const { createTaskStackFlexMessage } = getTaskFlexModule();
        const todayTasks = filterTodayTasks(userTasks);
        const taskStackFlexMessage = createTaskStackFlexMessage(todayTasks, userTags);
        
        console.log(`📋 重新生成任務堆疊，共 ${userTasks.length} 個任務`);
        console.log('📝 任務清單:', userTasks.map((task, index) => `${index + 1}. ${task.text}`));
        
        if (client) {
          return replyWithQuickReply(client, event.replyToken, taskStackFlexMessage, userId);
        } else {
          console.log('測試模式：回覆任務堆疊 Flex Message');
          return Promise.resolve(null);
        }
      } else {
        // 沒有任務時的回覆
        const noTaskMessage = {
          type: 'text',
          text: '目前沒有待辦任務 📝'
        };
        
        if (client) {
          return replyWithQuickReply(client, event.replyToken, noTaskMessage, userId);
        } else {
          console.log('測試模式：沒有任務');
          return Promise.resolve(null);
        }
      }
    }
    
    // 確保 SYNC_TASKS 處理完畢後就返回，不會繼續執行其他邏輯
    return;
  }
  
  // 檢查用戶是否正在等待標籤選擇
  const tagSelectionState = userTagSelectionStates.get(userId);
  if (tagSelectionState && tagSelectionState.waitingForTag) {
    console.log(`🏷️ [標籤處理] 用戶 ${userId} 選擇標籤: ${userMessage}`);
    
    // 清除標籤選擇狀態
    userTagSelectionStates.delete(userId);
    
    // 取得用戶任務堆疊
    let userTasks = userTaskStacks.get(userId) || [];
    
    // 找到目標任務
    const taskIndex = userTasks.findIndex(task => task.id === tagSelectionState.targetTaskId);
    if (taskIndex !== -1) {
      const originalTask = userTasks[taskIndex];
      
      // 更新任務文字格式為 (標籤)原文字
      const taggedText = `(${userMessage})${originalTask.text}`;
      userTasks[taskIndex].text = taggedText;
      userTaskStacks.set(userId, userTasks);
      
      console.log(`✅ 任務已標記: ${originalTask.text} -> ${taggedText}`);
      
      // 同步更新收藏任務中的名稱（如果該任務已被收藏）
      if (originalTask.favorited) {
        let userFavorites = userFavoriteTasks.get(userId) || [];
        const favoriteIndex = userFavorites.findIndex(fav => fav.source_task_id === originalTask.id);
        if (favoriteIndex !== -1) {
          userFavorites[favoriteIndex].name = taggedText;
          userFavoriteTasks.set(userId, userFavorites);
          console.log(`🔄 收藏任務同步更新: ${taggedText}`);
        }
      }
      
      // 重新生成任務堆疊 Flex Message（只顯示今天的任務）
      const userTags = await getUserTags(userId);
      const { createTaskStackFlexMessage } = getTaskFlexModule();
      const todayTasks = filterTodayTasks(userTasks);
      const updatedFlexMessage = createTaskStackFlexMessage(todayTasks, userTags);
      
      if (client) {
        return replyWithQuickReply(client, event.replyToken, updatedFlexMessage, userId);
      } else {
        console.log('測試模式：發送標記後的任務堆疊');
        return Promise.resolve(null);
      }
    } else {
      console.log(`⚠️ 找不到目標任務 ID: ${tagSelectionState.targetTaskId}`);
      
      // 發送錯誤訊息
      const errorMessage = {
        type: 'text',
        text: '找不到要標記的任務，請重新操作'
      };
      
      if (client) {
        return replyWithQuickReply(client, event.replyToken, errorMessage, userId);
      } else {
        console.log('測試模式：任務不存在錯誤');
        return Promise.resolve(null);
      }
    }
  }
  
  // 判斷是問句還是任務
  const isQuestionMessage = isQuestion(userMessage);
  console.log(`🔍 [訊息分類] 訊息: "${userMessage}" | 判斷結果: ${isQuestionMessage ? '問句' : '任務'}`);

  if (isQuestionMessage) {
    // 問句或請求：使用 AI 回覆
    console.log('💬 偵測到問句/請求，使用 AI 回覆');
    
    let aiResponse = `收到您的問題：${userMessage}`; // 預設回覆
    
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== '你的OpenAI_API_Key') {
      try {
        console.log('🤖 正在生成 AI 回覆...');
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "你是一個友善的助手，名字叫小汪。請用繁體中文回覆，回覆要簡潔親切。"
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          max_tokens: 150,
          temperature: 0.7,
        }, userId);
        
        aiResponse = completion.choices[0].message.content;
        console.log('✅ AI 回覆生成成功');
      } catch (error) {
        console.error('❌ OpenAI API 錯誤:', error.message);
        aiResponse = '抱歉，我現在無法處理您的請求，請稍後再試。';
      }
    } else {
      console.log('⚠️ OpenAI API Key 未設定，使用預設回覆');
    }
    
    // 為語音訊息添加特殊前綴
    let finalResponse = aiResponse;
    if (isVoiceMessage) {
      finalResponse = `🎤 語音轉文字: "${userMessage}"\n\n${aiResponse}`;
    }
    
    const replyMessage = {
      type: 'text',
      text: finalResponse
    };
    
    if (client) {
      return replyWithQuickReply(client, event.replyToken, replyMessage, userId);
    } else {
      console.log('測試模式：回覆訊息', replyMessage.text);
      return Promise.resolve(null);
    }
  } else {
    // 任務：加入任務堆疊並使用 Flex Message 記錄
    console.log('📝 偵測到任務，加入任務堆疊');

    // 🤖 使用AI解析任務中的時間資訊
    let parsedTask = {
      text: userMessage,
      scheduledDate: null,
      needGoogleCalendar: false
    };

    // 🔍 檢測Google日曆關鍵字
    console.log(`🔍 [Google檢測] 開始檢測訊息中的Google關鍵字: "${userMessage}"`);
    const googleKeywords = ['google', 'google日曆', 'google calendar', 'google calender', 'GOOGLE', 'GOOGLE日曆', 'GOOGLE CALENDAR', 'GOOGLE CALENDER'];
    const hasGoogleKeyword = googleKeywords.some(keyword => userMessage.includes(keyword));
    console.log(`🔍 [Google檢測] 關鍵字檢測結果: ${hasGoogleKeyword}`);

    if (hasGoogleKeyword) {
      parsedTask.needGoogleCalendar = true;
      console.log('📅 [Google檢測] 偵測到Google日曆關鍵字，將自動啟用Google Calendar功能');
    }

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== '你的OpenAI_API_Key') {
      try {
        console.log('🤖 [AI解析] 正在解析任務時間資訊...');
        const currentDate = new Date();
        const taiwanDate = new Date(currentDate.getTime() + 8 * 60 * 60 * 1000); // 台灣時間
        const today = taiwanDate.toISOString().split('T')[0];
        const todayWeekday = ['日', '一', '二', '三', '四', '五', '六'][taiwanDate.getDay()];

        const parseCompletion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `你是時間解析助手。今天是 ${today} (星期${todayWeekday})。
請解析用戶訊息中的任務內容和時間資訊。

重要規則：
1. 提取任務的核心動作（去除時間相關詞彙和Google日曆關鍵字）
2. 只有在用戶明確提到時間時才解析時間，轉換為台灣時區格式 YYYY-MM-DDTHH:mm:00+08:00
3. 如果用戶沒有明確提到任何時間詞彙，scheduledDate 必須設為 null
4. 明確的時間詞彙包括：今天、明天、後天、幾點、幾時、上午、下午、晚上、特定日期、24小時制時間格式（如：18:00、14:30、09:15等）
5. 如果只有時間沒有日期，使用今天的日期
6. 在提取任務內容時，去除"記到GOOGLE日曆"、"記到Google日曆"等相關詞彙

回覆格式（必須是有效JSON）：
{
  "task": "任務核心內容",
  "scheduledDate": "2025-09-26T18:00:00+08:00" 或 null
}

範例：
輸入："我今天晚上6點回家"
輸出：{"task": "回家", "scheduledDate": "${today}T18:00:00+08:00"}

輸入："18:00 睡覺 記到GOOGLE日曆"
輸出：{"task": "睡覺", "scheduledDate": "${today}T18:00:00+08:00"}

輸入："14:30 開會"
輸出：{"task": "開會", "scheduledDate": "${today}T14:30:00+08:00"}

輸入："明天下午2點開會"
輸出：{"task": "開會", "scheduledDate": "${new Date(taiwanDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T14:00:00+08:00"}

輸入："買牛奶"
輸出：{"task": "買牛奶", "scheduledDate": null}

輸入："吃飯"
輸出：{"task": "吃飯", "scheduledDate": null}

輸入："去運動"
輸出：{"task": "去運動", "scheduledDate": null}

輸入："睡覺"
輸出：{"task": "睡覺", "scheduledDate": null}

特別注意：不要為沒有明確時間的日常活動添加時間！`
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          max_tokens: 200,
          temperature: 0.1,
        });

        const aiResponse = parseCompletion.choices[0].message.content.trim();
        console.log('🤖 [AI解析] 原始回應:', aiResponse);

        try {
          const parsedResult = JSON.parse(aiResponse);
          if (parsedResult.task && typeof parsedResult.task === 'string') {
            parsedTask.text = parsedResult.task;
            parsedTask.scheduledDate = parsedResult.scheduledDate;
            console.log('✅ [AI解析] 成功解析:', {
              原始訊息: userMessage,
              解析任務: parsedTask.text,
              預定時間: parsedTask.scheduledDate
            });
          }
        } catch (parseError) {
          console.log('⚠️ [AI解析] JSON解析失敗，使用原始訊息');
        }

      } catch (error) {
        console.error('❌ [AI解析] 時間解析失敗:', error.message);
      }
    } else {
      console.log('⚠️ [AI解析] OpenAI API Key 未設定，跳過AI解析');
    }

    // 取得或初始化用戶任務堆疊
    let userTasks = userTaskStacks.get(userId) || [];

    // 新增任務到堆疊
    const newTask = {
      id: Date.now(),
      text: userMessage, // 儲存完整原始訊息到 text 欄位
      originalText: userMessage,
      scheduledDate: parsedTask.scheduledDate, // AI 解析的時間
      timestamp: new Date().toISOString(),
      tag: '無標籤' // 預設標籤
    };

    // 如果是 URL，取得預覽資訊
    if (userMessage && userMessage.includes('http')) {
      try {
        console.log('🔍 [任務預覽] 偵測到 URL，取得預覽資訊:', userMessage);
        const { openGraphAPI } = require('./open-graph-api.js');
        const previewResult = await openGraphAPI.getPreview(userMessage);

        if (previewResult && previewResult.description) {
          newTask.preview_description = previewResult.description;
          newTask.preview_title = previewResult.title;
          console.log('✅ [任務預覽] 成功取得預覽資訊:', {
            title: previewResult.title,
            description: previewResult.description?.substring(0, 50) + '...'
          }, userId);
        }
      } catch (error) {
        console.log('⚠️ [任務預覽] 取得預覽資訊失敗:', error.message);
      }
    }
    
    userTasks.push(newTask);
    userTaskStacks.set(userId, userTasks);

    console.log(`📋 [任務同步] 用戶 ${userId} 目前任務數量: ${userTasks.length}`);
    console.log('📝 [任務同步] 任務清單:', userTasks.map((task, index) => `${index + 1}. ${task.text}`));

    // 🗓️ 如果檢測到Google日曆關鍵字，自動建立Google Calendar事件
    if (parsedTask.needGoogleCalendar) {
      try {
        console.log('📅 [自動Google日曆] 開始自動建立Google日曆事件...');

        // 獲取用戶的Google tokens
        const { data: tokenData, error: tokenError } = await supabase
          .from('user_google_tokens')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!tokenError && tokenData) {
          // 檢查token是否過期
          const now = new Date().getTime();
          const expiryDate = new Date(tokenData.expiry_date).getTime();

          if (now < expiryDate) {
            // 設定OAuth2客戶端的憑證
            oauth2Client.setCredentials({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expiry_date: tokenData.expiry_date
            });

            // 建立Calendar API實例
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            // 準備事件資料
            let startDateTime, endDateTime;
            if (parsedTask.scheduledDate) {
              startDateTime = new Date(parsedTask.scheduledDate);
              endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 預設1小時
            } else {
              const today = new Date();
              today.setHours(9, 0, 0, 0); // 預設上午9點
              startDateTime = today;
              endDateTime = new Date(today.getTime() + 60 * 60 * 1000);
            }

            const event = {
              summary: parsedTask.text,
              description: `來自小汪記記的任務\n原始訊息: ${userMessage}`,
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'Asia/Taipei',
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Asia/Taipei',
              },
              reminders: {
                useDefault: false,
                overrides: [{ method: 'popup', minutes: 10 }],
              },
            };

            // 建立事件
            const result = await calendar.events.insert({
              calendarId: 'primary',
              resource: event,
            });

            console.log('✅ [自動Google日曆] Google日曆事件自動建立成功:', result.data.id);
            console.log('🔗 [自動Google日曆] 事件連結:', result.data.htmlLink);

          } else {
            console.log('⚠️ [自動Google日曆] Google授權已過期，無法自動建立事件');
          }
        } else {
          console.log('⚠️ [自動Google日曆] 用戶未授權Google日曆，無法自動建立事件');
        }
      } catch (calendarError) {
        console.error('❌ [自動Google日曆] 自動建立Google日曆事件失敗:', calendarError);
      }
    }

    // 💾 儲存完整的任務資料到資料庫（包含原始訊息和AI解析的時間）
    if (supabase) {
      try {
        const tablePrefix = process.env.TABLE_PREFIX || '';
        const tableName = tablePrefix + 'messages';

        // 檢測是否為標籤選擇或任務包含標籤資訊
        let detectedTag = null;

        // 檢查用戶是否正在等待標籤選擇
        const tagSelectionState = userTagSelectionStates.get(userId);
        if (tagSelectionState && tagSelectionState.waitingForTag) {
          detectedTag = userMessage; // 用戶回覆的就是標籤
        }
        // 檢查任務文字是否包含標籤格式 (標籤)任務內容
        else if (userMessage.match(/^\((.+?)\)/)) {
          const tagMatch = userMessage.match(/^\((.+?)\)/);
          detectedTag = tagMatch[1];
        }

        const { data, error } = await supabase
          .from(tableName)
          .insert([
            {
              user_id: userId,
              message_text: parsedTask.text, // 儲存AI解析的任務文字（去除時間）
              scheduled_date: parsedTask.scheduledDate, // AI解析的時間
              tag: detectedTag,
              created_at: new Date().toISOString()
            }
          ]);

        if (error) {
          console.error('❌ [資料庫儲存] Supabase 儲存錯誤:', error);
        } else {
          console.log('✅ [資料庫儲存] 任務已儲存到資料庫:', {
            userId,
            原始訊息: userMessage,
            message_text: parsedTask.text,
            scheduled_date: parsedTask.scheduledDate,
            標籤: detectedTag || '無標籤'
          });
        }
      } catch (err) {
        console.error('❌ [資料庫儲存] 資料庫連線錯誤:', err);
      }
    } else {
      console.log('⚠️ [資料庫儲存] 資料庫未連接，無法儲存任務');
    }

    // 🔄 同步到 localStorage - 讓 FLEX MESSAGE 與全部記錄頁面保持同步
    console.log('🔄 [任務同步] 同步任務到 localStorage 以保持與全部記錄頁面一致');
    
    // 🗓️ 使用記憶體中的任務堆疊來顯示 Flex Message（確保與標籤視圖同步）
    console.log(`🔍 [新建任務] 使用記憶體中的 ${userTasks.length} 個活躍任務`);

    // 創建包含活躍任務的 Flex Message
    const userTags = await getUserTags(userId);
    const { createTaskStackFlexMessage } = getTaskFlexModule();
    const flexMessage = createTaskStackFlexMessage(userTasks, userTags);
    
    // 📱 回覆 FLEX MESSAGE 時同時包含同步指令
    const syncMessage = `SYNC_TASKS:${JSON.stringify(userTasks)}`;
    console.log('📱 [任務同步] 準備發送 FLEX MESSAGE 和同步資料');
    
    // 🔍 詳細記錄 FLEX MESSAGE 結構用於診斷
    console.log('🔍 [FLEX DEBUG] FLEX MESSAGE 結構預覽:');
    console.log(`  - altText: ${flexMessage.altText}`);
    console.log(`  - type: ${flexMessage.type}`);
    console.log(`  - quickReply items: ${flexMessage.quickReply?.items?.length || 0}`);
    console.log('🔍 [FLEX DEBUG] 任務ICON結構檢查:');
    const bodyContents = flexMessage.contents?.body?.contents || [];
    
    // 檢查任務項目的ICON結構
    let taskIconCount = 0;
    bodyContents.forEach((item, idx) => {
      if (item.type === 'box' && item.layout === 'horizontal' && item.contents && item.contents.length >= 3) {
        const taskText = item.contents[0]?.text || '';
        if (taskText.match(/^\d+\./)) { // 匹配任務項目格式 "1. xxx"
          taskIconCount++;
          console.log(`  📋 任務 ${taskIconCount}:`);
          console.log(`    - 文字: ${taskText.substring(0, 20)}...`);
          console.log(`    - ICON數量: ${item.contents.length}`);
          item.contents.slice(1).forEach((icon, iconIdx) => {
            const actionType = icon.action?.type || 'none';
            const actionData = icon.action?.data || icon.action?.uri || 'none';
            console.log(`    - ICON ${iconIdx + 1}: ${icon.text} (${actionType}: ${actionData})`);
          }, userId);
        }
      }
    });
    
    // 檢查底部按鈕區域
    console.log('🔍 [FLEX DEBUG] 底部按鈕檢查:');
    const bottomButtonBox = bodyContents.find(item => 
      item.type === 'box' && 
      item.layout === 'horizontal' && 
      item.contents && 
      item.contents.some(btn => btn.text && (btn.text.includes('全部記錄') || btn.text.includes('任務收藏')))
    );
    if (bottomButtonBox) {
      console.log(`  ✅ 找到底部按鈕區域，包含 ${bottomButtonBox.contents?.length || 0} 個按鈕`);
      bottomButtonBox.contents?.forEach((btn, idx) => {
        console.log(`  📋 按鈕 ${idx + 1}: ${btn.text} -> ${btn.action?.uri}`);
      });
    } else {
      console.log('  ❌ 未找到底部按鈕區域');
    }
    
    if (client) {
      console.log('🚀 [FLEX SEND] 開始發送 FLEX MESSAGE 到 LINE...');
      return replyWithQuickReply(client, event.replyToken, flexMessage, userId)
        .then(result => {
          console.log('✅ [FLEX SEND] FLEX MESSAGE 發送成功!', {
            requestId: result['x-line-request-id'],
            sentMessages: result.sentMessages?.length || 0
          }, userId);
          return result;
        })
        .catch(error => {
          console.error('❌ [FLEX SEND] FLEX MESSAGE 發送失敗:', error);
          console.error('❌ [FLEX ERROR] 錯誤詳情:', error.message);
          throw error;
        }, userId);
    } else {
      console.log('測試模式：任務堆疊 Flex Message', JSON.stringify(flexMessage, null, 2));
      return Promise.resolve(null);
    }
  }
}

// LINE Login 路由（獨立模組，不影響 Bot）
const lineLoginRoutes = require('./line-login-routes');
app.use('/auth/line', lineLoginRoutes);

// LIFF 應用程式路由
// LIFF 應用程式直接HTML路由
app.get('/liff-app.html', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  console.log('📝 [任務編輯] 接收到 liff-app.html 請求');
  console.log('🔍 [任務編輯] 查詢參數:', req.query);

  try {
    let html = fs.readFileSync(path.join(__dirname, 'liff-app.html'), 'utf8');

    // 進行 LIFF ID 動態替換
    const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
    html = html.replace(/liffId: '[^']*'/, `liffId: '${liffId}'`);

    console.log(`📝 [任務編輯] 使用 LIFF ID: ${liffId}`);
    console.log(`🔗 [任務編輯] URL 參數:`, req.url);

    res.send(html);
  } catch (error) {
    console.error('讀取任務編輯頁面錯誤:', error);
    res.status(500).send('任務編輯頁面載入失敗');
  }
});
app.get('/liff', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    let html = fs.readFileSync(path.join(__dirname, 'liff-app.html'), 'utf8');
    
    // 根據環境變數替換 LIFF ID
    const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
    html = html.replace(/liffId: '[^']*'/, `liffId: '${liffId}'`);
    
    res.send(html);
  } catch (error) {
    console.error('LIFF 檔案讀取錯誤:', error);
    res.status(500).send('LIFF APP 載入失敗');
  }
});

// LIFF 儲存功能測試頁面
app.get('/test', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const html = fs.readFileSync(path.join(__dirname, 'test-liff-save.html'), 'utf8');
    res.send(html);
  } catch (error) {
    console.error('讀取測試檔案錯誤:', error);
    res.status(500).send('測試檔案載入失敗');
  }
});

// 儲存功能問題診斷工具
app.get('/debug', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const html = fs.readFileSync(path.join(__dirname, 'debug-storage.html'), 'utf8');
    res.send(html);
  } catch (error) {
    console.error('讀取診斷檔案錯誤:', error);
    res.status(500).send('診斷檔案載入失敗');
  }
});

// LIFF 全部記錄頁面路由
app.get('/liff/records', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    let html = fs.readFileSync(path.join(__dirname, 'liff-records.html'), 'utf8');
    
    // 🔧 修復：進行 LIFF ID 動態替換
    const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
    html = html.replace(/liffId: '[^']*'/, `liffId: '${liffId}'`);
    
    console.log(`📱 [記錄頁面] 使用 LIFF ID: ${liffId}`);
    console.log(`🔗 [記錄頁面] URL 參數:`, req.url);
    
    // 強制不緩存
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(html);
  } catch (error) {
    console.error('讀取記錄頁面錯誤:', error);
    res.status(500).send('記錄頁面載入失敗');
  }
});


// 帳戶頁面路由
app.get('/liff/account', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    let html = fs.readFileSync(path.join(__dirname, 'liff-account.html'), 'utf8');
    
    // 進行 LIFF ID 動態替換
    const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
    html = html.replace(/liffId: '[^']*'/, `liffId: '${liffId}'`);
    
    console.log(`👤 [帳戶頁面] 使用 LIFF ID: ${liffId}`);
    console.log(`🔗 [帳戶頁面] URL 參數:`, req.url);
    
    // 強制不緩存
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(html);
  } catch (error) {
    console.error('讀取帳戶頁面錯誤:', error);
    res.status(500).send('帳戶頁面載入失敗');
  }
});

// 收藏集合頁面路由
app.get('/liff/collections', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  try {
    let html = fs.readFileSync(path.join(__dirname, 'liff-collections.html'), 'utf8');

    // 進行 LIFF ID 動態替換
    const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
    html = html.replace(/liffId: '[^']*'/, `liffId: '${liffId}'`);

    console.log(`📋 [收藏集合頁面] 使用 LIFF ID: ${liffId}`);
    console.log(`🔗 [收藏集合頁面] URL 參數:`, req.url);

    // 強制不緩存
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(html);
  } catch (error) {
    console.error('讀取收藏集合頁面錯誤:', error);
    res.status(500).send('收藏集合頁面載入失敗');
  }
});

// 收藏卡 API 路由
const collectionsAPI = require('./collections-api');

// 🔍 獲取用戶收藏卡
app.get('/api/collections/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const options = {
      category: req.query.category,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const result = await collectionsAPI.getUserCollections(userId, options);

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ [API] 獲取收藏卡失敗:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ➕ 建立收藏卡
// 🔥 新增：支援不帶 userId 參數的收藏卡創建 API（userId 在 body 中）
app.post('/api/collections', async (req, res) => {
  try {
    const collectionData = req.body;
    const userId = collectionData.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId in request body'
      });
    }

    // 🔧 預處理URL並檢測社群平台
    const title = collectionData.title || '';
    const content = collectionData.content || {};
    const url = content.url || collectionData.url || title;
    const needsPreview = url && url.includes('http');

    // 🔥 檢測是否為社群平台URL（需要即時處理以顯示帳號資訊）
    const isSocialUrl = url && (
      url.includes('facebook.com') ||
      url.includes('instagram.com') ||
      url.includes('twitter.com') ||
      url.includes('x.com') ||
      url.includes('threads.net') ||
      url.includes('linkedin.com')
    );

    let result;
    if (isSocialUrl) {
      // 🚀 社群平台URL：立即處理並包含社群帳號資訊
      console.log(`🔥 [即時處理] 檢測到社群平台URL: ${url}`);

      try {
        // 立即調用AI標籤生成器獲取社群帳號資訊（使用全局實例）

        // 🔍 先使用URL預覽API獲取完整內容數據
        console.log(`🔄 [即時處理] 先獲取完整內容數據...`);
        const axios = require('axios');
        const previewResponse = await axios.post('http://localhost:3011/api/url-preview', {
          url: url
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }, userId);

        let analysisResult;
        if (previewResponse.data.success && previewResponse.data.data) {
          // 使用完整的預覽數據
          analysisResult = previewResponse.data.data;
          console.log(`✅ [即時處理] 成功獲取完整分析結果`);
        } else {
          // 回退到簡化版本
          console.log(`⚠️ [即時處理] 預覽失敗，使用簡化分析`);
          let domain = '';
          try {
            const urlObj = new URL(url);
            domain = urlObj.hostname;
          } catch (error) {
            console.log('⚠️ [即時處理] 無法解析URL domain:', error.message);
          }

          const contentData = {
            url: url,
            domain: domain,
            title: title,
            description: '',
            meta: {},
            metaTags: {}
          };

          analysisResult = await aiTagGenerator.generateTags(contentData);
        }

        // 更新 content 包含社群帳號資訊
        const enhancedContent = {
          ...content,
          url: url,
          socialAccount: analysisResult.socialAccount || null,
          autoTags: analysisResult.autoTags || [],
          preview_image: analysisResult.image,
          preview_title: analysisResult.title || title,
          preview_description: analysisResult.description || '',
          extraction_method: analysisResult.type || 'instant',
          auto_processed: true,
          extraction_date: new Date().toISOString()
        };

        // 創建包含社群帳號資訊的收藏卡
        const enhancedCollectionData = {
          ...collectionData,
          content: enhancedContent
        };

        if (analysisResult.autoTags && analysisResult.autoTags.length > 0) {
          enhancedCollectionData.tags = analysisResult.autoTags;
        }

        result = await collectionsAPI.createCollection(userId, enhancedCollectionData);

        if (analysisResult.socialAccount) {
          console.log(`👥 [即時處理] 成功提取社群帳號: ${analysisResult.socialAccount.platform} - ${analysisResult.socialAccount.accountName || '無名稱'}`);
        }

      } catch (socialError) {
        console.error(`❌ [即時處理] 社群帳號分析失敗: ${socialError.message}`);
        // 失敗時仍創建普通收藏卡
        result = await collectionsAPI.createCollection(userId, collectionData);
      }
    } else {
      // 🔄 非社群平台URL：正常創建，背景處理AI分析
      result = await collectionsAPI.createCollection(userId, collectionData);
    }

    if (result.success) {
      // 🤖 背景處理完整AI分析（對所有URL，但社群平台已經處理過帳號資訊）
      if (needsPreview && !isSocialUrl) {
        setImmediate(async () => {
          try {
            console.log(`🔄 [背景AI分析] 開始處理收藏卡 ${result.data.id} 的URL: ${url}`);

            // 調用完整的URL預覽API獲取AI分析結果
            const axios = require('axios');
            const apiResponse = await axios.post('http://localhost:3011/api/url-preview', {
              url: url
            }, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 60000
            }, userId);

            if (apiResponse.data.success && apiResponse.data.data) {
              const analysisResult = apiResponse.data.data;

              // 準備更新數據，同時更新content和tags
              const updateData = {
                content: {
                  ...content,
                  url: url,
                  socialAccount: analysisResult.socialAccount || null,
                  autoTags: analysisResult.autoTags || [],
                  preview_image: analysisResult.image,
                  preview_title: analysisResult.title || title,
                  preview_description: analysisResult.description || '',
                  extraction_method: analysisResult.type || 'background',
                  auto_processed: true,
                  extraction_date: new Date().toISOString()
                }
              };

              // 如果有自動標籤，也更新 tags 欄位
              if (analysisResult.autoTags && analysisResult.autoTags.length > 0) {
                updateData.tags = analysisResult.autoTags;
              }

              // 更新資料庫
              const updateResult = await collectionsAPI.updateCollection(userId, result.data.id, updateData);

              if (updateResult.success) {
                console.log(`✅ [背景AI分析] 收藏卡 ${result.data.id} 處理完成`);
                if (analysisResult.socialAccount) {
                  console.log(`👥 [背景AI分析] 發現社群帳號: ${analysisResult.socialAccount.platform} - ${analysisResult.socialAccount.accountName || '無名稱'}`);
                }
              } else {
                console.error(`❌ [背景AI分析] 收藏卡 ${result.data.id} 更新失敗:`, updateResult.error);
              }

            } else {
              console.log(`⚠️ [背景AI分析] 收藏卡 ${result.data.id} API 分析失敗`);
            }

          } catch (error) {
            console.error(`❌ [背景AI分析] 收藏卡 ${result.data.id} 處理出錯:`, error.message);
          }
        }, userId);
      }

      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('創建收藏卡失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/collections/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const collectionData = req.body;

    // 🔧 預處理URL並檢測社群平台
    const title = collectionData.title || '';
    const content = collectionData.content || {};
    const url = content.url || collectionData.url || title;
    const needsPreview = url && url.includes('http');

    // 🔥 檢測是否為社群平台URL（需要即時處理以顯示帳號資訊）
    const isSocialUrl = url && (
      url.includes('facebook.com') ||
      url.includes('instagram.com') ||
      url.includes('twitter.com') ||
      url.includes('x.com') ||
      url.includes('threads.net') ||
      url.includes('linkedin.com')
    );

    let result;
    if (isSocialUrl) {
      // 🚀 社群平台URL：立即處理並包含社群帳號資訊
      console.log(`🔥 [即時處理] 檢測到社群平台URL: ${url}`);

      try {
        // 立即調用AI標籤生成器獲取社群帳號資訊（使用全局實例）

        // 🔍 先使用URL預覽API獲取完整內容數據
        console.log(`🔄 [即時處理] 先獲取完整內容數據...`);
        const axios = require('axios');
        const previewResponse = await axios.post('http://localhost:3011/api/url-preview', {
          url: url
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }, userId);

        let analysisResult;
        if (previewResponse.data.success && previewResponse.data.data) {
          // 使用完整的預覽數據
          analysisResult = previewResponse.data.data;
          console.log(`✅ [即時處理] 成功獲取完整分析結果`);
        } else {
          // 回退到簡化版本
          console.log(`⚠️ [即時處理] 預覽失敗，使用簡化分析`);
          let domain = '';
          try {
            const urlObj = new URL(url);
            domain = urlObj.hostname;
          } catch (error) {
            console.log('⚠️ [即時處理] 無法解析URL domain:', error.message);
          }

          const contentData = {
            url: url,
            domain: domain,
            title: title,
            description: '',
            meta: {},
            metaTags: {}
          };

          analysisResult = await aiTagGenerator.generateTags(contentData);
        }

        // 更新 content 包含社群帳號資訊
        const enhancedContent = {
          ...content,
          url: url,
          socialAccount: analysisResult.socialAccount || null,
          autoTags: analysisResult.autoTags || [],
          preview_image: analysisResult.image,
          preview_title: analysisResult.title || title,
          preview_description: analysisResult.description || '',
          extraction_method: analysisResult.type || 'instant',
          auto_processed: true,
          extraction_date: new Date().toISOString()
        };

        // 創建包含社群帳號資訊的收藏卡
        const enhancedCollectionData = {
          ...collectionData,
          content: enhancedContent
        };

        if (analysisResult.autoTags && analysisResult.autoTags.length > 0) {
          enhancedCollectionData.tags = analysisResult.autoTags;
        }

        result = await collectionsAPI.createCollection(userId, enhancedCollectionData);

        if (analysisResult.socialAccount) {
          console.log(`👥 [即時處理] 成功提取社群帳號: ${analysisResult.socialAccount.platform} - ${analysisResult.socialAccount.accountName || '無名稱'}`);
        }

      } catch (socialError) {
        console.error(`❌ [即時處理] 社群帳號分析失敗: ${socialError.message}`);
        // 失敗時仍創建普通收藏卡
        result = await collectionsAPI.createCollection(userId, collectionData);
      }
    } else {
      // 🔄 非社群平台URL：正常創建，背景處理AI分析
      result = await collectionsAPI.createCollection(userId, collectionData);
    }

    if (result.success) {
      // 🤖 背景處理完整AI分析（對所有URL，但社群平台已經處理過帳號資訊）
      if (needsPreview && !isSocialUrl) {
        setImmediate(async () => {
          try {
            console.log(`🔄 [背景AI分析] 開始處理收藏卡 ${result.data.id} 的URL: ${url}`);

            // 調用完整的URL預覽API獲取AI分析結果
            const axios = require('axios');
            const apiResponse = await axios.post('http://localhost:3011/api/url-preview', {
              url: url
            }, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 60000
            }, userId);

            if (apiResponse.data.success && apiResponse.data.data) {
              const analysisResult = apiResponse.data.data;

              // 準備更新數據，同時更新content和tags
              const updateData = {
                content: {
                  ...content,
                  url: url,
                  preview_image: analysisResult.image,
                  preview_title: analysisResult.title || '預覽標題',
                  preview_description: analysisResult.description || '預覽描述',
                  extraction_method: analysisResult.type,
                  autoTags: analysisResult.autoTags || [], // 🤖 AI生成的標籤
                  socialAccount: analysisResult.socialAccount || null, // 👥 社群帳號資訊
                  auto_processed: true,
                  extraction_date: new Date().toISOString()
                }
              };

              // 🔥 重要：如果AI生成了標籤，更新tags欄位
              if (analysisResult.autoTags && analysisResult.autoTags.length > 0) {
                updateData.tags = analysisResult.autoTags;
                console.log(`🤖 [背景AI分析] 收藏卡 ${result.data.id} 更新AI標籤: ${analysisResult.autoTags.join(', ')}`);
              }

              // 👥 如果檢測到社群帳號，記錄日誌
              if (analysisResult.socialAccount) {
                console.log(`👥 [背景AI分析] 收藏卡 ${result.data.id} 檢測到社群帳號: ${analysisResult.socialAccount.platform} - ${analysisResult.socialAccount.accountName || '無名稱'}`);
              }

              const collectionsAPI = require('./collections-api');
              const updateResult = await collectionsAPI.updateCollection(userId, result.data.id, updateData);

              if (updateResult.success) {
                console.log(`✅ [背景AI分析] 收藏卡 ${result.data.id} 更新成功`);
              } else {
                console.error(`❌ [背景AI分析] 收藏卡 ${result.data.id} 更新失敗: ${updateResult.error}`);
              }
            } else {
              console.log(`⚠️ [背景AI分析] 收藏卡 ${result.data.id} AI分析未返回有效數據`);
            }

          } catch (autoError) {
            console.error(`❌ [背景AI分析] 收藏卡 ${result.data.id} 處理失敗: ${autoError.message}`);
          }
        }, userId);
      }

      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ [API] 建立收藏卡失敗:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 📝 更新收藏卡
app.put('/api/collections/:userId/:collectionId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const collectionId = req.params.collectionId;
    const updateData = req.body;

    const result = await collectionsAPI.updateCollection(userId, collectionId, updateData);

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ [API] 更新收藏卡失敗:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 🗑️ 刪除收藏卡
app.delete('/api/collections/:userId/:collectionId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const collectionId = req.params.collectionId;

    console.log(`🗑️ [API] 收到刪除收藏卡請求 - User: ${userId}, Collection: ${collectionId}`);

    const result = await collectionsAPI.deleteCollection(userId, collectionId);

    if (result.success) {
      console.log(`✅ [API] 刪除收藏卡成功 - Collection: ${collectionId}`);
      res.json({ success: true, data: result.data });
    } else {
      console.log(`❌ [API] 刪除收藏卡失敗 - Error: ${result.error}`);
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ [API] 刪除收藏卡異常:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 📊 獲取收藏卡統計
app.get('/api/collections/:userId/stats', async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await collectionsAPI.getCollectionStats(userId);

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ [API] 獲取收藏卡統計失敗:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 網址預覽 API
const { openGraphAPI } = require('./open-graph-api');

// 創建AI標籤生成器實例
const AITagGenerator = require('./ai-tag-generator');
const aiTagGenerator = new AITagGenerator();

// 🔍 獲取網址預覽
app.post('/api/url-preview', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: '缺少URL參數' });
    }

    // 驗證URL格式
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ success: false, error: 'URL格式無效' });
    }

    console.log(`🔍 [API] 請求網址預覽: ${url}`);

    // 🚀 優先使用 Open Graph API 處理所有連結（替代 Puppeteer）
    const isInstagram = url.includes('instagram.com');
    const isFacebook = url.includes('facebook.com');
    const linkType = isInstagram ? 'Instagram' : isFacebook ? 'Facebook' : '一般網站';
    console.log(`🌐 [API] 使用Open Graph API處理連結: ${linkType}`);

    let enhancedResult;
    try {
      // 使用 Open Graph API (快速、穩定、無資源問題)
      enhancedResult = await openGraphAPI.getPreview(url);
      console.log(`✅ [Open Graph] ${linkType} 處理成功`);
    } catch (error) {
      console.log(`⚠️ [Open Graph] ${linkType} 處理失敗:`, error.message);
      // 如果 Open Graph API 失敗，使用基本回退
      enhancedResult = {
        title: new URL(url).hostname,
        description: '無法獲取預覽內容',
        image: null
      };
    }

    // 🤖 使用AI標籤生成器進行分析（包含社群帳號提取）
    let autoTags = [];
    let socialAccount = null;
    try {
      console.log(`🤖 [AI分析] 開始使用AI標籤生成器分析 ${url}...`);

      // 準備分析數據（AI標籤生成器需要的格式）
      let domain = '';
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      } catch (error) {
        console.log('⚠️ [AI分析] 無法解析URL domain:', error.message);
      }

      const contentData = {
        url: url,
        domain: domain,
        title: enhancedResult.title,
        description: enhancedResult.description,
        image: enhancedResult.image,
        meta: enhancedResult.meta || {},
        metaTags: enhancedResult.meta || {}
      };

      // 調用AI標籤生成器
      const analysisResult = await aiTagGenerator.generateTags(contentData);

      if (analysisResult.tags && analysisResult.tags.length > 0) {
        autoTags = analysisResult.tags.slice(0, 5); // 最多5個標籤
        console.log(`✅ [AI分析] 生成標籤: ${autoTags.join(', ')}`);
      }

      if (analysisResult.socialAccount) {
        socialAccount = analysisResult.socialAccount;
        console.log(`👥 [社群分析] 檢測到社群帳號: ${socialAccount.platform} - ${socialAccount.accountName || '無名稱'}`);
      }

    } catch (aiError) {
      console.log('⚠️ [AI分析] AI標籤生成器失敗，使用關鍵詞提取...', aiError.message);

      // 降級到簡單關鍵詞提取
      if (enhancedResult.title && enhancedResult.description) {
        const combinedText = `${enhancedResult.title} ${enhancedResult.description}`.toLowerCase();

        // 技術關鍵詞庫
        const techKeywords = {
          'blog': '部落格', 'blogging': '部落格', 'website': '網站建置', 'platform': '平台',
          'wordpress': 'WordPress', 'medium': 'Medium', 'ghost': 'Ghost',
          'cms': 'CMS', 'seo': 'SEO', 'design': '設計', 'web design': '網頁設計',
          'marketing': '行銷', 'content': '內容創作', 'social': '社群',
          'tech': '科技', 'ai': '人工智慧', 'react': 'React',
          'javascript': 'JavaScript', 'python': 'Python', 'tutorial': '教學',
          'guide': '指南', 'tool': '工具', 'free': '免費', 'best': '推薦',
          'review': '評測', 'comparison': '比較', '2024': '2024', '2025': '2025'
        };

        // 提取匹配的關鍵詞
        const foundKeywords = [];
        for (const [eng, chi] of Object.entries(techKeywords)) {
          if (combinedText.includes(eng)) {
            foundKeywords.push(chi);
          }
        }

        autoTags = foundKeywords.slice(0, 5);
        console.log(`✅ [關鍵詞提取] 生成標籤: ${autoTags.join(', ')}`);
      }
    }

    // 轉換為標準格式
    const result = {
      success: true,
      data: {
        title: enhancedResult.title,
        description: enhancedResult.description,
        image: enhancedResult.image,
        url: enhancedResult.url,
        type: enhancedResult.type,
        autoTags: autoTags, // 新增自動生成的標籤
        socialAccount: socialAccount // 新增社群帳號資訊
      }
    };

    res.json(result);
  } catch (error) {
    console.error('❌ [API] 網址預覽失敗:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 🤖 AI文字分析 - 生成重點標籤
app.post('/api/ai-analysis', async (req, res) => {
  try {
    const { text, title } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: '缺少文字內容' });
    }

    console.log(`🤖 [AI分析] 開始分析文字內容: ${text.substring(0, 100)}...`);

    // 使用OpenAI進行文字分析生成重點標籤
    const analysisResult = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "你是一個專業的內容分析師，擅長從文字中提取關鍵重點並生成實用的標籤。"
        },
        {
          role: "user",
          content: `請分析以下文字內容，生成5個精準的中文重點標籤：

標題：${title || '無標題'}
內容：${text}

要求：
1. 生成5個中文標籤，每個標籤2-4個字
2. 標籤要反映文字的核心主題和重點
3. 標籤要實用，適合做為分類和搜尋使用
4. 避免過於籠統的詞彙
5. 優先提取技術名詞、關鍵概念、主題領域

請只輸出5個標籤，用逗號分隔：`
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    const aiResponse = analysisResult.choices[0]?.message?.content?.trim();
    if (!aiResponse) {
      throw new Error('AI分析回應為空');
    }

    // 解析標籤
    const tags = aiResponse.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    // 生成摘要（取前100字）
    const summary = text.length > 100 ? text.substring(0, 100) + '...' : text;

    const result = {
      success: true,
      data: {
        tags: tags.slice(0, 5), // 確保只返回5個標籤
        summary: summary,
        originalText: text,
        analysisMethod: 'openai',
        confidence: 85 // 使用OpenAI的固定置信度
      }
    };

    console.log(`✅ [AI分析] 成功生成標籤: ${tags.join(', ')}`);
    res.json(result);

  } catch (error) {
    console.error('❌ [AI分析] 分析失敗:', error);

    // 降級到簡單關鍵詞提取
    try {
      const { text, title } = req.body;
      const fallbackTags = extractSimpleKeywords(text, title);
      const summary = text.length > 100 ? text.substring(0, 100) + '...' : text;

      res.json({
        success: true,
        data: {
          tags: fallbackTags,
          summary: summary,
          originalText: text,
          analysisMethod: 'fallback',
          confidence: 60,
          note: 'AI分析不可用，使用關鍵詞提取'
        }
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: '文字分析失敗',
        details: error.message
      });
    }
  }
});

// 簡單關鍵詞提取函數（降級方案）
function extractSimpleKeywords(text, title = '') {
  const combinedText = `${title} ${text}`.toLowerCase();

  // 常用停用詞
  const stopWords = ['的', '是', '和', '或', '與', '及', '等', '也', '而', '但', '如', '在', '上', '下', '中', '內', '外', '可以', '使用', '這個', '如何', '什麼', '怎麼'];

  // 提取中文詞彙 (2-4字)
  const chineseWords = combinedText.match(/[\u4e00-\u9fff]{2,4}/g) || [];

  // 過濾停用詞並去重
  const keywords = [...new Set(chineseWords)]
    .filter(word => !stopWords.includes(word))
    .slice(0, 5);

  // 如果關鍵詞不足，添加通用標籤
  if (keywords.length < 3) {
    keywords.push('內容', '資訊', '參考');
  }

  return keywords.slice(0, 5);
}

// 路由設定
app.get('/', (req, res) => {
  const loginUrl = '/auth/line/login';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>小汪記記</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: -apple-system, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
        }
        .status { 
          background: #f0f0f0;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .login-link {
          display: inline-block;
          background: #00B900;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 10px;
        }
        .endpoints {
          background: #f9f9f9;
          padding: 15px;
          border-left: 3px solid #00B900;
          margin: 20px 0;
        }
        code {
          background: #e0e0e0;
          padding: 2px 5px;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <h1>🐕 小汪記記 LINE Bot</h1>
      
      <div class="status">
        <h2>系統狀態</h2>
        <p>✅ Bot 運行中</p>
        <p>🕐 ${new Date().toISOString()}</p>
      </div>
      
      <div class="endpoints">
        <h3>可用端點</h3>
        <ul>
          <li><code>POST /webhook</code> - LINE Bot Webhook</li>
          <li><code>GET /health</code> - 健康檢查</li>
          <li><code>GET /db-status</code> - 資料庫狀態</li>
          <li><code>GET /auth/line/login</code> - LINE 登入</li>
          <li><code>GET /auth/line/status</code> - 登入狀態 API</li>
        </ul>
      </div>
      
      <div>
        <h3>LINE Login</h3>
        <p>使用 LINE 帳號登入網頁版：</p>
        <a href="${loginUrl}" class="login-link">使用 LINE 登入</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 資料庫狀態檢查
app.get('/db-status', async (req, res) => {
  if (!supabase) {
    return res.json({ 
      database: 'disconnected',
      message: 'Supabase 環境變數未設定' 
    });
  }
  
  try {
    // 根據環境選擇表格名稱
    const tablePrefix = process.env.TABLE_PREFIX || '';
    const tableName = tablePrefix + 'messages';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) {
      return res.json({ 
        database: 'error',
        message: error.message 
      });
    }
    
    res.json({ 
      database: 'connected',
      message: 'Supabase 連線正常',
      totalMessages: data.length
    });
  } catch (err) {
    res.json({ 
      database: 'error',
      message: err.message 
    });
  }
});

// ==================== 標籤 API 端點 ====================

// 取得使用者標籤列表
app.get('/api/tags', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🔍 [API診斷] 取得使用者 ${userId} 的標籤列表`);
    
    if (supabase) {
      const tablePrefix = process.env.TABLE_PREFIX || '';
      const tableName = tablePrefix + 'tags';
      
      console.log(`🔍 [API診斷] 查詢表格: ${tableName}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.error('❌ [API診斷] Supabase 查詢錯誤:', error);
        return res.status(500).json({ error: 'Database query failed', details: error });
      }
      
      if (data && data.length > 0) {
        console.log(`✅ [API診斷] 查詢到 ${data.length} 個標籤:`);
        console.log(data.map(tag => `- ${tag.name}(${tag.sort_order})`));
        res.json(data);
      } else {
        console.log(`⚠️ [API診斷] 未找到標籤，返回空陣列`);
        res.json([]);
      }
    } else {
      console.log(`🔌 [API診斷] 無資料庫連線，返回預設標籤`);
      // 如果沒有資料庫連線，返回預設標籤
      const defaultTags = [
        { id: 1, name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1 },
        { id: 2, name: '學習', color: '#4ECDC4', icon: '📚', sort_order: 2 },
        { id: 3, name: '運動', color: '#45B7D1', icon: '🏃‍♂️', sort_order: 3 }
      ];
      res.json(defaultTags);
    }
  } catch (err) {
    console.error('標籤 API 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 新增標籤
app.post('/api/tags', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { name, color, icon, orderIndex } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    if (!name || name.length > 20) {
      return res.status(400).json({ error: 'Invalid tag name' });
    }
    
    console.log(`➕ 使用者 ${userId} 新增標籤: ${name}`);
    
    if (supabase) {
      const tablePrefix = process.env.TABLE_PREFIX || 'dev_';
      const tableName = tablePrefix + 'tags';
      
      console.log(`🔍 [新增標籤] 查詢表格: ${tableName}, 用戶: ${userId}`);
      
      // 檢查標籤數量限制
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (count >= 10) {
        return res.status(400).json({ error: 'Tag limit exceeded' });
      }
      
      // 檢查標籤名稱是否已存在
      const { data: existingTag } = await supabase
        .from(tableName)
        .select('id')
        .eq('user_id', userId)
        .eq('name', name)
        .eq('is_active', true)
        .single();
      
      if (existingTag) {
        return res.status(400).json({ error: 'Tag name already exists' });
      }
      
      // 獲取下一個 sort_order
      const { data: maxOrderData } = await supabase
        .from(tableName)
        .select('sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = maxOrderData && maxOrderData.length > 0 
        ? maxOrderData[0].sort_order + 1 
        : 1;

      console.log(`📋 [新增標籤] 下一個排序: ${nextOrder}`);

      // 新增標籤
      const { data, error } = await supabase
        .from(tableName)
        .insert([{
          user_id: userId,
          name,
          color: color || '#4169E1',
          icon: icon || '🏷️',
          sort_order: nextOrder,
          is_active: true
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ [新增標籤] Supabase 插入錯誤:', error);
        return res.status(500).json({ error: 'Database insert failed' });
      }
      
      console.log(`✅ [新增標籤] 標籤新增成功: ${data.name} (ID: ${data.id}, sort_order: ${data.sort_order})`);
      
      // 重新載入所有用戶標籤並記錄
      const updatedTags = await getUserTags(userId);
      console.log(`🔄 [新增標籤] 用戶現有標籤數量: ${updatedTags ? updatedTags.length : 0}`);
      if (updatedTags) {
        console.log(`📝 [新增標籤] 標籤列表:`, updatedTags.map(tag => `${tag.name}(${tag.sort_order})`));
      }
      
      res.status(201).json({ 
        newTag: data, 
        totalTags: updatedTags ? updatedTags.length : 0,
        allTags: updatedTags 
      });
    } else {
      // 沒有資料庫連線時返回模擬結果
      const newTag = {
        id: Date.now(),
        user_id: userId,
        name,
        color: color || '#4169E1',
        icon: icon || '🏷️',
        sort_order: orderIndex || 0,
        is_active: true
      };
      res.status(201).json(newTag);
    }
  } catch (err) {
    console.error('新增標籤錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 刪除標籤
app.delete('/api/tags/:tagId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const tagId = req.params.tagId;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🗑️ 使用者 ${userId} 刪除標籤: ${tagId}`);
    
    if (supabase) {
      const tablePrefix = process.env.TABLE_PREFIX || '';
      const tableName = tablePrefix + 'tags';
      
      // 軟刪除（設為不活躍）
      const { data, error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq('id', tagId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase 更新錯誤:', error);
        return res.status(500).json({ error: 'Database update failed' });
      }
      
      if (!data) {
        return res.status(404).json({ error: 'Tag not found' });
      }
      
      console.log('✅ 標籤刪除成功');
      res.json({ message: 'Tag deleted successfully' });
    } else {
      // 沒有資料庫連線時返回成功
      res.json({ message: 'Tag deleted successfully' });
    }
  } catch (err) {
    console.error('刪除標籤錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 取得使用者任務列表 API
app.get('/api/tasks', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🔍 [任務API] 取得使用者 ${userId} 的任務列表`);
    
    // 從記憶體獲取用戶任務
    const userTasks = userTaskStacks.get(userId) || [];
    
    console.log(`✅ [任務API] 成功回傳 ${userTasks.length} 個任務`);
    console.log(`📝 [任務API] 任務預覽:`, userTasks.slice(0, 3).map(task => task.text));
    
    res.json(userTasks);
  } catch (err) {
    console.error('❌ [任務API] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 取得單一任務詳細資料 API
app.get('/api/get-task', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const userId = req.headers['x-user-id'];
    const taskText = req.query.taskText;

    if (!userId || !taskText) {
      return res.status(400).json({ error: 'Missing user ID or task text' });
    }

    console.log(`🔍 [載入任務] 用戶 ${userId} 查詢任務: "${taskText}"`);

    // 🔍 首先檢查記憶體中的任務堆疊（包含AI解析的資料）
    const userTasks = userTaskStacks.get(userId) || [];
    const memoryTask = userTasks.find(task => task.text === taskText);

    if (memoryTask && memoryTask.scheduledDate) {
      console.log(`✅ [載入任務] 從記憶體找到任務和AI解析時間:`, {
        taskText: memoryTask.text,
        scheduledDate: memoryTask.scheduledDate,
        originalText: memoryTask.originalText
      });

      // 回傳記憶體中的資料（包含AI解析的時間）
      return res.json({
        success: true,
        taskData: {
          id: memoryTask.id,
          title: memoryTask.text,
          tag: memoryTask.tag || null,
          note: memoryTask.note || null,
          date: memoryTask.scheduledDate, // AI解析的時間
          reminder: memoryTask.reminder || null,
          repeat: memoryTask.repeat || null
        }
      });
    }

    // 從 Supabase 數據庫查詢任務詳細資料
    if (supabase) {
      try {
        const tablePrefix = process.env.TABLE_PREFIX || '';
        const tableName = `${tablePrefix}messages`;

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', userId)
          .eq('message_text', taskText)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ [載入任務] 查詢錯誤:', error);
          return res.status(500).json({ error: 'Database query failed' });
        }

        if (data && data.length > 0) {
          const taskData = data[0];
          console.log(`✅ [載入任務] 找到任務資料:`, {
            id: taskData.id,
            message_text: taskData.message_text,
            tag: taskData.tag,
            note: taskData.note,
            scheduled_date: taskData.scheduled_date,
            reminder_minutes: taskData.reminder_minutes,
            repeat_pattern: taskData.repeat_pattern,
            google_calendar_enabled: taskData.google_calendar_enabled,
            google_calendar_who: taskData.google_calendar_who
          }, userId);

          res.json({
            success: true,
            taskData: {
              id: taskData.id,
              title: taskData.message_text,
              tag: taskData.tag,
              note: taskData.note,
              date: taskData.scheduled_date,
              reminder: taskData.reminder_minutes,
              repeat: taskData.repeat_pattern,
              googleCalendar: taskData.google_calendar_enabled || false,
              guestEmail: taskData.google_calendar_who || null
            }
          });
        } else {
          console.log(`⚠️ [載入任務] 未找到任務資料: "${taskText}"`);
          res.json({
            success: true,
            taskData: {
              title: taskText,
              tag: null,
              note: null,
              date: null,
              reminder: null,
              repeat: null,
              googleCalendar: false,
              guestEmail: null
            }
          }, userId);
        }
      } catch (dbError) {
        console.error('❌ [載入任務] 數據庫錯誤:', dbError);
        return res.status(500).json({ error: 'Database error' });
      }
    } else {
      // 如果沒有 Supabase 連接，回傳基本資料
      res.json({
        success: true,
        taskData: {
          title: taskText,
          tag: null,
          note: null,
          date: null,
          reminder: null,
          repeat: null,
          googleCalendar: false
        }
      });
    }
  } catch (error) {
    console.error('❌ [載入任務] 發生錯誤:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 儲存/更新任務 API
app.post('/api/save-task', async (req, res) => {
  try {
    // 設置響應編碼
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const userId = req.headers['x-user-id'];

    // 直接使用請求體並確保 UTF-8 編碼
    const { taskId, title, note, tag, date, reminder, repeat, googleCalendar, guestEmail } = req.body;

    // 確保中文字符正確處理
    const safeTag = tag ? Buffer.from(tag, 'utf8').toString('utf8') : null;
    const safeTitle = title ? Buffer.from(title, 'utf8').toString('utf8') : title;
    const safeNote = note ? Buffer.from(note, 'utf8').toString('utf8') : note;
    const safeGuestEmail = guestEmail ? Buffer.from(guestEmail, 'utf8').toString('utf8').trim() : null;

    // 檢查接收到的原始資料和處理後資料
    console.log(`🔍 [接收資料] 原始輸入:`, { taskId, title, note, tag, date, reminder, repeat, googleCalendar, guestEmail });
    console.log(`🔍 [UTF-8處理] 處理後:`, { taskId, safeTitle, safeNote, safeTag, date, reminder, repeat, googleCalendar, safeGuestEmail });

    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    if (!taskId || !title?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`💾 [儲存任務] 用戶 ${userId} 儲存任務 ID: ${taskId}`);
    console.log(`📝 [儲存任務] 任務資料:`, { title, note, tag, date, reminder, repeat });

    // 更新記憶體中的任務資料
    const userTasks = userTaskStacks.get(userId) || [];
    const taskIndex = userTasks.findIndex(task => task.id === taskId);

    if (taskIndex !== -1) {
      // 更新現有任務使用安全編碼的資料
      userTasks[taskIndex].text = safeTitle;
      userTasks[taskIndex].note = safeNote || null;
      userTasks[taskIndex].tag = safeTag || null;
      userTasks[taskIndex].scheduled_date = date || null;
      userTasks[taskIndex].reminder_minutes = reminder || null;
      userTasks[taskIndex].repeat_pattern = repeat || null;
      userTasks[taskIndex].google_calendar_enabled = googleCalendar === true || googleCalendar === 'true';
      userTasks[taskIndex].google_calendar_who = safeGuestEmail || null;

      userTaskStacks.set(userId, userTasks);
      console.log(`✅ [儲存任務] 記憶體任務已更新`);
    }

    // 更新數據庫中的DEV_MESSAGES記錄
    if (supabase) {
      try {
        const tablePrefix = process.env.TABLE_PREFIX || '';
        const tableName = tablePrefix + 'messages';

        // 特別處理 TEXT 欄位的 UTF-8 編碼
        const processTextField = (value) => {
          if (!value) return null;
          // 確保 TEXT 欄位正確編碼
          return Buffer.from(value, 'utf8').toString('utf8');
        };

        let updateData = {
          message_text: processTextField(safeTitle),
          note: processTextField(safeNote),
          tag: processTextField(safeTag), // 特別處理 TEXT 屬性的 TAG 欄位
          scheduled_date: date || null,
          reminder_minutes: reminder ? parseInt(reminder.replace(/[^\d]/g, '')) : null,
          repeat_pattern: repeat || null,
          google_calendar_enabled: googleCalendar === true || googleCalendar === 'true',
          google_calendar_who: processTextField(safeGuestEmail)
        };

        console.log(`🔍 [儲存資料] 準備存入 (TEXT欄位特殊處理):`, updateData);
        console.log(`🔍 [TAG專門處理] TAG原始值: "${tag}" -> 處理後: "${updateData.tag}"`);
        console.log(`📅 [日期專門處理] 日期原始值: "${date}" -> 處理後: "${updateData.scheduled_date}"`);
        console.log(`📅 [Google日曆] Google日曆原始值: "${googleCalendar}" -> 處理後: "${updateData.google_calendar_enabled}"`);
        console.log(`👥 [訪客郵件] 訪客郵件原始值: "${guestEmail}" -> 處理後: "${updateData.google_calendar_who}"`);

        // 智能查找策略：優先用文字內容匹配最新記錄
        console.log(`🔍 [智能查找] 查找用戶 ${userId} 的訊息："${safeTitle}"`);

        // 方法1：用訊息文字查找最新記錄（最可靠的方法）
        let { data: textUpdate, error: textError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('user_id', userId)
          .eq('message_text', safeTitle)
          .order('created_at', { ascending: false })
          .limit(1)
          .select();

        console.log(`🔍 [文字匹配] 更新結果:`, { data: textUpdate, error: textError });

        if (textUpdate && textUpdate.length > 0) {
          console.log(`✅ [儲存任務] 文字匹配更新成功，實際ID: ${textUpdate[0].id}`);
          console.log(`🎯 [TAG確認] 更新後的TAG值: "${textUpdate[0].tag}"`);

          // 同步更新記憶體中的任務
          console.log(`🔄 [記憶體同步] 開始同步記憶體中的任務標籤`);
          const userTasks = userTaskStacks.get(userId) || [];
          let memoryUpdated = false;

          for (let i = 0; i < userTasks.length; i++) {
            if (userTasks[i].text === safeTitle || userTasks[i].id == taskId) {
              console.log(`🎯 [記憶體同步] 找到匹配任務: "${userTasks[i].text}"`);
              userTasks[i].tag = safeTag;
              memoryUpdated = true;
              console.log(`✅ [記憶體同步] 已更新記憶體中任務的標籤為: "${safeTag}"`);
              break;
            }
          }

          if (memoryUpdated) {
            userTaskStacks.set(userId, userTasks);
            console.log(`✅ [記憶體同步] 記憶體任務堆疊已更新`);
          } else {
            console.log(`⚠️ [記憶體同步] 在記憶體中未找到對應任務`);
          }
        } else {
          // 方法2：如果文字匹配失敗，嘗試數字ID匹配
          console.log(`🔄 [備用方法] 嘗試數字ID匹配`);

          const numericTaskId = parseInt(taskId);
          let { data: directUpdate, error: directError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', numericTaskId)
            .eq('user_id', userId)
            .select();

          console.log(`🔍 [ID匹配] 更新結果:`, { data: directUpdate, error: directError });

          if (directUpdate && directUpdate.length > 0) {
            console.log(`✅ [儲存任務] ID匹配更新成功`);
            console.log(`🎯 [TAG確認] 更新後的TAG值: "${directUpdate[0].tag}"`);

            // 同步更新記憶體中的任務
            console.log(`🔄 [記憶體同步] 開始同步記憶體中的任務標籤 (ID匹配)`);
            const userTasks = userTaskStacks.get(userId) || [];
            let memoryUpdated = false;

            for (let i = 0; i < userTasks.length; i++) {
              if (userTasks[i].text === safeTitle || userTasks[i].id == taskId) {
                console.log(`🎯 [記憶體同步] 找到匹配任務: "${userTasks[i].text}"`);
                userTasks[i].tag = safeTag;
                memoryUpdated = true;
                console.log(`✅ [記憶體同步] 已更新記憶體中任務的標籤為: "${safeTag}"`);
                break;
              }
            }

            if (memoryUpdated) {
              userTaskStacks.set(userId, userTasks);
              console.log(`✅ [記憶體同步] 記憶體任務堆疊已更新`);
            } else {
              console.log(`⚠️ [記憶體同步] 在記憶體中未找到對應任務`);
            }
          } else {
            console.log(`⚠️ [儲存任務] 所有匹配方法都失敗，請檢查數據庫記錄`);
          }
        }

      } catch (dbError) {
        console.error('❌ [儲存任務] 數據庫更新失敗:', dbError);
        // 數據庫更新失敗不影響記憶體更新的成功
      }
    }

    // 如果啟用了Google Calendar，建立日曆事件
    if (googleCalendar === true) {
      try {
        console.log('📅 [Google日曆] 檢測到需要建立日曆事件，開始處理...');

        // 獲取用戶的Google tokens
        const { data: tokenData, error: tokenError } = await supabase
          .from('user_google_tokens')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!tokenError && tokenData) {
          // 檢查token是否過期
          const now = new Date().getTime();
          const expiryDate = new Date(tokenData.expiry_date).getTime();

          if (now < expiryDate) {
            // 設定OAuth2客戶端的憑證
            oauth2Client.setCredentials({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expiry_date: tokenData.expiry_date
            });

            // 建立Calendar API實例
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            // 準備事件資料
            let startDateTime, endDateTime;
            if (date) {
              startDateTime = new Date(date);
              endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 預設1小時
            } else {
              const today = new Date();
              today.setHours(9, 0, 0, 0); // 預設上午9點
              startDateTime = today;
              endDateTime = new Date(today.getTime() + 60 * 60 * 1000);
            }

            const reminderMinutes = reminder ? parseInt(reminder.replace(/[^\d]/g, '')) : 10;

            const event = {
              summary: safeTitle,
              description: safeNote || '來自小汪記記的任務',
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'Asia/Taipei',
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Asia/Taipei',
              },
              reminders: {
                useDefault: false,
                overrides: [{ method: 'popup', minutes: reminderMinutes }],
              },
            };

            // 如果有訪客郵件地址，添加到attendees
            if (safeGuestEmail && safeGuestEmail.trim()) {
              event.attendees = [
                {
                  email: safeGuestEmail.trim(),
                  responseStatus: 'needsAction'
                }
              ];
              console.log(`👥 [Google日曆] 添加訪客邀請: ${safeGuestEmail.trim()}`);
            }

            // 建立事件
            const result = await calendar.events.insert({
              calendarId: 'primary',
              resource: event,
              sendUpdates: 'all'  // 發送邀請給所有attendees
            });

            console.log('✅ [Google日曆] 事件建立成功:', result.data.id);

            res.json({
              success: true,
              message: '任務儲存成功並已加入Google日曆',
              taskId: taskId,
              googleCalendarEvent: {
                eventId: result.data.id,
                eventLink: result.data.htmlLink
              }
            });
            return;
          } else {
            console.log('⚠️ [Google日曆] Google授權已過期');
          }
        } else {
          console.log('⚠️ [Google日曆] 用戶未授權Google日曆');
        }
      } catch (calendarError) {
        console.error('❌ [Google日曆] 建立事件失敗:', calendarError);
        // 不影響主要儲存功能，繼續正常回應
      }
    }

    res.json({
      success: true,
      message: '任務儲存成功',
      taskId: taskId
    });

  } catch (error) {
    console.error('❌ [儲存任務] 發生錯誤:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 加入常用任務 API
app.post('/api/add-frequent-task', async (req, res) => {
  try {
    // 設置響應編碼
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const userId = req.headers['x-user-id'];
    const { taskText, tag, note } = req.body;

    console.log(`⭐ [加入常用] 用戶 ${userId} 加入常用任務: "${taskText}"`);

    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    if (!taskText?.trim()) {
      return res.status(400).json({ error: 'Missing task text' });
    }

    // 確保中文字符正確處理
    const safeTaskText = Buffer.from(taskText, 'utf8').toString('utf8');
    const safeTag = tag ? Buffer.from(tag, 'utf8').toString('utf8') : null;
    const safeNote = note ? Buffer.from(note, 'utf8').toString('utf8') : null;

    // 儲存到數據庫
    if (supabase) {
      try {
        const tablePrefix = process.env.TABLE_PREFIX || '';
        const tableName = `${tablePrefix}frequent_tasks`;

        // 如果沒有前綴，強制使用 dev_ 前綴（根據其他表格的命名模式）
        const actualTableName = tablePrefix ? tableName : 'dev_frequent_tasks';

        console.log(`🔍 [加入常用] tablePrefix: "${tablePrefix}", tableName: "${tableName}", actualTableName: "${actualTableName}"`);

        // 使用 INSERT ON CONFLICT 來避免重複插入
        const { data, error } = await supabase
          .from(actualTableName)
          .upsert([
            {
              user_id: userId,
              task_text: safeTaskText,
              tag: safeTag,
              note: safeNote,
              updated_at: new Date().toISOString(),
              usage_count: 1
            }
          ], {
            onConflict: 'user_id,task_text',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          console.error('❌ [加入常用] 數據庫儲存失敗:', error);
          return res.status(500).json({ error: 'Database save failed', details: error.message });
        }

        console.log(`✅ [加入常用] 常用任務儲存成功:`, data);

        res.json({
          success: true,
          message: '成功加入常用任務',
          data: data
        });

      } catch (dbError) {
        console.error('❌ [加入常用] 數據庫操作失敗:', dbError);
        res.status(500).json({ error: 'Database operation failed', details: dbError.message });
      }
    } else {
      console.warn('⚠️ [加入常用] Supabase 未初始化');
      res.status(500).json({ error: 'Database not available' });
    }

  } catch (error) {
    console.error('❌ [加入常用] 發生錯誤:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 獲取常用任務 API
app.get('/api/frequent-tasks/:userId', async (req, res) => {
  try {
    // 設置響應編碼
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const { userId } = req.params;

    console.log(`📋 [獲取常用任務] 用戶 ${userId} 請求常用任務列表`);

    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    // 檢查 Supabase 連接
    if (supabase) {
      try {
        // 確定表格名稱
        const tablePrefix = process.env.SUPABASE_TABLE_PREFIX;
        const tableName = tablePrefix ? `${tablePrefix}frequent_tasks` : 'frequent_tasks';
        const actualTableName = tablePrefix ? tableName : 'dev_frequent_tasks';

        console.log(`🔍 [獲取常用任務] tablePrefix: "${tablePrefix}", tableName: "${tableName}", actualTableName: "${actualTableName}"`);

        // 查詢用戶的常用任務
        const { data, error } = await supabase
          .from(actualTableName)
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(10); // 限制最多10個常用任務

        if (error) {
          console.error('❌ [獲取常用任務] 數據庫查詢失敗:', error);
          return res.status(500).json({ error: 'Database query failed', details: error.message });
        }

        console.log(`✅ [獲取常用任務] 找到 ${data?.length || 0} 個常用任務`);

        res.json({
          success: true,
          message: '成功獲取常用任務',
          data: data || [],
          count: data?.length || 0
        });

      } catch (dbError) {
        console.error('❌ [獲取常用任務] 數據庫操作失敗:', dbError);
        res.status(500).json({ error: 'Database operation failed', details: dbError.message });
      }
    } else {
      console.warn('⚠️ [獲取常用任務] Supabase 未初始化');
      res.status(500).json({ error: 'Database not available' });
    }

  } catch (error) {
    console.error('❌ [獲取常用任務] 發生錯誤:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 刪除任務 API
app.delete('/api/delete-task/:taskId', async (req, res) => {
  try {
    // 設置響應編碼
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const userId = req.headers['x-user-id'];
    const { taskId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    if (!taskId) {
      return res.status(400).json({ error: 'Missing task ID' });
    }

    console.log(`🗑️ [刪除任務] 用戶 ${userId} 刪除任務 ID: ${taskId}`);

    // 從記憶體中移除任務
    const userTasks = userTaskStacks.get(userId) || [];
    const taskIndex = userTasks.findIndex(task => task.id === taskId);

    if (taskIndex !== -1) {
      const deletedTask = userTasks.splice(taskIndex, 1)[0];
      userTaskStacks.set(userId, userTasks);
      console.log(`✅ [刪除任務] 記憶體任務已移除: ${deletedTask.text}`);
    } else {
      console.log(`⚠️ [刪除任務] 在記憶體中未找到任務 ID: ${taskId}`);
    }

    // 從數據庫中刪除任務記錄
    if (supabase) {
      try {
        const tablePrefix = process.env.TABLE_PREFIX || '';
        const tableName = tablePrefix + 'messages';

        // 根據任務ID刪除數據庫記錄
        const { data, error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ [刪除任務] 數據庫刪除失敗:', error);
          return res.status(500).json({ error: 'Database deletion failed' });
        }

        if (data && data.length > 0) {
          console.log(`✅ [刪除任務] 數據庫記錄已刪除:`, data[0]);
        } else {
          console.log(`⚠️ [刪除任務] 在數據庫中未找到匹配的記錄`);
        }

      } catch (dbError) {
        console.error('❌ [刪除任務] 數據庫操作失敗:', dbError);
        return res.status(500).json({ error: 'Database operation failed' });
      }
    }

    res.json({
      success: true,
      message: '任務刪除成功',
      taskId: taskId
    });

  } catch (error) {
    console.error('❌ [刪除任務] 發生錯誤:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ==================== 收藏任務 API ====================

// 取得使用者收藏任務列表
app.get('/api/favorites', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`⭐ [收藏API] 取得使用者 ${userId} 的收藏任務`);
    
    // 使用 Supabase 查詢收藏任務
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('favorite_tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ [收藏API] Supabase 查詢錯誤:', error);
          return res.status(500).json({ error: 'Database error' });
        }
        
        // 格式化數據以保持相容性
        const formattedFavorites = data.map(item => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description,
          category: item.category,
          used_count: item.used_count,
          created_at: item.created_at
        }));
        
        console.log(`✅ [收藏API] 成功回傳 ${formattedFavorites.length} 個收藏任務（從 Supabase）`);
        res.json(formattedFavorites);
      } catch (dbError) {
        console.error('❌ [收藏API] 資料庫連線錯誤:', dbError);
        return res.status(500).json({ error: 'Database connection error' });
      }
    } else {
      // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
      console.log('⚠️ [收藏API] Supabase 未連接，使用記憶體儲存');
      const userFavorites = userFavoriteTasks.get(userId) || [];
      console.log(`✅ [收藏API] 成功回傳 ${userFavorites.length} 個收藏任務（從記憶體）`);
      res.json(userFavorites);
    }
  } catch (err) {
    console.error('❌ [收藏API] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 新增收藏任務
app.post('/api/favorites', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { name, description, category } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Missing task name' });
    }
    
    console.log(`⭐ [新增收藏] 用戶 ${userId} 新增收藏任務: ${name}`);
    
    // 使用 Supabase 儲存收藏任務
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('favorite_tasks')
          .insert([
            {
              user_id: userId,
              name: name.trim(),
              description: description ? description.trim() : '',
              category: category || '',
              used_count: 0
            }
          ])
          .select()
          .single();
        
        if (error) {
          console.error('❌ [新增收藏] Supabase 儲存錯誤:', error);
          return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`✅ [新增收藏] 收藏任務新增成功，ID: ${data.id}`);
        
        // 格式化返回數據以保持相容性
        const formattedFavorite = {
          id: data.id.toString(),
          name: data.name,
          description: data.description,
          category: data.category,
          used_count: data.used_count,
          created_at: data.created_at
        };
        
        res.json({ success: true, favorite: formattedFavorite });
      } catch (dbError) {
        console.error('❌ [新增收藏] 資料庫連線錯誤:', dbError);
        return res.status(500).json({ error: 'Database connection error' });
      }
    } else {
      // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
      console.log('⚠️ [新增收藏] Supabase 未連接，使用記憶體儲存');
      
      const newFavorite = {
        id: Date.now().toString(),
        name: name.trim(),
        description: description ? description.trim() : '',
        category: category || '',
        used_count: 0,
        created_at: new Date().toISOString()
      };
      
      let userFavorites = userFavoriteTasks.get(userId) || [];
      userFavorites.push(newFavorite);
      userFavoriteTasks.set(userId, userFavorites);
      
      console.log(`✅ [新增收藏] 收藏任務新增成功（記憶體），ID: ${newFavorite.id}`);
      res.json({ success: true, favorite: newFavorite });
    }
  } catch (err) {
    console.error('❌ [新增收藏] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 創建新標籤
app.post('/api/create-tag', async (req, res) => {
  try {
    // 設置響應編碼
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const userId = req.headers['x-user-id'];
    const { name, color, icon } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Missing tag name' });
    }

    // 確保中文字符正確處理
    const safeName = Buffer.from(name.trim(), 'utf8').toString('utf8');
    const safeColor = color || '#007bff';
    const safeIcon = icon || '📝';

    console.log(`🏷️ [創建標籤] 用戶 ${userId} 創建新標籤: ${safeName}`);
    console.log(`🎨 [創建標籤] 標籤屬性:`, { name: safeName, color: safeColor, icon: safeIcon });

    // 使用 Supabase 儲存新標籤
    if (supabase) {
      try {
        const tablePrefix = process.env.TABLE_PREFIX || '';
        const tableName = `${tablePrefix}tags`;

        // 先檢查是否已存在相同名稱的標籤
        const { data: existingTag, error: checkError } = await supabase
          .from(tableName)
          .select('id')
          .eq('user_id', userId)
          .eq('name', safeName)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ [創建標籤] 檢查重複標籤錯誤:', checkError);
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingTag) {
          return res.status(409).json({ error: '標籤名稱已存在' });
        }

        // 插入新標籤
        const { data, error } = await supabase
          .from(tableName)
          .insert([
            {
              user_id: userId,
              name: safeName,
              color: safeColor,
              icon: safeIcon,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (error) {
          console.error('❌ [創建標籤] Supabase 儲存錯誤:', error);
          return res.status(500).json({ error: 'Database error' });
        }

        console.log(`✅ [創建標籤] 新標籤創建成功，ID: ${data.id}`);

        // 格式化返回數據
        const formattedTag = {
          id: data.id,
          name: data.name,
          color: data.color,
          icon: data.icon,
          created_at: data.created_at
        };

        res.json({ success: true, tag: formattedTag });
      } catch (dbError) {
        console.error('❌ [創建標籤] 資料庫連線錯誤:', dbError);
        return res.status(500).json({ error: 'Database connection error' });
      }
    } else {
      // 如果沒有 Supabase 連線，返回錯誤
      console.log('⚠️ [創建標籤] Supabase 未連接，無法創建標籤');
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  } catch (err) {
    console.error('❌ [創建標籤] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 獲取分類任務數量統計
app.get('/api/category-counts', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    console.log(`📊 [分類統計] 用戶 ${userId} 獲取分類任務統計`);

    // 初始化分類計數
    const categoryCounts = {
      work: 0,
      study: 0,
      life: 0,
      health: 0,
      entertainment: 0
    };

    // 使用 Supabase 查詢分類統計
    if (supabase) {
      try {
        const tablePrefix = process.env.TABLE_PREFIX || '';
        const messagesTable = `${tablePrefix}messages`;
        const tagsTable = `${tablePrefix}tags`;

        // 查詢用戶的所有未完成任務
        const { data: tasks, error: tasksError } = await supabase
          .from(messagesTable)
          .select('id, completed, tag')
          .eq('user_id', userId)
          .eq('completed', false)
          .not('tag', 'is', null);

        if (tasksError) {
          console.error('❌ [分類統計] 查詢任務錯誤:', tasksError);
        } else if (tasks) {
          console.log(`📊 [分類統計] 找到 ${tasks.length} 個未完成任務`);

          // 根據標籤名稱統計分類
          tasks.forEach(task => {
            const tagName = task.tag || '';
            console.log(`📊 [分類統計] 處理任務標籤: "${tagName}"`);

            // 根據標籤內容判斷分類
            if (tagName.includes('工作')) {
              categoryCounts.work++;
            } else if (tagName.includes('學習') || tagName.includes('讀書')) {
              categoryCounts.study++;
            } else if (tagName.includes('運動') || tagName.includes('健康') || tagName.includes('走路')) {
              categoryCounts.health++;
            } else if (tagName.includes('娛樂') || tagName.includes('遊戲')) {
              categoryCounts.entertainment++;
            } else {
              // 預設歸類到生活雜事
              categoryCounts.life++;
            }
          }, userId);
        }

        console.log(`✅ [分類統計] 統計完成:`, categoryCounts);
        res.json(categoryCounts);

      } catch (dbError) {
        console.error('❌ [分類統計] 資料庫錯誤:', dbError);
        res.json(categoryCounts); // 返回空統計
      }
    } else {
      console.log('⚠️ [分類統計] Supabase 未連接，返回空統計');
      res.json(categoryCounts);
    }

  } catch (err) {
    console.error('❌ [分類統計] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 使用收藏任務（將收藏任務加到任務列表）
app.post('/api/favorites/:id/use', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const favoriteId = req.params.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🔄 [使用收藏] 用戶 ${userId} 使用收藏任務 ID: ${favoriteId}`);
    
    let favoriteTask = null;
    
    // 使用 Supabase 查詢和更新收藏任務
    if (supabase) {
      try {
        // 先查詢收藏任務
        const { data: queryData, error: queryError } = await supabase
          .from('favorite_tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('id', parseInt(favoriteId))
          .single();
        
        if (queryError || !queryData) {
          console.error('❌ [使用收藏] 查詢錯誤:', queryError);
          return res.status(404).json({ error: 'Favorite task not found' });
        }
        
        favoriteTask = queryData;
        
        // 更新使用次數
        const { data: updateData, error: updateError } = await supabase
          .from('favorite_tasks')
          .update({ used_count: (favoriteTask.used_count || 0) + 1 })
          .eq('user_id', userId)
          .eq('id', parseInt(favoriteId))
          .select();
        
        if (updateError) {
          console.error('❌ [使用收藏] 更新使用次數錯誤:', updateError);
        } else {
          console.log(`✅ [使用收藏] 使用次數已更新（從 Supabase）`);
        }
      } catch (dbError) {
        console.error('❌ [使用收藏] 資料庫連線錯誤:', dbError);
        return res.status(500).json({ error: 'Database connection error' });
      }
    } else {
      // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
      console.log('⚠️ [使用收藏] Supabase 未連接，使用記憶體儲存');
      
      let userFavorites = userFavoriteTasks.get(userId) || [];
      favoriteTask = userFavorites.find(fav => fav.id === favoriteId);
      
      if (!favoriteTask) {
        return res.status(404).json({ error: 'Favorite task not found' });
      }
      
      // 更新使用次數
      favoriteTask.used_count = (favoriteTask.used_count || 0) + 1;
      userFavoriteTasks.set(userId, userFavorites);
    }
    
    // 將收藏任務添加到任務列表
    const currentTasks = userTaskStacks.get(userId) || [];
    const newTask = {
      id: Date.now(),
      text: favoriteTask.name,
      timestamp: new Date().toISOString(),
      completed: false,
      fromFavorite: true
    };
    
    currentTasks.push(newTask);
    userTaskStacks.set(userId, currentTasks);
    
    console.log(`✅ [使用收藏] 收藏任務已添加到任務列表: ${favoriteTask.name}`);
    
    res.json({ success: true, task: newTask });
  } catch (err) {
    console.error('❌ [使用收藏] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 刪除收藏任務
app.delete('/api/favorites/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const favoriteId = req.params.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    
    console.log(`🗑️ [刪除收藏] 用戶 ${userId} 刪除收藏任務 ID: ${favoriteId}`);
    
    // 使用 Supabase 刪除收藏任務
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('favorite_tasks')
          .delete()
          .eq('user_id', userId)
          .eq('id', parseInt(favoriteId))
          .select();
        
        if (error) {
          console.error('❌ [刪除收藏] Supabase 刪除錯誤:', error);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!data || data.length === 0) {
          return res.status(404).json({ error: 'Favorite task not found' });
        }
        
        console.log(`✅ [刪除收藏] 收藏任務刪除成功（從 Supabase）`);
      } catch (dbError) {
        console.error('❌ [刪除收藏] 資料庫連線錯誤:', dbError);
        return res.status(500).json({ error: 'Database connection error' });
      }
    } else {
      // 如果沒有 Supabase 連線，使用記憶體儲存作為備用
      console.log('⚠️ [刪除收藏] Supabase 未連接，使用記憶體儲存');
      
      let userFavorites = userFavoriteTasks.get(userId) || [];
      const updatedFavorites = userFavorites.filter(fav => fav.id !== favoriteId);
      
      if (updatedFavorites.length === userFavorites.length) {
        return res.status(404).json({ error: 'Favorite task not found' });
      }
      
      userFavoriteTasks.set(userId, updatedFavorites);
      console.log(`✅ [刪除收藏] 收藏任務刪除成功（從記憶體）`);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('❌ [刪除收藏] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 管理員 API ====================

app.post('/admin/create-tags-table', async (req, res) => {
  try {
    console.log('🔧 [管理員] 開始建立 dev_tags 表格...');
    
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase 客戶端未初始化' });
    }

    // 使用 SQL 建立表格
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS dev_tags (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#4ECDC4',
        icon TEXT DEFAULT '🏷️',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 執行 SQL（透過 Supabase RPC）
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: createTableSQL });
    
    if (error) {
      console.log('❌ [管理員] 建立表格失敗:', error);
      
      // 直接添加 5 個測試標籤到不存在的表格（強制建立）
      console.log('🔄 [管理員] 嘗試直接插入資料來建立表格...');
      
      const testTags = [
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1, is_active: true },
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: '學習', color: '#4ECDC4', icon: '📚', sort_order: 2, is_active: true },
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: '運動', color: '#45B7D1', icon: '🏃‍♂️', sort_order: 3, is_active: true },
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: 'AI', color: '#9B59B6', icon: '🤖', sort_order: 4, is_active: true },
        { user_id: 'U2a9005032be2240a6816d29ae28d9294', name: '日本', color: '#E74C3C', icon: '🗾', sort_order: 5, is_active: true }
      ];

      for (const tag of testTags) {
        try {
          const { data: insertData, error: insertError } = await supabase
            .from('dev_tags')
            .insert(tag);
          
          if (insertError) {
            console.log(`❌ [管理員] 插入標籤失敗 ${tag.name}:`, insertError);
          } else {
            console.log(`✅ [管理員] 成功插入標籤: ${tag.name}`);
          }
        } catch (insertErr) {
          console.log(`💥 [管理員] 插入標籤異常 ${tag.name}:`, insertErr);
        }
      }
      
      return res.json({ 
        success: true, 
        message: '透過插入資料嘗試建立表格',
        sql_error: error 
      });
    } else {
      console.log('✅ [管理員] 表格建立成功');
      return res.json({ 
        success: true, 
        message: 'dev_tags 表格建立成功',
        data 
      });
    }
  } catch (err) {
    console.log('💥 [管理員] 建立表格異常:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== WEBHOOK 路由 ====================

app.post('/webhook', (req, res) => {
  // 簡化版本：跳過 LINE signature 驗證用於測試
  const timestamp = new Date().toISOString();
  console.log('\n=== WEBHOOK 接收到請求 ===');
  console.log(`⏰ 時間: ${timestamp}`);
  console.log('📥 完整請求 body:', JSON.stringify(req.body, null, 2));
  console.log('📊 事件數量:', req.body.events ? req.body.events.length : 0);
  
  if (!req.body.events) {
    console.log('⚠️ 沒有事件，直接返回');
    return res.status(200).json({ message: 'No events' });
  }
  
  // 詳細記錄每個事件
  req.body.events.forEach((event, index) => {
    console.log(`\n--- 事件 ${index + 1} ---`);
    console.log('📋 事件類型:', event.type);
    console.log('👤 來源:', event.source);
    if (event.message) {
      console.log('💬 訊息內容:', event.message);
    }
    if (event.postback) {
      console.log('🔄 Postback:', event.postback);
    }
  });
  
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => {
      console.log('\n✅ 所有事件處理完成:', result);
      console.log('=== WEBHOOK 處理結束 ===\n');
      res.status(200).json(result);
    })
    .catch((err) => {
      console.error('\n❌ 事件處理錯誤:', err);
      console.log('=== WEBHOOK 處理結束 (錯誤) ===\n');
      res.status(200).json({ error: 'Processing failed' });
    });
});

// 新增 API：從 Supabase 查詢訊息記錄（支援日期篩選）
app.get('/api/messages', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const dateFilter = req.query.date; // YYYY-MM-DD 格式
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    console.log(`🔍 [訊息API] 查詢使用者 ${userId} 的訊息記錄${dateFilter ? ` (日期: ${dateFilter})` : ''}`);
    
    let query = supabase
      .from('dev_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // 如果有日期篩選，加入日期條件
    if (dateFilter) {
      const startDate = `${dateFilter}T00:00:00.000Z`;
      const endDate = `${dateFilter}T23:59:59.999Z`;
      
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ [訊息API] Supabase 查詢錯誤:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // 轉換格式以符合前端預期
    const formattedMessages = data.map(msg => ({
      text: msg.message_text,
      timestamp: msg.created_at,
      completed: false, // 訊息記錄預設為未完成狀態
      id: msg.id
    }));
    
    console.log(`✅ [訊息API] 成功回傳 ${formattedMessages.length} 筆訊息記錄`);
    console.log(`📝 [訊息API] 訊息預覽:`, formattedMessages.slice(0, 3).map(msg => msg.text));
    
    res.json(formattedMessages);
    
  } catch (err) {
    console.error('❌ [訊息API] 錯誤:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced Preview API 端點
app.post('/api/enhanced-preview', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🚀 [Enhanced Preview API] 收到請求: ${url}`);

    // Use existing enhancedPreview instance
    const result = await enhancedPreview.getEnhancedPreview(url);

    console.log(`✅ [Enhanced Preview API] 成功回傳結果: ${result.title}`);
    res.json(result);

  } catch (error) {
    console.error('❌ [Enhanced Preview API] 錯誤:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 設定圓角圖片API路由
setupRoundedImageRoute(app);

// 清除圓角圖片快取路由
app.get('/clear-image-cache', (req, res) => {
  try {
    const clearedCount = clearImageCache();
    console.log(`🧹 [伺服器] 圓角圖片快取已清除，共移除 ${clearedCount} 個項目`);
    res.json({
      success: true,
      message: `圓角圖片快取已清除，共移除 ${clearedCount} 個項目`,
      clearedCount: clearedCount
    });
  } catch (error) {
    console.error('❌ [伺服器] 清除快取失敗:', error);
    res.status(500).json({
      success: false,
      error: '清除快取失敗',
      details: error.message
    });
  }
});

// 🖼️ 圖片代理路由 - 解決 Facebook 圖片 CORS 問題
app.get('/api/image-proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing image URL parameter' });
    }

    console.log(`🖼️ [圖片代理] 代理圖片請求: ${imageUrl}`);

    const fetch = require('node-fetch');
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'image/*,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.error(`❌ [圖片代理] 圖片請求失敗: ${response.status}`);
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const contentType = response.headers.get('content-type');
    console.log(`✅ [圖片代理] 成功取得圖片，Content-Type: ${contentType}`);

    // 設定適當的 headers
    res.set({
      'Content-Type': contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600', // 快取 1 小時
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    // 將圖片數據傳送給客戶端
    response.body.pipe(res);

  } catch (error) {
    console.error('❌ [圖片代理] 代理圖片失敗:', error);
    res.status(500).json({ error: 'Image proxy error' });
  }
});

// ====================================
// Google Calendar API 路由
// ====================================

// 生成Google授權URL
app.get('/api/google-calendar/auth-url', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: '缺少用戶ID' });
    }

    console.log('🔑 [Google授權] 為用戶生成授權URL:', userId);

    // 設定授權範圍
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events'
    ];

    // 生成授權URL，包含state參數來追蹤用戶
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // 用於回調時識別用戶
      prompt: 'consent' // 確保獲得refresh token
    });

    console.log('✅ [Google授權] 授權URL生成成功');
    res.json({ authUrl: authUrl });

  } catch (error) {
    console.error('❌ [Google授權] 生成授權URL失敗:', error);
    res.status(500).json({ error: '生成授權URL失敗' });
  }
});

// Google授權回調處理
app.get('/api/google-calendar/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      console.error('❌ [Google回調] 缺少授權代碼');
      return res.status(400).send('授權失敗：缺少授權代碼');
    }

    if (!userId) {
      console.error('❌ [Google回調] 缺少用戶ID');
      return res.status(400).send('授權失敗：缺少用戶ID');
    }

    console.log('🔑 [Google回調] 處理授權回調，用戶:', userId);

    // 使用授權代碼獲取token
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ [Google回調] 成功獲取tokens');

    // 儲存用戶的Google tokens到資料庫
    const { data, error } = await supabase
      .from('user_google_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ [Google回調] 儲存tokens失敗:', error);
      return res.status(500).send('授權失敗：無法儲存授權資訊');
    }

    console.log('✅ [Google回調] tokens已儲存到資料庫');

    // 重導向回到任務編輯頁面，並顯示成功訊息
    const redirectUrl = `/liff-app.html?googleAuth=success`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ [Google回調] 處理回調失敗:', error);
    res.status(500).send('授權失敗：' + error.message);
  }
});

// 檢查用戶Google授權狀態
app.get('/api/google-calendar/auth-status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: '缺少用戶ID' });
    }

    // 查詢用戶的Google tokens
    const { data, error } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.json({ authorized: false });
    }

    // 檢查token是否過期
    const now = new Date().getTime();
    const expiryDate = new Date(data.expiry_date).getTime();

    if (now >= expiryDate) {
      // Token已過期，需要重新授權
      return res.json({ authorized: false, expired: true });
    }

    res.json({ authorized: true });

  } catch (error) {
    console.error('❌ [Google授權狀態] 檢查失敗:', error);
    res.status(500).json({ error: '檢查授權狀態失敗' });
  }
});

// 建立Google Calendar事件
app.post('/api/google-calendar/create-event', async (req, res) => {
  try {
    const { taskTitle, taskNote, scheduledDate, reminderMinutes, guestEmail } = req.body;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: '缺少用戶ID' });
    }

    if (!taskTitle) {
      return res.status(400).json({ error: '缺少任務標題' });
    }

    console.log('📅 [建立事件] 開始為用戶建立Google日曆事件:', userId, '任務:', taskTitle);

    // 獲取用戶的Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      console.error('❌ [建立事件] 用戶未授權Google日曆:', userId);
      return res.status(401).json({ error: '用戶未授權Google日曆', requireAuth: true });
    }

    // 檢查token是否過期
    const now = new Date().getTime();
    const expiryDate = new Date(tokenData.expiry_date).getTime();

    if (now >= expiryDate) {
      console.error('❌ [建立事件] Google授權已過期:', userId);
      return res.status(401).json({ error: 'Google授權已過期', expired: true, requireAuth: true });
    }

    // 設定OAuth2客戶端的憑證
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date
    });

    // 建立Calendar API實例
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 準備事件資料
    let startDateTime, endDateTime;

    if (scheduledDate) {
      // 如果有指定時間，使用該時間
      startDateTime = new Date(scheduledDate);
      endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 預設1小時
    } else {
      // 如果沒有指定時間，設為今天的提醒時間
      const today = new Date();
      today.setHours(9, 0, 0, 0); // 預設上午9點
      startDateTime = today;
      endDateTime = new Date(today.getTime() + 60 * 60 * 1000); // 預設1小時
    }

    const event = {
      summary: taskTitle,
      description: taskNote || '來自小汪記記的任務',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Taipei',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Taipei',
      },
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: 'popup',
            minutes: reminderMinutes || 10, // 預設10分鐘前提醒
          },
        ],
      },
    };

    // 如果有訪客郵件地址，添加到attendees
    if (guestEmail && guestEmail.trim()) {
      event.attendees = [
        {
          email: guestEmail.trim(),
          responseStatus: 'needsAction'
        }
      ];
      console.log(`👥 [建立事件] 添加訪客邀請: ${guestEmail.trim()}`);
    }

    console.log('📅 [建立事件] 準備建立事件:', {
      summary: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      attendees: event.attendees?.length || 0
    });

    // 建立事件
    const result = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all'  // 發送邀請給所有attendees
    });

    console.log('✅ [建立事件] Google日曆事件建立成功:', result.data.id);

    res.json({
      success: true,
      eventId: result.data.id,
      eventLink: result.data.htmlLink,
      message: 'Google日曆事件建立成功'
    });

  } catch (error) {
    console.error('❌ [建立事件] 建立Google日曆事件失敗:', error);

    if (error.code === 401) {
      return res.status(401).json({
        error: 'Google授權無效',
        requireAuth: true,
        message: '請重新授權Google日曆'
      });
    }

    res.status(500).json({
      error: '建立Google日曆事件失敗',
      message: error.message
    });
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🤖 LINE Bot server running on port ${PORT} with Open Graph API`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});// 強制重啟 西元2025年09月18日 (星期四) 13時03分19秒    
