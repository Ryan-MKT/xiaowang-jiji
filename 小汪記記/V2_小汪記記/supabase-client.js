// Supabase 客戶端配置
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// 使用 SERVICE_ROLE_KEY 以繞過 RLS 政策限制
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase 客戶端初始化成功 (UTF-8 支援，使用', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE_KEY' : 'ANON_KEY', ')');

module.exports = supabase;