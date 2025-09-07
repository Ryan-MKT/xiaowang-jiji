// ⚠️ 警告：這是 Linus 認為的垃圾程式碼範例
// 為什麼是垃圾？因為它解決了一個不存在的問題

const crypto = require('crypto');

// 垃圾原因 #1：Bot 已經有 userId，為什麼還要 OAuth？
const LINE_LOGIN_CONFIG = {
  channelId: process.env.LINE_LOGIN_CHANNEL_ID,
  channelSecret: process.env.LINE_LOGIN_CHANNEL_SECRET,
  callbackUrl: process.env.LINE_LOGIN_CALLBACK_URL || 'https://your-domain.com/callback'
};

// 垃圾原因 #2：200行程式碼做一件不需要的事
function generateLoginUrl(state) {
  // 這整個流程對 Bot 來說是多餘的
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_LOGIN_CONFIG.channelId,
    redirect_uri: LINE_LOGIN_CONFIG.callbackUrl,
    state: state || crypto.randomBytes(16).toString('hex'),
    scope: 'profile openid'
  });
  
  return `https://access.line.me/oauth2/v2.1/authorize?${params}`;
}

// 垃圾原因 #3：Bot 內無法開啟網頁，這個流程根本跑不通
async function handleCallback(code) {
  // 省略 100+ 行的 token exchange 和 profile fetch
  // 最後得到的還是同一個 userId
  return "恭喜你繞了一大圈得到了本來就有的 userId";
}

// 正確的做法（Linus 式）：
function correctApproach(userId) {
  return userId; // 就這樣，完了
}

module.exports = { 
  generateLoginUrl, 
  handleCallback,
  correctApproach 
};