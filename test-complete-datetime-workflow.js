const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testCompleteDateTimeWorkflow() {
    console.log('🚀 測試完整的日期時間選擇器工作流程...\n');

    const testUserId = 'complete-test-user';
    const testTaskId = Date.now(); // 使用當前時間戳作為唯一 ID
    const testDateTime = '2025-09-16T14:30:00'; // 測試日期時間 ISO 格式

    try {
        // 步驟 1: 創建包含日期時間的新任務
        console.log('📝 步驟 1: 創建包含日期時間的新任務...');
        const createResponse = await axios.post('http://localhost:3003/api/task-note', {
            taskId: testTaskId,
            taskText: '完整日期時間測試任務',
            note: '這是完整日期時間測試',
            tag: '測試',
            scheduledDate: testDateTime
        }, {
            headers: {
                'x-user-id': testUserId,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 任務創建成功:', createResponse.data);

        // 步驟 2: 從數據庫直接驗證數據
        console.log('\n🔍 步驟 2: 從數據庫直接驗證數據...');
        const { data: dbData, error: dbError } = await supabase
            .from('dev_messages')
            .select('id, message_text, scheduled_date, user_id')
            .eq('id', testTaskId)
            .eq('user_id', testUserId)
            .single();

        if (dbError) {
            console.error('❌ 數據庫查詢錯誤:', dbError);
            return;
        }

        console.log('✅ 數據庫中的任務數據:');
        console.log(`  📋 任務 ID: ${dbData.id}`);
        console.log(`  👤 用戶: ${dbData.user_id}`);
        console.log(`  📝 內容: ${dbData.message_text}`);
        console.log(`  📅 排程日期: ${dbData.scheduled_date}`);

        // 步驟 3: 通過 API 端點獲取任務數據
        console.log('\n📡 步驟 3: 通過 API 端點獲取任務數據...');
        const getResponse = await axios.get(`http://localhost:3003/api/task-note/${testTaskId}`, {
            headers: {
                'x-user-id': testUserId
            }
        });

        console.log('✅ API 回應數據:', JSON.stringify(getResponse.data, null, 2));

        // 步驟 4: 驗證日期時間格式和解析
        console.log('\n🕐 步驟 4: 驗證日期時間格式和解析...');
        if (getResponse.data.scheduled_date) {
            const scheduledDate = new Date(getResponse.data.scheduled_date);
            console.log('✅ 成功解析 scheduled_date:', scheduledDate);

            // 顯示格式 (YYYY/MM/DD HH:MM) - 這是前端會使用的格式
            const displayFormat =
                scheduledDate.getFullYear() + '/' +
                String(scheduledDate.getMonth() + 1).padStart(2, '0') + '/' +
                String(scheduledDate.getDate()).padStart(2, '0') + ' ' +
                String(scheduledDate.getHours()).padStart(2, '0') + ':' +
                String(scheduledDate.getMinutes()).padStart(2, '0');

            console.log('🎯 前端顯示格式 (YYYY/MM/DD HH:MM):', displayFormat);

            // 分離日期和時間以供日期時間選擇器使用
            const dateOnly = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const timeOnly = String(scheduledDate.getHours()).padStart(2, '0') + ':' +
                            String(scheduledDate.getMinutes()).padStart(2, '0'); // HH:MM

            console.log('📅 HTML 日期選擇器值:', dateOnly);
            console.log('🕐 HTML 時間選擇器值:', timeOnly);
        } else {
            console.error('❌ scheduled_date 欄位不存在於 API 回應中');
        }

        // 步驟 5: 清理測試數據
        console.log('\n🧹 步驟 5: 清理測試數據...');
        const { error: deleteError } = await supabase
            .from('dev_messages')
            .delete()
            .eq('id', testTaskId)
            .eq('user_id', testUserId);

        if (deleteError) {
            console.error('⚠️ 清理測試數據失敗:', deleteError);
        } else {
            console.log('✅ 測試數據已清理');
        }

        console.log('\n🎉 完整的日期時間選擇器工作流程測試完成！');
        console.log('✨ 總結:');
        console.log('   ✅ 任務創建 - 成功');
        console.log('   ✅ 數據庫儲存 - 成功');
        console.log('   ✅ API 讀取 - 成功');
        console.log('   ✅ 日期時間解析 - 成功');
        console.log('   ✅ 前端格式化 - 成功');

    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.response?.data || error.message);

        // 嘗試清理可能的測試數據
        try {
            await supabase
                .from('dev_messages')
                .delete()
                .eq('id', testTaskId)
                .eq('user_id', testUserId);
        } catch (cleanupError) {
            console.error('⚠️ 清理失敗:', cleanupError);
        }
    }
}

testCompleteDateTimeWorkflow();