const { supabase } = require('./supabase-client');

async function testDatabaseConnection() {
  console.log('🔍 測試 Supabase 連線...');
  
  try {
    // 測試連線
    const { data, error } = await supabase
      .from('messages')
      .select('count', { count: 'exact' });
    
    if (error) {
      console.error('❌ 資料庫連線失敗:', error);
      return false;
    }
    
    console.log('✅ Supabase 連線成功！');
    console.log('📊 messages 資料表記錄數:', data);
    return true;
    
  } catch (err) {
    console.error('❌ 連線測試錯誤:', err);
    return false;
  }
}

// 如果直接執行此檔案則測試連線
if (require.main === module) {
  testDatabaseConnection();
}

module.exports = { testDatabaseConnection };