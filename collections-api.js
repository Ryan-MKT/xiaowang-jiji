// 收藏卡管理 API
// 提供 CRUD 操作給 LIFF 頁面使用

const { supabase } = require('./supabase-client');

// 🔍 獲取用戶的所有收藏卡
async function getUserCollections(userId, options = {}) {
  try {
    let query = supabase
      .from('dev_collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 可選過濾條件
    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [收藏卡] 查詢失敗:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [收藏卡] 成功獲取 ${data.length} 個收藏卡`);
    return { success: true, data };

  } catch (error) {
    console.error('❌ [收藏卡] 查詢異常:', error);
    return { success: false, error: error.message };
  }
}

// ➕ 建立新收藏卡
async function createCollection(userId, collectionData) {
  try {
    const newCollection = {
      user_id: userId,
      title: collectionData.title,
      description: collectionData.description || '',
      category: collectionData.category || 'general',
      content: collectionData.content || {},
      tags: collectionData.tags || [],
      color: collectionData.color || '#4169E1',
      icon: collectionData.icon || '📋'
    };

    const { data, error } = await supabase
      .from('dev_collections')
      .insert([newCollection])
      .select()
      .single();

    if (error) {
      console.error('❌ [收藏卡] 建立失敗:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [收藏卡] 成功建立: ${data.title} (ID: ${data.id})`);
    return { success: true, data };

  } catch (error) {
    console.error('❌ [收藏卡] 建立異常:', error);
    return { success: false, error: error.message };
  }
}

// 📝 更新收藏卡
async function updateCollection(userId, collectionId, updateData) {
  try {
    const { data, error } = await supabase
      .from('dev_collections')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', collectionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ [收藏卡] 更新失敗:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [收藏卡] 成功更新: ${data.title} (ID: ${data.id})`);
    return { success: true, data };

  } catch (error) {
    console.error('❌ [收藏卡] 更新異常:', error);
    return { success: false, error: error.message };
  }
}

// 🗑️ 刪除收藏卡 (硬刪除 - 完全移除記錄)
async function deleteCollection(userId, collectionId) {
  try {
    console.log(`🗑️ [收藏卡] 開始硬刪除收藏卡 ID: ${collectionId}, User: ${userId}`);

    // 先查詢要刪除的記錄，以便記錄日誌
    const { data: targetRecord, error: queryError } = await supabase
      .from('dev_collections')
      .select('title, id')
      .eq('id', collectionId)
      .eq('user_id', userId)
      .single();

    if (queryError) {
      console.error('❌ [收藏卡] 查詢失敗:', queryError);
      return { success: false, error: queryError.message };
    }

    if (!targetRecord) {
      console.error('❌ [收藏卡] 找不到要刪除的收藏卡');
      return { success: false, error: '找不到要刪除的收藏卡' };
    }

    // 執行硬刪除
    const { error: deleteError } = await supabase
      .from('dev_collections')
      .delete()
      .eq('id', collectionId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ [收藏卡] 硬刪除失敗:', deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log(`✅ [收藏卡] 成功硬刪除: ${targetRecord.title || '未知標題'} (ID: ${targetRecord.id})`);
    return { success: true, data: targetRecord };

  } catch (error) {
    console.error('❌ [收藏卡] 硬刪除異常:', error);
    return { success: false, error: error.message };
  }
}

// 📊 獲取收藏卡統計
async function getCollectionStats(userId) {
  try {
    const { data, error } = await supabase
      .from('dev_collections')
      .select('category, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [收藏卡] 統計失敗:', error);
      return { success: false, error: error.message };
    }

    // 統計分析
    const stats = {
      total: data.length,
      categories: {},
      thisMonth: 0,
      thisWeek: 0
    };

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    data.forEach(item => {
      // 分類統計
      stats.categories[item.category] = (stats.categories[item.category] || 0) + 1;

      // 時間統計
      const createdAt = new Date(item.created_at);
      if (createdAt >= thisMonth) stats.thisMonth++;
      if (createdAt >= thisWeek) stats.thisWeek++;
    });

    console.log(`📊 [收藏卡] 統計完成: 總數 ${stats.total}`);
    return { success: true, data: stats };

  } catch (error) {
    console.error('❌ [收藏卡] 統計異常:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getUserCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionStats
};