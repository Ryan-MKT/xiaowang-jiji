const { supabase } = require('./supabase-client');
const fs = require('fs');
const path = require('path');

// 讀取環境變數
require('dotenv').config();

async function addAiTagsColumn() {
    try {
        console.log('🔧 開始添加 ai_tags 欄位到 dev_messages 表格...');

        // 讀取 SQL 檔案
        const sqlFilePath = path.join(__dirname, 'add-ai-tags-to-dev-messages.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // 分割 SQL 指令
        const sqlCommands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);

        for (let i = 0; i < sqlCommands.length; i++) {
            const cmd = sqlCommands[i].trim();
            if (cmd) {
                console.log(`📝 執行 SQL 指令 ${i + 1}: ${cmd.substring(0, 50)}...`);

                const { data, error } = await supabase.rpc('exec_sql', {
                    query: cmd + ';'
                });

                if (error) {
                    console.error(`❌ SQL 指令 ${i + 1} 執行失敗:`, error);
                } else {
                    console.log(`✅ SQL 指令 ${i + 1} 執行成功`);
                    if (data) {
                        console.log('📊 結果:', data);
                    }
                }
            }
        }

        console.log('🎉 ai_tags 欄位添加完成!');

    } catch (error) {
        console.error('❌ 執行過程中發生錯誤:', error);
    }
}

// 如果直接執行此檔案
if (require.main === module) {
    addAiTagsColumn().then(() => {
        console.log('✅ 腳本執行完成');
        process.exit(0);
    }).catch(error => {
        console.error('❌ 腳本執行失敗:', error);
        process.exit(1);
    });
}

module.exports = { addAiTagsColumn };