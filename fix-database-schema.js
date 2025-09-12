require('dotenv').config();
const { supabase } = require('./supabase-client');

console.log('🔧 修復資料庫 Schema 問題...');

async function fixDatabaseSchema() {
    try {
        // 1. 檢查現有表格結構
        console.log('📊 檢查 dev_messages 表格結構...');
        
        const { data: columns, error: columnsError } = await supabase
            .rpc('get_table_columns', { 
                table_name: 'dev_messages' 
            });
            
        if (columnsError) {
            console.log('❌ 無法執行 RPC，嘗試直接查詢...');
        }

        // 2. 嘗試添加 message_type 欄位
        console.log('🔧 添加 message_type 欄位...');
        
        const { error: alterError } = await supabase
            .from('dev_messages')
            .select('message_type')
            .limit(1);
            
        if (alterError && alterError.code === 'PGRST204') {
            console.log('❌ 確認 message_type 欄位不存在，需要手動添加');
            console.log('🔗 請執行以下 SQL 指令：');
            console.log('ALTER TABLE dev_messages ADD COLUMN message_type TEXT DEFAULT \'text\';');
            console.log('');
            console.log('💡 或使用 Supabase Dashboard 的 SQL Editor 執行 fix-message-type-column.sql');
        } else {
            console.log('✅ message_type 欄位已存在或可以正常訪問');
        }

        // 3. 檢查其他可能的問題
        console.log('🔍 檢查表格是否存在...');
        const { data: tableExists, error: tableError } = await supabase
            .from('dev_messages')
            .select('count')
            .limit(1);
            
        if (tableError) {
            console.log('❌ dev_messages 表格問題:', tableError);
            
            if (tableError.code === 'PGRST106') {
                console.log('🔧 嘗試創建 dev_messages 表格...');
                console.log('💡 請執行以下 SQL:');
                console.log(`
CREATE TABLE IF NOT EXISTS dev_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    task_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 啟用 RLS
ALTER TABLE dev_messages ENABLE ROW LEVEL SECURITY;

-- 創建 RLS 政策
CREATE POLICY "Users can insert their own messages" ON dev_messages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can view their own messages" ON dev_messages
    FOR SELECT USING (auth.uid()::text = user_id OR true);
                `);
            }
        } else {
            console.log('✅ dev_messages 表格存在且可訪問');
        }

        // 4. 測試寫入功能
        console.log('🧪 測試寫入功能...');
        const testData = {
            user_id: 'test_user_' + Date.now(),
            text: 'Schema 修復測試',
            message_type: 'text',
            task_id: Date.now()
        };

        const { data: insertData, error: insertError } = await supabase
            .from('dev_messages')
            .insert(testData)
            .select();

        if (insertError) {
            console.log('❌ 測試寫入失敗:', insertError);
        } else {
            console.log('✅ 測試寫入成功:', insertData);
            
            // 清理測試資料
            await supabase
                .from('dev_messages')
                .delete()
                .eq('user_id', testData.user_id);
        }

    } catch (error) {
        console.error('💥 修復過程發生錯誤:', error);
    }
}

// 執行修復
if (require.main === module) {
    fixDatabaseSchema().then(() => {
        console.log('🎯 Schema 檢查完成');
        process.exit(0);
    });
}

module.exports = { fixDatabaseSchema };