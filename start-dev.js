#!/usr/bin/env node
const { exec, spawn } = require('child_process');
const axios = require('axios');
require('dotenv').config();

console.log('🚀 啟動小汪記記開發環境...\n');

// LINE Channel Access Token
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// 步驟 1: 啟動 Node.js 伺服器
console.log('1️⃣ 啟動 Node.js 伺服器...');
const nodeServer = spawn('npm', ['run', 'dev'], { 
  shell: true,
  stdio: 'inherit'
});

// 等待伺服器啟動
setTimeout(() => {
  // 步驟 2: 啟動 ngrok
  console.log('\n2️⃣ 啟動 ngrok...');
  const ngrok = spawn('ngrok', ['http', '3001'], {
    shell: true,
    detached: true
  });

  // 等待 ngrok 啟動並獲取 URL
  setTimeout(async () => {
    try {
      // 步驟 3: 獲取 ngrok URL
      console.log('\n3️⃣ 獲取 ngrok URL...');
      const response = await axios.get('http://localhost:4040/api/tunnels');
      const tunnel = response.data.tunnels.find(t => t.proto === 'https');
      
      if (tunnel) {
        const ngrokUrl = tunnel.public_url;
        const webhookUrl = `${ngrokUrl}/webhook`;
        
        console.log(`✅ Ngrok URL: ${ngrokUrl}`);
        console.log(`📌 Webhook URL: ${webhookUrl}`);
        
        // 步驟 4: 自動更新 LINE Webhook URL
        if (CHANNEL_ACCESS_TOKEN && CHANNEL_ACCESS_TOKEN !== 'dummy-token-for-testing') {
          console.log('\n4️⃣ 更新 LINE Webhook URL...');
          
          try {
            await axios.put(
              'https://api.line.me/v2/bot/channel/webhook/endpoint',
              { endpoint: webhookUrl },
              {
                headers: {
                  'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            console.log('✅ LINE Webhook URL 已自動更新！');
          } catch (error) {
            console.log('⚠️ 無法自動更新 LINE Webhook URL');
            console.log('請手動到 LINE Developers Console 更新為：');
            console.log(`👉 ${webhookUrl}`);
          }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('🎉 小汪記記開發環境已準備就緒！');
        console.log('='.repeat(50));
        console.log(`📱 Webhook URL: ${webhookUrl}`);
        console.log('💡 提示：現在可以在 LINE 中測試你的 Bot');
        console.log('='.repeat(50) + '\n');
        
        // 儲存 URL 到檔案供其他工具使用
        const fs = require('fs');
        fs.writeFileSync('.ngrok-url', ngrokUrl);
        
      } else {
        console.error('❌ 無法獲取 ngrok URL');
      }
    } catch (error) {
      console.error('❌ 獲取 ngrok 資訊失敗:', error.message);
      console.log('請確認 ngrok 是否正常運行');
    }
  }, 5000); // 等待 5 秒讓 ngrok 完全啟動
  
}, 3000); // 等待 3 秒讓 Node.js 伺服器啟動

// 處理程序退出
process.on('SIGINT', () => {
  console.log('\n👋 正在關閉服務...');
  nodeServer.kill();
  process.exit();
});