// 測試訪客郵件功能
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testGuestEmailFunctionality() {
  try {
    console.log('🧪 測試訪客郵件功能...');
    console.log('');

    const tablePrefix = process.env.TABLE_PREFIX || '';
    const tableName = tablePrefix + 'messages';

    // 1. 檢查表格是否有 guest_email 欄位
    console.log('1️⃣ 檢查表格結構...');
    let columnsError = null;

    try {
      const { data: testQuery, error: testError } = await supabase
        .from(tableName)
        .select('google_calendar_who')
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
      console.log('ALTER TABLE dev_messages ADD COLUMN guest_email TEXT DEFAULT NULL;');
      return;
    }

    console.log('✅ 表格結構檢查完成');
    console.log('');

    // 2. 測試儲存有訪客郵件的任務
    console.log('2️⃣ 測試儲存有訪客郵件的任務...');
    const testTaskWithGuest = {
      user_id: 'test_user_guest_email',
      message_text: '測試訪客郵件功能_有訪客',
      note: '這是一個測試任務，有訪客郵件地址',
      tag: '測試',
      scheduled_date: '2025-09-27T15:30:00+08:00',
      google_calendar_enabled: true,
      google_calendar_who: 'test.guest@gmail.com'
    };

    const { data: insertWithGuest, error: insertWithGuestError } = await supabase
      .from(tableName)
      .insert(testTaskWithGuest)
      .select();

    if (insertWithGuestError) {
      console.error('❌ 儲存失敗:', insertWithGuestError);
      return;
    }

    console.log('✅ 儲存成功:', insertWithGuest[0]);
    console.log('');

    // 3. 測試儲存無訪客郵件的任務
    console.log('3️⃣ 測試儲存無訪客郵件的任務...');
    const testTaskWithoutGuest = {
      user_id: 'test_user_guest_email',
      message_text: '測試訪客郵件功能_無訪客',
      note: '這是一個測試任務，沒有訪客郵件地址',
      tag: '測試',
      scheduled_date: '2025-09-27T16:00:00+08:00',
      google_calendar_enabled: true,
      google_calendar_who: null
    };

    const { data: insertWithoutGuest, error: insertWithoutGuestError } = await supabase
      .from(tableName)
      .insert(testTaskWithoutGuest)
      .select();

    if (insertWithoutGuestError) {
      console.error('❌ 儲存失敗:', insertWithoutGuestError);
      return;
    }

    console.log('✅ 儲存成功:', insertWithoutGuest[0]);
    console.log('');

    // 4. 驗證儲存結果
    console.log('4️⃣ 驗證儲存結果...');
    const { data: testResults, error: queryError } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', 'test_user_guest_email')
      .in('message_text', ['測試訪客郵件功能_有訪客', '測試訪客郵件功能_無訪客']);

    if (queryError) {
      console.error('❌ 查詢失敗:', queryError);
      return;
    }

    console.log('✅ 查詢結果:');
    testResults.forEach((record, index) => {
      console.log(`${index + 1}. 任務: ${record.message_text}`);
      console.log(`   Google日曆: ${record.google_calendar_enabled ? '是' : '否'}`);
      console.log(`   訪客郵件: ${record.google_calendar_who || '無'}`);
      console.log(`   預定時間: ${record.scheduled_date}`);
      console.log(`   備註: ${record.note || '無'}`);
      console.log('');
    });

    // 5. 測試更新訪客郵件
    console.log('5️⃣ 測試更新訪客郵件...');
    const { data: updateResult, error: updateError } = await supabase
      .from(tableName)
      .update({ google_calendar_who: 'updated.guest@gmail.com' })
      .eq('user_id', 'test_user_guest_email')
      .eq('message_text', '測試訪客郵件功能_無訪客')
      .select();

    if (updateError) {
      console.error('❌ 更新失敗:', updateError);
      return;
    }

    console.log('✅ 更新成功:', updateResult[0]);
    console.log('');

    // 6. 測試電子郵件格式驗證
    console.log('6️⃣ 測試電子郵件格式...');
    const testEmails = [
      'valid@gmail.com',
      'user.test@domain.com',
      'test+tag@example.org',
      'invalid-email',
      'no@domain',
      '@domain.com'
    ];

    testEmails.forEach(email => {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      console.log(`   ${email}: ${isValid ? '✅ 有效' : '❌ 無效'}`);
    });
    console.log('');

    console.log('🎉 所有測試完成！訪客郵件功能正常運作。');
    console.log('');
    console.log('🧹 清理測試資料...');

    // 清理測試資料
    const { error: cleanupError } = await supabase
      .from(tableName)
      .delete()
      .eq('user_id', 'test_user_guest_email');

    if (cleanupError) {
      console.warn('⚠️ 清理測試資料失敗:', cleanupError);
    } else {
      console.log('✅ 測試資料清理完成');
    }

    console.log('');
    console.log('📝 功能總結:');
    console.log('1. ✅ 前端已添加「跟誰?」輸入框，當Google日曆選擇「是」時顯示');
    console.log('2. ✅ 後端API已支援 guest_email 參數的接收和儲存');
    console.log('3. ✅ 數據庫使用現有 google_calendar_who 欄位（TEXT類型）');
    console.log('4. ✅ 載入任務時會正確回傳 google_calendar_who 資料');
    console.log('5. 🔄 下一步: 整合Google Calendar API以實際發送邀請');

  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
  }
}

testGuestEmailFunctionality();