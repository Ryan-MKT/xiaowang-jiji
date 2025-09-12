// 測試所有可能的 API endpoints
const axios = require('axios');

const authToken = process.env.OEN_PAYMENT_TEST_AUTH_TOKEN;

const possibleEndpoints = [
    // 基本路徑
    'https://payment-api.development.oen.tw/checkout-onetime',
    'https://payment-api.testing.oen.tw/checkout-onetime',
    
    // 加上 API 版本
    'https://payment-api.development.oen.tw/v1/checkout-onetime',
    'https://payment-api.development.oen.tw/api/v1/checkout-onetime',
    'https://payment-api.development.oen.tw/api/checkout-onetime',
    
    // 測試環境版本
    'https://payment-api.testing.oen.tw/v1/checkout-onetime',
    'https://payment-api.testing.oen.tw/api/v1/checkout-onetime',
    'https://payment-api.testing.oen.tw/api/checkout-onetime',
    
    // 根目錄測試
    'https://payment-api.development.oen.tw/',
    'https://payment-api.testing.oen.tw/',
    
    // 其他可能的路徑
    'https://payment-api.development.oen.tw/payments',
    'https://payment-api.development.oen.tw/payment',
    'https://payment-api.development.oen.tw/create-payment',
];

async function testEndpoint(url, method = 'GET') {
    try {
        const config = {
            method: method,
            url: url,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            timeout: 10000
        };
        
        if (method === 'POST') {
            config.data = {
                merchantId: 'mktersalon',
                amount: 299,
                currency: 'TWD',
                orderId: 'TEST_' + Date.now()
            };
        }
        
        const response = await axios(config);
        console.log(`✅ ${method} ${url} - Status: ${response.status}`);
        if (response.data) {
            console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        }
        return true;
        
    } catch (error) {
        const status = error.response?.status || 'NETWORK_ERROR';
        const message = error.response?.data || error.message;
        
        if (status === 404) {
            console.log(`❌ ${method} ${url} - 404 Not Found`);
        } else if (status === 401) {
            console.log(`🔒 ${method} ${url} - 401 Unauthorized (可能需要權限)`);
        } else if (status === 400) {
            console.log(`⚠️  ${method} ${url} - 400 Bad Request (endpoint 存在但參數錯誤)`);
            console.log(`   Response:`, message);
        } else if (status === 200) {
            console.log(`✅ ${method} ${url} - 200 OK`);
            console.log(`   Response:`, message);
        } else {
            console.log(`❓ ${method} ${url} - ${status}: ${message}`);
        }
        return false;
    }
}

async function testAllEndpoints() {
    console.log('🔍 測試所有可能的 Oen Payment API endpoints...\n');
    console.log(`📋 使用 JWT Token: ${authToken ? '已設定' : '未設定'}\n`);
    
    let foundWorking = false;
    
    for (const url of possibleEndpoints) {
        // 先試 GET，再試 POST
        const getResult = await testEndpoint(url, 'GET');
        if (getResult) {
            foundWorking = true;
        }
        
        // 如果是 checkout 或 payment 相關的，也試 POST
        if (url.includes('checkout') || url.includes('payment')) {
            const postResult = await testEndpoint(url, 'POST');
            if (postResult) {
                foundWorking = true;
            }
        }
        
        console.log(''); // 空行分隔
    }
    
    console.log('📊 測試結果總結:');
    if (foundWorking) {
        console.log('✅ 找到可用的 endpoint！');
    } else {
        console.log('❌ 未找到可用的 endpoint');
        console.log('\n💡 建議行動:');
        console.log('1. 檢查 JWT Token 是否正確');
        console.log('2. 聯絡 Oen Payment 技術支援確認正確的 API base URL');
        console.log('3. 確認 merchant 帳號是否已啟用 API 存取權限');
    }
}

if (require.main === module) {
    testAllEndpoints();
}