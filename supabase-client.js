const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// 檢查環境變數
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase 環境變數未設定，資料庫功能將停用');
  module.exports = { supabase: null };
} else {
  // 建立 Supabase 客戶端
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase 客戶端初始化成功');
  module.exports = { supabase };
}