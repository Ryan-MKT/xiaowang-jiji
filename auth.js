// Linus 式極簡認證
// "好品味的程式碼沒有特殊情況"

const { supabase } = require('./supabase-client');

// 核心原則：使用 LINE 提供的 userId，不要重新發明輪子
async function authenticateUser(userId, profile = null) {
  if (!userId) return null;
  
  // 單一資料結構，沒有特殊情況
  const user = {
    id: userId,
    profile: profile || { displayName: 'User' },
    lastSeen: new Date().toISOString()
  };
  
  // 如果有資料庫就存，沒有就返回記憶體物件
  if (supabase) {
    const { data } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'id' })
      .select()
      .single();
    return data || user;
  }
  
  return user;
}

module.exports = { authenticateUser };