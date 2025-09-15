require('dotenv').config();
const axios = require('axios');

console.log('🔍 診斷 Token Webhook 問題...\n');

async function diagnoseWebhookIssue() {
  const ngrokUrl = 'https://3447337587ec.ngrok-free.app';
  const webhookEndpoint = '/api/payment/token-webhook';
  
  console.log('📋 診斷清單:');
  console.log('1. 檢查 ngrok URL 是否可達');
  console.log('2. 檢查 webhook 端點是否正常');
  console.log('3. 模擬 Oen Payment webhook 回調');
  console.log('4. 檢查 Oen Payment API 可達性');
  console.log('5. 驗證 checkout ID: 32aIlgmt2HVP0RIo7jmH4eK39HK');
  console.log('');

  // 1. 檢查 ngrok URL 可達性
  console.log('🌐 1. 檢查 ngrok URL 可達性...');
  try {
    const response = await axios.get(`${ngrokUrl}/ping`, {
      timeout: 10000,
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    console.log('✅ ngrok URL 可達:', response.status);
  } catch (error) {
    console.log('❌ ngrok URL 不可達:', error.code || error.message);
  }

  // 2. 檢查 webhook 端點
  console.log('\n📞 2. 檢查 webhook 端點...');
  try {
    const testPayload = {
      test: 'connectivity_check',
      source: 'diagnosis'
    };
    
    const response = await axios.post(`${ngrokUrl}${webhookEndpoint}`, testPayload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    console.log('✅ webhook 端點可達:', response.status);
    console.log('📥 回應:', response.data);
  } catch (error) {
    console.log('❌ webhook 端點錯誤:', error.code || error.message);
    if (error.response) {
      console.log('📥 錯誤詳情:', error.response.status, error.response.data);
    }
  }

  // 3. 模擬真實的 Token webhook
  console.log('\n🎫 3. 模擬真實 Token webhook...');
  try {
    const realTokenWebhook = {
      success: true,
      purpose: "token",
      merchantId: "mktersalon",
      transactionId: `TEST_DIAG_${Date.now()}`,
      message: null,
      customId: JSON.stringify({
        userId: "diagnosis_user_123",
        purpose: "premium_subscription",
        plan: "monthly",
        amount: 299,
        timestamp: new Date().toISOString()
      }),
      token: `DIAG_TOKEN_${Date.now()}`,
      id: `DIAG_ID_${Date.now()}`
    };
    
    const response = await axios.post(`${ngrokUrl}${webhookEndpoint}`, realTokenWebhook, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    console.log('✅ 模擬 Token webhook 成功:', response.status);
    console.log('📥 回應:', response.data);
  } catch (error) {
    console.log('❌ 模擬 Token webhook 失敗:', error.code || error.message);
  }

  // 4. 檢查 Oen Payment API 可達性
  console.log('\n🏦 4. 檢查 Oen Payment API 可達性...');
  try {
    const apiUrl = 'https://payment-api.testing.oen.tw';
    const response = await axios.get(`${apiUrl}/health`, {
      timeout: 10000
    });
    console.log('✅ Oen Payment API 可達:', response.status);
  } catch (error) {
    console.log('❌ Oen Payment API 問題:', error.code || error.message);
    if (error.response && error.response.status === 404) {
      console.log('ℹ️  這可能是正常的，因為 /health 端點可能不存在');
    }
    
    // 嘗試檢查主域名
    try {
      const domainResponse = await axios.get('https://payment-api.testing.oen.tw', {
        timeout: 5000
      });
      console.log('✅ Oen Payment 主域名可達');
    } catch (domainError) {
      console.log('❌ Oen Payment 主域名也不可達');
    }
  }

  // 5. 查詢特定的 checkout ID 狀態 (如果我們能夠到達 API)
  console.log('\n🔍 5. 檢查特定 checkout ID 狀態...');
  console.log('Checkout ID: 32aIlgmt2HVP0RIo7jmH4eK39HK');
  
  const authToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjVhZDEzYTJlLTEwZTctNDlkZC1hYThhLTg2OTY2NmQwOTFlMyJ9.eyJkb21haW4iOiJta3RlcnNhbG9uIiwiaXNzIjoiaHR0cHM6Ly90ZXN0Lm9lbi50dyIsImF1ZCI6Imh0dHBzOi8vcGF5bWVudC1hcGkuZGV2ZWxvcG1lbnQub2VuLnR3IiwianRpIjoiMzJhN3c5UHZTVlpPWFdmS1RnV08zdnE0THZPIiwiaWF0IjoxNzU3NjQ3MDY1fQ.rCM-KdXuXWMSmykKUXS17dLYCNnI8yvIoSarhWVjy69F_mvJIsKHP3SlVfqpVmR_TQdCNYeGu8PFEP-wBWbsK9dJ9Kuo94lihcrgikvzDGtGmZ4OJiejblAr4mtAJtexyGyrqek4h-XF1P8ubtOwY60QdriPFKVJ0TvsviB3yUAglMHxOOIFRVCUxHLe9-xAyDbt-Aa2Gvzi4EoqFmcQosiOJBgMs032qvPz6i9IHOY3Ysi-gqojo9U6aizxAn_zuwZToEzvvW2uqATuZie25_I2IphOUcjiPLiDTgOzH23w3Hj-V8JAoA-G6bJCXiu9KlQPe0j0jiYG8Bsbt7PA1w';
  
  try {
    // 嘗試查詢 checkout 狀態
    const checkoutResponse = await axios.get(`https://payment-api.testing.oen.tw/checkout/32aIlgmt2HVP0RIo7jmH4eK39HK`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('✅ 找到 checkout 記錄:', checkoutResponse.data);
  } catch (error) {
    console.log('❌ 無法查詢 checkout 狀態:', error.code || error.message);
    if (error.response) {
      console.log('📥 API 回應:', error.response.status, error.response.data);
    }
  }

  // 6. 提供診斷結果和建議
  console.log('\n📊 診斷總結:');
  console.log('='.repeat(50));
  
  console.log('\n🔍 可能的問題原因:');
  console.log('1. 📍 webhook URL 配置問題');
  console.log('2. 🌐 ngrok 連接不穩定');
  console.log('3. 🏦 Oen Payment 系統延遲發送 webhook');
  console.log('4. ⚙️  webhook 重試機制尚未觸發');
  console.log('5. 🔒 防火牆或網路阻擋');
  
  console.log('\n💡 建議解決方案:');
  console.log('1. 🔄 重新創建 checkout link 並確認 webhookUrl');
  console.log('2. 📞 手動觸發 webhook 測試');
  console.log('3. 🕒 等待 Oen Payment 的重試機制 (2秒, 4秒, 6秒)');
  console.log('4. 📋 檢查 Oen Payment Dashboard 的 webhook 狀態');
  console.log('5. 🆔 使用不同的測試用戶和 checkout ID');
  
  console.log('\n⏰ 等待時間建議:');
  console.log('- 立即重試: 0 秒');
  console.log('- 第一次重試: 2 秒後');
  console.log('- 第二次重試: 4 秒後'); 
  console.log('- 第三次重試: 6 秒後');
  console.log('- 總等待時間: 約 12 秒');
}

diagnoseWebhookIssue();