require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 檢查 Supabase 9/14 日期的所有記錄...\n');

async function checkSupabase914() {
    try {
        // 初始化 Supabase 客戶端
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        console.log('✅ Supabase 客戶端初始化成功');
        console.log('🆔 用戶ID: U2a9005032be2240a6816d29ae28d9294');
        console.log('📅 檢查日期: 2025-09-14\n');

        // 檢查 dev_tasks 表格（任務數據的正確來源）
        console.log('🔍 檢查 dev_tasks 表格結構...');
        const { data: taskTableInfo, error: taskTableError } = await supabase
            .from('dev_tasks')
            .select('*')
            .limit(1);

        if (taskTableError) {
            console.error('❌ 檢查 dev_tasks 表格結構失敗:', taskTableError);
        } else if (taskTableInfo && taskTableInfo.length > 0) {
            console.log('📋 dev_tasks 表格欄位:', Object.keys(taskTableInfo[0]));
        }

        // 查詢 dev_tasks 表格中該用戶的所有記錄
        const { data: allTasks, error: taskError } = await supabase
            .from('dev_tasks')
            .select('*')
            .eq('user_id', 'U2a9005032be2240a6816d29ae28d9294')
            .order('timestamp', { ascending: false });

        if (taskError) {
            console.error('❌ 查詢 dev_tasks 記錄失敗:', taskError);
            return;
        }

        console.log(`📊 dev_tasks 該用戶總記錄數: ${allTasks.length}`);

        // 同時也檢查 dev_messages 表格
        console.log('\n🔍 檢查 dev_messages 表格結構...');
        const { data: messageTableInfo, error: messageTableError } = await supabase
            .from('dev_messages')
            .select('*')
            .limit(1);

        if (messageTableError) {
            console.error('❌ 檢查 dev_messages 表格結構失敗:', messageTableError);
        } else if (messageTableInfo && messageTableInfo.length > 0) {
            console.log('📋 dev_messages 表格欄位:', Object.keys(messageTableInfo[0]));
        }

        // 查詢 dev_messages 表格中該用戶的所有記錄
        const { data: allMessages, error: allError } = await supabase
            .from('dev_messages')
            .select('*')
            .eq('user_id', 'U2a9005032be2240a6816d29ae28d9294')
            .order('created_at', { ascending: false });

        if (allError) {
            console.error('❌ 查詢所有記錄失敗:', allError);
            return;
        }

        console.log(`📊 dev_messages 該用戶總記錄數: ${allMessages.length}`);

        // 檢查 dev_tasks 中 9/14 的記錄
        const sep14Tasks = allTasks.filter(task => {
            if (!task.timestamp) return false;
            const taskDate = new Date(task.timestamp);
            const dateString = taskDate.toISOString().split('T')[0];
            return dateString === '2025-09-14';
        });

        console.log(`\n📅 dev_tasks 2025-09-14 的記錄數: ${sep14Tasks.length}`);

        if (sep14Tasks.length > 0) {
            console.log('\n🔍 dev_tasks 2025-09-14 的詳細記錄:');
            sep14Tasks.forEach((task, index) => {
                console.log(`  ${index + 1}. ID: ${task.id}`);
                console.log(`     內容: "${task.text}"`);
                console.log(`     時間: ${task.timestamp}`);
                console.log(`     完成: ${task.completed || false}`);
                console.log('');
            });
        } else {
            console.log('❌ 確認：dev_tasks 2025-09-14 完全沒有任何記錄');
        }

        // 檢查 dev_messages 中 9/14 的記錄
        const sep14Messages = allMessages.filter(msg => {
            if (!msg.created_at) return false;
            const msgDate = new Date(msg.created_at);
            const dateString = msgDate.toISOString().split('T')[0];
            return dateString === '2025-09-14';
        });

        console.log(`\n📅 dev_messages 2025-09-14 的記錄數: ${sep14Messages.length}`);

        if (sep14Messages.length > 0) {
            console.log('\n🔍 dev_messages 2025-09-14 的詳細記錄:');
            sep14Messages.forEach((msg, index) => {
                console.log(`  ${index + 1}. ID: ${msg.id}`);
                console.log(`     內容: "${msg.message_text}"`);
                console.log(`     時間: ${msg.created_at}`);
                console.log('');
            });
        } else {
            console.log('❌ 確認：dev_messages 2025-09-14 完全沒有任何記錄');
        }

        // 檢查前後幾天的記錄數量
        console.log('\n📈 前後幾天的記錄數量對比:');
        const dates = ['2025-09-12', '2025-09-13', '2025-09-14', '2025-09-15', '2025-09-16'];

        // dev_tasks 前後幾天的記錄數量
        console.log('\n📈 dev_tasks 前後幾天的記錄數量對比:');
        dates.forEach(date => {
            const count = allTasks.filter(task => {
                if (!task.timestamp) return false;
                const taskDate = new Date(task.timestamp);
                const dateString = taskDate.toISOString().split('T')[0];
                return dateString === date;
            }).length;

            console.log(`  ${date}: ${count} 筆記錄`);
        });

        // dev_messages 前後幾天的記錄數量
        console.log('\n📈 dev_messages 前後幾天的記錄數量對比:');
        dates.forEach(date => {
            const count = allMessages.filter(msg => {
                if (!msg.created_at) return false;
                const msgDate = new Date(msg.created_at);
                const dateString = msgDate.toISOString().split('T')[0];
                return dateString === date;
            }).length;

            console.log(`  ${date}: ${count} 筆記錄`);
        });

        // 最近 10 筆 dev_tasks 記錄的時間戳檢查
        console.log('\n🕐 最近 10 筆 dev_tasks 記錄的時間戳:');
        allTasks.slice(0, 10).forEach((task, index) => {
            const taskDate = new Date(task.timestamp);
            const dateString = taskDate.toISOString().split('T')[0];
            console.log(`  ${index + 1}. ${task.text} - ${dateString} (${task.timestamp})`);
        });

        // 最近 10 筆 dev_messages 記錄的時間戳檢查
        console.log('\n🕐 最近 10 筆 dev_messages 記錄的時間戳:');
        allMessages.slice(0, 10).forEach((msg, index) => {
            const msgDate = new Date(msg.created_at);
            const dateString = msgDate.toISOString().split('T')[0];
            console.log(`  ${index + 1}. ${msg.message_text} - ${dateString} (${msg.created_at})`);
        });

    } catch (error) {
        console.error('❌ 檢查過程發生錯誤:', error);
    }
}

// 執行檢查
checkSupabase914();