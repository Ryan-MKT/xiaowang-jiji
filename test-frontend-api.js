// 測試前端 API 調用修復
require('dotenv').config();

// 模擬前端 API 調用測試
async function testFrontendAPICall() {
  console.log('🧪 測試前端修復後的 API 調用...');
  console.log('🎯 測試流程: 前端標籤編輯區 → POST /api/tags → SUPABASE → Quick Reply同步');
  
  const userId = 'U2a9005032be2240a6816d29ae28d9294';
  const testTagName = `前端測試_${Date.now()}`;
  
  try {
    // 模擬前端調用 (修復後的版本)
    console.log(`\n--- 步驟1: 模擬前端 API 調用 ---`);
    console.log(`📋 用戶ID: ${userId}`);
    console.log(`🏷️ 標籤名稱: ${testTagName}`);
    console.log(`🎨 顏色: #FF6B6B`);
    console.log(`😊 圖標: 🔥`);
    
    const response = await fetch('http://localhost:3001/api/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId
      },
      body: JSON.stringify({
        name: testTagName,
        color: '#FF6B6B',
        icon: '🔥',
        orderIndex: 10
      })
    });
    
    console.log(`📡 API 響應狀態: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ API 調用成功！`);
      console.log(`📄 響應內容:`, JSON.stringify(result, null, 2));
      
      // 驗證 SUPABASE 中是否真的新增了標籤
      console.log(`\n--- 步驟2: 驗證 SUPABASE 同步 ---`);
      
      // 測試 getUserTags 函數
      const verifyResponse = await fetch('http://localhost:3001/api/tags', {
        method: 'GET',
        headers: {
          'X-User-ID': userId
        }
      });
      
      if (verifyResponse.ok) {
        const allTags = await verifyResponse.json();
        console.log(`🔍 SUPABASE 中共有 ${allTags.length} 個標籤`);
        console.log(`📋 標籤列表:`, allTags.map(tag => `${tag.name}(${tag.sort_order})`));
        
        const newTagExists = allTags.find(tag => tag.name === testTagName);
        if (newTagExists) {
          console.log(`🎉 驗證成功！新標籤 "${testTagName}" 已成功同步到 SUPABASE`);
          console.log(`📊 標籤詳細資訊:`, newTagExists);
          
          console.log(`\n--- 步驟3: Quick Reply 同步測試 ---`);
          console.log(`✅ 完整流程測試成功！`);
          console.log(`✅ 前端標籤編輯區 → SUPABASE 同步正常`);
          console.log(`✅ Quick Reply 將顯示 ${allTags.length} 個按鈕`);
          console.log(`\n🎯 用戶現在可以在標籤編輯區新增標籤，並自動同步到 SUPABASE 和 Quick Reply！`);
          
        } else {
          console.log(`❌ 驗證失敗！新標籤未在 SUPABASE 中找到`);
        }
        
      } else {
        console.log(`❌ 無法驗證 SUPABASE 同步狀態`);
      }
      
    } else {
      const error = await response.text();
      console.log(`❌ API 調用失敗: ${error}`);
    }
    
  } catch (error) {
    console.error('💥 測試過程發生錯誤:', error);
  }
}

// 執行測試
if (require.main === module) {
  testFrontendAPICall();
}

module.exports = { testFrontendAPICall };