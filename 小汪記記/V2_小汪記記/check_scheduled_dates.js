// 檢查 Supabase 數據庫中的預定日期儲存情況
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkScheduledDates() {
  try {
    console.log('🔍 檢查數據庫中的預定日期儲存情況...');

    const tablePrefix = process.env.TABLE_PREFIX || '';
    const tableName = tablePrefix + 'messages';

    // 查詢最近10筆有預定日期的任務
    const { data: withDates, error: withDatesError } = await supabase
      .from(tableName)
      .select('*')
      .not('scheduled_date', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (withDatesError) {
      console.error('❌ 查詢有預定日期的記錄時出錯:', withDatesError);
      return;
    }

    console.log(`✅ 找到 ${withDates.length} 筆有預定日期的記錄：`);
    withDates.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}`);
      console.log(`   訊息: ${record.message_text}`);
      console.log(`   預定日期: ${record.scheduled_date}`);
      console.log(`   建立時間: ${record.created_at}`);
      console.log(`   標籤: ${record.tag || '無'}`);
      console.log(`   備註: ${record.note || '無'}`);
      console.log('');
    });

    // 查詢最近10筆任務（無論是否有預定日期）
    const { data: recent, error: recentError } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ 查詢最近記錄時出錯:', recentError);
      return;
    }

    console.log(`📋 最近 ${recent.length} 筆任務記錄：`);
    recent.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}`);
      console.log(`   訊息: ${record.message_text}`);
      console.log(`   預定日期: ${record.scheduled_date || '無'}`);
      console.log(`   建立時間: ${record.created_at}`);
      console.log('');
    });

    // 特別檢查是否有任務名稱包含"卡片"的記錄
    const { data: cardTasks, error: cardError } = await supabase
      .from(tableName)
      .select('*')
      .ilike('message_text', '%卡片%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (cardError) {
      console.error('❌ 查詢卡片任務時出錯:', cardError);
      return;
    }

    console.log(`🎴 找到 ${cardTasks.length} 筆包含"卡片"的任務：`);
    cardTasks.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}`);
      console.log(`   訊息: ${record.message_text}`);
      console.log(`   預定日期: ${record.scheduled_date || '無'}`);
      console.log(`   建立時間: ${record.created_at}`);
      console.log(`   更新時間: ${record.updated_at || '無'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 檢查過程發生錯誤:', error);
  }
}

checkScheduledDates();