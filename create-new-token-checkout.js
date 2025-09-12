// 使用正確的 ngrok URL 創建新的 Token 綁卡連結
const OenTokenPayment = require('./oen-token-payment');

async function createNewTokenCheckout() {
    console.log('🚀 [修正 URL] 創建新的 Token 綁卡連結...\n');
    
    // 使用正確的 ngrok URL
    const correctNgrokUrl = 'https://981a9bbcc42e.ngrok-free.app';
    
    console.log('🔧 [修正] 發現問題：之前使用了錯誤的 ngrok URL');
    console.log('❌ 錯誤的 URL: https://a4cc9d907f15.ngrok-free.app');
    console.log('✅ 正確的 URL:', correctNgrokUrl);
    console.log('');
    
    try {
        const tokenPayment = new OenTokenPayment();
        
        // 創建新的 Token 綁卡連結，使用正確的 URL
        const result = await tokenPayment.createTokenCheckoutLink({
            userId: 'wangji_fixed_test_' + Date.now(),
            successUrl: `${correctNgrokUrl}/payment/token-success`,
            failureUrl: `${correctNgrokUrl}/payment/token-failure`,
            webhookUrl: `${correctNgrokUrl}/api/payment/token-webhook`,
            customId: JSON.stringify({
                userId: 'wangji_fixed_test_' + Date.now(),
                purpose: 'premium_subscription',
                plan: 'monthly',
                amount: 299,
                timestamp: new Date().toISOString(),
                note: 'Fixed ngrok URL test'
            })
        });
        
        if (result.success) {
            console.log('🎉 [成功] 新的 Token 綁卡連結建立成功！\n');
            
            console.log('📋 [重要資訊]');
            console.log('🔗 綁卡 URL:', result.checkoutUrl);
            console.log('📱 結帳 ID:', result.checkoutId);
            console.log('🌐 正確的 Webhook URL:', `${correctNgrokUrl}/api/payment/token-webhook`);
            console.log('');
            
            console.log('📝 [測試步驟]');
            console.log('1. 👆 點擊上方綁卡 URL');
            console.log('2. 💳 輸入測試信用卡資訊');
            console.log('3. 🎯 現在應該會收到真實的 Webhook 回調！');
            console.log('4. 📞 檢查伺服器日誌確認收到回調');
            console.log('');
            
            console.log('⚡ [改善說明]');
            console.log('- 使用正確的 ngrok URL');
            console.log('- Webhook URL 現在指向正確的伺服器');
            console.log('- Oen Payment 可以成功發送回調');
            
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

// 執行修正測試
if (require.main === module) {
    createNewTokenCheckout()
        .then(result => {
            if (result) {
                console.log('\n🎯 [下一步] 請使用新的綁卡連結進行測試');
                console.log('🔍 [監控] 注意觀察伺服器日誌，應該會收到真實的 Webhook 回調');
            }
        })
        .catch(error => {
            console.error('❌ [錯誤] 執行失敗:', error);
        });
}

module.exports = { createNewTokenCheckout };