// Oen Payment API 整合模組 - 完全按照官方文件實現
// 基於官方完整 API 文件：https://documenter.getpostman.com/view/26859697/2s9YsQ7VJA

const crypto = require('crypto');
const axios = require('axios');

class OenPaymentCorrect {
    constructor() {
        const isProduction = process.env.NODE_ENV === 'production';
        
        this.config = {
            // 官方正確的 API 端點
            apiUrl: isProduction ? 
                'https://payment-api.oen.tw' : 
                'https://payment-api.development.oen.tw',
            
            // 商戶配置 - 按照官方規範
            merchantId: isProduction ? 
                process.env.OEN_PAYMENT_MERCHANT_ID : 
                process.env.OEN_PAYMENT_TEST_MERCHANT_ID || 'mktersalon', // 從 JWT token 取得
            
            // Bearer Token 認證
            authToken: isProduction ?
                process.env.OEN_PAYMENT_AUTH_TOKEN :
                process.env.OEN_PAYMENT_TEST_AUTH_TOKEN || 'yourToken', // 官方測試用
            
            // 回調 URL 配置
            successUrl: isProduction ?
                `${process.env.WEBHOOK_BASE_URL}/payment/success` :
                'https://a4cc9d907f15.ngrok-free.app/payment/success',
                
            failureUrl: isProduction ?
                `${process.env.WEBHOOK_BASE_URL}/payment/cancel` :
                'https://a4cc9d907f15.ngrok-free.app/payment/cancel',
            
            // 官方測試卡號
            testCards: {
                success: '4242424242424242',
                success3D: '4000000000002503',    // 觸發 3D 驗證
                success3D2: '5200000000002151',   // 觸發 3D 驗證
                fail: '4012888818888333'          // 觸發失敗情境
            }
        };
        
        console.log('💳 [Oen Payment Correct] 支付模組初始化完成', {
            environment: isProduction ? 'production' : 'testing',
            apiUrl: this.config.apiUrl,
            merchantId: this.config.merchantId
        });
    }
    
    // 創建單次支付訂單 - 按照官方 API 規範
    async createPaymentOrder(orderData) {
        try {
            console.log('📝 [Oen Payment Correct] 建立支付訂單:', orderData);
            
            // 官方規範：測試成功金額 > 100，失敗金額 < 100
            if (!orderData.amount || orderData.amount < 1) {
                throw new Error('訂單金額必須大於 0');
            }
            
            // 準備官方 API 請求 - 完全按照文件格式
            const paymentRequest = {
                merchantId: this.config.merchantId,
                amount: orderData.amount,
                currency: 'TWD',
                orderId: orderData.orderId || this.generateOrderId(),
                successUrl: this.config.successUrl,
                failureUrl: this.config.failureUrl,
                use3d: false, // 預設不開 3D 驗證
                customId: orderData.userId, // 用戶 ID 作為自訂資料
                userId: orderData.userId,
                userName: orderData.userName || '小汪記記用戶',
                userEmail: orderData.userEmail || '',
                note: orderData.description || '小汪記記 Premium 訂閱'
            };
            
            // 如果需要開發票，加入商品詳細資料
            if (orderData.needInvoice) {
                paymentRequest.productDetails = [{
                    productionCode: 'WANGJI_PREMIUM',
                    description: orderData.itemName || '小汪記記 Premium 訂閱',
                    quantity: 1,
                    unit: '月',
                    unitPrice: orderData.amount
                }];
            }
            
            // 調用官方 API
            const response = await this.callOfficialCreateAPI(paymentRequest);
            
            console.log('✅ [Oen Payment Correct] 支付訂單建立成功:', {
                orderId: paymentRequest.orderId,
                transactionHid: response.data.transactionHid,
                checkoutId: response.data.id
            });
            
            return {
                success: true,
                orderId: paymentRequest.orderId,
                checkoutId: response.data.id,
                transactionHid: response.data.transactionHid,
                // 官方要求：轉址到這個 URL
                paymentUrl: `https://${this.config.merchantId}.${process.env.NODE_ENV === 'production' ? 'oen.tw' : 'testing.oen.tw'}/checkout/onetime/${response.data.id}`,
                response: response.data
            };
            
        } catch (error) {
            console.error('❌ [Oen Payment Correct] 建立支付訂單失敗:', error);
            throw error;
        }
    }
    
    // 調用官方創建支付 API
    async callOfficialCreateAPI(paymentRequest) {
        try {
            console.log('🌐 [Oen Payment Correct] 調用官方 API:', this.config.apiUrl);
            
            const response = await axios.post(`${this.config.apiUrl}/checkout-onetime`, paymentRequest, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.authToken}`
                },
                timeout: 30000
            });
            
            // 檢查官方回應格式
            if (response.data.code !== 'S0000') {
                throw new Error(`API 錯誤: ${response.data.code} - ${response.data.message}`);
            }
            
            console.log('✅ [Oen Payment Correct] 官方 API 回應成功');
            return response.data;
            
        } catch (error) {
            console.error('❌ [Oen Payment Correct] 官方 API 調用失敗:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw new Error(`Oen Payment API 調用失敗: ${error.response?.data?.message || error.message}`);
        }
    }
    
    // 查詢交易狀態 - 按照官方 API
    async queryTransaction(orderId) {
        try {
            console.log(`🔍 [Oen Payment Correct] 查詢交易狀態: ${orderId}`);
            
            const response = await axios.get(`${this.config.apiUrl}/order/${orderId}/transactions`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.authToken}`
                },
                timeout: 30000
            });
            
            if (response.data.code !== 'S0000') {
                throw new Error(`查詢錯誤: ${response.data.code} - ${response.data.message}`);
            }
            
            const transactions = response.data.data.transactions;
            console.log('✅ [Oen Payment Correct] 交易查詢成功:', transactions.length, '筆交易');
            
            return {
                success: true,
                transactions: transactions,
                code: response.data.code
            };
            
        } catch (error) {
            console.error('❌ [Oen Payment Correct] 查詢交易失敗:', error.message);
            throw error;
        }
    }
    
    // 取消定期定額 - 按照官方 API
    async cancelSubscription(subscriptionId, reason = '用戶取消訂閱') {
        try {
            console.log(`🚫 [Oen Payment Correct] 取消定期定額: ${subscriptionId}`);
            
            const cancelRequest = {
                merchantId: this.config.merchantId,
                reason: reason
            };
            
            const response = await axios.put(`${this.config.apiUrl}/subscriptions/${subscriptionId}`, cancelRequest, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.authToken}`
                },
                timeout: 30000
            });
            
            if (response.data.code !== 'S0000') {
                throw new Error(`取消訂閱錯誤: ${response.data.code} - ${response.data.message}`);
            }
            
            console.log('✅ [Oen Payment Correct] 定期定額取消成功');
            return {
                success: true,
                data: response.data.data,
                code: response.data.code
            };
            
        } catch (error) {
            console.error('❌ [Oen Payment Correct] 取消定期定額失敗:', error.message);
            throw error;
        }
    }
    
    // 處理 Webhook 回調 - 需要等待官方提供 Webhook 格式
    processWebhook(webhookData) {
        try {
            console.log('📞 [Oen Payment Correct] 處理 Webhook:', webhookData);
            
            // 官方文件中提到會有 webhook 但格式尚未明確
            // 需要從官方獲得 webhook 的確切格式
            
            return {
                orderId: webhookData.orderId,
                status: webhookData.status,
                amount: webhookData.amount,
                transactionHid: webhookData.transactionHid,
                success: webhookData.status === 'charged'
            };
            
        } catch (error) {
            console.error('❌ [Oen Payment Correct] Webhook 處理失敗:', error);
            throw error;
        }
    }
    
    // 退款功能 - 按照官方 API
    async refund(transactionHid, refundData) {
        try {
            console.log(`💰 [Oen Payment Correct] 申請退款: ${transactionHid}`);
            
            const refundRequest = {
                merchantId: this.config.merchantId,
                amount: refundData.amount,
                reason: refundData.reason || '用戶申請退款'
            };
            
            const response = await axios.post(`${this.config.apiUrl}/refunds/${transactionHid}`, refundRequest, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.authToken}`
                },
                timeout: 30000
            });
            
            if (response.data.code !== 'S0000') {
                throw new Error(`退款錯誤: ${response.data.code} - ${response.data.message}`);
            }
            
            console.log('✅ [Oen Payment Correct] 退款申請成功');
            return response.data;
            
        } catch (error) {
            console.error('❌ [Oen Payment Correct] 退款申請失敗:', error.message);
            throw error;
        }
    }
    
    // 生成訂單 ID
    generateOrderId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `WANGJI_${timestamp}_${random}`;
    }
    
    // 獲取測試建議
    getTestGuidance() {
        return {
            testAmounts: {
                success: '大於 100 元 (例如: 299)',
                failure: '小於 100 元 (例如: 50)'
            },
            testCards: this.config.testCards,
            testEnvironment: {
                apiUrl: 'https://payment-api.testing.oen.tw',
                merchantId: 'oentech',
                authToken: 'yourToken'
            }
        };
    }
}

module.exports = OenPaymentCorrect;