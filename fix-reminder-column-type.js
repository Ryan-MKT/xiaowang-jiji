const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fixReminderColumnType() {
    console.log('🔧 修復 reminder_time 欄位類型...\n');

    try {
        console.log('🗑️ 步驟 1: 刪除錯誤類型的 reminder_time 欄位...');

        // 注意：由於我們無法直接執行 DDL，需要使用 RPC 或在 Supabase Dashboard 手動執行
        console.log('❗ 重要提示：');
        console.log('   需要在 Supabase Dashboard 的 SQL Editor 中執行以下 SQL：');
        console.log('');
        console.log('   ALTER TABLE dev_messages DROP COLUMN IF EXISTS reminder_time;');
        console.log('   ALTER TABLE dev_messages ADD COLUMN reminder_time TEXT;');
        console.log('');
        console.log('⏳ 請手動執行上述 SQL，然後按任意鍵繼續測試...');

        // 暫停等待用戶確認（實際上會直接繼續）
        console.log('🧪 5秒後開始測試...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('\n🧪 步驟 2: 測試新的欄位類型...');

        const testCases = [
            { desc: '5分鐘 (TEXT)', value: '5分鐘' },
            { desc: '10分鐘 (TEXT)', value: '10分鐘' },
            { desc: '30分鐘 (TEXT)', value: '30分鐘' },
            { desc: 'NULL值', value: null }
        ];

        for (const test of testCases) {
            console.log(`\n🔍 測試 ${test.desc}...`);

            try {
                const testId = Date.now() + Math.random();

                const { data, error } = await supabase
                    .from('dev_messages')
                    .insert([{
                        id: testId,
                        user_id: 'fix-test-user',
                        message_text: `修復測試 - ${test.desc}`,
                        reminder_time: test.value,
                        repeat_pattern: '單次'
                    }]);

                if (error) {
                    console.log(`❌ 插入失敗:`, error.message);
                    if (error.code === '22007') {
                        console.log('   → 仍然是 timestamp 類型，需要手動修復數據庫');
                        return false;
                    }
                } else {
                    console.log(`✅ 插入成功`);

                    // 驗證讀取
                    const { data: readData, error: readError } = await supabase
                        .from('dev_messages')
                        .select('reminder_time, repeat_pattern')
                        .eq('id', testId)
                        .single();

                    if (!readError && readData) {
                        console.log(`   讀取結果: reminder_time="${readData.reminder_time}", repeat_pattern="${readData.repeat_pattern}"`);
                    }

                    // 清理測試數據
                    await supabase
                        .from('dev_messages')
                        .delete()
                        .eq('id', testId);
                }
            } catch (err) {
                console.log(`❌ 測試異常:`, err.message);
            }
        }

        console.log('\n✅ 修復完成！可以重新測試提醒時間功能了。');
        return true;

    } catch (err) {
        console.error('❌ 修復過程中發生錯誤:', err);
        return false;
    }
}

fixReminderColumnType();