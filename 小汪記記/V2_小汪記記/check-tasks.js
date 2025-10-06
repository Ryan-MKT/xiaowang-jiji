require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkTasks() {
  const { data, error } = await supabase
    .from('dev_messages')
    .select('id, message_text, created_at, scheduled_date, completed')
    .eq('user_id', 'U2a9005032be2240a6816d29ae28d9294')
    .in('message_text', ['買按摩器或委託風馬', '亞洲創作者大會預告+公關索取', 'n8n學習', '回Kobe和寇馳第12月時間', 'Kevin 詢問訪談時間', '裘SHIOU和HARA和SUE改'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('查詢錯誤:', error);
    return;
  }

  console.log('找到的任務:');
  data.forEach(task => {
    console.log('- ' + task.message_text);
    console.log('  ID: ' + task.id);
    console.log('  created_at: ' + task.created_at);
    console.log('  scheduled_date: ' + task.scheduled_date);
    console.log('  completed: ' + task.completed);
    console.log('');
  });

  process.exit(0);
}

checkTasks();
