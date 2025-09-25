// 使用spacer分隔的雙欄位FLEX MESSAGE測試

function generateDualColumnSpacerTestMessage() {
  console.log('🎨 [雙欄位測試] 開始生成spacer分隔的雙欄位FLEX MESSAGE');

  const flexMessage = {
    type: 'flex',
    altText: '✅ spacer測試成功！中間空隙顯示背景',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎉 spacer分隔測試',
            size: 'lg',
            weight: 'bold',
            align: 'center',
            color: '#1A73E8'
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
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#E8F4FD',
                cornerRadius: '8px',
                paddingAll: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '📝 左側',
                    size: 'sm',
                    weight: 'bold',
                    color: '#1A73E8'
                  }
                ],
                flex: 2
              },
              {
                type: 'spacer',
                size: 'xl'
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#FFF4E6',
                cornerRadius: '8px',
                paddingAll: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '📋 右側',
                    size: 'sm',
                    weight: 'bold',
                    color: '#F57C00'
                  }
                ],
                flex: 2
              }
            ],
            margin: 'md'
          },
          {
            type: 'text',
            text: '💡 中間的空隙會顯示聊天室背景色',
            size: 'xs',
            color: '#666666',
            align: 'center',
            margin: 'md'
          }
        ]
      }
    }
  };

  console.log('✅ [雙欄位測試] spacer分隔的FLEX MESSAGE生成完成');
  return flexMessage;
}

module.exports = { generateDualColumnSpacerTestMessage };