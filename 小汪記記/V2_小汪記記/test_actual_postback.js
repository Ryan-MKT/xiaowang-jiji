// 測試實際的postback事件處理
const http = require('http');

console.log('=== 測試實際的 postback 事件 ===');

// 模擬LINE Bot的postback事件
const postbackEvent = {
  events: [{
    type: 'postback',
    postback: {
      data: 'switch_tab_tags'
    },
    source: {
      type: 'user',
      userId: 'test_user_123'
    },
    replyToken: 'test_reply_token_123'
  }]
};

// 測試不同port的server
const testPorts = [3002];

async function testServer(port) {
  return new Promise((resolve) => {
    const data = JSON.stringify(postbackEvent);

    const options = {
      hostname: 'localhost',
      port: port,
      path: '/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-line-signature': 'test_signature'
      },
      timeout: 5000
    };

    console.log(`\n🧪 測試 port ${port}:`);

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`✅ Port ${port} 回應: ${res.statusCode}`);
        if (responseData) {
          console.log('回應內容:', responseData.substring(0, 100) + '...');
        }
        resolve({ port, status: res.statusCode, data: responseData });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Port ${port} 錯誤:`, error.message);
      resolve({ port, error: error.message });
    });

    req.on('timeout', () => {
      console.log(`⏰ Port ${port} 超時`);
      req.destroy();
      resolve({ port, error: 'timeout' });
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('開始測試所有可能的 server ports...');

  for (const port of testPorts) {
    await testServer(port);
    // 等待一下避免連接衝突
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== 測試完成 ===');
  console.log('請檢查哪個 port 有回應，那就是處理您 LINE Bot 請求的 server');
  console.log('如果該 server 沒有載入最新代碼，請重啟該 server');
}

runTests().catch(console.error);