/**
 * 清理所有 Node.js 開發服務器腳本
 * 解決端口占用問題
 */

const { spawn } = require('child_process');

function killProcessOnPorts(ports) {
  ports.forEach(port => {
    console.log(`🔍 檢查端口 ${port}...`);
    
    // 查找占用端口的進程
    const netstat = spawn('netstat', ['-ano'], { shell: true });
    let output = '';
    
    netstat.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    netstat.on('close', () => {
      const lines = output.split('\n');
      const portLines = lines.filter(line => line.includes(`:${port} `));
      
      portLines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        
        if (pid && pid !== '0' && !isNaN(pid)) {
          console.log(`💀 殺死端口 ${port} 上的進程 PID ${pid}`);
          spawn('taskkill', ['/PID', pid, '/F'], { shell: true });
        }
      });
    });
  });
}

console.log('🧹 清理所有開發服務器...');
killProcessOnPorts([3000, 3001, 3002, 3003, 3004, 3005, 3006]);

setTimeout(() => {
  console.log('✅ 清理完成！現在可以啟動新服務器了。');
}, 2000);