// 測試修正後的 webhook URL
const axios = require('axios');

async function testCorrectedWebhook() {
    console.log('🧪 測試修正後的 webhook URL...\n');
    
    const correctNgrokUrl = 'https://ae4bee7dc026.ngrok-free.app';
    const webhookEndpoint = '/api/payment/token-webhook';
    const fullWebhookUrl = `${correctNgrokUrl}${webhookEndpoint}`;
    
    console.log('🎯 測試目標:', fullWebhookUrl);
    console.log('');
    
    // 1. 測試基本連接
    console.log('1. 🌐 測試基本連接...');
    try {
        const basicTest = {
            test: 'corrected_url_connectivity',
            source: 'test_script',
            timestamp: new Date().toISOString()
        };
        
        const response = await axios.post(fullWebhookUrl, basicTest, {
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            timeout: 10000
        });
        
        console.log('✅ 基本連接成功:', response.status);
        console.log('📥 回應:', response.data);
    } catch (error) {
        console.log('❌ 基本連接失敗:', error.message);
        if (error.response) {
            console.log('📥 錯誤詳情:', error.response.status, error.response.data);
        }
        return;
    }
    
    // 2. 模擬真實的 Token webhook
    console.log('\n2. 🎫 模擬真實 Token webhook...');
    try {
        const mockTokenWebhook = {
            success: true,
            purpose: "token",
            merchantId: "mktersalon",
            transactionId: `TEST_CORRECTED_${Date.now()}`,
            message: null,
            customId: JSON.stringify({
                userId: "test_corrected_user",
                purpose: "premium_subscription",
                plan: "monthly",
                amount: 299,
                timestamp: new Date().toISOString(),
                testType: "corrected_webhook_test"
            }),
            token: `CORRECTED_TOKEN_${Date.now()}`,
            id: `CORRECTED_ID_${Date.now()}`
        };
        
        const response = await axios.post(fullWebhookUrl, mockTokenWebhook, {
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            timeout: 10000
        });
        
        console.log('✅ 模擬 Token webhook 成功:', response.status);
        console.log('📥 回應:', response.data);
        console.log('🎫 測試 Token:', mockTokenWebhook.token);
        
    } catch (error) {
        console.log('❌ 模擬 Token webhook 失敗:', error.message);
        if (error.response) {
            console.log('📥 錯誤詳情:', error.response.status, error.response.data);
        }
    }
    
    console.log('\n🎉 測試完成！');
    console.log('📋 新的綁卡連結應該可以正常工作了：');
    console.log('🔗 https://mktersalon.test.oen.tw/checkout/subscription/create/32aJptgxHkycGhwvMluivJtEeR2');
    console.log('');
    console.log('💡 下一步：');
    console.log('1. 打開上面的連結');
    console.log('2. 完成綁卡流程');
    console.log('3. 觀察伺服器是否收到真實的 webhook');
}

testCorrectedWebhook();