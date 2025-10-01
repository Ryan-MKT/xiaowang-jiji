/**
 * LINE Flex Message Builder
 * 根據 LINE 官方規範創建 Flex Message
 * 遵循品味要求：簡潔、直接、無廢話
 */

/**
 * 創建回音 Flex Message
 * @param {string} userMessage - 用戶傳送的訊息
 * @returns {Object} LINE Flex Message 物件
 */
function createEchoFlexMessage(userMessage) {
  return {
    type: "flex",
    altText: `回音訊息: ${userMessage}`,
    contents: {
      type: "bubble",
      size: "micro",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🐕 小汪記記",
            weight: "bold",
            color: "#00B900",
            size: "sm"
          }
        ],
        backgroundColor: "#f8f9fa",
        paddingTop: "lg",
        paddingBottom: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "收到你的訊息：",
            size: "xs",
            color: "#666666",
            margin: "md"
          },
          {
            type: "text",
            text: userMessage,
            size: "xl",
            weight: "bold",
            color: "#333333",
            wrap: true,
            margin: "md"
          },
          {
            type: "text",
            text: `時間: ${new Date().toLocaleString('zh-TW')}`,
            size: "xs",
            color: "#999999",
            margin: "lg"
          }
        ],
        paddingAll: "lg"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "message",
              label: "再說一次",
              text: userMessage
            },
            style: "primary",
            color: "#00B900"
          }
        ],
        paddingAll: "sm"
      },
      styles: {
        footer: {
          separator: true
        }
      }
    }
  };
}

/**
 * 創建簡潔版 Flex Message（品味優先）
 * @param {string} userMessage - 用戶傳送的訊息
 * @returns {Object} 簡潔的 LINE Flex Message 物件
 */
function createMinimalFlexMessage(userMessage) {
  return {
    type: "flex",
    altText: userMessage,
    contents: {
      type: "bubble",
      size: "nano",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: userMessage,
            size: "lg",
            weight: "bold",
            color: "#333333",
            wrap: true,
            align: "center"
          }
        ],
        paddingAll: "xl",
        backgroundColor: "#ffffff"
      },
      styles: {
        body: {
          backgroundColor: "#f0f8ff"
        }
      }
    }
  };
}

/**
 * 創建任務清單 Flex Message（符合 LINE 官方規範）
 * @param {Array} taskList - 任務陣列
 * @returns {Object} 任務清單的 LINE Flex Message 物件
 */
function createTaskListFlexMessage(taskList) {
  // 限制最多顯示 10 個任務，按照截圖設計
  const displayTasks = taskList.slice(-10);
  
  // 統計完成狀況
  const completedCount = displayTasks.filter(task => task.completed).length;
  const totalCount = displayTasks.length;
  const pendingCount = totalCount - completedCount;
  
  // 根據截圖創建任務行 - 每個任務一行，帶黑色方框圖標
  const taskRows = [];
  displayTasks.forEach((task, index) => {
    const isCompleted = task.completed;
    let taskText = typeof task === 'string' ? task : task.text;
    // 限制為 12 個字元寬度
    if (taskText.length > 12) {
      taskText = taskText.substring(0, 11) + '…';
    }
    const taskId = task.id || Date.now() + index;
    
    // 添加任務行
    taskRows.push({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: `${index + 1}. ${taskText}`,
          size: "md",
          color: "#333333",
          weight: "regular",
          wrap: true,
          flex: 5
        },
        {
          type: "button",
          action: {
            type: "uri",
            label: "✎",
            uri: "https://github.com/Ryan-MKT/xiaowang-jiji"
          },
          style: "link",
          height: "sm"
        },
        {
          type: "spacer",
          size: "sm"
        },
        {
          type: "button",
          action: {
            type: "postback",
            label: isCompleted ? "☑" : "□",
            data: JSON.stringify({
              action: "complete_task",
              taskId: taskId
            })
          },
          style: "link",
          height: "sm"
        }
      ],
      spacing: "sm",
      paddingAll: "sm"
    });
    
    // 在每個任務後添加分隔線（除了最後一個）
    if (index < displayTasks.length - 1) {
      taskRows.push({
        type: "separator",
        margin: "sm",
        color: "#E0E0E0"
      });
    }
  });

  return {
    type: "flex",
    altText: `今天 ${totalCount} 件事要做`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `今天 ${totalCount} 件事要做`,
            weight: "bold",
            size: "lg",
            color: "#ffffff",
            align: "center"
          }
        ],
        backgroundColor: "#DDA368",
        paddingAll: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          ...taskRows,
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: `已完成 ${completedCount} 件，待完成 ${pendingCount} 件`,
            size: "sm",
            color: "#666666",
            align: "center",
            margin: "md"
          }
        ],
        spacing: "none",
        backgroundColor: "#FFF8DC",
        paddingAll: "md"
      },
      styles: {
        header: {
          backgroundColor: "#DDA368"
        },
        body: {
          backgroundColor: "#FFF8DC"
        }
      }
    }
  };
}

/**
 * 創建收藏成功 Flex Message
 * @param {string} url - 收藏的連結
 * @returns {Object} 收藏成功的 LINE Flex Message 物件
 */
function createBookmarkSuccessFlexMessage(url) {
  return {
    type: "flex",
    altText: `連結已記錄: ${url}`,
    contents: {
      type: "bubble",
      size: "micro",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "連結已記錄",
            weight: "bold",
            color: "#00B900",
            size: "lg",
            align: "center"
          }
        ],
        backgroundColor: "#f8f9fa",
        paddingAll: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: url,
            size: "sm",
            color: "#333333",
            wrap: true,
            align: "center",
            margin: "md"
          }
        ],
        paddingAll: "lg"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "button",
                action: {
                  type: "message",
                  label: "查看",
                  text: "查看收藏"
                },
                style: "primary",
                color: "#00B900",
                flex: 1
              },
              {
                type: "button",
                action: {
                  type: "message",
                  label: "刪除",
                  text: "刪除收藏"
                },
                style: "secondary",
                flex: 1
              }
            ],
            spacing: "sm"
          },
          {
            type: "button",
            action: {
              type: "postback",
              label: "回到任務",
              data: "return_to_tasks",
              displayText: "顯示任務列表"
            },
            style: "primary",
            color: "#1DB446",
            margin: "sm"
          }
        ],
        paddingAll: "sm"
      },
      styles: {
        footer: {
          separator: true
        }
      }
    }
  };
}

module.exports = {
  createEchoFlexMessage,
  createMinimalFlexMessage,
  createTaskListFlexMessage,
  createBookmarkSuccessFlexMessage
};