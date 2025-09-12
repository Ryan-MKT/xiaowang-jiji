// 簡化版金流測試工具 - 逐步測試每個環節
const axios = require('axios');

async function testStep1_CreateOrder() {
    console.log('🔍 === 測試步驟 1: 建立支付訂單 ===');
    
    const orderData = {
        userId: 'simple_test_user',
        userName: '簡化測試',
        amount: 199,
        itemName: '測試商品',
        description: '簡化測試訂單'
    };
    
    try {
        const response = await axios.post(
            'https://a4cc9d907f15.ngrok-free.app/api/payment/create',
            orderData,
            { timeout: 10000 }
        );
        
        console.log('✅ 訂單建立成功:', response.data);
        return response.data;
    } catch (error) {
        console.log('❌ 訂單建立失敗:', error.response?.data || error.message);
        return null;
    }
}

async function testStep2_PaymentCallback(orderId) {
    console.log('\n🔍 === 測試步驟 2: 支付回調 ===');
    
    if (!orderId) {
        console.log('❌ 沒有訂單 ID，跳過回調測試');
        return false;
    }
    
    const callbackData = {
        order_id: orderId,
        trade_status: 'TRADE_SUCCESS',
        amount: '199.00',
        trade_no: 'SIMPLE_TEST_' + Date.now(),
        customer_id: 'simple_test_user',
        timestamp: Math.floor(Date.now() / 1000),
        signature: 'simple_test_signature'
    };
    
    try {
        console.log('📞 發送回調數據:', callbackData);
        
        const response = await axios.post(
            'https://a4cc9d907f15.ngrok-free.app/payment/callback',
            callbackData,
            { 
                timeout: 10000,
                validateStatus: function (status) {
                    return status < 500; // 接受所有小於 500 的狀態碼
                }
            }
        );
        
        console.log('📋 回調回應:', {
            status: response.status,
            data: response.data
        });
        
        return response.status === 200;
    } catch (error) {
        console.log('❌ 回調測試失敗:', error.message);
        return false;
    }
}

async function testStep3_PaymentPage(paymentUrl) {
    console.log('\n🔍 === 測試步驟 3: 支付頁面 ===');
    
    if (!paymentUrl) {
        console.log('❌ 沒有支付 URL，跳過頁面測試');
        return false;
    }
    
    try {
        console.log('🌐 訪問支付頁面:', paymentUrl);
        
        const response = await axios.get(paymentUrl, { 
            timeout: 10000,
            validateStatus: function (status) {
                return status < 500;
            }
        });
        
        console.log('📋 頁面回應:', {
            status: response.status,
            contentLength: response.data.length,
            hasOrderInfo: response.data.includes('訂單資訊'),
            hasPaymentButtons: response.data.includes('模擬支付')
        });
        
        return response.status === 200;
    } catch (error) {
        console.log('❌ 支付頁面測試失敗:', error.message);
        return false;
    }
}

async function runSimpleTest() {
    console.log('🚀 開始簡化金流測試');
    console.log('=' .repeat(40));
    
    // 步驟 1: 建立訂單
    const orderResult = await testStep1_CreateOrder();
    let orderId = null;
    let paymentUrl = null;
    
    if (orderResult && orderResult.success) {
        orderId = orderResult.orderId;
        paymentUrl = orderResult.paymentUrl;
    }
    
    // 步驟 2: 測試回調
    const callbackSuccess = await testStep2_PaymentCallback(orderId);
    
    // 步驟 3: 測試支付頁面
    const pageSuccess = await testStep3_PaymentPage(paymentUrl);
    
    // 總結
    console.log('\n📊 === 簡化測試結果 ===');
    console.log(`💳 建立訂單: ${orderResult ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`📞 支付回調: ${callbackSuccess ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`🌐 支付頁面: ${pageSuccess ? '✅ 成功' : '❌ 失敗'}`);
    
    const totalSuccess = [!!orderResult, callbackSuccess, pageSuccess].filter(Boolean).length;
    console.log(`\n🎯 總計: ${totalSuccess}/3 項測試通過`);
    
    return { orderResult, callbackSuccess, pageSuccess, totalSuccess };
}

// 執行測試
if (require.main === module) {
    runSimpleTest()
        .then(() => {
            console.log('\n✨ 簡化測試完成');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 測試失敗:', error);
            process.exit(1);
        });
}

module.exports = { runSimpleTest };