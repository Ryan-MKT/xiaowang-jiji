// 小汪記記訂閱管理服務
const { supabase } = require('./supabase-client');
const { Client } = require('@line/bot-sdk');

class SubscriptionService {
    constructor() {
        // 初始化 LINE Bot 客戶端 (用於發送通知)
        this.lineClient = null;
        try {
            if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
                this.lineClient = new Client({
                    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
                });
                console.log('✅ [訂閱服務] LINE 客戶端初始化成功');
            }
        } catch (error) {
            console.warn('⚠️  [訂閱服務] LINE 客戶端初始化失敗:', error.message);
        }
        console.log('📋 [訂閱服務] 訂閱管理服務初始化完成');
    }

    // 獲取用戶訂閱狀態
    async getUserSubscription(userId) {
        try {
            console.log(`🔍 [訂閱服務] 查詢用戶訂閱狀態: ${userId}`);
            
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!data) {
                // 用戶沒有訂閱記錄，創建免費訂閱
                console.log(`➕ [訂閱服務] 創建免費訂閱: ${userId}`);
                return await this.createFreeSubscription(userId);
            }

            // 檢查訂閱是否已過期
            const subscription = await this.checkSubscriptionExpiry(data);
            
            console.log(`✅ [訂閱服務] 用戶訂閱狀態:`, {
                userId,
                type: subscription.subscription_type,
                status: subscription.status,
                expiresAt: subscription.expires_at
            });

            return subscription;

        } catch (error) {
            console.error('❌ [訂閱服務] 獲取用戶訂閱狀態失敗:', error);
            throw error;
        }
    }

    // 創建免費訂閱
    async createFreeSubscription(userId) {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    subscription_type: 'free',
                    status: 'active',
                    started_at: new Date().toISOString(),
                    expires_at: null // 免費訂閱不會過期
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ [訂閱服務] 免費訂閱創建成功: ${userId}`);
            return data;

        } catch (error) {
            console.error('❌ [訂閱服務] 創建免費訂閱失敗:', error);
            throw error;
        }
    }

    // 升級到高級訂閱
    async upgradeToPremium(userId, durationMonths = 1) {
        try {
            console.log(`⬆️ [訂閱服務] 升級到高級訂閱: ${userId}, 期間: ${durationMonths}個月`);
            
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

            const { data, error } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    subscription_type: 'premium',
                    status: 'active',
                    started_at: new Date().toISOString(),
                    expires_at: expiresAt.toISOString()
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`🎉 [訂閱服務] 高級訂閱升級成功:`, {
                userId,
                expiresAt: data.expires_at
            });

            return data;

        } catch (error) {
            console.error('❌ [訂閱服務] 升級到高級訂閱失敗:', error);
            throw error;
        }
    }

    // 檢查訂閱是否過期
    async checkSubscriptionExpiry(subscription) {
        if (subscription.subscription_type === 'free') {
            return subscription; // 免費訂閱不會過期
        }

        const now = new Date();
        const expiresAt = new Date(subscription.expires_at);

        if (now > expiresAt && subscription.status === 'active') {
            console.log(`⏰ [訂閱服務] 訂閱已過期，降級為免費: ${subscription.user_id}`);
            
            // 過期後降級為免費
            const { data, error } = await supabase
                .from('subscriptions')
                .update({
                    subscription_type: 'free',
                    status: 'expired',
                    expires_at: null
                })
                .eq('user_id', subscription.user_id)
                .select()
                .single();

            if (error) throw error;
            return data;
        }

        return subscription;
    }

    // 記錄支付訂單
    async createPaymentOrder(orderData) {
        try {
            console.log('💳 [訂閱服務] 創建支付訂單:', orderData);

            const { data, error } = await supabase
                .from('payment_orders')
                .insert({
                    order_id: orderData.orderId,
                    user_id: orderData.userId,
                    amount: orderData.amount,
                    currency: orderData.currency || 'TWD',
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ [訂閱服務] 支付訂單記錄成功: ${orderData.orderId}`);
            return data;

        } catch (error) {
            console.error('❌ [訂閱服務] 創建支付訂單失敗:', error);
            throw error;
        }
    }

    // 處理支付成功
    async processSuccessfulPayment(paymentResult) {
        try {
            console.log('🎉 [訂閱服務] 處理支付成功:', paymentResult);

            let orderData;

            // 先嘗試更新現有的支付訂單
            const { data: existingOrder, error: updateError } = await supabase
                .from('payment_orders')
                .update({
                    status: 'paid',
                    transaction_id: paymentResult.transactionId,
                    paid_at: new Date().toISOString()
                })
                .eq('order_id', paymentResult.orderId)
                .select()
                .single();

            if (updateError && updateError.code === 'PGRST116') {
                // 訂單不存在，創建新的支付訂單記錄
                console.log('📝 [訂閱服務] 訂單記錄不存在，創建新記錄');
                const { data: newOrder, error: insertError } = await supabase
                    .from('payment_orders')
                    .insert({
                        order_id: paymentResult.orderId,
                        user_id: paymentResult.userId,
                        amount: paymentResult.amount,
                        currency: 'TWD',
                        status: 'paid',
                        payment_method: paymentResult.paymentMethod || 'unknown',
                        transaction_id: paymentResult.transactionId,
                        paid_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                orderData = newOrder;
            } else if (updateError) {
                throw updateError;
            } else {
                orderData = existingOrder;
            }

            // 升級用戶訂閱 (根據付款金額決定訂閱期間)
            const durationMonths = this.calculateSubscriptionDuration(orderData.amount);
            const subscription = await this.upgradeToPremium(paymentResult.userId, durationMonths);

            console.log('🎊 [訂閱服務] 支付處理完成，用戶已升級為高級會員');

            // 發送 LINE 通知給用戶
            try {
                await this.sendPaymentSuccessNotification(paymentResult.userId, subscription, paymentResult.orderId);
            } catch (notificationError) {
                console.error('⚠️  [訂閱服務] 發送通知失敗:', notificationError.message);
                // 不影響主要流程，繼續執行
            }

            return {
                userId: paymentResult.userId,
                subscription_type: subscription.subscription_type,
                status: subscription.status,
                expires_at: subscription.expires_at,
                paymentOrderId: orderData.id
            };

        } catch (error) {
            console.error('❌ [訂閱服務] 處理支付成功失敗:', error);
            throw error;
        }
    }

    // 根據付款金額計算訂閱期間
    calculateSubscriptionDuration(amount) {
        // 299元 = 1個月
        // 未來可以擴展更多方案
        if (amount >= 299) {
            return 1; // 1個月
        }
        return 1; // 默認1個月
    }

    // 檢查用戶是否為高級會員
    async isPremiumUser(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            return subscription.subscription_type === 'premium' && subscription.status === 'active';
        } catch (error) {
            console.error('❌ [訂閱服務] 檢查高級會員狀態失敗:', error);
            return false;
        }
    }

    // 獲取訂閱統計
    async getSubscriptionStats() {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('subscription_type, status');

            if (error) throw error;

            const stats = {
                total: data.length,
                free: data.filter(s => s.subscription_type === 'free').length,
                premium: data.filter(s => s.subscription_type === 'premium').length,
                active: data.filter(s => s.status === 'active').length,
                expired: data.filter(s => s.status === 'expired').length
            };

            console.log('📊 [訂閱服務] 訂閱統計:', stats);
            return stats;

        } catch (error) {
            console.error('❌ [訂閱服務] 獲取訂閱統計失敗:', error);
            throw error;
        }
    }

    // 發送支付成功通知
    async sendPaymentSuccessNotification(userId, subscription, orderId) {
        if (!this.lineClient) {
            console.log('⚠️  [訂閱服務] LINE 客戶端未初始化，跳過通知');
            return;
        }

        try {
            console.log(`📱 [訂閱服務] 發送支付成功通知給用戶: ${userId}`);

            // 計算到期日期顯示
            const expiryDate = new Date(subscription.expires_at);
            const expiryDateStr = expiryDate.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

            // 創建支付成功的 Flex Message
            const successMessage = {
                type: 'flex',
                altText: '🎉 小汪記記 Premium 訂閱成功！',
                contents: {
                    type: 'bubble',
                    size: 'kilo',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        paddingAll: 'md',
                        backgroundColor: '#28a745',
                        contents: [
                            {
                                type: 'text',
                                text: '🎉 訂閱成功！',
                                color: '#ffffff',
                                size: 'xl',
                                weight: 'bold',
                                align: 'center'
                            }
                        ]
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        paddingAll: 'lg',
                        backgroundColor: '#f8f9fa',
                        contents: [
                            {
                                type: 'text',
                                text: '恭喜您成功訂閱小汪記記 Premium！',
                                size: 'md',
                                weight: 'bold',
                                color: '#333333',
                                align: 'center',
                                margin: 'none'
                            },
                            {
                                type: 'separator',
                                margin: 'md',
                                color: '#e9ecef'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'md',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '訂單編號:',
                                                size: 'sm',
                                                color: '#666666',
                                                flex: 0
                                            },
                                            {
                                                type: 'text',
                                                text: orderId || 'N/A',
                                                size: 'sm',
                                                color: '#333333',
                                                flex: 0,
                                                align: 'end'
                                            }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '會員等級:',
                                                size: 'sm',
                                                color: '#666666',
                                                flex: 0
                                            },
                                            {
                                                type: 'text',
                                                text: '⭐ Premium',
                                                size: 'sm',
                                                color: '#ffc107',
                                                weight: 'bold',
                                                flex: 0,
                                                align: 'end'
                                            }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '有效期至:',
                                                size: 'sm',
                                                color: '#666666',
                                                flex: 0
                                            },
                                            {
                                                type: 'text',
                                                text: expiryDateStr,
                                                size: 'sm',
                                                color: '#28a745',
                                                weight: 'bold',
                                                flex: 0,
                                                align: 'end'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'separator',
                                margin: 'md',
                                color: '#e9ecef'
                            },
                            {
                                type: 'text',
                                text: '✨ 進階功能已啟用',
                                size: 'md',
                                color: '#28a745',
                                weight: 'bold',
                                align: 'center',
                                margin: 'md'
                            },
                            {
                                type: 'text',
                                text: '• 無限制任務數量\n• 自定義標籤管理\n• 任務收藏功能\n• 進階統計報表\n• 優先客服支援',
                                size: 'sm',
                                color: '#555555',
                                margin: 'md',
                                wrap: true
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        paddingAll: 'sm',
                        contents: [
                            {
                                type: 'text',
                                text: '立即開始使用進階功能！',
                                size: 'sm',
                                color: '#667eea',
                                align: 'center',
                                action: {
                                    type: 'message',
                                    text: '開始使用'
                                }
                            }
                        ]
                    }
                }
            };

            await this.lineClient.pushMessage(userId, successMessage);
            console.log('✅ [訂閱服務] 支付成功通知已發送');

        } catch (error) {
            console.error('❌ [訂閱服務] 發送通知失敗:', error);
            throw error;
        }
    }
}

// 創建單例實例
const subscriptionService = new SubscriptionService();

module.exports = {
    SubscriptionService,
    subscriptionService
};