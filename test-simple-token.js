// 簡化版 Token 測試 - 完全複製成功的調試邏輯
const axios = require('axios');

const config = {
    merchantId: 'mktersalon',
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjVhZDEzYTJlLTEwZTctNDlkZC1hYThhLTg2OTY2NmQwOTFlMyJ9.eyJkb21haW4iOiJta3RlcnNhbG9uIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Lm9lbi50dyIsImF1ZCI6Imh0dHBzOi8vcGF5bWVudC1hcGkuZGV2ZWxvcG1lbnQub2VuLnR3IiwianRpIjoiMzJhN3c5UHZTVlpPWFdmS1RnV08zdnE0THZPIiwiaWF0IjoxNzU3NjQ3MDY1fQ.rCM-KdXuXWMSmykKUXS17dLYCNnI8yvIoSarhWVjy69F_mvJIsKHP3SlVfqpVmR_TQdCNYeGu8PFEP-wBWbsK9dJ9Kuo94lihcrgikvzDGtGmZ4OJiejblAr4mtAJtexyGyrqek4h-XF1P8ubtOwY60QdriPFKVJ0TvsviB3yUAglMHxOOIFRVCUxHLe9-xAyDbt-Aa2Gvzi4EoqFmcQosiOJBgMs032qvPz6i9IHOY3Ysi-gqojo9U6aizxAn_zuwZToEzvvW2uqATuZie25_I2IphOUcjiPLiDTgOzH23w3Hj-V8JAoA-G6bJCXiu9KlQPe0j0jiYG8Bsbt7PA1w',
    apiUrl: 'https://payment-api.testing.oen.tw'
};

async function createSimpleToken() {
    console.log('🧪 [簡化測試] 創建 Token，不帶 customId...\n');
    
    try {
        const response = await axios.post(`${config.apiUrl}/checkout-token`, {
            merchantId: config.merchantId,
            successUrl: 'https://example.com/success',
            failureUrl: 'https://example.com/failure'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.token}`
            },
            timeout: 10000
        });
        
        console.log('✅ 創建成功:', response.status);
        console.log('📦 回應資料:', JSON.stringify(response.data, null, 2));
        
        const checkoutId = response.data.data.id;
        console.log('\n🎉 [成功] 獲得 Checkout ID:', checkoutId);
        
        return {
            success: true,
            checkoutId: checkoutId
        };
        
    } catch (error) {
        console.log('❌ 創建失敗:', error.response?.status, error.response?.data);
        return {
            success: false,
            error: error.response?.data
        };
    }
}

async function createTokenWithCustomId() {
    console.log('\n🧪 [簡化測試] 創建 Token，帶 customId...\n');
    
    try {
        const response = await axios.post(`${config.apiUrl}/checkout-token`, {
            merchantId: config.merchantId,
            successUrl: 'https://example.com/success',
            failureUrl: 'https://example.com/failure',
            customId: 'simple_test_123'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.token}`
            },
            timeout: 10000
        });
        
        console.log('✅ 創建成功:', response.status);
        console.log('📦 回應資料:', JSON.stringify(response.data, null, 2));
        
        const checkoutId = response.data.data.id;
        console.log('\n🎉 [成功] 獲得 Checkout ID:', checkoutId);
        
        return {
            success: true,
            checkoutId: checkoutId
        };
        
    } catch (error) {
        console.log('❌ 創建失敗:', error.response?.status, error.response?.data);
        return {
            success: false,
            error: error.response?.data
        };
    }
}

async function runTests() {
    console.log('🚀 [簡化測試] 開始測試 Token 創建...\\n');
    
    const result1 = await createSimpleToken();
    const result2 = await createTokenWithCustomId();
    
    console.log('\n📊 [總結]');
    console.log('無 customId:', result1.success ? '✅ 成功' : '❌ 失敗');
    console.log('有 customId:', result2.success ? '✅ 成功' : '❌ 失敗');
}

if (require.main === module) {
    runTests();
}

module.exports = { createSimpleToken, createTokenWithCustomId };