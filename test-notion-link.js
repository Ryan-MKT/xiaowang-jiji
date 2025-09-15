const axios = require('axios');

async function testNotionLink() {
    console.log('🔗 測試Notion連結預覽...\n');

    const notionUrl = 'https://www.notion.so/JOBSS-15d9fd8bfd5080e1885dddd8e918012d?p=2559fd8bfd50807c868edd8436eaed9a&pm=c';
    const testUserId = 'test-notion-user';

    console.log(`📡 測試連結: ${notionUrl}`);

    try {
        const response = await axios.post('http://localhost:3002/api/link-preview', {
            url: notionUrl
        }, {
            headers: {
                'x-user-id': testUserId,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            console.log('✅ 預覽成功:');
            console.log(`   標題: ${response.data.title || '無'}`);
            console.log(`   描述: ${response.data.description || '無'}`);
            console.log(`   圖片: ${response.data.image || '無'}`);
            console.log(`   域名: ${response.data.domain || '無'}`);
            console.log('📋 完整回應:', JSON.stringify(response.data, null, 2));
        } else {
            console.log(`❌ API 回應錯誤: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ 請求失敗: ${error.response?.data?.error || error.message}`);
        if (error.response?.data) {
            console.log('📋 錯誤詳情:', JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log('\n🎯 測試完成!');
}

testNotionLink();