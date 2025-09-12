require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 檢查資料庫表結構...\n');

async function listTables() {
  try {
    // 檢查 information_schema 來看有什麼表
    const { data, error } = await supabase
      .rpc('list_tables');

    if (error) {
      console.log('❌ 無法使用 RPC 查詢，嘗試直接查詢已知表...\n');
      
      // 嘗試查詢一些已知的表
      const tables = ['dev_messages', 'dev_tags', 'dev_tasks', 'dev_checkouts', 'dev_tokens', 'dev_paid_users'];
      
      for (const table of tables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (!tableError) {
            console.log(`✅ 表 ${table} 存在`);
            if (tableData && tableData.length > 0) {
              console.log(`   - 欄位: ${Object.keys(tableData[0]).join(', ')}`);
            } else {
              console.log(`   - 表為空`);
            }
          } else {
            console.log(`❌ 表 ${table} 不存在或無權限: ${tableError.message}`);
          }
        } catch (e) {
          console.log(`❌ 檢查表 ${table} 時發生錯誤: ${e.message}`);
        }
        console.log('');
      }
    } else {
      console.log('✅ 資料庫表列表:');
      console.log(data);
    }

  } catch (error) {
    console.error('❌ 檢查表結構時發生錯誤:', error);
  }
}

listTables();