const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkDatabaseSchema() {
  console.log('🔍 檢查 dev_collections 表結構...');

  try {
    // 嘗試選擇所有欄位來查看結構
    const { data, error } = await supabase
      .from('dev_collections')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ 查詢失敗:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ 找到記錄');
      console.log('📋 資料表欄位:', Object.keys(data[0]));
      console.log('📄 範例記錄:', data[0]);
    } else {
      console.log('⚠️ 表中沒有記錄，嘗試描述表結構...');

      // 如果沒有記錄，嘗試插入一個測試記錄來看看錯誤
      const testData = {
        user_id: 'test',
        title: 'test',
        url: 'test'
      };

      const { error: insertError } = await supabase
        .from('dev_collections')
        .insert(testData);

      console.log('🧪 測試插入結果:', insertError || 'SUCCESS');
    }
  } catch (err) {
    console.error('❌ 檢查失敗:', err);
  }
}

checkDatabaseSchema().catch(console.error);