// 檢查 Google 授權狀態的測試腳本
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkGoogleAuth() {
  try {
    console.log('🔍 檢查已授權的 Google 用戶...');

    // 先檢查表格是否存在和欄位結構
    const { data: tokens, error } = await supabase
      .from('user_google_tokens')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ 查詢錯誤:', error);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️  目前沒有任何已授權的 Google 用戶');
      console.log('');
      console.log('📝 如何測試 email 邀請功能：');
      console.log('1. 用您的真實 LINE 帳號開啟小汪記記');
      console.log('2. 進入編輯頁面，點擊「加入Google日曆」按鈕');
      console.log('3. 完成 Google OAuth 授權');
      console.log('4. 發送訊息：「22:00 跟老王打球 記錄到GOOGLE日曆 ryan915389712@gmail.com」');
      console.log('5. 檢查 Google Calendar 中的 Guests 欄位');
      return;
    }

    console.log(`✅ 找到 ${tokens.length} 個已授權的用戶：`);
    tokens.forEach((token, index) => {
      const expiryDate = new Date(token.expiry_date);
      console.log(`${index + 1}. 用戶 ID: ${token.user_id}`);
      console.log(`   授權到期時間: ${expiryDate.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
      console.log('');
    });

    console.log('🎯 測試建議：');
    console.log(`用以下用戶 ID 測試: ${tokens[0].user_id}`);
    console.log('');
    console.log('📝 測試步驟：');
    console.log('1. 用您的 LINE 帳號發送測試訊息');
    console.log('2. 訊息內容：「22:00 跟老王打球 記錄到GOOGLE日曆 ryan915389712@gmail.com」');
    console.log('3. 檢查 Google Calendar 是否正確加入 Guests');

  } catch (error) {
    console.error('❌ 檢查過程發生錯誤:', error);
  }
}

checkGoogleAuth();