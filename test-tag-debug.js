// 標籤更新問題診斷測試 - 2025-09-11
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function runAllTests() {
  console.log('🚀 開始全面診斷測試...');
  
  const testUserId = 'U2a9005032be2240a6816d29ae28d9294';
  const testTaskName = '測試任務' + Date.now();
  const testTag = '測試標籤';
  
  try {
    // 測試 1: 檢查 favorite_tasks 表格結構
    console.log('\n📋 測試 1: 檢查表格結構');
    const { data: schema, error: schemaError } = await supabase
      .from('favorite_tasks')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.error('❌ Schema 錯誤:', schemaError);
    } else {
      console.log('✅ favorite_tasks 表格存在');
      if (schema.length > 0) {
        console.log('📝 表格欄位:', Object.keys(schema[0]));
      }
    }
    
    // 測試 2: 檢查是否有 tag 欄位
    console.log('\n🏷️ 測試 2: 檢查 tag 欄位');
    const { error: tagTestError } = await supabase
      .from('favorite_tasks')
      .select('tag')
      .limit(1);
    
    if (tagTestError) {
      console.error('❌ tag 欄位不存在:', tagTestError);
    } else {
      console.log('✅ tag 欄位存在');
    }
    
    // 測試 3: 插入測試記錄
    console.log('\n➕ 測試 3: 插入測試記錄');
    const { data: insertData, error: insertError } = await supabase
      .from('favorite_tasks')
      .insert({
        user_id: testUserId,
        name: testTaskName,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (insertError) {
      console.error('❌ 插入失敗:', insertError);
      return;
    } else {
      console.log('✅ 測試記錄插入成功:', insertData);
    }
    
    // 測試 4: 查詢測試記錄
    console.log('\n🔍 測試 4: 查詢測試記錄');
    const { data: selectData, error: selectError } = await supabase
      .from('favorite_tasks')
      .select('*')
      .eq('user_id', testUserId)
      .eq('name', testTaskName);
    
    if (selectError) {
      console.error('❌ 查詢失敗:', selectError);
    } else {
      console.log('✅ 查詢成功:', selectData);
    }
    
    // 測試 5: 更新 tag 欄位
    console.log('\n🔄 測試 5: 更新 tag 欄位');
    const { data: updateData, error: updateError } = await supabase
      .from('favorite_tasks')
      .update({
        tag: testTag,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', testUserId)
      .eq('name', testTaskName)
      .select();
    
    if (updateError) {
      console.error('❌ 更新失敗:', updateError);
    } else {
      console.log('✅ 更新成功:', updateData);
    }
    
    // 測試 6: 驗證更新結果
    console.log('\n✅ 測試 6: 驗證更新結果');
    const { data: verifyData, error: verifyError } = await supabase
      .from('favorite_tasks')
      .select('*')
      .eq('user_id', testUserId)
      .eq('name', testTaskName);
    
    if (verifyError) {
      console.error('❌ 驗證失敗:', verifyError);
    } else {
      console.log('✅ 驗證結果:', verifyData);
      if (verifyData[0]?.tag === testTag) {
        console.log('🎉 標籤更新成功！');
      } else {
        console.log('❌ 標籤更新失敗，tag 值:', verifyData[0]?.tag);
      }
    }
    
    // 測試 7: 模擬實際 LINE Bot 流程
    console.log('\n🤖 測試 7: 模擬 LINE Bot 更新流程');
    const originalName = '模擬任務' + Date.now();
    const taggedName = `(${testTag})${originalName}`;
    
    // 先插入原始記錄
    const { data: botInsert, error: botInsertError } = await supabase
      .from('favorite_tasks')
      .insert({
        user_id: testUserId,
        name: originalName,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (botInsertError) {
      console.error('❌ Bot 模擬插入失敗:', botInsertError);
    } else {
      console.log('✅ Bot 模擬記錄插入成功');
      
      // 模擬 LINE Bot 的更新邏輯
      const { data: botUpdate, error: botUpdateError } = await supabase
        .from('favorite_tasks')
        .update({
          name: taggedName,
          tag: testTag,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', testUserId)
        .eq('name', originalName)
        .select();
      
      if (botUpdateError) {
        console.error('❌ Bot 模擬更新失敗:', botUpdateError);
      } else {
        console.log('✅ Bot 模擬更新成功:', botUpdate);
        if (botUpdate[0]?.tag === testTag) {
          console.log('🎉 Bot 模擬流程成功！標籤正確寫入！');
        } else {
          console.log('❌ Bot 模擬流程失敗，tag 值:', botUpdate[0]?.tag);
        }
      }
    }
    
    // 測試 8: 檢查現有記錄
    console.log('\n📊 測試 8: 檢查現有用戶記錄');
    const { data: existingData, error: existingError } = await supabase
      .from('favorite_tasks')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (existingError) {
      console.error('❌ 查詢現有記錄失敗:', existingError);
    } else {
      console.log('✅ 現有記錄:', existingData);
      console.log('📈 記錄數量:', existingData.length);
      console.log('🏷️ 有標籤的記錄:', existingData.filter(r => r.tag).length);
    }
    
    // 清理測試記錄
    console.log('\n🧹 清理測試記錄...');
    await supabase
      .from('favorite_tasks')
      .delete()
      .eq('user_id', testUserId)
      .like('name', '%測試%');
    
    await supabase
      .from('favorite_tasks')
      .delete()
      .eq('user_id', testUserId)
      .like('name', '%模擬%');
    
    console.log('✅ 測試完成');
    
  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
  }
}

runAllTests();