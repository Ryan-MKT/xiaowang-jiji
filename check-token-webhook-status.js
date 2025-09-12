require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 檢查 Token Webhook 狀況...\n');

async function checkTokenWebhookStatus() {
  try {
    // 1. 檢查最新的 checkout 記錄
    console.log('📋 1. 檢查最新的 checkout 記錄:');
    const { data: checkouts, error: checkoutError } = await supabase
      .from('dev_checkouts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (checkoutError) {
      console.error('❌ 查詢 checkout 記錄失敗:', checkoutError);
    } else {
      console.log(`✅ 找到 ${checkouts.length} 筆最新 checkout 記錄:`);
      checkouts.forEach((checkout, index) => {
        console.log(`  ${index + 1}. ID: ${checkout.checkout_id || 'N/A'}`);
        console.log(`     狀態: ${checkout.status || 'N/A'}`);
        console.log(`     類型: ${checkout.type || 'N/A'}`);
        console.log(`     用戶ID: ${checkout.user_id || 'N/A'}`);
        console.log(`     webhookUrl: ${checkout.webhook_url || 'N/A'}`);
        console.log(`     建立時間: ${checkout.created_at || 'N/A'}`);
        console.log(`     更新時間: ${checkout.updated_at || 'N/A'}`);
        console.log('     ---');
      });
    }

    // 2. 檢查是否有對應 checkout ID 32aIlgmt2HVP0RIo7jmH4eK39HK 的記錄
    console.log('\n🔍 2. 檢查特定 Checkout ID: 32aIlgmt2HVP0RIo7jmH4eK39HK');
    const { data: specificCheckout, error: specificError } = await supabase
      .from('dev_checkouts')
      .select('*')
      .eq('checkout_id', '32aIlgmt2HVP0RIo7jmH4eK39HK');

    if (specificError) {
      console.error('❌ 查詢特定 checkout 失敗:', specificError);
    } else if (specificCheckout && specificCheckout.length > 0) {
      console.log('✅ 找到特定 checkout 記錄:');
      console.log(JSON.stringify(specificCheckout[0], null, 2));
    } else {
      console.log('❌ 未找到 checkout ID: 32aIlgmt2HVP0RIo7jmH4eK39HK 的記錄');
    }

    // 3. 檢查 tokens 表
    console.log('\n💳 3. 檢查最新的 token 記錄:');
    const { data: tokens, error: tokenError } = await supabase
      .from('dev_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tokenError) {
      console.error('❌ 查詢 token 記錄失敗:', tokenError);
    } else {
      console.log(`✅ 找到 ${tokens.length} 筆最新 token 記錄:`);
      tokens.forEach((token, index) => {
        console.log(`  ${index + 1}. Token: ${token.token || 'N/A'}`);
        console.log(`     用戶ID: ${token.user_id || 'N/A'}`);
        console.log(`     交易ID: ${token.transaction_id || 'N/A'}`);
        console.log(`     狀態: ${token.status || 'N/A'}`);
        console.log(`     建立時間: ${token.created_at || 'N/A'}`);
        console.log('     ---');
      });
    }

    // 4. 檢查 webhook 日誌表（如果存在）
    console.log('\n📞 4. 檢查 webhook 日誌:');
    const { data: webhookLogs, error: webhookError } = await supabase
      .from('dev_webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (webhookError && webhookError.code !== 'PGRST106') { // PGRST106 = table not found
      console.error('❌ 查詢 webhook 日誌失敗:', webhookError);
    } else if (webhookError && webhookError.code === 'PGRST106') {
      console.log('ℹ️  webhook 日誌表不存在');
    } else {
      console.log(`✅ 找到 ${webhookLogs.length} 筆 webhook 日誌:`);
      webhookLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. 類型: ${log.webhook_type || 'N/A'}`);
        console.log(`     狀態: ${log.status || 'N/A'}`);
        console.log(`     內容: ${JSON.stringify(log.payload) || 'N/A'}`);
        console.log(`     時間: ${log.created_at || 'N/A'}`);
        console.log('     ---');
      });
    }

    // 5. 檢查付費用戶表
    console.log('\n👤 5. 檢查付費用戶記錄:');
    const { data: paidUsers, error: paidError } = await supabase
      .from('dev_paid_users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (paidError) {
      console.error('❌ 查詢付費用戶記錄失敗:', paidError);
    } else {
      console.log(`✅ 找到 ${paidUsers.length} 筆付費用戶記錄:`);
      paidUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. 用戶ID: ${user.user_id || 'N/A'}`);
        console.log(`     Token: ${user.token || 'N/A'}`);
        console.log(`     狀態: ${user.status || 'N/A'}`);
        console.log(`     建立時間: ${user.created_at || 'N/A'}`);
        console.log('     ---');
      });
    }

  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
  }
}

checkTokenWebhookStatus();