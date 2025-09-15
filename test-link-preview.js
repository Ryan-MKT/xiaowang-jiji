const axios = require('axios');

async function testLinkPreview() {
    console.log('🔗 測試連結預覽API...\n');

    const testUrls = [
        'https://github.com',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.npmjs.com/package/axios',
        'https://example.com'
    ];

    const testUserId = 'test-link-preview-user';

    for (const url of testUrls) {
        console.log(`\n📡 測試連結: ${url}`);
        try {
            const response = await axios.post('http://localhost:3004/api/link-preview', {
                url: url
            }, {
                headers: {
                    'x-user-id': testUserId,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                console.log('✅ 預覽成功:');
                console.log(`   標題: ${response.data.title || '無'}`);
                console.log(`   描述: ${response.data.description ? response.data.description.substring(0, 100) + '...' : '無'}`);
                console.log(`   圖片: ${response.data.image || '無'}`);
                console.log(`   域名: ${response.data.domain || '無'}`);
            } else {
                console.log(`❌ API 回應錯誤: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ 請求失敗: ${error.response?.data?.error || error.message}`);
        }
    }

    console.log('\n🎯 測試完成!');
}

testLinkPreview();