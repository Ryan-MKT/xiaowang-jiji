// 最簡單的 Open Graph 測試
console.log('🧪 開始最簡單的 Open Graph 測試...');

const testUrl = 'https://www.facebook.com/share/p/177ygM7Y8M/';
console.log(`📱 測試 URL: ${testUrl}`);

// 方法 1: 使用 link-preview-js
async function testMethod1() {
  console.log('\n--- 方法 1: link-preview-js ---');
  try {
    const { getLinkPreview } = require('link-preview-js');

    const result = await getLinkPreview(testUrl, {
      timeout: 15000,
      followRedirects: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    console.log('✅ link-preview-js 成功:', {
      title: result.title,
      description: result.description?.substring(0, 100),
      image: result.images?.[0],
      url: result.url
    });
    return result;
  } catch (error) {
    console.log('❌ link-preview-js 失敗:', error.message);
    return null;
  }
}

// 方法 2: 使用 puppeteer (如果有的話)
async function testMethod2() {
  console.log('\n--- 方法 2: puppeteer ---');
  try {
    const puppeteer = require('puppeteer');

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 15000 });

    const ogData = await page.evaluate(() => {
      const getMetaContent = (property) => {
        const meta = document.querySelector(`meta[property="${property}"]`) ||
                      document.querySelector(`meta[name="${property}"]`);
        return meta ? meta.getAttribute('content') : null;
      };

      return {
        title: getMetaContent('og:title') || document.title,
        description: getMetaContent('og:description'),
        image: getMetaContent('og:image'),
        url: getMetaContent('og:url') || window.location.href
      };
    });

    await browser.close();

    console.log('✅ puppeteer 成功:', ogData);
    return ogData;
  } catch (error) {
    console.log('❌ puppeteer 失敗:', error.message);
    return null;
  }
}

// 方法 3: 使用簡單的 HTTP 請求
async function testMethod3() {
  console.log('\n--- 方法 3: HTTP 請求 ---');
  try {
    const axios = require('axios');
    const cheerio = require('cheerio');

    const response = await axios.get(testUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    const $ = cheerio.load(response.data);

    const ogData = {
      title: $('meta[property="og:title"]').attr('content') || $('title').text(),
      description: $('meta[property="og:description"]').attr('content'),
      image: $('meta[property="og:image"]').attr('content'),
      url: $('meta[property="og:url"]').attr('content') || testUrl
    };

    console.log('✅ HTTP 請求成功:', ogData);
    return ogData;
  } catch (error) {
    console.log('❌ HTTP 請求失敗:', error.message);
    return null;
  }
}

// 執行所有測試
async function runAllTests() {
  console.log('🚀 開始測試所有方法...\n');

  const result1 = await testMethod1();
  const result2 = await testMethod2();
  const result3 = await testMethod3();

  console.log('\n🎯 測試結果總結:');
  console.log('方法 1 (link-preview-js):', result1 ? '成功' : '失敗');
  console.log('方法 2 (puppeteer):', result2 ? '成功' : '失敗');
  console.log('方法 3 (HTTP + cheerio):', result3 ? '成功' : '失敗');

  // 找出最好的結果
  const results = [result1, result2, result3].filter(r => r && r.title && r.title !== 'Error');
  if (results.length > 0) {
    console.log('\n🎉 找到可用的方法！最佳結果:');
    console.log(JSON.stringify(results[0], null, 2));
  } else {
    console.log('\n😢 所有方法都失敗了');
  }
}

runAllTests().catch(console.error);