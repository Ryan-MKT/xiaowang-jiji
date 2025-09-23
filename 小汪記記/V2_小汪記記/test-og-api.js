const { openGraphAPI } = require('./open-graph-api');

async function testOpenGraphAPI() {
  console.log('🧪 測試 Open Graph API...');

  const testUrl = 'https://www.facebook.com/share/p/177ygM7Y8M/';

  try {
    const result = await openGraphAPI.getPreview(testUrl);
    console.log('✅ 測試結果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

testOpenGraphAPI();