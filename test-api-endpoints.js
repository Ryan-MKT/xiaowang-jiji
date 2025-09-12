// 測試不同的 API endpoints
const axios = require('axios');

const authToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjVhZDEzYTJlLTEwZTctNDlkZC1hYThhLTg2OTY2NmQwOTFlMyJ9.eyJkb21haW4iOiJta3RlcnNhbG9uIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Lm9lbi50dyIsImF1ZCI6Imh0dHBzOi8vcGF5bWVudC1hcGkuZGV2ZWxvcG1lbnQub2VuLnR3IiwianRpIjoiMzJhN3c5UHZTVlpPWFdmS1RnV08zdnE0THZPIiwiaWF0IjoxNzU3NjQ3MDY1fQ.rCM-KdXuXWMSmykKUXS17dLYCNnI8yvIoSarhWVjy69F_mvJIsKHP3SlVfqpVmR_TQdCNYeGu8PFEP-wBWbsK9dJ9Kuo94lihcrgikvzDGtGmZ4OJiejblAr4mtAJtexyGyrqek4h-XF1P8ubtOwY60QdriPFKVJ0TvsviB3yUAglMHxOOIFRVCUxHLe9-xAyDbt-Aa2Gvzi4EoqFmcQosiOJBgMs032qvPz6i9IHOY3Ysi-gqojo9U6aizxAn_zuwZToEzvvW2uqATuZie25_I2IphOUcjiPLiDTgOzH23w3Hj-V8JAoA-G6bJCXiu9KlQPe0j0jiYG8Bsbt7PA1w';

const testEndpoints = [
    'https://payment-api.development.oen.tw/checkout-onetime',
    'https://payment-api.testing.oen.tw/checkout-onetime',
    'https://payment-api.development.oen.tw/payment/create',
    'https://payment-api.testing.oen.tw/payment/create'
];

async function testEndpoint(url, method = 'POST') {
    try {
        console.log(`🧪 測試 ${method} ${url}`);
        
        const response = await axios({
            method: method,
            url: url,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            data: method === 'POST' ? {
                merchantId: 'mktersalon',
                amount: 299,
                currency: 'TWD',
                orderId: 'TEST_' + Date.now(),
                successUrl: 'https://example.com/success',
                failureUrl: 'https://example.com/failure'
            } : undefined,
            timeout: 10000
        });
        
        console.log(`✅ ${url} - Status: ${response.status}`);
        console.log(`   Response:`, response.data);
        return true;
        
    } catch (error) {
        console.log(`❌ ${url} - Error: ${error.response?.status || error.message}`);
        if (error.response?.data) {
            console.log(`   Response:`, error.response.data);
        }
        return false;
    }
}

async function testAllEndpoints() {
    console.log('🔍 測試 Oen Payment API endpoints...\n');
    
    for (const url of testEndpoints) {
        await testEndpoint(url);
        console.log(''); // 空行分隔
    }
    
    console.log('📊 測試完成');
}

testAllEndpoints();