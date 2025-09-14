// 直接測試建立支付連結 - 使用官方 MCP Server 的邏輯
const axios = require('axios');

// 配置
const config = {
    merchantId: 'mktersalon',
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjVhZDEzYTJlLTEwZTctNDlkZC1hYThhLTg2OTY2NmQwOTFlMyJ9.eyJkb21haW4iOiJta3RlcnNhbG9uIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Lm9lbi50dyIsImF1ZCI6Imh0dHBzOi8vcGF5bWVudC1hcGkuZGV2ZWxvcG1lbnQub2VuLnR3IiwianRpIjoiMzJhN3c5UHZTVlpPWFdmS1RnV08zdnE0THZPIiwiaWF0IjoxNzU3NjQ3MDY1fQ.rCM-KdXuXWMSmykKUXS17dLYCNnI8yvIoSarhWVjy69F_mvJIsKHP3SlVfqpVmR_TQdCNYeGu8PFEP-wBWbsK9dJ9Kuo94lihcrgikvzDGtGmZ4OJiejblAr4mtAJtexyGyrqek4h-XF1P8ubtOwY60QdriPFKVJ0TvsviB3yUAglMHxOOIFRVCUxHLe9-xAyDbt-Aa2Gvzi4EoqFmcQosiOJBgMs032qvPz6i9IHOY3Ysi-gqojo9U6aizxAn_zuwZToEzvvW2uqATuZie25_I2IphOUcjiPLiDTgOzH23w3Hj-V8JAoA-G6bJCXiu9KlQPe0j0jiYG8Bsbt7PA1w',
    apiUrl: 'https://payment-api.development.oen.tw' // 從 JWT 取得
};

async function createPaymentLink(orderData) {
    console.log('💳 [Payment Link] 建立支付連結...');
    console.log('📋 [Payment Link] 訂單資料:', orderData);
    
    try {
        // 根據 MCP Server 可能使用的 API 格式
        const paymentRequest = {
            merchantId: config.merchantId,
            amount: orderData.amount,
            currency: orderData.currency || 'TWD',
            orderId: orderData.orderId || `WANGJI_${Date.now()}`,
            customId: orderData.userId,
            userId: orderData.userId,
            userName: orderData.userName || '小汪記記用戶',
            userEmail: orderData.userEmail || '',
            note: orderData.note || '小汪記記 Premium 訂閱',
            // 成功/失敗 URL - 如果沒提供會用預設
            successUrl: orderData.successUrl || `https://128bc9123177.ngrok-free.app/payment/success`,
            failureUrl: orderData.failureUrl || `https://128bc9123177.ngrok-free.app/payment/cancel`
        };
        
        console.log('🌐 [Payment Link] 調用 API:', config.apiUrl);
        console.log('📤 [Payment Link] 請求資料:', paymentRequest);
        
        // 嘗試不同的 API endpoints
        const possibleEndpoints = [
            '/checkout-onetime',
            '/api/checkout-onetime', 
            '/v1/checkout-onetime',
            '/api/v1/checkout-onetime'
        ];
        
        for (const endpoint of possibleEndpoints) {
            try {
                console.log(`🧪 [Payment Link] 嘗試 endpoint: ${endpoint}`);
                
                const response = await axios.post(`${config.apiUrl}${endpoint}`, paymentRequest, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.token}`
                    },
                    timeout: 15000
                });
                
                console.log(`✅ [Payment Link] ${endpoint} 成功！`);
                console.log('📥 [Payment Link] 回應:', response.data);
                
                // 根據 MCP 文檔，成功會回傳支付 URL
                if (response.data && response.data.code === 'S0000') {
                    return {
                        success: true,
                        paymentUrl: response.data.data.paymentUrl || response.data.data.checkoutUrl,
                        orderId: paymentRequest.orderId,
                        transactionId: response.data.data.id,
                        response: response.data
                    };
                }
                
            } catch (endpointError) {
                const status = endpointError.response?.status;
                const message = endpointError.response?.data;
                
                console.log(`❌ [Payment Link] ${endpoint} - ${status}: ${JSON.stringify(message)}`);
                
                // 如果是 400 錯誤，表示 endpoint 存在但參數有問題
                if (status === 400) {
                    console.log('⚠️  [Payment Link] 發現可用的 endpoint，但參數格式需要調整');
                    return {
                        success: false,
                        error: '參數格式需要調整',
                        endpoint: endpoint,
                        response: message
                    };
                }
                
                // 繼續嘗試下一個 endpoint
                continue;
            }
        }
        
        throw new Error('所有 endpoints 都無法存取');
        
    } catch (error) {
        console.error('❌ [Payment Link] 建立支付連結失敗:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 測試函數
async function testPaymentLink() {
    console.log('🧪 [Test] 開始測試支付連結建立...\n');
    
    const testOrder = {
        userId: 'test_user_wangji_123',
        userName: '小汪記記測試用戶',
        userEmail: 'test@wangji.com',
        amount: 299,
        note: '小汪記記 Premium 訂閱 - MCP 測試'
    };
    
    const result = await createPaymentLink(testOrder);
    
    console.log('\n📊 [Test] 測試結果:');
    if (result.success) {
        console.log('✅ 支付連結建立成功！');
        console.log('🔗 支付 URL:', result.paymentUrl);
        console.log('📋 訂單 ID:', result.orderId);
    } else {
        console.log('❌ 支付連結建立失敗:', result.error);
        if (result.endpoint) {
            console.log('💡 發現可用的 endpoint:', result.endpoint);
        }
    }
    
    return result;
}

// 執行測試
if (require.main === module) {
    testPaymentLink();
}

module.exports = { createPaymentLink, testPaymentLink };