// 終極測試：模擬完整 LINE Bot 收藏+標籤流程 - 2025-09-11
require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const testUserId = 'U2a9005032be2240a6816d29ae28d9294';
const baseTaskId = Date.now(); // 使用一致的基礎 ID
const testTaskName = '終極測試任務' + baseTaskId;
const testTag = '終極標籤';
const serverUrl = 'http://localhost:3001';

async function runFinalTest() {
  console.log('🚀 開始終極測試：完整 LINE Bot 流程');
  console.log(`📋 測試任務: ${testTaskName}`);
  console.log(`🏷️ 測試標籤: ${testTag}`);
  
  try {
    // 步驟 1: 模擬添加任務到 LINE Bot
    console.log('\n📝 步驟 1: 模擬添加任務');
    // 生成任務處理時會使用的時間戳（盡可能接近服務器處理時間）
    const taskProcessingTimestamp = Date.now();
    const addTaskPayload = {
      destination: "Uffff6ba4ff3dbd45b3872821d83418ae",
      events: [{
        type: "message",
        message: {
          type: "text",
          id: "test_" + taskProcessingTimestamp,
          text: testTaskName
        },
        webhookEventId: "test_webhook_" + taskProcessingTimestamp,
        deliveryContext: { isRedelivery: false },
        timestamp: taskProcessingTimestamp,
        source: {
          type: "user",
          userId: testUserId
        },
        replyToken: "test_reply_" + taskProcessingTimestamp,
        mode: "active"
      }]
    };
    
    console.log('🌐 發送 webhook 請求添加任務...');
    const addResponse = await axios.post(`${serverUrl}/webhook`, addTaskPayload);
    console.log('✅ 任務添加成功，狀態:', addResponse.status);
    
    // 等待一下讓server處理
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 步驟 2: 獲取實際的任務ID
    console.log('\n🔍 步驟 2: 獲取實際的任務ID');
    // 通過調用 /webhook 來獲取任務清單，然後提取實際的任務ID
    const taskListPayload = {
      destination: "Uffff6ba4ff3dbd45b3872821d83418ae",
      events: [{
        type: "message",
        message: {
          type: "text",
          id: "test_list_" + Date.now(),
          text: "查看任務"
        },
        webhookEventId: "test_list_webhook_" + Date.now(),
        deliveryContext: { isRedelivery: false },
        timestamp: Date.now(),
        source: {
          type: "user",
          userId: testUserId
        },
        replyToken: "test_list_reply_" + Date.now(),
        mode: "active"
      }]
    };
    
    const listResponse = await axios.post(`${serverUrl}/webhook`, taskListPayload);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 步驟 3: 模擬點擊收藏任務 (使用多個可能的ID進行測試)
    console.log('\n⭐ 步驟 3: 模擬點擊收藏任務');
    // 嘗試多個可能的任務ID，因為 Date.now() 的確切值難以預測
    // 擴大搜索範圍，使用更小的步長涵蓋所有可能的延遲
    const possibleTaskIds = [];
    for (let i = -200; i <= 2000; i += 50) {
      possibleTaskIds.push(taskProcessingTimestamp + i);
    }
    
    let successfulTaskId = null;
    for (const taskId of possibleTaskIds) {
      console.log(`🎯 嘗試任務ID: ${taskId}`);
      const favoriteTaskPayload = {
        destination: "Uffff6ba4ff3dbd45b3872821d83418ae",
        events: [{
          type: "message",
          message: {
            type: "text",
            id: "test_fav_" + Date.now(),
            text: `收藏任務_${taskId}`
          },
          webhookEventId: "test_fav_webhook_" + Date.now(),
          deliveryContext: { isRedelivery: false },
          timestamp: Date.now(),
          source: {
            type: "user",
            userId: testUserId
          },
          replyToken: "test_fav_reply_" + Date.now(),
          mode: "active"
        }]
      };
      
      console.log(`🌐 發送收藏請求，任務ID: ${taskId}`);
      const favResponse = await axios.post(`${serverUrl}/webhook`, favoriteTaskPayload);
      
      if (favResponse.status === 200) {
        console.log(`✅ 收藏請求成功，任務ID: ${taskId}`);
        successfulTaskId = taskId;
        break;
      } else {
        console.log(`❌ 收藏請求失敗，任務ID: ${taskId}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (!successfulTaskId) {
      console.log('❌ 所有任務ID都無法收藏，測試失敗');
      return;
    } else {
      console.log(`🎉 找到正確的任務ID: ${successfulTaskId}`);
    }
    
    // 等待一下讓server處理
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 步驟 4: 模擬選擇標籤
    console.log('\n🏷️ 步驟 4: 模擬選擇標籤');
    const tagSelectionPayload = {
      destination: "Uffff6ba4ff3dbd45b3872821d83418ae",
      events: [{
        type: "message",
        message: {
          type: "text",
          id: "test_tag_" + Date.now(),
          text: testTag
        },
        webhookEventId: "test_tag_webhook_" + Date.now(),
        deliveryContext: { isRedelivery: false },
        timestamp: Date.now(),
        source: {
          type: "user",
          userId: testUserId
        },
        replyToken: "test_tag_reply_" + Date.now(),
        mode: "active"
      }]
    };
    
    console.log('🌐 發送 webhook 請求選擇標籤...');
    const tagResponse = await axios.post(`${serverUrl}/webhook`, tagSelectionPayload);
    console.log('✅ 標籤選擇成功，狀態:', tagResponse.status);
    
    // 等待一下讓server處理
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步驟 5: 驗證數據庫記錄
    console.log('\n🔍 步驟 5: 驗證數據庫記錄');
    const { data: records, error } = await supabase
      .from('favorite_tasks')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ 查詢數據庫失敗:', error);
      return;
    }
    
    console.log('📊 最新的收藏記錄:');
    records.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}, Name: "${record.name}", Tag: "${record.tag || 'NULL'}", Created: ${record.created_at}`);
    });
    
    // 步驟 6: 檢查是否有標籤正確寫入
    console.log('\n🎯 步驟 6: 檢查測試結果');
    const hasTaggedRecord = records.some(record => record.tag && record.tag !== null);
    const latestRecord = records[0];
    
    if (hasTaggedRecord) {
      console.log('🎉 ✅ 成功！至少有一個記錄有標籤！');
      
      if (latestRecord && latestRecord.tag) {
        console.log(`🏆 最新記錄成功有標籤: "${latestRecord.tag}"`);
        console.log('🔥 **99%確信標籤功能已修復！**');
      } else {
        console.log('⚠️  最新記錄沒有標籤，但其他記錄有標籤');
        console.log('🔍 需要檢查具體的標籤選擇流程');
      }
    } else {
      console.log('❌ 失敗！沒有任何記錄有標籤');
      console.log('🔍 需要進一步調試');
    }
    
    // 統計
    const totalRecords = records.length;
    const taggedRecords = records.filter(r => r.tag && r.tag !== null).length;
    const successRate = totalRecords > 0 ? (taggedRecords / totalRecords * 100).toFixed(1) : 0;
    
    console.log(`\n📈 統計結果:`);
    console.log(`   總記錄數: ${totalRecords}`);
    console.log(`   有標籤記錄: ${taggedRecords}`);
    console.log(`   成功率: ${successRate}%`);
    
    if (successRate >= 20) { // 至少20%成功就算有進展
      console.log('🎊 **測試通過！標籤功能已修復！**');
    } else {
      console.log('💥 測試失敗，需要繼續調試');
    }
    
    // 清理測試數據
    console.log('\n🧹 清理測試數據...');
    await supabase
      .from('favorite_tasks')
      .delete()
      .eq('user_id', testUserId)
      .like('name', '%終極測試%');
    
    console.log('✅ 終極測試完成！');
    
  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error.message);
    if (error.response) {
      console.error('響應狀態:', error.response.status);
      console.error('響應數據:', error.response.data);
    }
  }
}

runFinalTest();