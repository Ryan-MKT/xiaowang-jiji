require('dotenv').config();
const { supabase } = require('./supabase-client');

async function checkTables() {
  console.log('🔍 檢查 Supabase 資料庫表格...');
  
  if (!supabase) {
    console.error('❌ Supabase 客戶端未初始化');
    return;
  }

  const tablesToCheck = ['dev_messages', 'dev_tags', 'favorite_tasks'];
  
  for (const tableName of tablesToCheck) {
    try {
      console.log(`\n📋 檢查表格: ${tableName}`);
      
      // 嘗試查詢表格的前幾筆記錄
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ 表格 ${tableName} 不存在或無法訪問:`);
        console.error(`   錯誤: ${error.message}`);
        console.error(`   代碼: ${error.code}`);
      } else {
        console.log(`✅ 表格 ${tableName} 存在並可訪問`);
        console.log(`   記錄數量: ${data ? data.length : 0}`);
        if (data && data.length > 0) {
          console.log(`   欄位: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.error(`💥 檢查表格 ${tableName} 時發生錯誤:`, err.message);
    }
  }
  
  console.log('\n🎯 表格檢查完成！');
}

// 執行檢查
checkTables()
  .then(() => {
    console.log('✨ 程序執行完畢');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 程序執行錯誤:', err);
    process.exit(1);
  });