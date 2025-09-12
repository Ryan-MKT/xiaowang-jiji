// 測試新的 Oen Payment 實現
const OenPaymentCorrect = require('./payment-correct');

async function testPaymentCorrect() {
    console.log('🧪 [測試] 開始測試 Oen Payment Correct 實現...\n');
    
    // 初始化支付模組
    const oenPayment = new OenPaymentCorrect();
    
    // 測試 1: 創建支付訂單
    console.log('📝 [測試 1] 創建支付訂單...');
    try {
        const testOrderData = {
            userId: 'test_user_123',
            userName: '測試用戶',
            userEmail: 'test@example.com',
            amount: 299,
            itemName: '小汪記記 Premium 訂閱',
            description: '進階功能測試'
        };
        
        const orderResult = await oenPayment.createPaymentOrder(testOrderData);
        
        console.log('✅ [測試 1] 訂單創建成功:', {
            orderId: orderResult.orderId,
            checkoutId: orderResult.checkoutId,
            paymentUrl: orderResult.paymentUrl
        });
        
        // 測試 2: 模擬 Webhook 處理
        console.log('\n📞 [測試 2] 測試 Webhook 處理...');
        const mockWebhookData = {
            orderId: orderResult.orderId,
            status: 'charged',
            amount: 299,
            transactionHid: 'test_transaction_123'
        };
        
        const webhookResult = oenPayment.processWebhook(mockWebhookData);
        console.log('✅ [測試 2] Webhook 處理成功:', webhookResult);
        
        // 測試 3: 獲取測試建議
        console.log('\n💡 [測試 3] 獲取測試建議...');
        const testGuidance = oenPayment.getTestGuidance();
        console.log('✅ [測試 3] 測試建議:', testGuidance);
        
        console.log('\n🎉 [測試完成] 所有測試通過！新的 Oen Payment 實現運作正常。');
        return true;
        
    } catch (error) {
        console.error('❌ [測試失敗]', error.message);
        return false;
    }
}

// 執行測試
if (require.main === module) {
    testPaymentCorrect()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ [測試錯誤]', error);
            process.exit(1);
        });
}

module.exports = { testPaymentCorrect };