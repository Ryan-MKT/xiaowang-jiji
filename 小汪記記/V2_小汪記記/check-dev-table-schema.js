// 檢查開發環境 6 個表的完整欄位結構
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getTableSchema(tableName) {
  console.log(`\n📋 ===== ${tableName} =====`);

  try {
    // 查詢表結構（從 information_schema）
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      // 如果 rpc 不可用，使用備用方法：查詢一行資料看欄位
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error(`❌ 查詢失敗:`, sampleError.message);
        return;
      }

      if (sampleData && sampleData.length > 0) {
        console.log('欄位列表（從實際資料推斷）:');
        Object.keys(sampleData[0]).forEach(col => {
          const value = sampleData[0][col];
          const type = typeof value === 'number' ? 'numeric' :
                      typeof value === 'boolean' ? 'boolean' :
                      value instanceof Date ? 'timestamp' :
                      Array.isArray(value) ? 'array' : 'text';
          console.log(`  - ${col}: ${type}`);
        });
      } else {
        console.log('⚠️  表是空的，無法推斷欄位');
      }
      return;
    }

    // 顯示欄位資訊
    if (data && data.length > 0) {
      console.log('完整欄位結構:');
      data.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
    }
  } catch (err) {
    console.error(`❌ 發生錯誤:`, err.message);
  }
}

async function main() {
  console.log('🔍 開始檢查開發環境 6 個表的結構...\n');
  console.log(`📍 連接到: ${supabaseUrl}\n`);

  const tables = [
    'dev_boxes',
    'dev_collections',
    'dev_frequent_tasks',
    'dev_guest',
    'dev_messages',
    'dev_tags'
  ];

  for (const table of tables) {
    await getTableSchema(table);
  }

  console.log('\n\n✅ 檢查完成！');
  process.exit(0);
}

main();
