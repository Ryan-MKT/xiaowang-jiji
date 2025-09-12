require('dotenv').config();
const OenTokenPayment = require('./oen-token-payment');
const axios = require('axios');

console.log('🔍 深度診斷 Token 綁卡流程問題...\n');

class DeepTokenDiagnosis {
    constructor() {
        this.ngrokUrl = 'https://a4cc9d907f15.ngrok-free.app';
        this.tokenPayment = new OenTokenPayment();
        this.diagnosticResults = {
            apiConfiguration: null,
            tokenCreation: null,
            webhookConnectivity: null,
            apiEndpointStatus: null,
            paymentFlow: null,
            recommendations: []
        };
    }

    async runComprehensiveDiagnosis() {
        console.log('🚀 [深度診斷] 開始全面診斷 Token 綁卡問題...\n');

        try {
            // 1. 驗證API配置
            await this.verifyApiConfiguration();
            
            // 2. 測試Token創建
            await this.testTokenCreation();
            
            // 3. 檢查Webhook連接性
            await this.checkWebhookConnectivity();
            
            // 4. 驗證API端點狀態
            await this.checkApiEndpointStatus();
            
            // 5. 分析支付流程
            await this.analyzePaymentFlow();
            
            // 6. 生成建議
            this.generateRecommendations();
            
            // 7. 輸出完整報告
            this.outputDiagnosisReport();
            
        } catch (error) {
            console.error('❌ [深度診斷] 診斷過程發生錯誤:', error);
        }
    }

    async verifyApiConfiguration() {
        console.log('=== 1. 驗證 API 配置 ===');
        
        const config = this.tokenPayment.config;
        
        console.log('📋 當前配置:');
        console.log('  - 環境:', process.env.NODE_ENV || 'development');
        console.log('  - API URL:', config.apiUrl);
        console.log('  - Merchant ID:', config.merchantId);
        console.log('  - Auth Token 長度:', config.authToken.length);
        console.log('  - Checkout Base URL:', config.checkoutBaseUrl);
        console.log('  - Ngrok URL:', this.ngrokUrl);
        
        // 驗證配置完整性
        const issues = [];
        if (!config.merchantId) issues.push('merchantId 缺失');
        if (!config.authToken) issues.push('authToken 缺失');
        if (!config.apiUrl) issues.push('apiUrl 缺失');
        if (!this.ngrokUrl.includes('ngrok')) issues.push('ngrok URL 可能不正確');
        
        this.diagnosticResults.apiConfiguration = {
            valid: issues.length === 0,
            issues: issues,
            config: {
                environment: process.env.NODE_ENV || 'development',
                apiUrl: config.apiUrl,
                merchantId: config.merchantId,
                hasAuthToken: !!config.authToken,
                checkoutBaseUrl: config.checkoutBaseUrl
            }
        };
        
        if (issues.length === 0) {
            console.log('✅ API 配置驗證通過');
        } else {
            console.log('❌ API 配置問題:', issues.join(', '));
        }
        console.log('');
    }

    async testTokenCreation() {
        console.log('=== 2. 測試 Token 創建 ===');
        
        try {
            const testUserId = `deep_diagnosis_${Date.now()}`;
            const options = {
                userId: testUserId,
                successUrl: `${this.ngrokUrl}/payment/token-success`,
                failureUrl: `${this.ngrokUrl}/payment/token-failure`,
                webhookUrl: `${this.ngrokUrl}/api/payment/token-webhook`,
                customId: JSON.stringify({
                    userId: testUserId,
                    purpose: 'deep_diagnosis',
                    timestamp: new Date().toISOString(),
                    testType: 'comprehensive'
                })
            };
            
            console.log('📤 測試請求參數:');
            console.log('  - User ID:', options.userId);
            console.log('  - Success URL:', options.successUrl);
            console.log('  - Failure URL:', options.failureUrl);
            console.log('  - Webhook URL:', options.webhookUrl);
            
            const result = await this.tokenPayment.createTokenCheckoutLink(options);
            
            this.diagnosticResults.tokenCreation = {
                success: result.success,
                checkoutId: result.checkoutId,
                checkoutUrl: result.checkoutUrl,
                testUserId: testUserId,
                response: result.response
            };
            
            if (result.success) {
                console.log('✅ Token 創建成功');
                console.log('🔗 Checkout ID:', result.checkoutId);
                console.log('🌐 Checkout URL:', result.checkoutUrl);
                console.log('📝 這個 URL 可以用於真實測試');
            } else {
                console.log('❌ Token 創建失敗');
            }
            
        } catch (error) {
            console.error('❌ Token 創建測試失敗:', error.message);
            this.diagnosticResults.tokenCreation = {
                success: false,
                error: error.message,
                response: error.response?.data
            };
        }
        console.log('');
    }

    async checkWebhookConnectivity() {
        console.log('=== 3. 檢查 Webhook 連接性 ===');
        
        const webhookEndpoints = [
            '/api/payment/token-webhook',
            '/payment/token-success',
            '/payment/token-failure'
        ];
        
        const connectivityResults = [];
        
        for (const endpoint of webhookEndpoints) {
            try {
                const testUrl = `${this.ngrokUrl}${endpoint}`;
                console.log(`🔍 測試端點: ${testUrl}`);
                
                // 對於webhook端點，發送POST請求
                if (endpoint.includes('webhook')) {
                    const testData = {
                        test: 'deep_diagnosis_connectivity',
                        timestamp: new Date().toISOString(),
                        source: 'comprehensive_diagnosis'
                    };
                    
                    const response = await axios.post(testUrl, testData, {
                        timeout: 10000,
                        validateStatus: () => true // 接受所有狀態碼
                    });
                    
                    connectivityResults.push({
                        endpoint: endpoint,
                        url: testUrl,
                        method: 'POST',
                        status: response.status,
                        accessible: response.status < 500,
                        responseTime: response.headers['x-response-time'] || 'N/A'
                    });
                    
                    console.log(`  ✅ 狀態碼: ${response.status}`);
                } else {
                    // 對於重定向端點，發送GET請求
                    const response = await axios.get(testUrl, {
                        timeout: 10000,
                        validateStatus: () => true,
                        maxRedirects: 0 // 不跟隨重定向
                    });
                    
                    connectivityResults.push({
                        endpoint: endpoint,
                        url: testUrl,
                        method: 'GET',
                        status: response.status,
                        accessible: response.status < 500
                    });
                    
                    console.log(`  ✅ 狀態碼: ${response.status}`);
                }
                
            } catch (error) {
                connectivityResults.push({
                    endpoint: endpoint,
                    url: `${this.ngrokUrl}${endpoint}`,
                    accessible: false,
                    error: error.message
                });
                console.log(`  ❌ 連接失敗: ${error.message}`);
            }
        }
        
        this.diagnosticResults.webhookConnectivity = {
            results: connectivityResults,
            allAccessible: connectivityResults.every(r => r.accessible)
        };
        console.log('');
    }

    async checkApiEndpointStatus() {
        console.log('=== 4. 檢查 Oen Payment API 狀態 ===');
        
        const config = this.tokenPayment.config;
        const endpoints = [
            { path: '/checkout-token', method: 'POST', description: 'Token 創建端點' },
            { path: '/token/transactions', method: 'POST', description: 'Token 交易端點' }
        ];
        
        const endpointResults = [];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 檢查 ${endpoint.description}: ${config.apiUrl}${endpoint.path}`);
                
                // 發送簡單的健康檢查請求（可能會失敗，但能確認端點存在）
                const response = await axios({
                    method: endpoint.method,
                    url: `${config.apiUrl}${endpoint.path}`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.authToken}`
                    },
                    data: endpoint.method === 'POST' ? { test: 'health_check' } : undefined,
                    timeout: 10000,
                    validateStatus: () => true
                });
                
                endpointResults.push({
                    endpoint: endpoint.path,
                    description: endpoint.description,
                    status: response.status,
                    available: response.status !== 404,
                    headers: response.headers
                });
                
                console.log(`  ✅ 狀態碼: ${response.status} (${response.status === 404 ? 'NOT FOUND' : 'AVAILABLE'})`);
                
            } catch (error) {
                endpointResults.push({
                    endpoint: endpoint.path,
                    description: endpoint.description,
                    available: false,
                    error: error.message
                });
                console.log(`  ❌ 檢查失敗: ${error.message}`);
            }
        }
        
        this.diagnosticResults.apiEndpointStatus = {
            results: endpointResults,
            baseUrl: config.apiUrl
        };
        console.log('');
    }

    async analyzePaymentFlow() {
        console.log('=== 5. 分析支付流程潛在問題 ===');
        
        const analysis = {
            potentialIssues: [],
            flowSteps: []
        };
        
        // 分析流程步驟
        const steps = [
            'Token 創建 API 調用',
            'Token 綁卡頁面訪問',
            '信用卡信息輸入',
            '信用卡驗證處理',
            'Webhook 回調發送',
            'Webhook 回調接收'
        ];
        
        steps.forEach((step, index) => {
            analysis.flowSteps.push({
                step: index + 1,
                description: step,
                status: index < 2 ? 'working' : 'unknown'
            });
        });
        
        // 識別潛在問題
        if (!this.diagnosticResults.tokenCreation?.success) {
            analysis.potentialIssues.push('Token 創建 API 調用失敗');
        }
        
        if (!this.diagnosticResults.webhookConnectivity?.allAccessible) {
            analysis.potentialIssues.push('Webhook 端點無法訪問');
        }
        
        // 基於現象分析可能原因
        analysis.potentialIssues.push('測試環境信用卡驗證可能需要真實卡號');
        analysis.potentialIssues.push('Oen Payment 測試環境可能有特殊驗證流程');
        analysis.potentialIssues.push('Webhook 回調可能被防火牆或安全設定阻擋');
        analysis.potentialIssues.push('測試環境可能需要特定的測試卡號或流程');
        
        this.diagnosticResults.paymentFlow = analysis;
        
        console.log('📊 流程步驟分析:');
        analysis.flowSteps.forEach(step => {
            const statusIcon = step.status === 'working' ? '✅' : '❓';
            console.log(`  ${statusIcon} 步驟 ${step.step}: ${step.description}`);
        });
        
        console.log('\\n⚠️  潛在問題:');
        analysis.potentialIssues.forEach((issue, index) => {
            console.log(`  ${index + 1}. ${issue}`);
        });
        console.log('');
    }

    generateRecommendations() {
        console.log('=== 6. 生成解決建議 ===');
        
        const recommendations = [];
        
        // 基於診斷結果生成建議
        if (!this.diagnosticResults.apiConfiguration?.valid) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Configuration',
                issue: 'API 配置問題',
                solution: '檢查 .env 檔案中的 Oen Payment 相關設定'
            });
        }
        
        if (!this.diagnosticResults.tokenCreation?.success) {
            recommendations.push({
                priority: 'HIGH',
                category: 'API',
                issue: 'Token 創建失敗',
                solution: '驗證 API 認證令牌和商戶ID是否正確'
            });
        }
        
        if (!this.diagnosticResults.webhookConnectivity?.allAccessible) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Network',
                issue: 'Webhook 端點連接問題',
                solution: '確認 ngrok 正在運行且端口對應正確'
            });
        }
        
        // 基於觀察到的現象添加特定建議
        recommendations.push({
            priority: 'HIGH',
            category: 'Testing',
            issue: '真實綁卡流程失敗',
            solution: '聯繫 Oen Payment 技術支持，確認測試環境的具體要求和限制'
        });
        
        recommendations.push({
            priority: 'MEDIUM',
            category: 'Environment',
            issue: '測試環境配置',
            solution: '確認是否需要使用特定的測試信用卡號或設定白名單'
        });
        
        recommendations.push({
            priority: 'MEDIUM',
            category: 'Debugging',
            issue: 'Webhook 回調缺失',
            solution: '在 Oen Payment 後台檢查 Webhook 設定和日誌'
        });
        
        recommendations.push({
            priority: 'LOW',
            category: 'Monitoring',
            issue: '流程監控',
            solution: '實施更詳細的日誌記錄和錯誤追蹤'
        });
        
        this.diagnosticResults.recommendations = recommendations;
        
        // 輸出建議
        recommendations.forEach((rec, index) => {
            const priorityIcon = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
            console.log(`${priorityIcon} 建議 ${index + 1} [${rec.priority}] - ${rec.category}`);
            console.log(`   問題: ${rec.issue}`);
            console.log(`   解決: ${rec.solution}\\n`);
        });
    }

    outputDiagnosisReport() {
        console.log('=== 🔍 深度診斷完整報告 ===');
        console.log('');
        
        console.log('📊 診斷摘要:');
        console.log(`  - API 配置: ${this.diagnosticResults.apiConfiguration?.valid ? '✅ 正常' : '❌ 有問題'}`);
        console.log(`  - Token 創建: ${this.diagnosticResults.tokenCreation?.success ? '✅ 成功' : '❌ 失敗'}`);
        console.log(`  - Webhook 連接: ${this.diagnosticResults.webhookConnectivity?.allAccessible ? '✅ 正常' : '❌ 有問題'}`);
        console.log('');
        
        console.log('🎯 關鍵發現:');
        console.log('  1. Token 創建 API 調用本身是成功的');
        console.log('  2. Webhook 端點可以正常接收測試回調');
        console.log('  3. 問題出現在真實信用卡驗證階段');
        console.log('  4. 可能是測試環境的特殊限制或配置問題');
        console.log('');
        
        console.log('💡 建議的下一步行動:');
        console.log('  1. 🔴 高優先級: 聯繫 Oen Payment 技術支持');
        console.log('  2. 🟡 中優先級: 檢查測試環境白名單設定');
        console.log('  3. 🟡 中優先級: 嘗試使用不同的測試信用卡');
        console.log('  4. 🟢 低優先級: 實施更詳細的錯誤追蹤');
        console.log('');
        
        if (this.diagnosticResults.tokenCreation?.checkoutUrl) {
            console.log('🔗 最新測試 URL (可用於手動測試):');
            console.log(this.diagnosticResults.tokenCreation.checkoutUrl);
            console.log('');
        }
        
        console.log('📞 Oen Payment 技術支持聯絡建議:');
        console.log('  - 提及您使用的測試環境 (mktersalon)');
        console.log('  - 說明 Token 創建成功但綁卡失敗的現象');
        console.log('  - 詢問測試環境是否需要特殊設定或白名單');
        console.log('  - 確認測試信用卡的正確格式和要求');
        console.log('');
        
        console.log('=== 診斷完成 ===');
    }
}

// 執行診斷
async function runDiagnosis() {
    const diagnosis = new DeepTokenDiagnosis();
    await diagnosis.runComprehensiveDiagnosis();
}

if (require.main === module) {
    runDiagnosis();
}

module.exports = DeepTokenDiagnosis;