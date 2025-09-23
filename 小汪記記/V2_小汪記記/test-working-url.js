// 測試一個一定會成功的 URL
const { getLinkPreview } = require('link-preview-js');

async function testWorkingUrl() {
  console.log('🧪 測試絕對會成功的 URL...');

  // 這些 URL 通常都有完整的 Open Graph 標籤
  const testUrls = [
    'https://github.com',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.npmjs.com/package/link-preview-js',
    'https://stackoverflow.com/questions/1732348/regex-match-open-tags-except-xhtml-self-contained-tags'
  ];

  for (const url of testUrls) {
    console.log(`\n📱 測試: ${url}`);
    try {
      const result = await getLinkPreview(url, {
        timeout: 15000,
        followRedirects: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      console.log('✅ 成功:', {
        title: result.title?.substring(0, 50),
        description: result.description?.substring(0, 80),
        hasImage: !!result.images?.[0],
        url: result.url
      });

      if (result.title && result.title !== 'Error') {
        console.log('🎉 找到可用的方法！');
        return result;
      }
    } catch (error) {
      console.log('❌ 失敗:', error.message);
    }
  }
}

testWorkingUrl().catch(console.error);