const fetch = require('node-fetch');

async function testFacebookOEmbed() {
  const fbUrl = 'https://www.facebook.com/share/p/17dWR77Mh1/';
  const oembedUrl = `https://www.facebook.com/plugins/post/oembed.json/?url=${encodeURIComponent(fbUrl)}`;

  console.log('🔍 測試 Facebook oEmbed API...');
  console.log('目標 URL:', fbUrl);
  console.log('oEmbed URL:', oembedUrl);
  console.log('');

  try {
    const response = await fetch(oembedUrl);
    const data = await response.json();

    console.log('✅ 成功取得 oEmbed 資料：');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ 失敗:', error.message);
  }
}

testFacebookOEmbed();
