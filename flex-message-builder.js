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

module.exports = {
  createEchoFlexMessage,
  createMinimalFlexMessage
};