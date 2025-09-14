// Oen Payment API 整合模組
// 基於 Oen Payment API 文件實現最簡單的付款流程

const crypto = require('crypto');

class OenPayment {
    constructor() {
        const isProduction = process.env.NODE_ENV === 'production';
        
        this.config = {
            // 根據環境選擇 API 端點
            apiUrl: isProduction ? 
                (process.env.OEN_PAYMENT_API_URL || 'https://payment.oen.tw') : 
                'https://ae4bee7dc026.ngrok-free.app',
            
            // 商店配置 - 從環境變數取得
            storeId: isProduction ? 
                process.env.OEN_PAYMENT_MERCHANT_ID : 
                'test_store_id',
            secretKey: isProduction ? 
                process.env.OEN_PAYMENT_SECRET_KEY : 
                'test_secret_key',
            
            // 回調 URL - 根據環境配置
            callbackUrl: isProduction ?
                (process.env.PAYMENT_CALLBACK_URL || `${process.env.WEBHOOK_BASE_URL}/api/payment/callback`) :
                'https://ae4bee7dc026.ngrok-free.app/payment/callback',
            returnUrl: isProduction ?
                (process.env.PAYMENT_SUCCESS_URL || `${process.env.WEBHOOK_BASE_URL}/payment/success`) :
                'https://ae4bee7dc026.ngrok-free.app/payment/success',
            
            // 測試卡號配置（僅測試環境）
            testCards: {
                success: '4242424242424242', // 測試成功卡號
                fail: '4242424200000000'     // 測試失敗卡號
            }
        };
        
        console.log('💳 [Oen Payment] 支付模組初始化完成', {
            environment: isProduction ? 'production' : 'development',
            apiUrl: this.config.apiUrl,
            signatureVerification: process.env.PAYMENT_SIGNATURE_VERIFICATION === 'true'
        });
    }
    
    // 創建支付訂單
    async createPaymentOrder(orderData) {
        try {
            console.log('📝 [Oen Payment] 建立支付訂單:', orderData);
            
            // 驗證訂單金額（最小金額 100）
            if (orderData.amount < 100) {
                throw new Error('訂單金額不能小於 100 元');
            }
            
            // 生成唯一訂單號
            const orderId = this.generateOrderId();
            
            // 準備支付請求資料
            const paymentRequest = {
                store_id: this.config.storeId,
                order_id: orderId,
                amount: orderData.amount,
                currency: 'TWD',
                item_name: orderData.itemName || '小汪記記 - 訂閱升級',
                item_description: orderData.description || '小汪記記進階功能訂閱',
                customer_id: orderData.userId,
                customer_name: orderData.userName,
                callback_url: this.config.callbackUrl,
                return_url: this.config.returnUrl,
                timestamp: Math.floor(Date.now() / 1000)
            };
            
            // 生成簽名
            paymentRequest.signature = this.generateSignature(paymentRequest);
            
            console.log('✅ [Oen Payment] 支付訂單建立成功:', {
                orderId,
                amount: paymentRequest.amount,
                userId: orderData.userId
            });
            
            // 模擬 API 回應（實際應該調用 Oen Payment API）
            return {
                success: true,
                orderId: orderId,
                paymentUrl: this.generatePaymentUrl(paymentRequest),
                request: paymentRequest
            };
            
        } catch (error) {
            console.error('❌ [Oen Payment] 建立支付訂單失敗:', error);
            throw error;
        }
    }
    
    // 生成唯一訂單號
    generateOrderId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `WANGJI_${timestamp}_${random}`;
    }
    
    // 生成支付簽名
    generateSignature(data) {
        // 根據 Oen Payment API 規範生成簽名
        const sortedKeys = Object.keys(data).filter(key => key !== 'signature').sort();
        const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
        const fullString = signString + '&key=' + this.config.secretKey;
        
        return crypto.createHash('md5').update(fullString).digest('hex').toLowerCase();
    }
    
    // 生成支付頁面 URL
    generatePaymentUrl(paymentRequest) {
        const params = new URLSearchParams();
        Object.keys(paymentRequest).forEach(key => {
            params.append(key, paymentRequest[key]);
        });
        
        return `${this.config.apiUrl}/payment/create?${params.toString()}`;
    }
    
    // 驗證回調簽名
    verifyCallback(callbackData) {
        try {
            const receivedSignature = callbackData.signature;
            delete callbackData.signature;
            
            const calculatedSignature = this.generateSignature(callbackData);
            
            const isValid = receivedSignature === calculatedSignature;
            
            console.log(`🔍 [Oen Payment] 回調簽名驗證:`, {
                valid: isValid,
                received: receivedSignature,
                calculated: calculatedSignature
            });
            
            return isValid;
            
        } catch (error) {
            console.error('❌ [Oen Payment] 回調簽名驗證失敗:', error);
            return false;
        }
    }
    
    // 處理支付結果
    processPaymentResult(callbackData) {
        try {
            console.log('📊 [Oen Payment] 處理支付結果:', callbackData);
            
            // 檢查是否需要驗證簽名
            const enableSignatureVerification = process.env.PAYMENT_SIGNATURE_VERIFICATION === 'true';
            const isProduction = process.env.NODE_ENV === 'production';
            
            if (!enableSignatureVerification || !isProduction) {
                console.log('🧪 [支付處理] 簽名驗證已停用 (開發/測試模式)');
            } else {
                console.log('🔒 [支付處理] 正在驗證簽名...');
                // 驗證簽名
                if (!this.verifyCallback(callbackData)) {
                    throw new Error('回調簽名驗證失敗');
                }
                console.log('✅ [支付處理] 簽名驗證通過');
            }
            
            // 解析支付狀態
            const result = {
                orderId: callbackData.order_id,
                status: callbackData.trade_status,
                amount: parseFloat(callbackData.amount),
                transactionId: callbackData.trade_no,
                userId: callbackData.customer_id,
                timestamp: callbackData.timestamp,
                success: callbackData.trade_status === 'TRADE_SUCCESS'
            };
            
            console.log('✅ [Oen Payment] 支付結果處理完成:', result);
            
            return result;
            
        } catch (error) {
            console.error('❌ [Oen Payment] 處理支付結果失敗:', error);
            throw error;
        }
    }
}

// 創建單例實例
const oenPayment = new OenPayment();

module.exports = {
    OenPayment,
    oenPayment
};