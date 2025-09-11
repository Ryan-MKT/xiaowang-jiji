require('dotenv').config();
const { supabase } = require('./supabase-client');

async function checkDevMessages() {
  console.log('🔍 檢查 dev_messages 表的訊息記錄...');
  
  if (!supabase) {
    console.error('❌ Supabase 客戶端未初始化');
    return;
  }

  try {
    // 查詢最新的 20 筆記錄
    console.log('\n📋 查詢最新 20 筆 dev_messages 記錄：');
    const { data, error } = await supabase
      .from('dev_messages')
      .select('id, user_id, message_text, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('❌ 查詢失敗:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  沒有找到任何訊息記錄');
      return;
    }

    console.log(`✅ 找到 ${data.length} 筆記錄\n`);
    
    // 顯示詳細記錄
    data.forEach((record, index) => {
      const createdAt = new Date(record.created_at).toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei'
      });
      
      console.log(`${index + 1}. ID: ${record.id}`);
      console.log(`   用戶ID: ${record.user_id}`);
      console.log(`   訊息內容: "${record.message_text}"`);
      console.log(`   建立時間: ${createdAt}`);
      console.log('   ────────────────────────────────────');
    });

    // 統計資訊
    const uniqueUsers = [...new Set(data.map(record => record.user_id))];
    console.log(`\n📊 統計資訊：`);
    console.log(`   總記錄數: ${data.length}`);
    console.log(`   獨立用戶數: ${uniqueUsers.length}`);
    console.log(`   用戶ID列表: ${uniqueUsers.join(', ')}`);

    // 檢查是否有實際內容的訊息
    const nonEmptyMessages = data.filter(record => record.message_text && record.message_text.trim() !== '');
    console.log(`   有內容的訊息: ${nonEmptyMessages.length} 筆`);

    if (nonEmptyMessages.length > 0) {
      console.log(`\n💬 有內容的訊息範例：`);
      nonEmptyMessages.slice(0, 5).forEach((record, index) => {
        console.log(`   ${index + 1}. "${record.message_text}"`);
      });
    }

  } catch (err) {
    console.error('💥 檢查過程發生錯誤:', err.message);
  }
}

// 執行檢查
checkDevMessages()
  .then(() => {
    console.log('\n✨ dev_messages 檢查完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 程序執行錯誤:', err);
    process.exit(1);
  });