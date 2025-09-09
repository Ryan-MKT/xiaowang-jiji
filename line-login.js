// LINE Login 模組 - 完全獨立，不影響 Bot 功能
// Linus: "分離關注點，不要把所有東西混在一起"

const axios = require('axios');
const crypto = require('crypto');

class LineLogin {
  constructor() {
    this.channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    this.channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
    this.redirectUri = process.env.LINE_LOGIN_CALLBACK_URL || 'http://localhost:3001/auth/line/callback';
  }

  // 生成登入 URL
  getAuthUrl(state = null) {
    const actualState = state || crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.channelId,
      redirect_uri: this.redirectUri,
      state: actualState,
      scope: 'profile openid email'
    });
    
    return {
      url: `https://access.line.me/oauth2/v2.1/authorize?${params}`,
      state: actualState
    };
  }

  // 處理回調，取得 access token
  async handleCallback(code) {
    try {
      const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: this.channelId,
          client_secret: this.channelSecret,
          redirect_uri: this.redirectUri
        }), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      const { access_token, id_token } = tokenResponse.data;
      
      // 取得使用者資料
      const profileResponse = await axios.get('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      return {
        success: true,
        profile: profileResponse.data,
        tokens: { access_token, id_token }
      };
    } catch (error) {
      console.error('LINE Login error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // 驗證 access token
  async verifyToken(accessToken) {
    try {
      const response = await axios.get('https://api.line.me/oauth2/v2.1/verify', {
        params: { access_token: accessToken }
      });
      return { valid: true, data: response.data };
    } catch (error) {
      return { valid: false };
    }
  }
}

module.exports = new LineLogin();