// 創建 dev_tags 表格 - 修復版本
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function createDevTagsTable() {
  console.log('🔧 開始創建 dev_tags 表格...');
  
  try {
    // 建立標籤表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS dev_tags (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name VARCHAR(20) NOT NULL, -- LINE Quick Reply 標籤長度限制
        color VARCHAR(7) DEFAULT '#4169E1', -- 十六進位顏色代碼
        icon VARCHAR(2) DEFAULT '🏷️', -- emoji 圖標
        sort_order INTEGER DEFAULT 0, -- 顯示順序 (修復：使用 sort_order)
        is_active BOOLEAN DEFAULT true, -- 是否啟用
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- 確保每個用戶的標籤名稱唯一
        UNIQUE(user_id, name)
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });

    if (createError) {
      console.error('❌ 創建表格失敗:', createError);
      // 嘗試直接使用原始 SQL API
      console.log('🔄 嘗試直接執行 SQL...');
      
      // 使用 rpc 創建表格
      const { data, error } = await supabase.rpc('create_dev_tags_table');
      
      if (error) {
        console.log('💡 使用直接方法創建表格...');
        await createTableDirectly();
      } else {
        console.log('✅ 使用 RPC 創建表格成功');
      }
    } else {
      console.log('✅ 表格創建成功');
    }

    // 創建索引
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_dev_tags_user_id ON dev_tags(user_id);
      CREATE INDEX IF NOT EXISTS idx_dev_tags_active ON dev_tags(user_id, is_active, sort_order);
    `;

    console.log('📊 創建索引...');

    // 插入測試用戶的標籤
    console.log('📋 插入用戶標籤...');
    
    const testUserId = 'U2a9005032be2240a6816d29ae28d9294';
    const defaultTags = [
      { name: '工作', color: '#FF6B6B', icon: '💼', sort_order: 1 },
      { name: '學習', color: '#4ECDC4', icon: '📚', sort_order: 2 },
      { name: '運動', color: '#45B7D1', icon: '🏃‍♂️', sort_order: 3 },
      { name: 'AI', color: '#9B59B6', icon: '🤖', sort_order: 4 },
      { name: '日本', color: '#E74C3C', icon: '🗾', sort_order: 5 },
      { name: '香港', color: '#E67E22', icon: '🇭🇰', sort_order: 6 }
    ];

    for (const tag of defaultTags) {
      const { error: insertError } = await supabase
        .from('dev_tags')
        .upsert({
          user_id: testUserId,
          name: tag.name,
          color: tag.color,
          icon: tag.icon,
          sort_order: tag.sort_order,
          is_active: true
        }, {
          onConflict: 'user_id,name'
        });

      if (insertError) {
        console.log(`⚠️ 插入標籤 "${tag.name}" 失敗:`, insertError.message);
      } else {
        console.log(`✅ 插入標籤: ${tag.icon} ${tag.name}`);
      }
    }

    // 驗證表格和數據
    console.log('\n🔍 驗證創建結果...');
    
    const { data: tags, error: selectError } = await supabase
      .from('dev_tags')
      .select('*')
      .eq('user_id', testUserId)
      .order('sort_order');

    if (selectError) {
      console.error('❌ 查詢失敗:', selectError);
    } else {
      console.log(`✅ 成功！用戶共有 ${tags.length} 個標籤:`);
      tags.forEach(tag => {
        console.log(`  ${tag.icon} ${tag.name} (sort_order: ${tag.sort_order})`);
      });
      
      console.log('\n🎉 dev_tags 表格創建和初始化完成！');
      console.log('🎯 現在前端 API 調用應該可以正常工作了');
    }

  } catch (error) {
    console.error('💥 創建過程發生錯誤:', error);
  }
}

// 直接創建方法（如果 RPC 不可用）
async function createTableDirectly() {
  console.log('🔧 使用直接方法創建表格...');
  
  // 這裡需要用戶手動在 Supabase Dashboard 中執行 SQL
  console.log(`
📋 請在 Supabase Dashboard 的 SQL Editor 中執行以下 SQL:

CREATE TABLE IF NOT EXISTS dev_tags (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name VARCHAR(20) NOT NULL,
  color VARCHAR(7) DEFAULT '#4169E1',
  icon VARCHAR(2) DEFAULT '🏷️',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dev_tags_user_id ON dev_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_tags_active ON dev_tags(user_id, is_active, sort_order);

-- 插入測試數據
INSERT INTO dev_tags (user_id, name, color, icon, sort_order) VALUES
('U2a9005032be2240a6816d29ae28d9294', '工作', '#FF6B6B', '💼', 1),
('U2a9005032be2240a6816d29ae28d9294', '學習', '#4ECDC4', '📚', 2),
('U2a9005032be2240a6816d29ae28d9294', '運動', '#45B7D1', '🏃‍♂️', 3),
('U2a9005032be2240a6816d29ae28d9294', 'AI', '#9B59B6', '🤖', 4),
('U2a9005032be2240a6816d29ae28d9294', '日本', '#E74C3C', '🗾', 5),
('U2a9005032be2240a6816d29ae28d9294', '香港', '#E67E22', '🇭🇰', 6)
ON CONFLICT (user_id, name) DO NOTHING;
  `);
}

if (require.main === module) {
  createDevTagsTable();
}

module.exports = { createDevTagsTable };