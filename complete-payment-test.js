// 完整的金流測試工具 - 包含 Token 流程和真實交易
require('dotenv').config();
const axios = require('axios');
const OenTokenPayment = require('./oen-token-payment');

class CompletePaymentTest {
    constructor() {
        this.baseUrl = process.env.WEBHOOK_BASE_URL || 'https://128bc9123177.ngrok-free.app';
        this.tokenPayment = new OenTokenPayment();
        console.log('🧪 [完整金流測試] 測試工具初始化完成');
        console.log('🌐 Webhook 基礎 URL:', this.baseUrl);
    }

    // 步驟 1: 創建 Token 綁卡連結
    async createTokenCheckoutLink() {
        console.log('\n=== 步驟 1: 創建 Token 綁卡連結 ===');
        
        const testUserId = 'wangji_test_' + Date.now();
        const options = {
            userId: testUserId,
            successUrl: `${this.baseUrl}/payment/token-success`,
            failureUrl: `${this.baseUrl}/payment/token-failure`,
            customId: JSON.stringify({
                userId: testUserId,
                purpose: 'premium_subscription',
                plan: 'monthly',
                amount: 299,
                testMode: true,
                timestamp: new Date().toISOString()
            })
        };

        try {
            const result = await this.tokenPayment.createTokenCheckoutLink(options);
            
            if (result.success) {
                console.log('✅ Token 綁卡連結創建成功！');
                console.log('🔗 Checkout ID:', result.checkoutId);
                
                // 根據官方指南，構建真實的綁卡 URL
                const checkoutUrl = `https://mktersalon.test.oen.tw/checkout/subscription/create/${result.checkoutId}`;
                
                return {
                    success: true,
                    checkoutId: result.checkoutId,
                    checkoutUrl: checkoutUrl,
                    testUserId: testUserId
                };
            } else {
                throw new Error('Token 連結創建失敗');
            }
            
        } catch (error) {
            console.error('❌ 創建 Token 連結失敗:', error.message);
            return { success: false, error: error.message };
        }
    }

    // 步驟 2: 檢查 Webhook 端點
    async checkWebhookEndpoints() {
        console.log('\n=== 步驟 2: 檢查 Webhook 端點 ===');
        
        const endpoints = [
            '/payment/token-success',
            '/payment/token-failure',
            '/api/payment/token-webhook'
        ];

        const results = [];
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                    timeout: 10000
                });
                
                console.log(`✅ ${endpoint}: ${response.status} ${response.statusText}`);
                results.push({ endpoint, status: response.status, success: true });
                
            } catch (error) {
                const status = error.response?.status || 'NETWORK_ERROR';
                console.log(`❌ ${endpoint}: ${status} ${error.message}`);
                results.push({ endpoint, status, success: false, error: error.message });
            }
        }
        
        return results;
    }

    // 步驟 3: 模擬 Token Webhook 回調
    async simulateTokenWebhook(testUserId, checkoutId) {
        console.log('\n=== 步驟 3: 模擬 Token Webhook 回調 ===');
        
        const mockWebhookData = {
            success: true,
            purpose: "token",
            merchantId: "mktersalon",
            transactionId: `TEST_${Date.now()}`,
            message: null,
            customId: JSON.stringify({
                userId: testUserId,
                purpose: 'premium_subscription',
                plan: 'monthly',
                amount: 299,
                testMode: true
            }),
            token: `token_${Date.now()}_test`,
            id: checkoutId
        };

        try {
            const response = await axios.post(`${this.baseUrl}/api/payment/token-webhook`, mockWebhookData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log('✅ Token Webhook 模擬成功:', response.status);
            console.log('🎫 獲得的 Token:', mockWebhookData.token);
            
            return {
                success: true,
                token: mockWebhookData.token,
                response: response.data
            };
            
        } catch (error) {
            console.error('❌ Token Webhook 模擬失敗:', error.response?.status, error.response?.data);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 步驟 4: 使用 Token 進行真實交易
    async performRealTransaction(tokenData, testUserId) {
        console.log('\n=== 步驟 4: 使用 Token 進行真實交易 ===');
        
        const transactionData = {
            amount: 299,
            currency: 'TWD',
            userName: '小汪記記測試用戶',
            userEmail: 'test@example.com',
            description: '小汪記記 Premium 訂閱',
            unit: 'month'
        };

        try {
            const result = await this.tokenPayment.chargeWithToken(tokenData, transactionData);
            
            if (result.success) {
                console.log('✅ 真實交易成功！');
                console.log('💰 交易 ID:', result.transactionId);
                console.log('🔐 授權碼:', result.authCode);
                console.log('📋 訂單 ID:', result.orderId);
                
                return result;
            } else {
                throw new Error('交易失敗');
            }
            
        } catch (error) {
            console.error('❌ 真實交易失敗:', error.message);
            return { success: false, error: error.message };
        }
    }

    // 執行完整測試流程
    async runCompleteTest() {
        console.log('🚀 [完整金流測試] 開始執行完整的金流測試流程\\n');
        
        const testResults = {
            tokenCreation: null,
            webhookEndpoints: null,
            webhookSimulation: null,
            realTransaction: null
        };

        try {
            // 步驟 1: 創建 Token 連結
            const tokenResult = await this.createTokenCheckoutLink();
            testResults.tokenCreation = tokenResult;
            
            if (!tokenResult.success) {
                throw new Error('Token 創建失敗，無法繼續測試');
            }

            // 步驟 2: 檢查 Webhook 端點
            const webhookCheck = await this.checkWebhookEndpoints();
            testResults.webhookEndpoints = webhookCheck;

            // 步驟 3: 模擬 Token Webhook (如果我們有端點)
            if (webhookCheck.some(e => e.endpoint === '/api/payment/token-webhook' && e.success)) {
                const webhookResult = await this.simulateTokenWebhook(
                    tokenResult.testUserId, 
                    tokenResult.checkoutId
                );
                testResults.webhookSimulation = webhookResult;

                // 步驟 4: 使用 Token 進行交易 (如果 Webhook 成功)
                if (webhookResult.success) {
                    const transactionResult = await this.performRealTransaction(
                        { token: webhookResult.token }, 
                        tokenResult.testUserId
                    );
                    testResults.realTransaction = transactionResult;
                }
            }

        } catch (error) {
            console.error('❌ 測試流程失敗:', error.message);
        }

        // 生成測試報告
        this.generateTestReport(testResults);
        return testResults;
    }

    // 生成測試報告
    generateTestReport(results) {
        console.log('\\n📊 [測試報告] 完整金流測試結果\\n');
        
        // Token 創建
        console.log('1️⃣ Token 連結創建:', results.tokenCreation?.success ? '✅ 成功' : '❌ 失敗');
        if (results.tokenCreation?.success) {
            console.log('   🔗 結帳 URL:', results.tokenCreation.checkoutUrl);
            console.log('   📱 Checkout ID:', results.tokenCreation.checkoutId);
        }

        // Webhook 端點
        console.log('\\n2️⃣ Webhook 端點檢查:');
        if (results.webhookEndpoints) {
            results.webhookEndpoints.forEach(endpoint => {
                console.log(`   ${endpoint.success ? '✅' : '❌'} ${endpoint.endpoint}: ${endpoint.status}`);
            });
        }

        // Webhook 模擬
        console.log('\\n3️⃣ Webhook 模擬:', results.webhookSimulation?.success ? '✅ 成功' : '❌ 失敗');

        // 真實交易
        console.log('4️⃣ 真實交易:', results.realTransaction?.success ? '✅ 成功' : '❌ 失敗');

        // 下一步指引
        console.log('\\n🎯 [下一步指引]');
        if (results.tokenCreation?.success) {
            console.log('✅ Token 創建成功，你可以：');
            console.log('1. 👆 訪問結帳 URL 進行真實綁卡測試');
            console.log('2. 💳 使用測試信用卡進行 1 元驗證');
            console.log('3. 📞 等待 Webhook 回調包含真實 Token');
            console.log('4. 💰 使用真實 Token 進行交易');
            console.log('\\n🔗 結帳 URL:', results.tokenCreation.checkoutUrl);
        } else {
            console.log('❌ Token 創建失敗，請檢查 API 配置');
        }
    }

    // 快速測試 - 只測試 Token 創建
    async quickTest() {
        console.log('⚡ [快速測試] 只測試 Token 創建功能\\n');
        
        const result = await this.createTokenCheckoutLink();
        
        if (result.success) {
            console.log('🎉 [成功] 快速測試通過！');
            console.log('🔗 你可以使用這個 URL 進行真實綁卡測試:');
            console.log(result.checkoutUrl);
            console.log('\\n💡 [提示] 使用真實信用卡會進行 1 元驗證扣款');
        } else {
            console.log('❌ [失敗] 快速測試失敗:', result.error);
        }
        
        return result;
    }
}

// 執行測試
if (require.main === module) {
    const tester = new CompletePaymentTest();
    
    // 根據命令行參數決定測試類型
    const testType = process.argv[2] || 'quick';
    
    if (testType === 'complete') {
        tester.runCompleteTest();
    } else {
        tester.quickTest();
    }
}

module.exports = CompletePaymentTest;