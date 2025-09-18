/**
 * LOG偵測系統 - 監控LINE BOT運行狀態
 * 建立時間: 2025-09-18
 */

const fs = require('fs');
const path = require('path');

class LogMonitor {
    constructor() {
        this.logFile = path.join(__dirname, 'bot-monitor.log');
        this.errorPatterns = [
            /SyntaxError/,
            /TypeError/,
            /ReferenceError/,
            /❌.*錯誤/,
            /錯誤.*無法/,
            /失敗/,
            /Error:/
        ];
        this.successPatterns = [
            /✅.*成功/,
            /FLEX MESSAGE 發送成功/,
            /訊息已儲存到 Supabase/,
            /收藏卡.*成功/
        ];
    }

    /**
     * 記錄系統狀態
     */
    logSystemStatus() {
        const timestamp = new Date().toISOString();
        const status = {
            timestamp,
            type: 'SYSTEM_CHECK',
            linebot_running: this.checkLineBotStatus(),
            puppeteer_status: this.checkPuppeteerStatus(),
            supabase_status: this.checkSupabaseStatus()
        };

        this.writeLog(status);
        return status;
    }

    /**
     * 檢查LINE BOT運行狀態
     */
    checkLineBotStatus() {
        try {
            // 檢查port 3008是否被佔用
            const { execSync } = require('child_process');
            const result = execSync('netstat -ano | findstr :3008', { encoding: 'utf8' });
            return {
                status: result.length > 0 ? 'RUNNING' : 'STOPPED',
                port: 3008,
                details: result.trim()
            };
        } catch (error) {
            return {
                status: 'ERROR',
                error: error.message
            };
        }
    }

    /**
     * 檢查Puppeteer狀態
     */
    checkPuppeteerStatus() {
        try {
            const enhancedPreview = require('./enhanced-link-preview');
            return {
                status: 'AVAILABLE',
                module: 'enhanced-link-preview.js'
            };
        } catch (error) {
            return {
                status: 'ERROR',
                error: error.message,
                module: 'enhanced-link-preview.js'
            };
        }
    }

    /**
     * 檢查Supabase狀態
     */
    checkSupabaseStatus() {
        const hasEnvVars = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
        return {
            status: hasEnvVars ? 'CONFIGURED' : 'MISSING_CONFIG',
            url_exists: !!process.env.SUPABASE_URL,
            key_exists: !!process.env.SUPABASE_ANON_KEY
        };
    }

    /**
     * 分析LOG文件中的錯誤
     */
    analyzeErrors(logContent) {
        const lines = logContent.split('\n');
        const errors = [];
        const successes = [];

        lines.forEach((line, index) => {
            // 檢查錯誤模式
            this.errorPatterns.forEach(pattern => {
                if (pattern.test(line)) {
                    errors.push({
                        lineNumber: index + 1,
                        content: line.trim(),
                        pattern: pattern.source
                    });
                }
            });

            // 檢查成功模式
            this.successPatterns.forEach(pattern => {
                if (pattern.test(line)) {
                    successes.push({
                        lineNumber: index + 1,
                        content: line.trim(),
                        pattern: pattern.source
                    });
                }
            });
        });

        return { errors, successes };
    }

    /**
     * 監控服務器LOG
     */
    monitorServerLogs() {
        const logData = {
            timestamp: new Date().toISOString(),
            type: 'LOG_ANALYSIS',
            system_status: this.logSystemStatus(),
            recent_activity: this.getRecentActivity()
        };

        console.log('🔍 [LOG監控] 系統狀態檢查...');
        console.log('📊 [系統狀態]', JSON.stringify(logData.system_status, null, 2));

        this.writeLog(logData);
        return logData;
    }

    /**
     * 獲取最近活動
     */
    getRecentActivity() {
        // 這裡可以擴展來讀取實際的服務器日誌
        return {
            last_webhook: 'Check server logs for recent webhook activity',
            last_message: 'Check server logs for recent message processing',
            last_error: 'Check server logs for recent errors'
        };
    }

    /**
     * 寫入LOG文件
     */
    writeLog(data) {
        const logEntry = `${new Date().toISOString()} - ${JSON.stringify(data)}\n`;
        fs.appendFileSync(this.logFile, logEntry);
    }

    /**
     * 讀取LOG歷史
     */
    readLogHistory(lines = 50) {
        try {
            if (!fs.existsSync(this.logFile)) {
                return '📝 LOG文件尚未建立';
            }

            const content = fs.readFileSync(this.logFile, 'utf8');
            const logLines = content.trim().split('\n');

            return logLines.slice(-lines).join('\n');
        } catch (error) {
            return `❌ 讀取LOG失敗: ${error.message}`;
        }
    }

    /**
     * 清除舊LOG
     */
    clearOldLogs() {
        try {
            if (fs.existsSync(this.logFile)) {
                fs.unlinkSync(this.logFile);
                console.log('🗑️ [LOG清理] 舊LOG已清除');
            }
        } catch (error) {
            console.error('❌ [LOG清理] 失敗:', error.message);
        }
    }

    /**
     * 產生監控報告
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            system_status: this.logSystemStatus(),
            log_history: this.readLogHistory(20),
            recommendations: this.generateRecommendations()
        };

        console.log('\n=== LINE BOT 監控報告 ===');
        console.log('🕐 時間:', report.timestamp);
        console.log('📊 系統狀態:', report.system_status.linebot_running.status);
        console.log('🔧 Puppeteer:', report.system_status.puppeteer_status.status);
        console.log('💾 Supabase:', report.system_status.supabase_status.status);
        console.log('💡 建議:', report.recommendations.join(', '));
        console.log('========================\n');

        return report;
    }

    /**
     * 產生建議
     */
    generateRecommendations() {
        const recommendations = [];
        const status = this.logSystemStatus();

        if (status.linebot_running.status !== 'RUNNING') {
            recommendations.push('重新啟動LINE BOT服務');
        }

        if (status.puppeteer_status.status === 'ERROR') {
            recommendations.push('檢查enhanced-link-preview.js語法錯誤');
        }

        if (status.supabase_status.status === 'MISSING_CONFIG') {
            recommendations.push('檢查Supabase環境變數設定');
        }

        if (recommendations.length === 0) {
            recommendations.push('系統運行正常');
        }

        return recommendations;
    }
}

module.exports = LogMonitor;

// 如果直接執行此文件
if (require.main === module) {
    const monitor = new LogMonitor();

    console.log('🚀 啟動LINE BOT監控系統...\n');

    // 生成初始報告
    monitor.generateReport();

    // 持續監控（每30秒檢查一次）
    setInterval(() => {
        monitor.monitorServerLogs();
    }, 30000);

    console.log('🔄 監控系統已啟動，每30秒檢查一次狀態');
    console.log('📁 LOG文件位置:', monitor.logFile);
}