const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function debugTablePrefix() {
    console.log('🔍 調試 TABLE_PREFIX 問題...\n');

    console.log('📊 環境變數:');
    console.log(`  TABLE_PREFIX: "${process.env.TABLE_PREFIX}"`);
    console.log(`  預設值處理: "${process.env.TABLE_PREFIX || ''}"`);
    console.log(`  完整表格名: "${(process.env.TABLE_PREFIX || '') + 'messages'}"`);

    const tablePrefix = process.env.TABLE_PREFIX || '';
    const tableName = tablePrefix + 'messages';

    console.log('\n🔍 測試表格存在性...');

    // 測試 dev_messages 表格
    try {
        console.log('\n📋 測試 dev_messages 表格:');
        const { data: devData, error: devError } = await supabase
            .from('dev_messages')
            .select('id, message_text, reminder_time')
            .limit(3);

        if (devError) {
            console.log('❌ dev_messages 查詢失敗:', devError.message);
        } else {
            console.log('✅ dev_messages 表格存在，記錄數:', devData.length);
            if (devData.length > 0) {
                console.log('  最新記錄:', devData[0].id, devData[0].message_text);
            }
        }
    } catch (err) {
        console.log('❌ dev_messages 測試異常:', err.message);
    }

    // 測試 messages 表格（無前綴）
    try {
        console.log('\n📋 測試 messages 表格:');
        const { data: msgData, error: msgError } = await supabase
            .from('messages')
            .select('id, message_text, reminder_time')
            .limit(3);

        if (msgError) {
            console.log('❌ messages 查詢失敗:', msgError.message);
        } else {
            console.log('✅ messages 表格存在，記錄數:', msgData.length);
            if (msgData.length > 0) {
                console.log('  最新記錄:', msgData[0].id, msgData[0].message_text);
            }
        }
    } catch (err) {
        console.log('❌ messages 測試異常:', err.message);
    }

    // 測試我們實際使用的表格名稱
    try {
        console.log(`\n📋 測試計算出的表格 ${tableName}:`);
        const { data: actualData, error: actualError } = await supabase
            .from(tableName)
            .select('id, message_text, reminder_time')
            .limit(3);

        if (actualError) {
            console.log(`❌ ${tableName} 查詢失敗:`, actualError.message);
        } else {
            console.log(`✅ ${tableName} 表格存在，記錄數:`, actualData.length);
            if (actualData.length > 0) {
                console.log('  最新記錄:', actualData[0].id, actualData[0].message_text);
            }
        }
    } catch (err) {
        console.log(`❌ ${tableName} 測試異常:`, err.message);
    }
}

debugTablePrefix().catch(console.error);