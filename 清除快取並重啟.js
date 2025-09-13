#!/usr/bin/env node
// 清除快取並重啟 - 一鍵清除 FLEX MESSAGE 快取並重新啟動伺服器
// 版本：V1.0 - 2025-09-13

const { spawn } = require('child_process');
const path = require('path');

console.log('🔥 一鍵清除快取並重啟工具');
console.log('=====================================');

async function quickClearAndRestart() {
  try {
    console.log('🚀 步驟 1: 執行 FM清除快取...');

    // 執行 FM清除快取.js
    const clearProcess = spawn('node', ['FM清除快取.js'], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    clearProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 快取清除完成！');
        console.log('🚀 步驟 2: 重新啟動伺服器...');

        // 等待 2 秒後重新啟動
        setTimeout(() => {
          const startProcess = spawn('npm', ['start'], {
            cwd: __dirname,
            stdio: 'inherit'
          });

          startProcess.on('error', (err) => {
            console.error('❌ 啟動伺服器失敗:', err);
          });

          console.log('🎉 伺服器重新啟動中...');
        }, 2000);
      } else {
        console.error('❌ 快取清除失敗，退出碼:', code);
      }
    });

    clearProcess.on('error', (err) => {
      console.error('❌ 執行清除快取失敗:', err);
    });

  } catch (error) {
    console.error('❌ 執行過程發生錯誤:', error);
  }
}

quickClearAndRestart();