require('dotenv').config();
const { supabase } = require('./supabase-client');

async function testDatabase() {
  console.log('🧪 測試 Supabase 資料庫讀寫功能...');
  
  if (!supabase) {
    console.error('❌ Supabase 客戶端未初始化');
    return;
  }

  try {
    // 測試 1: 寫入 dev_messages 表
    console.log('\n📝 測試 1: 寫入 dev_messages 表');
    const testMessage = {
      user_id: 'test_user_' + Date.now(),
      message_text: '測試訊息 - ' + new Date().toLocaleString('zh-TW')
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('dev_messages')
      .insert(testMessage)
      .select();
    
    if (insertError) {
      console.error('❌ 寫入失敗:', insertError.message);
    } else {
      console.log('✅ 寫入成功');
      console.log('   新記錄 ID:', insertData[0].id);
    }

    // 測試 2: 讀取 dev_messages 表
    console.log('\n📖 測試 2: 讀取 dev_messages 表 (最新 3 筆記錄)');
    const { data: readData, error: readError } = await supabase
      .from('dev_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (readError) {
      console.error('❌ 讀取失敗:', readError.message);
    } else {
      console.log('✅ 讀取成功');
      console.log(`   共 ${readData.length} 筆記錄`);
      readData.forEach((record, index) => {
        console.log(`   ${index + 1}. [${record.id}] ${record.user_id}: ${record.message_text}`);
      });
    }

    // 測試 3: 查詢 dev_tags 表
    console.log('\n🏷️  測試 3: 查詢 dev_tags 表');
    const { data: tagsData, error: tagsError } = await supabase
      .from('dev_tags')
      .select('*')
      .limit(5);
    
    if (tagsError) {
      console.error('❌ 查詢 dev_tags 失敗:', tagsError.message);
    } else {
      console.log('✅ 查詢 dev_tags 成功');
      console.log(`   共 ${tagsData.length} 個標籤`);
      tagsData.forEach((tag, index) => {
        console.log(`   ${index + 1}. ${tag.icon} ${tag.name} (${tag.color})`);
      });
    }

    // 測試 4: 查詢 favorite_tasks 表
    console.log('\n⭐ 測試 4: 查詢 favorite_tasks 表');
    const { data: tasksData, error: tasksError } = await supabase
      .from('favorite_tasks')
      .select('*')
      .limit(5);
    
    if (tasksError) {
      console.error('❌ 查詢 favorite_tasks 失敗:', tasksError.message);
    } else {
      console.log('✅ 查詢 favorite_tasks 成功');
      console.log(`   共 ${tasksData.length} 個收藏任務`);
      tasksData.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.name} (使用 ${task.used_count} 次)`);
      });
    }

    console.log('\n🎉 所有資料庫測試完成！');
    
  } catch (err) {
    console.error('💥 測試過程發生錯誤:', err.message);
  }
}

// 執行測試
testDatabase()
  .then(() => {
    console.log('✨ 資料庫測試程序執行完畢');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 程序執行錯誤:', err);
    process.exit(1);
  });