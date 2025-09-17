const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkHihiTask() {
    try {
        console.log('🔍 查詢包含"嗨嗨"的任務...');

        // 查詢包含"嗨嗨"的任務
        const { data, error } = await supabase
            .from('dev_messages')
            .select('id, message_text, scheduled_date')
            .ilike('message_text', '%嗨嗨%')
            .order('id', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ 查詢錯誤:', error);
            return;
        }

        if (data.length === 0) {
            console.log('⚠️ 沒有找到包含"嗨嗨"的任務');
            return;
        }

        console.log(`✅ 找到 ${data.length} 個包含"嗨嗨"的任務:`);
        data.forEach(task => {
            console.log(`📋 任務 ID: ${task.id}`);
            console.log(`📝 內容: ${task.message_text}`);
            console.log(`📅 排程日期: ${task.scheduled_date}`);
            console.log('---');
        });

        // 也查詢最近的測試任務
        console.log('\n🔍 查詢最近的測試任務...');
        const { data: recentTasks, error: recentError } = await supabase
            .from('dev_messages')
            .select('id, message_text, scheduled_date, user_id')
            .gte('id', 1757946000000)
            .order('id', { ascending: false })
            .limit(5);

        if (!recentError && recentTasks.length > 0) {
            console.log(`✅ 最近的測試任務:`);
            recentTasks.forEach(task => {
                console.log(`📋 任務 ID: ${task.id}`);
                console.log(`👤 用戶: ${task.user_id}`);
                console.log(`📝 內容: ${task.message_text}`);
                console.log(`📅 排程日期: ${task.scheduled_date}`);
                console.log('---');
            });
        }

    } catch (err) {
        console.error('❌ 執行錯誤:', err);
    }
}

checkHihiTask();