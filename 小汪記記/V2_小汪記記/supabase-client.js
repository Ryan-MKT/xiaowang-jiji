// Supabase 客戶端配置
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  }
});

console.log('✅ Supabase 客戶端初始化成功 (UTF-8 支援)');

module.exports = supabase;