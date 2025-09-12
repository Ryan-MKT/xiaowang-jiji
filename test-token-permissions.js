// 測試 JWT Token 的實際權限範圍
const axios = require('axios');

const config = {
    merchantId: 'mktersalon',
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjVhZDEzYTJlLTEwZTctNDlkZC1hYThhLTg2OTY2NmQwOTFlMyJ9.eyJkb21haW4iOiJta3RlcnNhbG9uIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Lm9lbi50dyIsImF1ZCI6Imh0dHBzOi8vcGF5bWVudC1hcGkuZGV2ZWxvcG1lbnQub2VuLnR3IiwianRpIjoiMzJhN3c5UHZTVlpPWFdmS1RnV08zdnE0THZPIiwiaWF0IjoxNzU3NjQ3MDY1fQ.rCM-KdXuXWMSmykKUXS17dLYCNnI8yvIoSarhWVjy69F_mvJIsKHP3SlVfqpVmR_TQdCNYeGu8PFEP-wBWbsK9dJ9Kuo94lihcrgikvzDGtGmZ4OJiejblAr4mtAJtexyGyrqek4h-XF1P8ubtOwY60QdriPFKVJ0TvsviB3yUAglMHxOOIFRVCUxHLe9-xAyDbt-Aa2Gvzi4EoqFmcQosiOJBgMs032qvPz6i9IHOY3Ysi-gqojo9U6aizxAn_zuwZToEzvvW2uqATuZie25_I2IphOUcjiPLiDTgOzH23w3Hj-V8JAoA-G6bJCXiu9KlQPe0j0jiYG8Bsbt7PA1w',
    apiUrl: 'https://payment-api.testing.oen.tw'
};

// 測試不同的 API endpoints 來確定權限範圍
const testEndpoints = [
    // 查詢類 (通常權限較低)
    { method: 'GET', path: '/', name: '根目錄' },
    { method: 'GET', path: '/health', name: '健康檢查' },
    { method: 'GET', path: '/merchants', name: '商戶資訊' },
    { method: 'GET', path: `/merchants/${config.merchantId}`, name: '我的商戶資訊' },
    
    // 交易查詢類
    { method: 'GET', path: '/transactions', name: '交易列表' },
    { method: 'GET', path: '/orders', name: '訂單列表' },
    
    // 創建類 (權限較高)
    { method: 'POST', path: '/checkout-token', name: 'Token 結帳' },
    { method: 'POST', path: '/checkout-onetime', name: '單次結帳' },
    { method: 'POST', path: '/payments', name: '建立付款' },
    { method: 'POST', path: '/orders', name: '建立訂單' },
    
    // 其他可能的 endpoints
    { method: 'GET', path: '/config', name: '配置資訊' },
    { method: 'GET', path: '/status', name: '狀態檢查' }
];

async function testEndpoint(endpoint) {
    try {
        const config_headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.token}`
        };
        
        const requestConfig = {
            method: endpoint.method,
            url: `${config.apiUrl}${endpoint.path}`,
            headers: config_headers,
            timeout: 10000
        };
        
        // 對 POST 請求添加基本資料
        if (endpoint.method === 'POST') {
            requestConfig.data = {
                merchantId: config.merchantId
            };
            
            // 針對特定 endpoints 添加必要參數
            if (endpoint.path === '/checkout-token') {
                requestConfig.data = {
                    ...requestConfig.data,
                    successUrl: 'https://example.com/success',
                    failureUrl: 'https://example.com/failure',
                    customId: 'test_permission_check'
                };
            }
        }
        
        const response = await axios(requestConfig);
        
        return {
            endpoint: endpoint.name,
            method: endpoint.method,
            path: endpoint.path,
            status: response.status,
            success: true,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : []
        };
        
    } catch (error) {
        return {
            endpoint: endpoint.name,
            method: endpoint.method,
            path: endpoint.path,
            status: error.response?.status || 'NETWORK_ERROR',
            success: false,
            error: error.response?.data || error.message
        };
    }
}

async function exploreTokenPermissions() {
    console.log('🔍 [權限探測] 開始檢測 JWT Token 權限範圍...\n');
    console.log(`📋 [權限探測] 商戶 ID: ${config.merchantId}`);
    console.log(`🌐 [權限探測] API URL: ${config.apiUrl}\n`);
    
    const results = [];
    
    for (const endpoint of testEndpoints) {
        console.log(`🧪 測試: ${endpoint.method} ${endpoint.path} (${endpoint.name})`);
        
        const result = await testEndpoint(endpoint);
        results.push(result);
        
        // 根據結果給予不同的提示
        if (result.success) {
            console.log(`✅ ${result.status} - 有權限存取`);
            if (result.hasData) {
                console.log(`   📦 回傳資料包含: ${result.dataKeys.join(', ')}`);
            }
        } else {
            const status = result.status;
            if (status === 401) {
                console.log(`🔒 ${status} - 需要更高權限`);
            } else if (status === 404) {
                console.log(`❌ ${status} - endpoint 不存在`);
            } else if (status === 400) {
                console.log(`⚠️  ${status} - 參數錯誤 (endpoint 存在)`, result.error);
            } else if (status === 403) {
                console.log(`🚫 ${status} - 禁止存取`);
            } else {
                console.log(`❓ ${status} - 其他錯誤`, result.error);
            }
        }
        console.log(''); // 空行
    }
    
    // 分析結果
    console.log('📊 [權限分析] 結果總結:\n');
    
    const successful = results.filter(r => r.success);
    const unauthorized = results.filter(r => r.status === 401);
    const notFound = results.filter(r => r.status === 404);
    const badRequest = results.filter(r => r.status === 400);
    
    console.log(`✅ 可存取的 endpoints: ${successful.length}`);
    successful.forEach(r => console.log(`   - ${r.method} ${r.path} (${r.endpoint})`));
    
    console.log(`\n🔒 需要更高權限的 endpoints: ${unauthorized.length}`);
    unauthorized.forEach(r => console.log(`   - ${r.method} ${r.path} (${r.endpoint})`));
    
    console.log(`\n❌ 不存在的 endpoints: ${notFound.length}`);
    notFound.forEach(r => console.log(`   - ${r.method} ${r.path} (${r.endpoint})`));
    
    if (badRequest.length > 0) {
        console.log(`\n⚠️  參數錯誤但 endpoint 存在: ${badRequest.length}`);
        badRequest.forEach(r => console.log(`   - ${r.method} ${r.path} (${r.endpoint})`));
    }
    
    // 給出建議
    console.log('\n💡 [建議]');
    if (successful.length > 0) {
        console.log('✅ 你的 Token 有一些權限，可以嘗試使用可存取的 endpoints');
    }
    if (unauthorized.length > 0) {
        console.log('🔒 部分功能需要更高權限，可能需要向應援申請權限升級');
    }
    if (badRequest.length > 0) {
        console.log('⚠️  某些 endpoints 存在但參數格式需要調整');
    }
    
    return results;
}

// 執行權限探測
if (require.main === module) {
    exploreTokenPermissions()
        .then(results => {
            console.log('\n🎯 [完成] 權限探測完成');
        })
        .catch(error => {
            console.error('❌ [錯誤] 權限探測失敗:', error);
        });
}

module.exports = { exploreTokenPermissions };