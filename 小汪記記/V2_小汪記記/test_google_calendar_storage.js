// 測試 Google Calendar 選項儲存功能
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testGoogleCalendarStorage() {
  try {
    console.log('🧪 測試 Google Calendar 選項儲存功能...');
    console.log('');

    const tablePrefix = process.env.TABLE_PREFIX || '';
    const tableName = tablePrefix + 'messages';

    // 首先檢查表格是否有 google_calendar_enabled 欄位
    console.log('1️⃣ 檢查表格結構...');
    let columnsError = null;

    try {
      // 嘗試查詢包含 google_calendar_enabled 欄位的記錄
      const { data: testQuery, error: testError } = await supabase
        .from(tableName)
        .select('google_calendar_enabled')
        .limit(1);

      if (testError) {
        columnsError = testError;
      }
    } catch (error) {
      columnsError = error;
    }

    if (columnsError) {
      console.error('❌ 檢查表格結構失敗:', columnsError);
      console.log('');
      console.log('📝 請手動執行以下 SQL 來新增欄位:');
      console.log('ALTER TABLE dev_messages ADD COLUMN google_calendar_enabled BOOLEAN DEFAULT FALSE;');
      return;
    }

    console.log('✅ 表格結構檢查完成');
    console.log('');

    // 測試儲存 Google Calendar 為 true 的任務
    console.log('2️⃣ 測試儲存 Google Calendar = true 的任務...');
    const testTaskTrue = {
      user_id: 'test_user_google_cal',
      message_text: '測試Google日曆功能_開啟',
      note: '這是一個測試任務，Google日曆選項為是',
      tag: '測試',
      scheduled_date: '2025-09-27T15:30:00+08:00',
      google_calendar_enabled: true
    };

    const { data: insertTrue, error: insertTrueError } = await supabase
      .from(tableName)
      .insert(testTaskTrue)
      .select();

    if (insertTrueError) {
      console.error('❌ 儲存失敗:', insertTrueError);
      return;
    }

    console.log('✅ 儲存成功:', insertTrue[0]);
    console.log('');

    // 測試儲存 Google Calendar 為 false 的任務
    console.log('3️⃣ 測試儲存 Google Calendar = false 的任務...');
    const testTaskFalse = {
      user_id: 'test_user_google_cal',
      message_text: '測試Google日曆功能_關閉',
      note: '這是一個測試任務，Google日曆選項為否',
      tag: '測試',
      scheduled_date: '2025-09-27T16:00:00+08:00',
      google_calendar_enabled: false
    };

    const { data: insertFalse, error: insertFalseError } = await supabase
      .from(tableName)
      .insert(testTaskFalse)
      .select();

    if (insertFalseError) {
      console.error('❌ 儲存失敗:', insertFalseError);
      return;
    }

    console.log('✅ 儲存成功:', insertFalse[0]);
    console.log('');

    // 驗證儲存結果
    console.log('4️⃣ 驗證儲存結果...');
    const { data: testResults, error: queryError } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', 'test_user_google_cal')
      .in('message_text', ['測試Google日曆功能_開啟', '測試Google日曆功能_關閉']);

    if (queryError) {
      console.error('❌ 查詢失敗:', queryError);
      return;
    }

    console.log('✅ 查詢結果:');
    testResults.forEach((record, index) => {
      console.log(`${index + 1}. 任務: ${record.message_text}`);
      console.log(`   Google日曆: ${record.google_calendar_enabled ? '是' : '否'} (${record.google_calendar_enabled})`);
      console.log(`   預定時間: ${record.scheduled_date}`);
      console.log(`   備註: ${record.note}`);
      console.log('');
    });

    // 測試更新功能
    console.log('5️⃣ 測試更新 Google Calendar 選項...');
    const { data: updateResult, error: updateError } = await supabase
      .from(tableName)
      .update({ google_calendar_enabled: true })
      .eq('user_id', 'test_user_google_cal')
      .eq('message_text', '測試Google日曆功能_關閉')
      .select();

    if (updateError) {
      console.error('❌ 更新失敗:', updateError);
      return;
    }

    console.log('✅ 更新成功:', updateResult[0]);
    console.log('');

    console.log('🎉 所有測試完成！Google Calendar 儲存功能正常運作。');
    console.log('');
    console.log('🧹 清理測試資料...');

    // 清理測試資料
    const { error: cleanupError } = await supabase
      .from(tableName)
      .delete()
      .eq('user_id', 'test_user_google_cal');

    if (cleanupError) {
      console.warn('⚠️ 清理測試資料失敗:', cleanupError);
    } else {
      console.log('✅ 測試資料清理完成');
    }

  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
  }
}

testGoogleCalendarStorage();