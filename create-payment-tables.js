require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 創建付費相關資料庫表結構...\n');

async function createPaymentTables() {
  try {
    // 1. 創建 dev_checkouts 表
    console.log('📋 1. 創建 dev_checkouts 表...');
    const checkoutTableSQL = `
      CREATE TABLE IF NOT EXISTS dev_checkouts (
        id SERIAL PRIMARY KEY,
        checkout_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'token',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        merchant_id VARCHAR(100),
        success_url TEXT,
        failure_url TEXT,
        webhook_url TEXT,
        custom_id TEXT,
        response_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { data: checkoutResult, error: checkoutError } = await supabase.rpc('exec_sql', { 
      sql: checkoutTableSQL 
    });

    if (checkoutError) {
      console.error('❌ 創建 dev_checkouts 表失敗:', checkoutError);
    } else {
      console.log('✅ dev_checkouts 表創建成功');
    }

    // 2. 創建 dev_tokens 表
    console.log('\n🎫 2. 創建 dev_tokens 表...');
    const tokenTableSQL = `
      CREATE TABLE IF NOT EXISTS dev_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(500) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        transaction_id VARCHAR(255),
        checkout_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        merchant_id VARCHAR(100),
        custom_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE
      );
    `;

    const { data: tokenResult, error: tokenError } = await supabase.rpc('exec_sql', { 
      sql: tokenTableSQL 
    });

    if (tokenError) {
      console.error('❌ 創建 dev_tokens 表失敗:', tokenError);
    } else {
      console.log('✅ dev_tokens 表創建成功');
    }

    // 3. 創建 dev_paid_users 表
    console.log('\n👤 3. 創建 dev_paid_users 表...');
    const paidUserTableSQL = `
      CREATE TABLE IF NOT EXISTS dev_paid_users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        token VARCHAR(500),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        plan VARCHAR(50),
        subscription_start TIMESTAMP WITH TIME ZONE,
        subscription_end TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { data: paidUserResult, error: paidUserError } = await supabase.rpc('exec_sql', { 
      sql: paidUserTableSQL 
    });

    if (paidUserError) {
      console.error('❌ 創建 dev_paid_users 表失敗:', paidUserError);
    } else {
      console.log('✅ dev_paid_users 表創建成功');
    }

    // 4. 創建 dev_webhook_logs 表
    console.log('\n📞 4. 創建 dev_webhook_logs 表...');
    const webhookLogTableSQL = `
      CREATE TABLE IF NOT EXISTS dev_webhook_logs (
        id SERIAL PRIMARY KEY,
        webhook_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'received',
        payload JSONB NOT NULL,
        user_id VARCHAR(255),
        checkout_id VARCHAR(255),
        transaction_id VARCHAR(255),
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { data: webhookResult, error: webhookError } = await supabase.rpc('exec_sql', { 
      sql: webhookLogTableSQL 
    });

    if (webhookError) {
      console.error('❌ 創建 dev_webhook_logs 表失敗:', webhookError);
    } else {
      console.log('✅ dev_webhook_logs 表創建成功');
    }

    console.log('\n🎉 付費相關表結構創建完成！');
    console.log('📋 已創建的表:');
    console.log('  - dev_checkouts: 儲存 checkout 記錄');
    console.log('  - dev_tokens: 儲存 payment tokens');  
    console.log('  - dev_paid_users: 儲存付費用戶資訊');
    console.log('  - dev_webhook_logs: 儲存 webhook 日誌');

  } catch (error) {
    console.error('❌ 創建表結構時發生錯誤:', error);
    
    // 如果 RPC 方法不存在，給出替代方案
    if (error.message && error.message.includes('rpc')) {
      console.log('\n💡 替代方案: 請手動在 Supabase Dashboard 中執行以下 SQL:');
      console.log('\n-- 1. dev_checkouts 表');
      console.log(`CREATE TABLE IF NOT EXISTS dev_checkouts (
        id SERIAL PRIMARY KEY,
        checkout_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'token',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        merchant_id VARCHAR(100),
        success_url TEXT,
        failure_url TEXT,
        webhook_url TEXT,
        custom_id TEXT,
        response_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`);

      console.log('\n-- 2. dev_tokens 表');
      console.log(`CREATE TABLE IF NOT EXISTS dev_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(500) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        transaction_id VARCHAR(255),
        checkout_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        merchant_id VARCHAR(100),
        custom_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE
      );`);

      console.log('\n-- 3. dev_paid_users 表');
      console.log(`CREATE TABLE IF NOT EXISTS dev_paid_users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        token VARCHAR(500),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        plan VARCHAR(50),
        subscription_start TIMESTAMP WITH TIME ZONE,
        subscription_end TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`);

      console.log('\n-- 4. dev_webhook_logs 表');
      console.log(`CREATE TABLE IF NOT EXISTS dev_webhook_logs (
        id SERIAL PRIMARY KEY,
        webhook_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'received',
        payload JSONB NOT NULL,
        user_id VARCHAR(255),
        checkout_id VARCHAR(255),
        transaction_id VARCHAR(255),
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`);
    }
  }
}

createPaymentTables();