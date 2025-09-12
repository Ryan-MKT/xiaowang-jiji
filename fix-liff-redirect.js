const fs = require('fs');

// 讀取當前 server.js
let serverCode = fs.readFileSync('server.js', 'utf8');

// 找到並替換問題的重定向程式碼
const oldRedirectCode = `return res.redirect('/liff');`;

const newDirectCode = `console.log('🔄 [LIFF CALLBACK] 直接返回 LIFF APP 頁面，避免重定向循環');
        const fs = require('fs');
        const path = require('path');
        try {
          let html = fs.readFileSync(path.join(__dirname, 'liff-app.html'), 'utf8');
          const liffId = process.env.LIFF_APP_ID || '2008077335-rZlgE4bX';
          html = html.replace(/liffId: '[^']*'/, \`liffId: '\${liffId}'\`);
          return res.send(html);
        } catch (error) {
          console.error('LIFF 檔案讀取錯誤:', error);
          return res.status(500).send('LIFF APP 載入失敗');
        }`;

// 執行替換
const updatedCode = serverCode.replace(oldRedirectCode, newDirectCode);

if (updatedCode !== serverCode) {
  // 寫回檔案
  fs.writeFileSync('server.js', updatedCode);
  console.log('✅ 成功修復 LIFF 重定向循環問題');
} else {
  console.log('❌ 找不到需要替換的程式碼');
}