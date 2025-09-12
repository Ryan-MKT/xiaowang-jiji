// 建立真實的 Token 綁卡連結
const OenTokenPayment = require('./oen-token-payment');

async function createRealTokenCheckout() {
    console.log('🚀 [真實測試] 建立 Token 綁卡連結...\n');
    
    try {
        const tokenPayment = new OenTokenPayment();
        
        // 建立真實的 Token 綁卡連結
        const result = await tokenPayment.createTokenCheckoutLink({
            userId: 'wangji_real_test_' + Date.now(),
            successUrl: 'https://a4cc9d907f15.ngrok-free.app/payment/token-success',
            failureUrl: 'https://a4cc9d907f15.ngrok-free.app/payment/token-failure',
            customId: JSON.stringify({
                userId: 'wangji_real_test_' + Date.now(),
                purpose: 'premium_subscription',
                plan: 'monthly',
                amount: 299,
                timestamp: new Date().toISOString()
            })
        });
        
        if (result.success) {
            console.log('🎉 [成功] Token 綁卡連結建立成功！\n');
            
            console.log('📋 [重要資訊]');
            console.log('🔗 綁卡 URL:', result.checkoutUrl);
            console.log('📱 結帳 ID:', result.checkoutId);
            console.log('');
            
            console.log('📝 [使用步驟]');
            console.log('1. 👆 點擊上方 URL 或複製到瀏覽器');
            console.log('2. 💳 輸入真實信用卡資訊 (會扣 1 元驗證)');
            console.log('3. ✅ 完成後會收到 Webhook 通知');
            console.log('4. 🎫 Webhook 會包含 payment token');
            console.log('5. 💰 使用 token 進行真實交易');
            console.log('');
            
            console.log('⚠️  [注意事項]');
            console.log('- 這是真實的測試環境，會進行 1 元驗證扣款');
            console.log('- 請使用真實但可以接受小額扣款的信用卡');
            console.log('- Webhook 會發送到你的 ngrok URL');
            console.log('- 根據官方資訊，失敗會重試 3 次 (2秒, 4秒, 6秒)');
            console.log('');
            
            console.log('📞 [預期的 Webhook 格式]');
            console.log(JSON.stringify({
                success: true,
                purpose: "token",
                merchantId: "mktersalon",
                transactionId: "實際交易ID",
                message: null,
                customId: "你的自訂資料",
                token: "實際的payment_token",
                id: "綁卡記錄ID"
            }, null, 2));
            
            return result;
            
        } else {
            throw new Error('Token 連結建立失敗');
        }
        
    } catch (error) {
        console.error('❌ [失敗] 建立 Token 連結失敗:', error.message);
        if (error.response) {
            console.error('📥 錯誤詳情:', error.response.data);
        }
        return null;
    }
}

// 執行真實測試
if (require.main === module) {
    createRealTokenCheckout()
        .then(result => {
            if (result) {
                console.log('\n🎯 [下一步] 等待用戶完成綁卡，然後檢查 Webhook 回調');
            }
        })
        .catch(error => {
            console.error('❌ [錯誤] 執行失敗:', error);
        });
}

module.exports = { createRealTokenCheckout };