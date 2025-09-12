// 測試 MCP Server 工具功能
const { spawn } = require('child_process');

// 配置
const MERCHANT_ID = 'mktersalon';
const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjVhZDEzYTJlLTEwZTctNDlkZC1hYThhLTg2OTY2NmQwOTFlMyJ9.eyJkb21haW4iOiJta3RlcnNhbG9uIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Oel5ldvIiLWF1ZCI6Imh0dHBzOi8vcGF5bWVudC1hcGkuZGV2ZWxvcG1lbnQub2VuLnR3IiwianRpIjoiMzJhN3c5UHZTVlpPWFdmS1RnV08zdnE0THZPIiwiaWF0IjoxNzU3NjQ3MDY1fQ.rCM-KdXuXWMSmykKUXS17dLYCNnI8yvIoSarhWVjy69F_mvJIsKHP3SlVfqpVmR_TQdCNYeGu8PFEP-wBWbsK9dJ9Kuo94lihcrgikvzDGtGmZ4OJiejblAr4mtAJtexyGyrqek4h-XF1P8ubtOwY60QdriPFKVJ0TvsviB3yUAglMHxOOIFRVCUxHLe9-xAyDbt-Aa2Gvzi4EoqFmcQosiOJBgMs032qvPz6i9IHOY3Ysi-gqojo9U6aizxAn_zuwZToEzvvW2uqATuZie25_I2IphOUcjiPLiDTgOzH23w3Hj-V8JAoA-G6bJCXiu9KlQPe0j0jiYG8Bsbt7PA1w';

// 模擬 MCP 工具調用
async function callMCPTool(toolName, params = {}) {
    return new Promise((resolve, reject) => {
        console.log(`🔧 [MCP Test] 測試工具: ${toolName}`);
        console.log(`📋 [MCP Test] 參數:`, params);
        
        // 使用 spawn 來呼叫 MCP Server
        const args = [
            `--merchantId=${MERCHANT_ID}`,
            `--token=${AUTH_TOKEN}`,
            `--tool=${toolName}`,
            ...Object.entries(params).map(([key, value]) => `--${key}=${value}`)
        ];
        
        const child = spawn('oen-payment-mcp-server', args, { 
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true 
        });
        
        let output = '';
        let error = '';
        
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ [MCP Test] ${toolName} 成功執行`);
                console.log('📤 輸出:', output);
                resolve({ success: true, output, error });
            } else {
                console.log(`❌ [MCP Test] ${toolName} 執行失敗 (code: ${code})`);
                console.log('📤 錯誤:', error);
                resolve({ success: false, output, error, code });
            }
        });
        
        child.on('error', (err) => {
            console.log(`💥 [MCP Test] ${toolName} 執行錯誤:`, err.message);
            reject(err);
        });
    });
}

async function testMCPTools() {
    console.log('🧪 [MCP Test] 開始測試 Oen Payment MCP 工具...\n');
    
    // 測試 1: 讀取配置
    console.log('=== 測試 1: getConfig ===');
    try {
        const configResult = await callMCPTool('getConfig');
        console.log('Config result:', configResult);
    } catch (error) {
        console.error('Config test failed:', error.message);
    }
    
    console.log('\n=== 測試 2: readDocs ===');
    try {
        const docsResult = await callMCPTool('readDocs');
        console.log('Docs result:', docsResult);
    } catch (error) {
        console.error('Docs test failed:', error.message);
    }
    
    console.log('\n=== 測試 3: checkoutLink (建立支付連結) ===');
    try {
        const checkoutResult = await callMCPTool('checkoutLink', {
            amount: 299,
            currency: 'TWD',
            orderId: 'WANGJI_TEST_' + Date.now(),
            customId: 'test_user_123',
            userId: 'test_user_123',
            userName: '小汪記記測試用戶',
            userEmail: 'test@wangji.com',
            note: '小汪記記 Premium 訂閱測試'
        });
        console.log('Checkout result:', checkoutResult);
    } catch (error) {
        console.error('Checkout test failed:', error.message);
    }
    
    console.log('\n📊 [MCP Test] 測試完成');
}

// 執行測試
if (require.main === module) {
    testMCPTools().catch(console.error);
}

module.exports = { testMCPTools, callMCPTool };