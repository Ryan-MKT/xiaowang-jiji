// 測試正確的 Token 流程
const OenTokenPayment = require('./oen-token-payment');

async function testTokenFlow() {
    console.log('🧪 [測試] 開始測試 Oen Token 獲取流程...\n');
    
    // 初始化支付系統
    const tokenPayment = new OenTokenPayment();
    
    try {
        // 步驟 1: 創建 Token 獲取連結
        console.log('=== 步驟 1: 創建 Token 獲取連結 ===');
        
        const checkoutOptions = {
            userId: 'wangji_test_user_123',
            successUrl: 'https://ae4bee7dc026.ngrok-free.app/payment/token-success',
            failureUrl: 'https://ae4bee7dc026.ngrok-free.app/payment/token-failure',
            customId: JSON.stringify({
                userId: 'wangji_test_user_123',
                purpose: 'premium_subscription',
                plan: 'monthly',
                amount: 299
            })
        };
        
        const checkoutResult = await tokenPayment.createTokenCheckoutLink(checkoutOptions);
        
        if (checkoutResult.success) {
            console.log('✅ Token 獲取連結創建成功！');
            console.log('🔗 用戶需要訪問此 URL 來綁定信用卡:');
            console.log(checkoutResult.checkoutUrl);
            console.log('');
            console.log('📋 接下來的流程:');
            console.log('1. 用戶點擊上述連結');
            console.log('2. 在應援頁面輸入信用卡資訊');
            console.log('3. 完成後會收到 Webhook 通知包含 token');
            console.log('4. 使用該 token 進行實際扣款');
            
            // 顯示測試指引
            console.log('\n=== 測試指引 ===');
            const guidance = tokenPayment.getTestGuidance();
            console.log('流程步驟:', guidance.flow);
            console.log('需要準備的 Webhook 端點:', guidance.urls.webhookEndpoints);
            
            return {
                success: true,
                checkoutUrl: checkoutResult.checkoutUrl,
                checkoutId: checkoutResult.checkoutId
            };
            
        } else {
            throw new Error('創建 Token 連結失敗');
        }
        
    } catch (error) {
        console.error('❌ [測試] Token 流程測試失敗:', error.message);
        
        // 分析錯誤類型
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            console.log('\n🔍 [錯誤分析]');
            console.log('HTTP Status:', status);
            console.log('錯誤回應:', data);
            
            if (status === 404) {
                console.log('💡 可能原因: API endpoint 不正確');
            } else if (status === 401) {
                console.log('💡 可能原因: Token 權限不足或已過期');
            } else if (status === 400) {
                console.log('💡 可能原因: 請求參數格式錯誤');
            } else if (status === 403) {
                console.log('💡 可能原因: 伺服器存在但拒絕存取');
            }
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

// 模擬 Webhook 處理測試
function testWebhookProcessing() {
    console.log('\n=== 模擬 Webhook 處理測試 ===');
    
    const tokenPayment = new OenTokenPayment();
    
    // 模擬官方指南中的 Webhook 格式
    const mockWebhookData = {
        success: true,
        purpose: "token",
        merchantId: "mktersalon",
        transactionId: "123abc456def789ghi",
        message: null,
        customId: JSON.stringify({
            userId: "wangji_test_user_123", 
            purpose: "premium_subscription", 
            plan: "monthly",
            amount: 299
        }),
        token: "xyz123456789token",
        id: "123abc456def789ghi"
    };
    
    try {
        const webhookResult = tokenPayment.processTokenWebhook(mockWebhookData);
        console.log('✅ Webhook 處理成功:', webhookResult);
        console.log('🎫 獲得的 Token:', webhookResult.token);
        
        return webhookResult;
        
    } catch (error) {
        console.error('❌ Webhook 處理失敗:', error.message);
        return null;
    }
}

// 執行完整測試
async function runCompleteTest() {
    console.log('🚀 [完整測試] 開始執行 Oen Token 支付流程測試\n');
    
    // 測試 Token 獲取連結創建
    const tokenResult = await testTokenFlow();
    
    // 測試 Webhook 處理
    const webhookResult = testWebhookProcessing();
    
    console.log('\n📊 [測試總結]');
    console.log('Token 連結創建:', tokenResult.success ? '✅ 成功' : '❌ 失敗');
    console.log('Webhook 處理:', webhookResult ? '✅ 成功' : '❌ 失敗');
    
    if (tokenResult.success) {
        console.log('\n🎉 [下一步] 真實測試指引:');
        console.log('1. 訪問生成的 checkout URL');
        console.log('2. 輸入真實信用卡資訊 (會扣 1 元驗證)');
        console.log('3. 完成後檢查 Webhook 回調');
        console.log('4. 使用獲得的 token 進行實際交易');
    }
}

// 執行測試
if (require.main === module) {
    runCompleteTest();
}

module.exports = { testTokenFlow, testWebhookProcessing };