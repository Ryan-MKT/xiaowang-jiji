const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testReminderSave() {
    console.log('🧪 測試提醒時間儲存功能...\n');

    const testUserId = 'reminder-test-user';
    const testTaskId = Date.now(); // 使用當前時間戳作為唯一 ID
    const testReminder = '10分鐘'; // 測試提醒時間

    try {
        // 步驟 1: 創建包含提醒時間的新任務
        console.log('📝 步驟 1: 創建包含提醒時間的新任務...');
        const createResponse = await axios.post('http://localhost:3003/api/save-task', {
            taskId: testTaskId,
            title: '提醒時間測試任務',
            note: '這是提醒時間測試',
            tag: '測試',
            date: '2025-09-16',
            reminder: testReminder, // 重要：設定提醒時間
            repeat: '單次'
        }, {
            headers: {
                'x-user-id': testUserId,
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 完整 API 回應狀態:', createResponse.status);
        console.log('📊 完整 API 回應 headers:', createResponse.headers);

        console.log('✅ API 回應:', createResponse.data);

        // 步驟 2: 從數據庫直接驗證數據
        console.log('\n🔍 步驟 2: 從數據庫直接驗證數據...');
        const { data: dbData, error: dbError } = await supabase
            .from('dev_messages')
            .select('id, message_text, reminder_time, repeat_pattern, user_id')
            .eq('id', testTaskId)
            .eq('user_id', testUserId)
            .single();

        if (dbError) {
            console.error('❌ 數據庫查詢錯誤:', dbError);
        } else {
            console.log('✅ 數據庫中的任務數據:');
            console.log(`  📋 任務 ID: ${dbData.id}`);
            console.log(`  👤 用戶: ${dbData.user_id}`);
            console.log(`  📝 內容: ${dbData.message_text}`);
            console.log(`  📢 提醒時間: ${dbData.reminder_time || 'NULL'}`);
            console.log(`  🔄 重複模式: ${dbData.repeat_pattern || 'NULL'}`);
        }

        // 步驟 3: 通過 API 端點獲取任務數據
        console.log('\n📡 步驟 3: 通過 API 端點獲取任務數據...');
        const getResponse = await axios.get(`http://localhost:3003/api/task-note/${testTaskId}`, {
            headers: {
                'x-user-id': testUserId
            }
        });

        console.log('✅ API 讀取結果:', JSON.stringify(getResponse.data, null, 2));

        // 步驟 4: 清理測試數據
        console.log('\n🧹 步驟 4: 清理測試數據...');
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

        // 總結
        console.log('\n🎯 測試總結:');
        if (dbData && dbData.reminder_time === testReminder) {
            console.log('✅ 提醒時間儲存成功！');
        } else {
            console.log('❌ 提醒時間儲存失敗！');
            console.log(`  預期: ${testReminder}`);
            console.log(`  實際: ${dbData?.reminder_time || 'NULL'}`);
        }

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

testReminderSave();