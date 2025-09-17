// Oen Payment API 整合模組 - 官方規範版本
// 等待官方提供正確的 API 規格後使用此版本

const crypto = require('crypto');
const axios = require('axios');

class OenPaymentOfficial {
    constructor() {
        const isProduction = process.env.NODE_ENV === 'production';
        const isOfficialTest = process.env.OEN_USE_OFFICIAL_TEST === 'true';
        
        this.config = {
            // 官方 API 端點 (等待官方確認)
            apiUrl: isProduction ? 
                'https://api.payment.oen.tw' :  // 生產環境 (推測)
                (isOfficialTest ? 
                    'https://XXXXXX.testing.oen.tw' :  // 官方測試環境 (待確認)
                    'https://3c22a40d8ece.ngrok-free.app'  // 暫時的模擬環境
                ),
            
            // 商戶配置
            merchantId: isProduction ? 
                process.env.OEN_PAYMENT_MERCHANT_ID : 
                process.env.OEN_PAYMENT_TEST_MERCHANT_ID || 'test_merchant_id',
            
            apiKey: isProduction ?
                process.env.OEN_PAYMENT_API_KEY :
                process.env.OEN_PAYMENT_TEST_API_KEY || 'test_api_key',
                
            secretKey: isProduction ? 
                process.env.OEN_PAYMENT_SECRET_KEY : 
                process.env.OEN_PAYMENT_TEST_SECRET_KEY || 'test_secret_key',
            
            // 回調配置
            callbackUrl: isProduction ?
                `${process.env.WEBHOOK_BASE_URL}/payment/callback` :
                'https://3c22a40d8ece.ngrok-free.app/payment/callback',
                
            returnUrl: isProduction ?
                `${process.env.WEBHOOK_BASE_URL}/payment/success` :
                'https://3c22a40d8ece.ngrok-free.app/payment/success',
            
            // 官方測試卡號
            testCards: {
                success: '4242424242424242',
                fail: '4242424200000000'
            }
        };
        
        console.log('💳 [Oen Payment Official] 支付模組初始化', {
            environment: isProduction ? 'production' : 'development',
            apiUrl: this.config.apiUrl,
            usingOfficialTest: isOfficialTest
        });
    }
    
    // 創建支付訂單 - 按照官方規範
    async createPaymentOrder(orderData) {
        try {
            console.log('📝 [Oen Payment Official] 建立支付訂單:', orderData);
            
            // 驗證最小金額 (官方要求 100 元)
            if (orderData.amount < 100) {
                throw new Error('訂單金額不能小於 100 元 (官方最小金額限制)');
            }
            
            // 生成訂單 ID
            const orderId = this.generateOrderId();
            const timestamp = Math.floor(Date.now() / 1000);
            
            // 準備支付請求 (等待官方確認參數格式)
            const paymentRequest = {
                merchant_id: this.config.merchantId,
                order_id: orderId,
                amount: orderData.amount,
                currency: 'TWD',
                item_name: orderData.itemName || '小汪記記 Premium 訂閱',
                item_description: orderData.description || '進階功能訂閱服務',
                customer_id: orderData.userId,
                customer_name: orderData.userName || '用戶',
                callback_url: this.config.callbackUrl,
                return_url: this.config.returnUrl,
                timestamp: timestamp
            };
            
            // 生成簽章 (按照官方規範)
            paymentRequest.signature = this.generateSignature(paymentRequest);
            
            // 如果使用官方測試環境，實際調用 API
            if (process.env.OEN_USE_OFFICIAL_TEST === 'true') {
                return await this.callOfficialAPI(paymentRequest);
            } else {
                // 暫時返回模擬結果
                return this.mockApiResponse(paymentRequest);
            }
            
        } catch (error) {
            console.error('❌ [Oen Payment Official] 建立支付訂單失敗:', error);
            throw error;
        }
    }
    
    // 調用官方 API
    async callOfficialAPI(paymentRequest) {
        try {
            // TODO: 等待官方提供正確的 API 端點和方法
            const response = await axios.post(`${this.config.apiUrl}/api/payment/create`, paymentRequest, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,  // 如果需要
                    'User-Agent': 'XiaoWang-LineBot/1.0'
                },
                timeout: 30000
            });
            
            console.log('✅ [Oen Payment Official] API 調用成功:', response.data);
            
            return {
                success: true,
                orderId: paymentRequest.order_id,
                paymentUrl: response.data.payment_url,
                response: response.data
            };
            
        } catch (error) {
            console.error('❌ [Oen Payment Official] API 調用失敗:', error.response?.data || error.message);
            throw new Error(`Oen Payment API 調用失敗: ${error.response?.data?.message || error.message}`);
        }
    }
    
    // 模擬 API 回應 (測試用)
    mockApiResponse(paymentRequest) {
        console.log('🧪 [Oen Payment Official] 使用模擬 API 回應');
        
        return {
            success: true,
            orderId: paymentRequest.order_id,
            paymentUrl: this.generatePaymentUrl(paymentRequest),
            response: {
                status: 'created',
                payment_url: this.generatePaymentUrl(paymentRequest),
                expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            }
        };
    }
    
    // 處理支付回調 - 按照官方規範
    processPaymentCallback(callbackData) {
        try {
            console.log('📞 [Oen Payment Official] 處理支付回調:', callbackData);
            
            // 檢查是否啟用簽章驗證
            const enableSignatureVerification = process.env.PAYMENT_SIGNATURE_VERIFICATION === 'true';
            const isProduction = process.env.NODE_ENV === 'production';
            
            if (enableSignatureVerification && isProduction) {
                console.log('🔒 [Oen Payment Official] 驗證回調簽章...');
                if (!this.verifyCallbackSignature(callbackData)) {
                    throw new Error('回調簽章驗證失敗');
                }
                console.log('✅ [Oen Payment Official] 簽章驗證通過');
            } else {
                console.log('🧪 [Oen Payment Official] 簽章驗證已停用 (測試模式)');
            }
            
            // 解析支付狀態 (官方規範: failed 為失敗狀態)
            const isSuccess = callbackData.status !== 'failed' && 
                             (callbackData.status === 'success' || callbackData.trade_status === 'TRADE_SUCCESS');
            
            return {
                orderId: callbackData.order_id,
                status: callbackData.status || callbackData.trade_status,
                amount: parseFloat(callbackData.amount),
                transactionId: callbackData.transaction_id || callbackData.trade_no,
                userId: callbackData.customer_id,
                timestamp: callbackData.timestamp || Math.floor(Date.now() / 1000),
                success: isSuccess
            };
            
        } catch (error) {
            console.error('❌ [Oen Payment Official] 處理回調失敗:', error);
            throw error;
        }
    }
    
    // 驗證回調簽章
    verifyCallbackSignature(callbackData) {
        try {
            const receivedSignature = callbackData.signature;
            if (!receivedSignature) {
                console.error('❌ [Oen Payment Official] 回調缺少簽章');
                return false;
            }
            
            // 移除簽章後計算
            const dataToVerify = { ...callbackData };
            delete dataToVerify.signature;
            
            const calculatedSignature = this.generateSignature(dataToVerify);
            const isValid = receivedSignature === calculatedSignature;
            
            console.log(`🔍 [Oen Payment Official] 簽章驗證結果:`, {
                valid: isValid,
                received: receivedSignature,
                calculated: calculatedSignature
            });
            
            return isValid;
            
        } catch (error) {
            console.error('❌ [Oen Payment Official] 簽章驗證錯誤:', error);
            return false;
        }
    }
    
    // 生成簽章 (等待官方確認算法)
    generateSignature(data) {
        // TODO: 等待官方提供正確的簽章算法
        const sortedKeys = Object.keys(data)
            .filter(key => key !== 'signature')
            .sort();
        
        const signString = sortedKeys
            .map(key => `${key}=${data[key]}`)
            .join('&') + `&key=${this.config.secretKey}`;
        
        return crypto.createHash('sha256').update(signString, 'utf8').digest('hex').toUpperCase();
    }
    
    // 生成支付頁面 URL
    generatePaymentUrl(paymentRequest) {
        const params = new URLSearchParams();
        Object.keys(paymentRequest).forEach(key => {
            if (paymentRequest[key] !== undefined && paymentRequest[key] !== null) {
                params.append(key, paymentRequest[key]);
            }
        });
        
        return `${this.config.apiUrl}/payment/create?${params.toString()}`;
    }
    
    // 生成訂單 ID
    generateOrderId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `WANGJI_${timestamp}_${random}`;
    }
}

module.exports = OenPaymentOfficial;