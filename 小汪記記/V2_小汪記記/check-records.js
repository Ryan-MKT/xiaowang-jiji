const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkRecords() {
  console.log('檢查 ID:320-340 的記錄差異...');

  const { data, error } = await supabase
    .from('dev_collections')
    .select('*')
    .gte('id', 320)
    .lte('id', 340)
    .order('id', { ascending: true });

  if (error) {
    console.error('查詢失敗:', error);
    return;
  }

  console.log(`找到 ${data.length} 筆記錄`);

  data.forEach(record => {
    console.log(`\nID:${record.id} - ${record.created_at}`);
    console.log(`   Title: ${record.title}`);
    console.log(`   Preview Title: ${record.preview_title || 'NO_DATA'}`);
    console.log(`   Preview Description: ${record.preview_description ? 'HAS_DATA' : 'NO_DATA'}`);
    console.log(`   Preview Image: ${record.preview_image ? 'HAS_DATA' : 'NO_DATA'}`);
    console.log(`   Social Platform: ${record.social_platform || 'NO_DATA'}`);
    console.log(`   AI Summary: ${record.ai_summary ? 'HAS_DATA' : 'NO_DATA'}`);

    // 檢查 content 結構
    if (record.content) {
      console.log(`   Content Keys: ${Object.keys(record.content).join(', ')}`);
    }
  });
}

checkRecords().catch(console.error);