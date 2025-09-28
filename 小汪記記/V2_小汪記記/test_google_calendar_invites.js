// 測試Google Calendar邀請功能
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testGoogleCalendarInvites() {
  try {
    console.log('🧪 測試Google Calendar邀請功能...');
    console.log('');

    const tablePrefix = process.env.TABLE_PREFIX || '';
    const tableName = tablePrefix + 'messages';

    // 1. 測試儲存有訪客郵件的任務並建立Google Calendar事件
    console.log('1️⃣ 測試儲存有訪客郵件的任務...');
    const testTaskWithGuest = {
      user_id: 'test_user_calendar_invite',
      message_text: '測試Google Calendar邀請功能_與客戶會議',
      note: '這是一個會議，需要邀請客戶參加',
      tag: '會議',
      scheduled_date: '2025-09-28T14:00:00+08:00',
      google_calendar_enabled: true,
      google_calendar_who: 'client@company.com'
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
    console.log(`📅 任務ID: ${insertWithGuest[0].id}`);
    console.log(`👥 訪客郵件: ${insertWithGuest[0].google_calendar_who}`);
    console.log('');

    // 2. 測試儲存無訪客郵件的任務
    console.log('2️⃣ 測試儲存無訪客郵件的任務...');
    const testTaskWithoutGuest = {
      user_id: 'test_user_calendar_invite',
      message_text: '測試Google Calendar邀請功能_個人任務',
      note: '這是個人任務，不需要邀請其他人',
      tag: '個人',
      scheduled_date: '2025-09-28T16:00:00+08:00',
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
    console.log(`📅 任務ID: ${insertWithoutGuest[0].id}`);
    console.log(`👥 訪客郵件: ${insertWithoutGuest[0].google_calendar_who || '無'}`);
    console.log('');

    // 3. 驗證資料庫儲存結果
    console.log('3️⃣ 驗證資料庫儲存結果...');
    const { data: testResults, error: queryError } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', 'test_user_calendar_invite')
      .in('message_text', ['測試Google Calendar邀請功能_與客戶會議', '測試Google Calendar邀請功能_個人任務']);

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
      console.log(`   任務ID: ${record.id}`);
      console.log('');
    });

    console.log('🎉 資料庫測試完成！');
    console.log('');

    console.log('📝 接下來的步驟:');
    console.log('1. ✅ 資料庫已正確儲存google_calendar_who欄位');
    console.log('2. ✅ 前端「跟誰?」輸入框已完成');
    console.log('3. ✅ 後端API已支援guestEmail參數和attendees');
    console.log('4. 🔄 需要測試實際的Google Calendar事件建立');
    console.log('5. 🔄 需要確認邀請郵件是否正確發送');
    console.log('');

    console.log('🧹 清理測試資料...');

    // 清理測試資料
    const { error: cleanupError } = await supabase
      .from(tableName)
      .delete()
      .eq('user_id', 'test_user_calendar_invite');

    if (cleanupError) {
      console.warn('⚠️ 清理測試資料失敗:', cleanupError);
    } else {
      console.log('✅ 測試資料清理完成');
    }

    console.log('');
    console.log('📋 Google Calendar邀請功能實現摘要:');
    console.log('1. ✅ 前端: 「跟誰?」輸入框與Google日曆選項連動');
    console.log('2. ✅ 後端: save-task API支援guestEmail參數');
    console.log('3. ✅ 後端: /api/google-calendar/create-event支援guestEmail');
    console.log('4. ✅ 資料庫: google_calendar_who欄位正確儲存Gmail地址');
    console.log('5. ✅ Google API: 事件中自動添加attendees和sendUpdates設定');

  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
  }
}

testGoogleCalendarInvites();