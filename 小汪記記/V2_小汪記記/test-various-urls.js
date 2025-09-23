const { openGraphAPI } = require('./open-graph-api');

async function testVariousURLs() {
  console.log('🧪 測試各種 URL...');

  const testUrls = [
    'https://github.com',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.facebook.com/share/p/177ygM7Y8M/',
    'https://example.com'
  ];

  for (const url of testUrls) {
    console.log(`\n🔍 測試: ${url}`);
    try {
      const result = await openGraphAPI.getPreview(url);
      console.log(`✅ 成功 - 標題: "${result.title}"`);
      console.log(`   描述: "${result.description?.substring(0, 100) || '無'}"`);
      console.log(`   圖片: ${result.image ? '有' : '無'}`);
    } catch (error) {
      console.error(`❌ 失敗: ${error.message}`);
    }
  }
}

testVariousURLs();