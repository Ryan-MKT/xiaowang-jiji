const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testRepeatPattern() {
    console.log('🧪 測試重複性任務欄位儲存功能...\n');

    const testUserId = 'repeat-test-user';
    const testTaskId = Date.now();
    const testRepeatPattern = '每天'; // 測試重複模式

    try {
        // 步驟 1: 創建包含重複模式的新任務
        console.log('📝 步驟 1: 創建包含重複模式的新任務...');
        const createResponse = await axios.post('http://localhost:3003/api/save-task', {
            taskId: testTaskId,
            title: '重複任務測試',
            note: '這是重複任務測試',
            tag: '測試',
            date: '2025-09-16',
            reminder: null,
            repeat: testRepeatPattern // 重要：設定重複模式
        }, {
            headers: {
                'x-user-id': testUserId,
                'Content-Type': 'application/json'
            }
        });

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
        if (dbData && dbData.repeat_pattern === testRepeatPattern) {
            console.log('✅ 重複模式儲存成功！');
            console.log(`✅ repeat_pattern 欄位可以正確儲存: "${testRepeatPattern}"`);
        } else {
            console.log('❌ 重複模式儲存失敗！');
            console.log(`  預期: ${testRepeatPattern}`);
            console.log(`  實際: ${dbData?.repeat_pattern || 'NULL'}`);
        }

        // 測試其他重複模式
        console.log('\n🧪 步驟 5: 測試其他重複模式...');
        const repeatOptions = ['每週', '每月', '每年', '不重複'];

        for (const repeatOption of repeatOptions) {
            const testId = Date.now() + Math.random();
            console.log(`\n🔍 測試 "${repeatOption}"`);

            try {
                const response = await axios.post('http://localhost:3003/api/save-task', {
                    taskId: testId,
                    title: `重複測試-${repeatOption}`,
                    note: '',
                    tag: null,
                    date: null,
                    reminder: null,
                    repeat: repeatOption === '不重複' ? null : repeatOption
                }, {
                    headers: {
                        'x-user-id': testUserId,
                        'Content-Type': 'application/json'
                    }
                });

                // 驗證儲存
                const { data: verifyData } = await supabase
                    .from('dev_messages')
                    .select('repeat_pattern')
                    .eq('id', testId)
                    .single();

                if (repeatOption === '不重複') {
                    if (verifyData.repeat_pattern === null) {
                        console.log(`  ✅ "${repeatOption}" 正確儲存為 NULL`);
                    } else {
                        console.log(`  ❌ "${repeatOption}" 儲存錯誤:`, verifyData.repeat_pattern);
                    }
                } else {
                    if (verifyData.repeat_pattern === repeatOption) {
                        console.log(`  ✅ "${repeatOption}" 儲存成功`);
                    } else {
                        console.log(`  ❌ "${repeatOption}" 儲存失敗:`, verifyData.repeat_pattern);
                    }
                }

                // 清理
                await supabase.from('dev_messages').delete().eq('id', testId);

            } catch (testError) {
                console.log(`  ❌ 測試 "${repeatOption}" 失敗:`, testError.message);
            }
        }

    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.response?.data || error.message);

        // 嘗試清理可能的測試數據
        try {
            await supabase
                .from('dev_messages')
                .delete()
                .eq('user_id', testUserId);
        } catch (cleanupError) {
            console.error('⚠️ 清理失敗:', cleanupError);
        }
    }
}

testRepeatPattern();