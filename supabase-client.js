const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// 建立 Supabase 客戶端
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };