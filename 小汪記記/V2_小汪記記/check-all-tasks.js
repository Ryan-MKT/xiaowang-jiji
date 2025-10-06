require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkAllTasks() {
  const { data, error } = await supabase
    .from('dev_messages')
    .select('id, message_text, created_at, scheduled_date, completed')
    .eq('user_id', 'U2a9005032be2240a6816d29ae28d9294')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('查詢錯誤:', error);
    return;
  }

  console.log('=== 數據庫中的所有任務 ===');
  console.log('總數:', data.length);
  console.log('');

  data.forEach((task, index) => {
    console.log(`${index + 1}. ${task.message_text}`);
    console.log(`   created_at: ${task.created_at}`);
    console.log(`   scheduled_date: ${task.scheduled_date}`);
    console.log(`   completed: ${task.completed}`);
    console.log('');
  });

  process.exit(0);
}

checkAllTasks();
