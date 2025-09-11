// 直接測試訂閱服務整合（跳過付款簽名驗證）
require('dotenv').config();

const { subscriptionService } = require('./subscription-service');

console.log('🚀 開始直接測試訂閱服務付款整合...\n');

async function testSubscriptionIntegrationDirect() {
    try {
        // 創建模擬的付款結果（跳過 Oen Payment 簽名驗證）
        const mockPaymentResult = {
            success: true,
            orderId: 'TEST_ORDER_' + Date.now(),
            userId: 'test_user_direct_' + Date.now(),
            amount: 99,
            transactionId: 'TXN_' + Date.now(),
            paymentMethod: 'test',
            description: '高級會員訂閱 - 1個月'
        };

        console.log('💳 模擬付款成功結果:', {
            success: mockPaymentResult.success,
            orderId: mockPaymentResult.orderId,
            userId: mockPaymentResult.userId,
            amount: mockPaymentResult.amount
        });

        // 步驟 1: 檢查用戶付款前的訂閱狀態
        console.log('\n🔧 步驟 1: 檢查付款前的訂閱狀態...');
        const beforeSubscription = await subscriptionService.getUserSubscription(mockPaymentResult.userId);
        console.log('📋 付款前訂閱狀態:', {
            userId: beforeSubscription.user_id,
            type: beforeSubscription.subscription_type,
            status: beforeSubscription.status,
            expiresAt: beforeSubscription.expires_at
        });

        // 步驟 2: 處理付款成功，自動更新訂閱
        console.log('\n🔧 步驟 2: 處理付款成功，自動更新訂閱...');
        const subscriptionResult = await subscriptionService.processSuccessfulPayment(mockPaymentResult);
        
        console.log('✅ 訂閱自動更新成功!', {
            userId: subscriptionResult.userId,
            type: subscriptionResult.subscription_type,
            status: subscriptionResult.status,
            expiresAt: subscriptionResult.expires_at,
            paymentOrderId: subscriptionResult.paymentOrderId
        });

        // 步驟 3: 驗證訂閱狀態變化
        console.log('\n🔧 步驟 3: 驗證訂閱狀態變化...');
        const afterSubscription = await subscriptionService.getUserSubscription(mockPaymentResult.userId);
        
        console.log('📊 付款後訂閱狀態:', {
            userId: afterSubscription.user_id,
            type: afterSubscription.subscription_type,
            status: afterSubscription.status,
            expiresAt: afterSubscription.expires_at
        });

        // 步驟 4: 分析變化結果
        console.log('\n🔧 步驟 4: 分析訂閱狀態變化...');
        
        const hasUpgraded = beforeSubscription.subscription_type !== afterSubscription.subscription_type;
        const hasExpiration = !!afterSubscription.expires_at && afterSubscription.expires_at !== beforeSubscription.expires_at;
        const statusActive = afterSubscription.status === 'active';
        
        console.log('📈 訂閱狀態變化分析:');
        console.log(`   類型變化: ${beforeSubscription.subscription_type} → ${afterSubscription.subscription_type}`);
        console.log(`   狀態: ${beforeSubscription.status} → ${afterSubscription.status}`);
        console.log(`   到期時間: ${beforeSubscription.expires_at || '無'} → ${afterSubscription.expires_at || '無'}`);
        console.log(`   已成功升級: ${hasUpgraded ? '✅' : '❌'}`);
        console.log(`   有有效到期時間: ${hasExpiration ? '✅' : '❌'}`);
        console.log(`   狀態為活躍: ${statusActive ? '✅' : '❌'}`);
        
        // 步驟 5: 測試支付訂單記錄
        console.log('\n🔧 步驟 5: 檢查支付訂單記錄...');
        
        if (subscriptionResult.paymentOrderId) {
            console.log('✅ 支付訂單已記錄，ID:', subscriptionResult.paymentOrderId);
        } else {
            console.log('❌ 支付訂單記錄失敗');
        }

        // 最終結果
        console.log('\n📊 測試結果總結:');
        
        if (hasUpgraded && hasExpiration && statusActive && subscriptionResult.paymentOrderId) {
            console.log('🎉 付款成功後自動更新用戶訂閱功能完全正常！');
            console.log('✨ 系統能夠：');
            console.log('   - 自動將免費用戶升級為高級會員');
            console.log('   - 正確設置訂閱到期時間');
            console.log('   - 記錄支付訂單詳情');
            console.log('   - 維持訂閱活躍狀態');
        } else {
            console.log('⚠️  部分功能正常，但需要檢查以下問題：');
            if (!hasUpgraded) console.log('   ❌ 用戶訂閱類型未升級');
            if (!hasExpiration) console.log('   ❌ 訂閱未設置正確的到期時間');
            if (!statusActive) console.log('   ❌ 訂閱狀態未設為活躍');
            if (!subscriptionResult.paymentOrderId) console.log('   ❌ 支付訂單未正確記錄');
        }

        console.log('\n🔧 接下來可以測試:');
        console.log('   1. 在實際的 server.js 付款回調中使用此功能');
        console.log('   2. 測試不同金額對應的訂閱期間');
        console.log('   3. 在帳戶頁面顯示用戶的訂閱狀態');

    } catch (error) {
        console.error('💥 測試過程發生錯誤:', error.message);
        console.error('📋 錯誤詳情:', error);
    }
}

// 執行測試
testSubscriptionIntegrationDirect();