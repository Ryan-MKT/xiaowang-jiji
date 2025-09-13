#!/usr/bin/env node
// FM清除快取 - FLEX MESSAGE 快速清除快取工具
// 用途：以最快速度清除 FLEX MESSAGE 相關的所有快取
// 作者：Claude Code Assistant
// 版本：V1.0 - 2025-09-13

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚨 FM清除快取工具啟動中...');
console.log('⚡ 開始執行 FLEX MESSAGE 快取清除作業');

async function clearFlexMessageCache() {
  const startTime = Date.now();

  try {
    // 1. 清除 Node.js require cache
    console.log('🔄 步驟 1: 清除 Node.js require cache...');
    const flexMessageFiles = [
      './task-flex-message.js',
      '../task-flex-message.js',
      '../../task-flex-message.js',
      path.resolve('./task-flex-message.js'),
      path.resolve('../task-flex-message.js'),
      path.resolve('../../task-flex-message.js')
    ];

    flexMessageFiles.forEach(filePath => {
      try {
        delete require.cache[require.resolve(filePath)];
        console.log(`   ✅ 清除快取: ${filePath}`);
      } catch (e) {
        // 檔案不存在，忽略
      }
    });

    // 2. 強制清除所有相關模組快取
    console.log('🧹 步驟 2: 強制清除所有相關模組快取...');
    Object.keys(require.cache).forEach(key => {
      if (key.includes('task-flex-message') ||
          key.includes('flex-message') ||
          key.includes('FLEX')) {
        delete require.cache[key];
        console.log(`   ✅ 清除模組快取: ${key}`);
      }
    });

    // 3. 終止現有的 Node.js 進程 (如果有的話)
    console.log('💀 步驟 3: 檢查並終止現有 Node.js 進程...');
    await killExistingNodeProcesses();

    // 4. 清除可能的暫存檔案
    console.log('🗑️  步驟 4: 清除暫存檔案...');
    const tempFiles = [
      './.env.cache',
      './node_modules/.cache',
      './.cache'
    ];

    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          if (fs.lstatSync(file).isDirectory()) {
            fs.rmSync(file, { recursive: true, force: true });
          } else {
            fs.unlinkSync(file);
          }
          console.log(`   ✅ 刪除暫存檔案: ${file}`);
        } catch (e) {
          console.log(`   ⚠️  無法刪除: ${file}`);
        }
      }
    });

    // 5. 重新載入環境變數
    console.log('🔄 步驟 5: 重新載入環境變數...');
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config();
    console.log('   ✅ 環境變數重新載入完成');

    // 6. 等待一秒確保清除完成
    console.log('⏳ 步驟 6: 等待快取清除完成...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('🎉 ================================');
    console.log('✅ FM清除快取作業完成！');
    console.log(`⚡ 總耗時: ${duration}ms`);
    console.log('🚀 建議現在重新啟動伺服器以套用變更');
    console.log('💡 使用指令: npm start 或 node server.js');
    console.log('🎉 ================================');

    return true;
  } catch (error) {
    console.error('❌ FM清除快取過程發生錯誤:', error);
    return false;
  }
}

async function killExistingNodeProcesses() {
  return new Promise((resolve) => {
    // Windows 系統
    if (process.platform === 'win32') {
      const tasklist = spawn('tasklist', ['/fo', 'csv']);
      let data = '';

      tasklist.stdout.on('data', (chunk) => {
        data += chunk;
      });

      tasklist.on('close', () => {
        const lines = data.split('\n');
        const nodeProcesses = lines.filter(line =>
          line.includes('node.exe') && line.includes('3002')
        );

        if (nodeProcesses.length > 0) {
          console.log(`   🎯 發現 ${nodeProcesses.length} 個相關進程`);
          nodeProcesses.forEach(line => {
            const pid = line.split(',')[1]?.replace(/"/g, '');
            if (pid && !isNaN(pid)) {
              try {
                spawn('taskkill', ['/F', '/PID', pid]);
                console.log(`   ✅ 終止進程 PID: ${pid}`);
              } catch (e) {
                console.log(`   ⚠️  無法終止進程 PID: ${pid}`);
              }
            }
          });
        } else {
          console.log('   ℹ️  未發現相關 Node.js 進程');
        }
        resolve();
      });
    } else {
      // Unix-like 系統 (Linux, macOS)
      const ps = spawn('ps', ['aux']);
      let data = '';

      ps.stdout.on('data', (chunk) => {
        data += chunk;
      });

      ps.on('close', () => {
        const lines = data.split('\n');
        const nodeProcesses = lines.filter(line =>
          line.includes('node') && line.includes('server.js')
        );

        if (nodeProcesses.length > 0) {
          console.log(`   🎯 發現 ${nodeProcesses.length} 個相關進程`);
          nodeProcesses.forEach(line => {
            const pid = line.trim().split(/\s+/)[1];
            if (pid && !isNaN(pid)) {
              try {
                spawn('kill', ['-9', pid]);
                console.log(`   ✅ 終止進程 PID: ${pid}`);
              } catch (e) {
                console.log(`   ⚠️  無法終止進程 PID: ${pid}`);
              }
            }
          });
        } else {
          console.log('   ℹ️  未發現相關 Node.js 進程');
        }
        resolve();
      });
    }
  });
}

// 如果直接執行此文件
if (require.main === module) {
  clearFlexMessageCache().then(success => {
    if (success) {
      console.log('🎯 快取清除成功！準備重新啟動...');

      // 可選: 自動重新啟動伺服器
      const shouldRestart = process.argv.includes('--restart');
      if (shouldRestart) {
        console.log('🚀 自動重新啟動伺服器中...');
        setTimeout(() => {
          spawn('npm', ['start'], { stdio: 'inherit' });
        }, 2000);
      }
    } else {
      process.exit(1);
    }
  });
}

module.exports = { clearFlexMessageCache };