// 調試 Token 請求的具體問題
const axios = require('axios');

const config = {
    merchantId: 'mktersalon',
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjVhZDEzYTJlLTEwZTctNDlkZC1hYThhLTg2OTY2NmQwOTFlMyJ9.eyJkb21haW4iOiJta3RlcnNhbG9uIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Lm9lbi50dyIsImF1ZCI6Imh0dHBzOi8vcGF5bWVudC1hcGkuZGV2ZWxvcG1lbnQub2VuLnR3IiwianRpIjoiMzJhN3c5UHZTVlpPWFdmS1RnV08zdnE0THZPIiwiaWF0IjoxNzU3NjQ3MDY1fQ.rCM-KdXuXWMSmykKUXS17dLYCNnI8yvIoSarhWVjy69F_mvJIsKHP3SlVfqpVmR_TQdCNYeGu8PFEP-wBWbsK9dJ9Kuo94lihcrgikvzDGtGmZ4OJiejblAr4mtAJtexyGyrqek4h-XF1P8ubtOwY60QdriPFKVJ0TvsviB3yUAglMHxOOIFRVCUxHLe9-xAyDbt-Aa2Gvzi4EoqFmcQosiOJBgMs032qvPz6i9IHOY3Ysi-gqojo9U6aizxAn_zuwZToEzvvW2uqATuZie25_I2IphOUcjiPLiDTgOzH23w3Hj-V8JAoA-G6bJCXiu9KlQPe0j0jiYG8Bsbt7PA1w',
    apiUrl: 'https://payment-api.testing.oen.tw'
};

async function testDifferentRequests() {
    console.log('🔍 [調試] 測試不同的請求格式...\n');
    
    // 測試 1: 權限探測使用的最簡請求 (之前成功的)
    console.log('=== 測試 1: 最簡請求 (權限探測版本) ===');
    try {
        const simpleResponse = await axios.post(`${config.apiUrl}/checkout-token`, {
            merchantId: config.merchantId
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.token}`
            },
            timeout: 10000
        });
        
        console.log('✅ 最簡請求成功:', simpleResponse.status);
        console.log('📦 回應資料:', JSON.stringify(simpleResponse.data, null, 2));
        
    } catch (error) {
        console.log('❌ 最簡請求失敗:', error.response?.status, error.response?.data);
    }
    
    // 測試 2: 添加必要的 URL 參數
    console.log('\n=== 測試 2: 添加必要 URL 參數 ===');
    try {
        const withUrlResponse = await axios.post(`${config.apiUrl}/checkout-token`, {
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
        
        console.log('✅ 添加 URL 請求成功:', withUrlResponse.status);
        console.log('📦 回應資料:', JSON.stringify(withUrlResponse.data, null, 2));
        
    } catch (error) {
        console.log('❌ 添加 URL 請求失敗:', error.response?.status, error.response?.data);
    }
    
    // 測試 3: 完整請求 (包含 customId)
    console.log('\n=== 測試 3: 完整請求 ===');
    try {
        const fullResponse = await axios.post(`${config.apiUrl}/checkout-token`, {
            merchantId: config.merchantId,
            successUrl: 'https://128bc9123177.ngrok-free.app/payment/token-success',
            failureUrl: 'https://128bc9123177.ngrok-free.app/payment/token-failure',
            customId: 'simple_test_123'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.token}`
            },
            timeout: 10000
        });
        
        console.log('✅ 完整請求成功:', fullResponse.status);
        console.log('📦 回應資料:', JSON.stringify(fullResponse.data, null, 2));
        
    } catch (error) {
        console.log('❌ 完整請求失敗:', error.response?.status, error.response?.data);
    }
    
    // 測試 4: 檢查 Token 是否過期
    console.log('\n=== 測試 4: 檢查 Token 資訊 ===');
    try {
        // 解析 JWT Token (不驗證簽名，只看內容)
        const tokenParts = config.token.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            
            console.log('📋 Token 資訊:');
            console.log('  Domain:', payload.domain);
            console.log('  Issuer:', payload.iss);
            console.log('  Audience:', payload.aud);
            console.log('  Issued At:', new Date(payload.iat * 1000).toISOString());
            console.log('  Expires At:', payload.exp ? new Date(payload.exp * 1000).toISOString() : '無過期時間');
            console.log('  Current Time:', new Date().toISOString());
            
            if (payload.exp && payload.exp < Date.now() / 1000) {
                console.log('⚠️  Token 已過期！');
            } else {
                console.log('✅ Token 尚未過期');
            }
        }
    } catch (error) {
        console.log('❌ Token 解析失敗:', error.message);
    }
}

// 執行調試
if (require.main === module) {
    testDifferentRequests();
}

module.exports = { testDifferentRequests };