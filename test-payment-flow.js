// 小汪記記金流測試工具 - 完整支付流程測試
// 測試從訂單建立到支付成功的完整流程

const axios = require('axios');
const { supabase } = require('./supabase-client');

class PaymentFlowTester {
    constructor() {
        this.baseUrl = 'https://a4cc9d907f15.ngrok-free.app';
        this.testUser = {
            userId: 'test_user_payment_' + Date.now(),
            userName: '測試用戶'
        };
        console.log('🧪 [支付測試] 初始化測試環境');
        console.log('🔗 [支付測試] 測試伺服器:', this.baseUrl);
        console.log('👤 [支付測試] 測試用戶:', this.testUser.userId);
    }

    // 步驟 1: 測試 API 端點可用性
    async testApiEndpoints() {
        console.log('\n🔍 === 步驟 1: 測試 API 端點可用性 ===');
        
        const endpoints = [
            { name: '建立支付訂單', url: '/api/payment/create', method: 'POST' },
            { name: '支付回調處理', url: '/payment/callback', method: 'POST' },
            { name: '支付成功頁面', url: '/payment/success', method: 'GET' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`📡 測試 ${endpoint.name}: ${endpoint.method} ${endpoint.url}`);
                
                if (endpoint.method === 'GET') {
                    const response = await axios.get(this.baseUrl + endpoint.url, { timeout: 5000 });
                    console.log(`✅ ${endpoint.name} - 狀態碼: ${response.status}`);
                } else {
                    // 對 POST 端點只檢查是否存在（會返回 400 但不是 404）
                    try {
                        await axios.post(this.baseUrl + endpoint.url, {}, { timeout: 5000 });
                    } catch (error) {
                        if (error.response && error.response.status !== 404) {
                            console.log(`✅ ${endpoint.name} - 端點存在 (狀態碼: ${error.response.status})`);
                        } else {
                            throw error;
                        }
                    }
                }
            } catch (error) {
                console.log(`❌ ${endpoint.name} - 錯誤: ${error.message}`);
                return false;
            }
        }
        
        console.log('✅ 所有 API 端點都可正常訪問');
        return true;
    }

    // 步驟 2: 測試建立支付訂單
    async testCreatePaymentOrder() {
        console.log('\n💳 === 步驟 2: 測試建立支付訂單 ===');
        
        const orderData = {
            userId: this.testUser.userId,
            userName: this.testUser.userName,
            amount: 299,
            itemName: '小汪記記 Premium 訂閱',
            description: '解鎖進階功能 - 測試訂單'
        };
        
        console.log('📝 建立訂單資料:', orderData);
        
        try {
            const response = await axios.post(
                this.baseUrl + '/api/payment/create',
                orderData,
                { timeout: 10000 }
            );
            
            console.log('✅ 訂單建立成功');
            console.log('📋 回應資料:', response.data);
            
            if (response.data.success && response.data.orderId && response.data.paymentUrl) {
                this.testOrderId = response.data.orderId;
                this.testPaymentUrl = response.data.paymentUrl;
                console.log(`💼 測試訂單 ID: ${this.testOrderId}`);
                console.log(`🔗 支付 URL: ${this.testPaymentUrl}`);
                return response.data;
            } else {
                console.log('❌ 訂單建立失敗 - 回應格式不正確');
                return null;
            }
            
        } catch (error) {
            console.log('❌ 建立訂單失敗:', error.response?.data || error.message);
            return null;
        }
    }

    // 步驟 3: 測試支付頁面
    async testPaymentPage() {
        console.log('\n🌐 === 步驟 3: 測試支付頁面 ===');
        
        if (!this.testPaymentUrl) {
            console.log('❌ 沒有支付 URL，跳過支付頁面測試');
            return false;
        }
        
        try {
            console.log('🔗 訪問支付頁面:', this.testPaymentUrl);
            const response = await axios.get(this.testPaymentUrl, { timeout: 10000 });
            
            if (response.status === 200) {
                console.log('✅ 支付頁面載入成功');
                
                // 檢查頁面內容是否包含必要元素
                const pageContent = response.data;
                const requiredElements = [
                    '訂單資訊',
                    '模擬支付成功',
                    '模擬支付失敗',
                    this.testOrderId
                ];
                
                for (const element of requiredElements) {
                    if (pageContent.includes(element)) {
                        console.log(`✅ 頁面包含: ${element}`);
                    } else {
                        console.log(`⚠️  頁面缺少: ${element}`);
                    }
                }
                
                return true;
            }
            
        } catch (error) {
            console.log('❌ 支付頁面訪問失敗:', error.message);
            return false;
        }
    }

    // 步驟 4: 測試支付成功流程
    async testSuccessfulPayment() {
        console.log('\n🎉 === 步驟 4: 測試支付成功流程 ===');
        
        if (!this.testOrderId) {
            console.log('❌ 沒有測試訂單 ID，跳過支付成功測試');
            return false;
        }
        
        // 模擬 Oen Payment 的成功回調
        const callbackData = {
            order_id: this.testOrderId,
            trade_status: 'TRADE_SUCCESS',
            amount: '299.00',
            trade_no: 'OEN_TEST_' + Date.now(),
            customer_id: this.testUser.userId,
            timestamp: Math.floor(Date.now() / 1000),
            signature: 'test_signature_' + this.testOrderId
        };
        
        console.log('📞 發送支付成功回調:', callbackData);
        
        try {
            const response = await axios.post(
                this.baseUrl + '/payment/callback',
                callbackData,
                { timeout: 10000 }
            );
            
            if (response.status === 200 && response.data === 'OK') {
                console.log('✅ 支付成功回調處理正常');
                return true;
            } else {
                console.log('❌ 支付回調回應異常:', response.data);
                return false;
            }
            
        } catch (error) {
            console.log('❌ 支付成功測試失敗:', error.response?.data || error.message);
            return false;
        }
    }

    // 步驟 5: 驗證訂閱狀態更新
    async testSubscriptionUpdate() {
        console.log('\n📋 === 步驟 5: 驗證訂閱狀態更新 ===');
        
        try {
            // 檢查用戶訂閱狀態
            const { data: subscription, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', this.testUser.userId)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.log('❌ 查詢訂閱狀態失敗:', error.message);
                return false;
            }
            
            if (subscription) {
                console.log('✅ 找到用戶訂閱記錄');
                console.log('📊 訂閱詳細:', {
                    user_id: subscription.user_id,
                    subscription_type: subscription.subscription_type,
                    status: subscription.status,
                    expires_at: subscription.expires_at
                });
                
                if (subscription.subscription_type === 'premium' && subscription.status === 'active') {
                    console.log('🎉 訂閱狀態更新成功！');
                    return true;
                } else {
                    console.log('⚠️  訂閱狀態未正確更新');
                    return false;
                }
            } else {
                console.log('⚠️  未找到用戶訂閱記錄，可能是首次用戶');
                return false;
            }
            
        } catch (error) {
            console.log('❌ 驗證訂閱狀態失敗:', error.message);
            return false;
        }
    }

    // 步驟 6: 測試支付失敗流程
    async testFailedPayment() {
        console.log('\n❌ === 步驟 6: 測試支付失敗流程 ===');
        
        // 建立一個新的測試訂單用於失敗測試
        const failOrderData = {
            userId: this.testUser.userId + '_fail',
            userName: this.testUser.userName,
            amount: 199,
            itemName: '失敗測試訂單',
            description: '用於測試支付失敗情境'
        };
        
        try {
            const orderResponse = await axios.post(
                this.baseUrl + '/api/payment/create',
                failOrderData,
                { timeout: 10000 }
            );
            
            const failOrderId = orderResponse.data.orderId;
            console.log(`💼 失敗測試訂單 ID: ${failOrderId}`);
            
            // 模擬支付失敗回調
            const failCallbackData = {
                order_id: failOrderId,
                trade_status: 'TRADE_FAILED',
                amount: '199.00',
                trade_no: 'OEN_FAIL_' + Date.now(),
                customer_id: this.testUser.userId + '_fail',
                timestamp: Math.floor(Date.now() / 1000),
                signature: 'fail_signature_' + failOrderId,
                error_code: 'CARD_DECLINED',
                error_message: '信用卡被拒絕'
            };
            
            console.log('📞 發送支付失敗回調:', failCallbackData);
            
            const response = await axios.post(
                this.baseUrl + '/payment/callback',
                failCallbackData,
                { timeout: 10000 }
            );
            
            if (response.status === 200) {
                console.log('✅ 支付失敗回調處理正常');
                return true;
            }
            
        } catch (error) {
            console.log('❌ 支付失敗測試發生錯誤:', error.message);
            return false;
        }
    }

    // 步驟 7: 清理測試資料
    async cleanupTestData() {
        console.log('\n🧹 === 步驟 7: 清理測試資料 ===');
        
        try {
            // 清理測試用戶的訂閱記錄
            const { error: subError } = await supabase
                .from('subscriptions')
                .delete()
                .like('user_id', this.testUser.userId + '%');
            
            if (subError) {
                console.log('⚠️  清理訂閱記錄時發生錯誤:', subError.message);
            } else {
                console.log('✅ 測試訂閱記錄已清理');
            }
            
            // 清理測試訂單記錄
            const { error: orderError } = await supabase
                .from('payment_orders')
                .delete()
                .like('user_id', this.testUser.userId + '%');
            
            if (orderError) {
                console.log('⚠️  清理訂單記錄時發生錯誤:', orderError.message);
            } else {
                console.log('✅ 測試訂單記錄已清理');
            }
            
            console.log('🎯 測試資料清理完成');
            return true;
            
        } catch (error) {
            console.log('❌ 清理測試資料失敗:', error.message);
            return false;
        }
    }

    // 執行完整測試流程
    async runFullTest() {
        console.log('🚀 === 小汪記記金流測試開始 ===');
        console.log('⏰ 測試時間:', new Date().toLocaleString('zh-TW'));
        console.log('=' .repeat(50));
        
        const testResults = {
            apiEndpoints: false,
            createOrder: false,
            paymentPage: false,
            successfulPayment: false,
            subscriptionUpdate: false,
            failedPayment: false,
            cleanup: false
        };
        
        try {
            // 執行所有測試步驟
            testResults.apiEndpoints = await this.testApiEndpoints();
            
            if (testResults.apiEndpoints) {
                const orderResult = await this.testCreatePaymentOrder();
                testResults.createOrder = !!orderResult;
                
                if (testResults.createOrder) {
                    testResults.paymentPage = await this.testPaymentPage();
                    testResults.successfulPayment = await this.testSuccessfulPayment();
                    
                    if (testResults.successfulPayment) {
                        // 等待一秒讓資料庫更新
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        testResults.subscriptionUpdate = await this.testSubscriptionUpdate();
                    }
                }
                
                testResults.failedPayment = await this.testFailedPayment();
            }
            
            testResults.cleanup = await this.cleanupTestData();
            
        } catch (error) {
            console.log('💥 測試過程中發生未預期錯誤:', error.message);
        }
        
        // 輸出測試結果摘要
        this.printTestSummary(testResults);
        
        return testResults;
    }

    // 輸出測試結果摘要
    printTestSummary(results) {
        console.log('\n📊 === 測試結果摘要 ===');
        console.log('=' .repeat(50));
        
        const testItems = [
            { key: 'apiEndpoints', name: 'API 端點可用性', icon: '🔗' },
            { key: 'createOrder', name: '建立支付訂單', icon: '💳' },
            { key: 'paymentPage', name: '支付頁面載入', icon: '🌐' },
            { key: 'successfulPayment', name: '支付成功處理', icon: '🎉' },
            { key: 'subscriptionUpdate', name: '訂閱狀態更新', icon: '📋' },
            { key: 'failedPayment', name: '支付失敗處理', icon: '❌' },
            { key: 'cleanup', name: '測試資料清理', icon: '🧹' }
        ];
        
        let passedTests = 0;
        const totalTests = testItems.length;
        
        testItems.forEach(item => {
            const status = results[item.key] ? '✅ 通過' : '❌ 失敗';
            console.log(`${item.icon} ${item.name}: ${status}`);
            if (results[item.key]) passedTests++;
        });
        
        console.log('\n🎯 測試統計:');
        console.log(`   通過: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
        
        if (passedTests === totalTests) {
            console.log('\n🏆 恭喜！所有測試都通過了！');
            console.log('✨ 金流系統已準備就緒，可以開始實際使用');
        } else {
            console.log('\n⚠️  部分測試未通過，請檢查以上失敗項目');
        }
        
        console.log('\n🔚 測試完成時間:', new Date().toLocaleString('zh-TW'));
    }
}

// 如果直接執行此檔案，則運行測試
if (require.main === module) {
    const tester = new PaymentFlowTester();
    tester.runFullTest()
        .then(() => {
            console.log('\n👋 測試程序結束');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 測試程序異常結束:', error);
            process.exit(1);
        });
}

module.exports = PaymentFlowTester;