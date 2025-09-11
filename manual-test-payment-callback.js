// 手動測試付款回調完整流程
require('dotenv').config();

const { supabase } = require('./supabase-client');
const { subscriptionService } = require('./subscription-service');

console.log('🎯 開始手動測試付款回調完整流程...\n');

async function manualTestPaymentCallback() {
    try {
        // 1. 準備測試用戶和訂單資料
        const testUserId = 'manual_test_user_' + Date.now();
        const testOrderId = 'MANUAL_ORDER_' + Date.now();
        const testAmount = 199; // 高級會員價格

        console.log('📋 測試參數:', {
            userId: testUserId,
            orderId: testOrderId,
            amount: testAmount
        });

        // 2. 檢查測試前的資料庫狀態
        console.log('\n🔍 步驟 1: 檢查測試前的資料庫狀態');
        
        // 檢查用戶是否已有訂閱
        console.log('📊 檢查用戶訂閱狀態...');
        const beforeSubscription = await subscriptionService.getUserSubscription(testUserId);
        console.log('初始訂閱狀態:', {
            userId: beforeSubscription.user_id,
            type: beforeSubscription.subscription_type,
            status: beforeSubscription.status,
            expiresAt: beforeSubscription.expires_at
        });

        // 檢查支付訂單表
        console.log('💳 檢查支付訂單表...');
        const { data: beforeOrders, error: beforeOrdersError } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('user_id', testUserId);
        
        if (beforeOrdersError) {
            console.log('支付訂單查詢錯誤:', beforeOrdersError.message);
        } else {
            console.log(`初始支付訂單數量: ${beforeOrders.length}`);
        }

        // 3. 模擬付款成功回調
        console.log('\n🎉 步驟 2: 模擬付款成功，觸發訂閱升級');
        
        const mockPaymentResult = {
            success: true,
            orderId: testOrderId,
            userId: testUserId,
            amount: testAmount,
            transactionId: 'TXN_MANUAL_' + Date.now(),
            paymentMethod: 'manual_test',
            description: '高級會員訂閱 - 2個月 (手動測試)'
        };

        console.log('付款結果數據:', mockPaymentResult);

        // 執行付款處理
        const subscriptionResult = await subscriptionService.processSuccessfulPayment(mockPaymentResult);
        
        console.log('✅ 付款處理完成!', {
            userId: subscriptionResult.userId,
            subscriptionType: subscriptionResult.subscription_type,
            status: subscriptionResult.status,
            expiresAt: subscriptionResult.expires_at,
            paymentOrderId: subscriptionResult.paymentOrderId
        });

        // 4. 驗證資料庫更新
        console.log('\n🔎 步驟 3: 驗證資料庫更新結果');

        // 檢查訂閱表更新
        console.log('📊 檢查訂閱表更新...');
        const afterSubscription = await subscriptionService.getUserSubscription(testUserId);
        console.log('更新後訂閱狀態:', {
            userId: afterSubscription.user_id,
            type: afterSubscription.subscription_type,
            status: afterSubscription.status,
            expiresAt: afterSubscription.expires_at
        });

        // 檢查支付訂單表新增
        console.log('💳 檢查支付訂單表更新...');
        const { data: afterOrders, error: afterOrdersError } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('user_id', testUserId)
            .order('created_at', { ascending: false });
        
        if (afterOrdersError) {
            console.log('支付訂單查詢錯誤:', afterOrdersError.message);
        } else {
            console.log(`更新後支付訂單數量: ${afterOrders.length}`);
            if (afterOrders.length > 0) {
                const latestOrder = afterOrders[0];
                console.log('最新支付訂單詳情:', {
                    id: latestOrder.id,
                    orderId: latestOrder.order_id,
                    userId: latestOrder.user_id,
                    amount: latestOrder.amount,
                    status: latestOrder.status,
                    transactionId: latestOrder.transaction_id,
                    paidAt: latestOrder.paid_at
                });
            }
        }

        // 5. 直接查詢資料庫驗證
        console.log('\n🗄️  步驟 4: 直接查詢資料庫驗證');
        
        // 查詢 subscriptions 表
        const { data: dbSubscription, error: dbSubError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', testUserId)
            .single();
        
        if (dbSubError) {
            console.log('❌ 直接查詢訂閱表失敗:', dbSubError.message);
        } else {
            console.log('✅ 資料庫訂閱記錄:', {
                id: dbSubscription.id,
                userId: dbSubscription.user_id,
                subscriptionType: dbSubscription.subscription_type,
                status: dbSubscription.status,
                startedAt: dbSubscription.started_at,
                expiresAt: dbSubscription.expires_at,
                updatedAt: dbSubscription.updated_at
            });
        }

        // 查詢 payment_orders 表
        const { data: dbPaymentOrder, error: dbPayError } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('order_id', testOrderId)
            .single();
        
        if (dbPayError) {
            console.log('❌ 直接查詢支付訂單表失敗:', dbPayError.message);
        } else {
            console.log('✅ 資料庫支付訂單記錄:', {
                id: dbPaymentOrder.id,
                orderId: dbPaymentOrder.order_id,
                userId: dbPaymentOrder.user_id,
                amount: dbPaymentOrder.amount,
                currency: dbPaymentOrder.currency,
                status: dbPaymentOrder.status,
                paymentMethod: dbPaymentOrder.payment_method,
                transactionId: dbPaymentOrder.transaction_id,
                paidAt: dbPaymentOrder.paid_at,
                createdAt: dbPaymentOrder.created_at
            });
        }

        // 6. 總結驗證結果
        console.log('\n📊 步驟 5: 測試結果總結');
        
        const subscriptionUpgraded = beforeSubscription.subscription_type !== afterSubscription.subscription_type;
        const hasExpiryDate = !!afterSubscription.expires_at;
        const paymentRecorded = afterOrders && afterOrders.length > 0;
        const paymentStatusPaid = dbPaymentOrder && dbPaymentOrder.status === 'paid';
        
        console.log('🎯 驗證清單:');
        console.log(`   ✅ 用戶訂閱已升級: ${subscriptionUpgraded ? '是' : '否'} (${beforeSubscription.subscription_type} → ${afterSubscription.subscription_type})`);
        console.log(`   ✅ 設置到期時間: ${hasExpiryDate ? '是' : '否'} (${afterSubscription.expires_at || '無'})`);
        console.log(`   ✅ 記錄支付訂單: ${paymentRecorded ? '是' : '否'} (數量: ${afterOrders?.length || 0})`);
        console.log(`   ✅ 支付狀態為已付: ${paymentStatusPaid ? '是' : '否'} (${dbPaymentOrder?.status || '無記錄'})`);
        
        if (subscriptionUpgraded && hasExpiryDate && paymentRecorded && paymentStatusPaid) {
            console.log('\n🎉 手動測試完全成功！');
            console.log('✨ 付款回調系統運作正常，所有資料庫更新都正確執行');
        } else {
            console.log('\n⚠️  測試發現問題，請檢查：');
            if (!subscriptionUpgraded) console.log('   - 用戶訂閱未正確升級');
            if (!hasExpiryDate) console.log('   - 訂閱未設置到期時間');
            if (!paymentRecorded) console.log('   - 支付訂單未正確記錄');
            if (!paymentStatusPaid) console.log('   - 支付狀態未更新為已付');
        }

        console.log('\n📋 測試用戶資料 (可用於進一步驗證):');
        console.log(`   用戶ID: ${testUserId}`);
        console.log(`   訂單ID: ${testOrderId}`);
        console.log(`   資料庫訂閱ID: ${dbSubscription?.id}`);
        console.log(`   資料庫支付訂單ID: ${dbPaymentOrder?.id}`);

    } catch (error) {
        console.error('💥 手動測試過程發生錯誤:', error.message);
        console.error('📋 錯誤詳情:', error);
    }
}

// 執行手動測試
manualTestPaymentCallback();