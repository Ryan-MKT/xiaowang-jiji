// 常用任務 FLEX MESSAGE 生成器

function generateFrequentTasksFlexMessage(frequentTasks) {
  console.log(`🎨 [常用任務FLEX] 開始生成 ${frequentTasks.length} 個常用任務的 FLEX MESSAGE`);

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
    // 任務標題
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
            type: 'text',
            text: '⭐ 常用任務',
            weight: 'bold',
            size: 'xl',
            color: '#333333'
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

  console.log('✅ [常用任務FLEX] FLEX MESSAGE 生成完成');
  return flexMessage;
}

module.exports = { generateFrequentTasksFlexMessage };