// Oen Payment Token 獲取與支付流程 - 基於官方指南
require('dotenv').config();
const axios = require('axios');

class OenTokenPayment {
    constructor() {
        const isProduction = process.env.NODE_ENV === 'production';
        
        this.config = {
            // 正確的 API 端點
            apiUrl: isProduction ? 
                'https://payment-api.oen.tw' : 
                'https://payment-api.testing.oen.tw',
            
            // 商戶配置
            merchantId: isProduction ? 
                process.env.OEN_PAYMENT_MERCHANT_ID : 
                process.env.OEN_PAYMENT_TEST_MERCHANT_ID || 'mktersalon',
            
            // Bearer Token 認證
            authToken: isProduction ?
                process.env.OEN_PAYMENT_AUTH_TOKEN :
                process.env.OEN_PAYMENT_TEST_AUTH_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjVhZDEzYTJlLTEwZTctNDlkZC1hYThhLTg2OTY2NmQwOTFlMyJ9.eyJkb21haW4iOiJta3RlcnNhbG9uIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Lm9lbi50dyIsImF1ZCI6Imh0dHBzOi8vcGF5bWVudC1hcGkuZGV2ZWxvcG1lbnQub2VuLnR3IiwianRpIjoiMzJhN3c5UHZTVlpPWFdmS1RnV08zdnE0THZPIiwiaWF0IjoxNzU3NjQ3MDY1fQ.rCM-KdXuXWMSmykKUXS17dLYCNnI8yvIoSarhWVjy69F_mvJIsKHP3SlVfqpVmR_TQdCNYeGu8PFEP-wBWbsK9dJ9Kuo94lihcrgikvzDGtGmZ4OJiejblAr4mtAJtexyGyrqek4h-XF1P8ubtOwY60QdriPFKVJ0TvsviB3yUAglMHxOOIFRVCUxHLe9-xAyDbt-Aa2Gvzi4EoqFmcQosiOJBgMs032qvPz6i9IHOY3Ysi-gqojo9U6aizxAn_zuwZToEzvvW2uqATuZie25_I2IphOUcjiPLiDTgOzH23w3Hj-V8JAoA-G6bJCXiu9KlQPe0j0jiYG8Bsbt7PA1w',
            
            // 跳轉 URL 基本格式
            checkoutBaseUrl: isProduction ?
                `https://mktersalon.oen.tw` :
                `https://mktersalon.test.oen.tw`
        };
        
        console.log('💳 [Oen Token Payment] 初始化完成', {
            environment: isProduction ? 'production' : 'testing',
            apiUrl: this.config.apiUrl,
            merchantId: this.config.merchantId,
            checkoutBaseUrl: this.config.checkoutBaseUrl
        });
    }
    
    // 步驟 1: 創建 Token 獲取連結
    async createTokenCheckoutLink(options = {}) {
        try {
            console.log('🔗 [Oen Token Payment] 創建 Token 獲取連結...');
            
            const requestData = {
                merchantId: this.config.merchantId,
                successUrl: options.successUrl || `https://3447337587ec.ngrok-free.app/payment/token-success`,
                failureUrl: options.failureUrl || `https://3447337587ec.ngrok-free.app/payment/token-failure`,
                webhookUrl: options.webhookUrl || `https://3447337587ec.ngrok-free.app/api/payment/token-webhook`,
                customId: options.customId || JSON.stringify({
                    userId: options.userId || 'test_user',
                    purpose: 'subscription',
                    plan: 'premium'
                })
            };
            
            console.log('📤 [Oen Token Payment] 請求資料:', requestData);
            
            const response = await axios.post(`${this.config.apiUrl}/checkout-token`, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.authToken}`
                },
                timeout: 30000
            });
            
            if (response.data.code !== 'S0000') {
                throw new Error(`API 錯誤: ${response.data.code} - ${response.data.message}`);
            }
            
            const checkoutId = response.data.data.id;
            
            console.log('✅ [Oen Token Payment] Token 獲取連結創建成功');
            console.log('🔗 結帳 ID:', checkoutId);
            
            // 根據官方文檔構建 Token 綁卡 URL
            const checkoutUrl = `${this.config.checkoutBaseUrl}/checkout/subscription/create/${checkoutId}`;
            console.log('🌐 Token 綁卡 URL:', checkoutUrl);
            
            return {
                success: true,
                checkoutId: checkoutId,
                checkoutUrl: checkoutUrl,
                note: 'Token checkout created successfully. Users can visit the checkoutUrl to bind their card.',
                response: response.data
            };
            
        } catch (error) {
            console.error('❌ [Oen Token Payment] 創建 Token 連結失敗:', error.message);
            if (error.response) {
                console.error('📥 錯誤回應:', error.response.data);
            }
            throw error;
        }
    }
    
    // 步驟 2: 處理 Token Webhook
    processTokenWebhook(webhookData) {
        try {
            console.log('📞 [Oen Token Payment] 處理 Token Webhook:', webhookData);
            
            // 根據官方指南的 Webhook 格式
            const result = {
                success: webhookData.success,
                purpose: webhookData.purpose, // 應該是 "token"
                merchantId: webhookData.merchantId,
                transactionId: webhookData.transactionId,
                customId: webhookData.customId,
                token: webhookData.token, // 重要：這就是我們需要的 payment token
                id: webhookData.id,
                message: webhookData.message
            };
            
            console.log('✅ [Oen Token Payment] Webhook 處理完成:', {
                success: result.success,
                hasToken: !!result.token,
                purpose: result.purpose
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ [Oen Token Payment] Webhook 處理失敗:', error);
            throw error;
        }
    }
    
    // 步驟 3: 使用 Token 進行實際交易
    async chargeWithToken(tokenData, transactionData) {
        try {
            console.log('💰 [Oen Token Payment] 使用 Token 進行交易...');
            console.log('🎫 Token:', tokenData.token);
            console.log('💵 交易資料:', transactionData);
            
            const chargeRequest = {
                merchantId: this.config.merchantId,
                amount: transactionData.amount,
                currency: transactionData.currency || 'TWD',
                token: tokenData.token,
                orderId: transactionData.orderId || `WANGJI_${Date.now()}`,
                userName: transactionData.userName || '小汪記記用戶',
                userEmail: transactionData.userEmail || '',
                productDetails: [{
                    productionCode: 'WANGJI_PREMIUM',
                    description: transactionData.description || '小汪記記 Premium 訂閱',
                    quantity: 1,
                    unit: transactionData.unit || 'month',
                    unitPrice: transactionData.amount
                }]
            };
            
            console.log('📤 [Oen Token Payment] 交易請求:', chargeRequest);
            
            const response = await axios.post(`${this.config.apiUrl}/token/transactions`, chargeRequest, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.authToken}`
                },
                timeout: 30000
            });
            
            if (response.data.code !== 'S0000') {
                throw new Error(`交易失敗: ${response.data.code} - ${response.data.message}`);
            }
            
            console.log('✅ [Oen Token Payment] 交易成功完成');
            console.log('📋 交易 ID:', response.data.data.id);
            
            return {
                success: true,
                transactionId: response.data.data.id,
                authCode: response.data.data.authCode,
                orderId: chargeRequest.orderId,
                response: response.data
            };
            
        } catch (error) {
            console.error('❌ [Oen Token Payment] Token 交易失敗:', error.message);
            if (error.response) {
                console.error('📥 錯誤回應:', error.response.data);
            }
            throw error;
        }
    }
    
    // 獲取測試指引
    getTestGuidance() {
        return {
            flow: [
                '1. 創建 Token 獲取連結',
                '2. 用戶在應援頁面綁定信用卡',
                '3. 接收 Token Webhook',
                '4. 儲存 Token 到資料庫',
                '5. 使用 Token 進行實際交易'
            ],
            urls: {
                tokenCheckout: `${this.config.checkoutBaseUrl}/checkout/subscription/create/{id}`,
                webhookEndpoints: [
                    '/payment/token-success (GET redirect)',
                    '/payment/token-failure (GET redirect)', 
                    '/api/payment/token-webhook (POST callback)'
                ]
            },
            testCards: {
                success: '實際信用卡號碼 (會扣款 1 元驗證)',
                note: '測試環境仍會進行真實驗證，請使用測試卡或小額測試'
            }
        };
    }
}

module.exports = OenTokenPayment;