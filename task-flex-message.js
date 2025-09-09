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

// 任務堆疊 Flex Message - 100% 模仿原始設計
function createTaskStackFlexMessage(tasks) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
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
          margin: 'none'
        },
        {
          type: 'text',
          text: '✎',
          size: 'md',
          color: '#000000',
          flex: 0,
          margin: 'sm',
          action: {
            type: 'uri',
            uri: 'https://liff.line.me/2008077335-rZlgE4bX'
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
    altText: `總共 ${totalTasks} 件事要做`,
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
            text: `總共 ${totalTasks} 件事要做`,
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
            type: 'text',
            text: '📚 全部記錄',
            size: 'sm',
            color: '#4169E1',
            align: 'center',
            margin: 'md',
            action: {
              type: 'uri',
              uri: 'https://liff.line.me/2008077335-rZlgE4bX/records'
            }
          }
        ])
      }
    },
    // 簡潔直接：每個任務堆疊都有 Quick Reply，無條件判斷
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: 'AI',
            text: 'AI'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '工作',
            text: '工作'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '家事',
            text: '家事'
          }
        }
      ]
    }
  };
}

module.exports = {
  createTaskFlexMessage,
  createTaskStackFlexMessage
};