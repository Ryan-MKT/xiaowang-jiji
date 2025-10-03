// Collections API 模組 - 完整的 Supabase 整合版本
const supabase = require('./supabase-client');

// 獲取用戶收藏品
async function getUserCollections(userId, options = {}) {
  try {
    console.log(`📦 [Collections API] 獲取用戶 ${userId} 的收藏品`);

    const { limit = 20, offset = 0, category = null } = options;

    let query = supabase
      .from('dev_collections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [Collections API] 查詢失敗:', error);
      throw error;
    }

    console.log(`✅ [Collections API] 成功獲取 ${data?.length || 0} 個收藏品`);
    return { success: true, data: data || [] };

  } catch (error) {
    console.error('❌ [Collections API] getUserCollections 錯誤:', error);
    return { success: false, error: error.message };
  }
}

// 創建新收藏品
async function createCollection(collectionData) {
  try {
    console.log(`📦 [Collections API] 創建新收藏品`);
    console.log('🔍 [Collections API] 收藏數據:', collectionData);

    const { data, error } = await supabase
      .from('dev_collections')
      .insert(collectionData)
      .select()
      .single();

    if (error) {
      console.error('❌ [Collections API] 創建失敗:', error);
      throw error;
    }

    console.log(`✅ [Collections API] 成功創建收藏品 ID: ${data.id}`);
    return data;

  } catch (error) {
    console.error('❌ [Collections API] createCollection 錯誤:', error);
    throw error;
  }
}

// 更新收藏品
async function updateCollection(collectionId, updateData) {
  try {
    console.log(`📦 [Collections API] 更新收藏品 ID: ${collectionId}`);

    const { data, error } = await supabase
      .from('dev_collections')
      .update(updateData)
      .eq('id', collectionId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Collections API] 更新失敗:', error);
      throw error;
    }

    console.log(`✅ [Collections API] 成功更新收藏品 ID: ${collectionId}`);
    return data;

  } catch (error) {
    console.error('❌ [Collections API] updateCollection 錯誤:', error);
    throw error;
  }
}

// 刪除收藏品（硬刪除）
async function deleteCollection(collectionId, userId) {
  try {
    console.log(`📦 [Collections API] 刪除收藏品 ID: ${collectionId}`);

    const { data, error } = await supabase
      .from('dev_collections')
      .delete()
      .eq('id', collectionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Collections API] 刪除失敗:', error);
      throw error;
    }

    console.log(`✅ [Collections API] 成功刪除收藏品 ID: ${collectionId}`);
    return data;

  } catch (error) {
    console.error('❌ [Collections API] deleteCollection 錯誤:', error);
    throw error;
  }
}

// 獲取單個收藏品
async function getCollection(collectionId, userId) {
  try {
    console.log(`📦 [Collections API] 獲取收藏品 ID: ${collectionId}`);

    const { data, error } = await supabase
      .from('dev_collections')
      .select('*')
      .eq('id', collectionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ [Collections API] 查詢失敗:', error);
      throw error;
    }

    console.log(`✅ [Collections API] 成功獲取收藏品 ID: ${collectionId}`);
    return data;

  } catch (error) {
    console.error('❌ [Collections API] getCollection 錯誤:', error);
    throw error;
  }
}

module.exports = {
  getUserCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollection
};