// 強制刷新 Supabase 連接和快取
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function forceSupabaseRefresh() {
  console.log('🔄 強制刷新 Supabase 連接和快取...');
  
  try {
    // 創建新的 Supabase 客戶端
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      db: { schema: 'public' },
      auth: { persistSession: false }
    });
    
    console.log('📡 測試基本連接...');
    
    // 1. 測試基本連接
    const { data: healthCheck, error: healthError } = await supabase
      .from('dev_messages')  // 使用已知存在的表格
      .select('count')
      .limit(1);
      
    if (healthError) {
      console.error('❌ 基本連接失敗:', healthError);
      return false;
    }
    
    console.log('✅ 基本連接正常');
    
    // 2. 直接測試 dev_tags 表格訪問
    console.log('🏷️ 測試 dev_tags 表格訪問...');
    
    const { data: tagsTest, error: tagsError } = await supabase
      .from('dev_tags')
      .select('count')
      .limit(1);
    
    if (tagsError) {
      console.error('❌ dev_tags 表格訪問失敗:', tagsError);
      
      // 3. 嘗試手動重新建立表格連接
      console.log('🔧 嘗試重新建立表格連接...');
      
      // 使用 RPC 嘗試刷新 schema 快取
      const { error: rpcError } = await supabase.rpc('pg_notify', {
        channel: 'pgrst',
        payload: 'reload schema'
      });
      
      if (rpcError) {
        console.log('⚠️ RPC 刷新失敗，這是正常的');
      }
      
      return false;
    }
    
    console.log('✅ dev_tags 表格訪問正常！');
    
    // 4. 測試實際的 CRUD 操作
    console.log('🧪 測試 CRUD 操作...');
    
    const testUserId = 'U2a9005032be2240a6816d29ae28d9294';
    const testTagName = `連接測試_${Date.now()}`;
    
    // 插入測試
    const { data: insertResult, error: insertError } = await supabase
      .from('dev_tags')
      .insert({
        user_id: testUserId,
        name: testTagName,
        color: '#00FF00',
        icon: '✅',
        sort_order: 99,
        is_active: true
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ 插入測試失敗:', insertError);
      return false;
    }
    
    console.log('✅ 插入測試成功:', insertResult);
    
    // 查詢測試
    const { data: selectResult, error: selectError } = await supabase
      .from('dev_tags')
      .select('*')
      .eq('user_id', testUserId)
      .order('sort_order');
    
    if (selectError) {
      console.error('❌ 查詢測試失敗:', selectError);
      return false;
    }
    
    console.log(`✅ 查詢測試成功，共 ${selectResult.length} 個標籤`);
    selectResult.forEach(tag => {
      console.log(`  ${tag.icon} ${tag.name} (sort_order: ${tag.sort_order})`);
    });
    
    // 清理測試數據
    await supabase
      .from('dev_tags')
      .delete()
      .eq('name', testTagName);
    
    console.log('🎉 Supabase 連接完全正常！問題已解決！');
    return true;
    
  } catch (error) {
    console.error('💥 強制刷新過程發生錯誤:', error);
    return false;
  }
}

if (require.main === module) {
  forceSupabaseRefresh().then(success => {
    if (success) {
      console.log('🚀 現在可以重新測試前端 API 了！');
      console.log('📝 執行: node test-frontend-api.js');
    } else {
      console.log('❌ 需要手動在 Supabase Dashboard 操作');
    }
  });
}

module.exports = { forceSupabaseRefresh };