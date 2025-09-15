require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 驗證 Supabase 同步狀況...\n');

async function verifySupabaseSync() {
    try {
        // 初始化 Supabase 客戶端
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        console.log('✅ Supabase 客戶端初始化成功');
        console.log('🆔 用戶ID: U2a9005032be2240a6816d29ae28d9294\n');

        // 查詢最新的 10 筆記錄
        console.log('🔍 查詢最新 10 筆 dev_messages 記錄...');
        const { data: recentMessages, error: recentError } = await supabase
            .from('dev_messages')
            .select('*')
            .eq('user_id', 'U2a9005032be2240a6816d29ae28d9294')
            .order('created_at', { ascending: false })
            .limit(10);

        if (recentError) {
            console.error('❌ 查詢最新記錄失敗:', recentError);
            return;
        }

        console.log(`📊 最新 10 筆記錄:`);
        if (recentMessages && recentMessages.length > 0) {
            recentMessages.forEach((msg, index) => {
                const date = new Date(msg.created_at);
                const dateString = date.toISOString().split('T')[0];
                const timeString = date.toTimeString().split(' ')[0];

                console.log(`  ${index + 1}. ID: ${msg.id}`);
                console.log(`     內容: "${msg.message_text}"`);
                console.log(`     時間: ${dateString} ${timeString}`);
                console.log('');
            });

            // 檢查是否有今天 (2025-09-15) 的記錄
            const todayRecords = recentMessages.filter(msg => {
                const msgDate = new Date(msg.created_at);
                const dateString = msgDate.toISOString().split('T')[0];
                return dateString === '2025-09-15';
            });

            console.log(`📅 今天 (2025-09-15) 的記錄數: ${todayRecords.length}`);

            if (todayRecords.length > 0) {
                console.log('✅ 修復成功！新任務已正常同步到 Supabase');
                todayRecords.forEach((record, index) => {
                    console.log(`  ${index + 1}. "${record.message_text}" (${record.created_at})`);
                });
            } else {
                console.log('❌ 今天沒有新記錄，同步可能仍有問題');
            }

        } else {
            console.log('❌ 沒有找到任何記錄');
        }

        // 查詢總記錄數
        const { count, error: countError } = await supabase
            .from('dev_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', 'U2a9005032be2240a6816d29ae28d9294');

        if (!countError) {
            console.log(`\n📊 該用戶總記錄數: ${count}`);
        }

    } catch (error) {
        console.error('❌ 驗證過程發生錯誤:', error);
    }
}

// 執行驗證
verifySupabaseSync();