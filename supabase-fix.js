// 這是要插入到 server.js 中的修正程式碼
// 位置：在 "console.log(`🔄 收藏任務同步更新: ${taggedText}`);" 之後

        // 同步更新 Supabase favorite_tasks 表
        if (supabase) {
          try {
            // 從任務文字中提取標籤
            const tagMatch = taggedText.match(/^\((.+?)\)/);
            const extractedTag = tagMatch ? tagMatch[1] : '';
            
            const { data, error } = await supabase
              .from('favorite_tasks')
              .update({
                name: taggedText,
                category: extractedTag,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
              .eq('name', originalTask.text);
            
            if (error) {
              console.error('❌ [收藏標籤同步] Supabase 更新錯誤:', error);
            } else {
              console.log(`✅ [收藏標籤同步] Supabase 已更新: ${taggedText} (標籤: ${extractedTag})`);
            }
          } catch (dbError) {
            console.error('💥 [收藏標籤同步] 資料庫連線錯誤:', dbError);
          }
        } else {
          console.log('🔌 [收藏標籤同步] 無 Supabase 連線，僅更新記憶體');
        }