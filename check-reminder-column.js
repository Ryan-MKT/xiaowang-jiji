const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkReminderColumn() {
    try {
        console.log('🔍 先嘗試查詢最近的任務資料...');

        // 先嘗試直接查詢任務資料，看看是否包含 reminder_time
        const { data: tasks, error: taskError } = await supabase
            .from('dev_messages')
            .select('id, message_text, reminder_time, repeat_pattern')
            .order('id', { ascending: false })
            .limit(5);

        if (taskError) {
            console.error('❌ 查詢任務時發生錯誤:', taskError);

            // 如果查詢失敗，可能是欄位不存在，嘗試不包含這些欄位的查詢
            console.log('🔍 嘗試基本查詢...');
            const { data: basicTasks, error: basicError } = await supabase
                .from('dev_messages')
                .select('id, message_text, note, tag, scheduled_date')
                .order('id', { ascending: false })
                .limit(3);

            if (basicError) {
                console.error('❌ 基本查詢也失敗:', basicError);
                return;
            }

            console.log('✅ 基本任務資料:');
            basicTasks.forEach(task => {
                console.log(`  ID: ${task.id}, 內容: ${task.message_text}`);
            });

            console.log('\n❌ reminder_time 和 repeat_pattern 欄位可能不存在！');
            console.log('📝 需要執行 SQL 指令添加這些欄位：');
            console.log('   ALTER TABLE dev_messages ADD COLUMN IF NOT EXISTS reminder_time TEXT;');
            console.log('   ALTER TABLE dev_messages ADD COLUMN IF NOT EXISTS repeat_pattern TEXT;');

            return;
        }

        console.log('✅ 成功查詢任務資料，reminder_time 和 repeat_pattern 欄位存在');
        if (tasks.length > 0) {
            console.log('📋 最近的任務資料:');
            tasks.forEach(task => {
                console.log(`  ID: ${task.id}`);
                console.log(`  內容: ${task.message_text}`);
                console.log(`  提醒: ${task.reminder_time || 'NULL'}`);
                console.log(`  重複: ${task.repeat_pattern || 'NULL'}`);
                console.log('  ---');
            });
        } else {
            console.log('⚠️ 沒有找到任務資料');
        }

    } catch (err) {
        console.error('❌ 執行錯誤:', err);
    }
}

checkReminderColumn();