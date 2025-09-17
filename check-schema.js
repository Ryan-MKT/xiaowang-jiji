const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log('🔍 檢查 dev_messages 表格 schema...\n');

    try {
        // 檢查表格結構
        const { data: columns, error } = await supabase
            .rpc('get_table_columns', {
                table_name: 'dev_messages'
            });

        if (error) {
            console.log('⚠️ RPC 調用失敗，使用 information_schema 查詢...');

            // 使用 information_schema 查詢
            const { data: schemaData, error: schemaError } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type, is_nullable')
                .eq('table_name', 'dev_messages')
                .order('ordinal_position');

            if (schemaError) {
                console.log('❌ Schema 查詢失敗，手動測試插入...');

                // 手動測試插入不同格式的 reminder_time
                const testValues = [
                    { name: 'TEXT格式', value: '10分鐘' },
                    { name: '時間格式', value: '10:00' },
                    { name: 'NULL值', value: null }
                ];

                for (const test of testValues) {
                    console.log(`\n🧪 測試 ${test.name}: "${test.value}"`);

                    try {
                        const { data, error: insertError } = await supabase
                            .from('dev_messages')
                            .insert([{
                                id: Date.now(),
                                user_id: 'schema-test-user',
                                message_text: `Schema測試 - ${test.name}`,
                                reminder_time: test.value
                            }]);

                        if (insertError) {
                            console.log(`❌ 插入失敗:`, insertError.message);
                            if (insertError.code) {
                                console.log(`   錯誤代碼: ${insertError.code}`);
                            }
                        } else {
                            console.log(`✅ 插入成功`);

                            // 立即清理
                            await supabase
                                .from('dev_messages')
                                .delete()
                                .eq('user_id', 'schema-test-user');
                        }
                    } catch (err) {
                        console.log(`❌ 異常:`, err.message);
                    }
                }
            } else {
                console.log('✅ 表格結構:');
                schemaData.forEach(col => {
                    console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
                });
            }
        } else {
            console.log('✅ 表格欄位:', columns);
        }

    } catch (err) {
        console.error('❌ 檢查過程中發生錯誤:', err);
    }
}

checkSchema();