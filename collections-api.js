// 收藏卡管理 API - 新分離架構 v2.0
// 提供 CRUD 操作給 LIFF 頁面使用

// 確保載入環境變數
require('dotenv').config();

const { supabase } = require('./supabase-client');
const AITagGenerator = require('./ai-tag-generator');
const AISummaryService = require('./ai-summary-service');

console.log('🚀 [系統] collections-api.js 已載入 - 使用新分離架構!');

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
    console.log('🔥 [collections-api] createCollection 開始處理:', {
      title: collectionData.title,
      hasContent: !!collectionData.content,
      contentUrl: collectionData.content?.url
    });

    let finalContent = collectionData.content || {};

    // 🔥 檢測是否為社群平台URL（需要即時處理以顯示帳號資訊）
    const url = collectionData.content?.url || collectionData.title;
    const isSocialUrl = url && (
      url.includes('facebook.com') ||
      url.includes('instagram.com') ||
      url.includes('twitter.com') ||
      url.includes('x.com') ||
      url.includes('threads.net') ||
      url.includes('linkedin.com')
    );

    if (isSocialUrl) {
      console.log('🔥 [即時處理] 檢測到社群URL，開始即時處理:', url);

      try {
        // 🚀 第一步：調用 Enhanced Preview 獲取完整內容（圖片+文字）
        console.log('🔄 [即時處理] 步驟1: 呼叫 Enhanced Preview 獲取完整內容...');
        const EnhancedLinkPreview = require('./enhanced-link-preview');
        const enhancedPreview = new EnhancedLinkPreview();
        const enhancedResult = await enhancedPreview.getEnhancedPreview(url);

        if (enhancedResult && enhancedResult.title) {
          console.log('✅ [即時處理] Enhanced Preview 成功:', {
            hasImage: !!enhancedResult.image,
            hasDescription: !!enhancedResult.description,
            title: enhancedResult.title?.substring(0, 50) || '無標題'
          });

          // 將 Enhanced Preview 的內容加入 finalContent
          finalContent = {
            ...finalContent,
            image: enhancedResult.image,
            text: enhancedResult.text || enhancedResult.description,
            title: enhancedResult.title,
            description: enhancedResult.description
          };
        } else {
          console.log('⚠️ [即時處理] Enhanced Preview 失敗:', enhancedResult ? '格式錯誤' : '無返回數據');
        }

        // 🚀 第二步：使用獨立的社群帳戶提取器 (新架構)
        console.log('🔄 [即時處理] 步驟2: 呼叫獨立社群帳戶提取器 (新架構)...');
        const SocialAccountExtractor = require('./social-account-extractor');
        const socialExtractor = new SocialAccountExtractor();

        // 準備內容數據（包含 Enhanced Preview 的結果）
        const contentData = {
          url: url,
          domain: new URL(url).hostname,
          title: (enhancedResult && enhancedResult.title) ? enhancedResult.title : collectionData.title,
          description: (enhancedResult && enhancedResult.description) ? enhancedResult.description : collectionData.description || '',
          content: finalContent,
          metaTags: (enhancedResult && enhancedResult.metaTags) ? enhancedResult.metaTags : {},
          mainContent: (enhancedResult && enhancedResult.text) ? enhancedResult.text : ''
        };

        console.log('📋 [即時處理] 傳遞給社群帳戶提取器的數據:', {
          url: contentData.url,
          domain: contentData.domain,
          title: contentData.title,
          hasDescription: !!contentData.description,
          hasMetaTags: !!contentData.metaTags,
          hasMainContent: !!contentData.mainContent
        });

        // 🔥 並行處理：同時進行社群帳戶提取和AI標籤生成
        const [socialResult, aiResult] = await Promise.allSettled([
          socialExtractor.extractAccountInfo(contentData),
          new AITagGenerator().generateTags(contentData)
        ]);

        // 處理社群帳戶提取結果
        let socialAccount = null;
        if (socialResult.status === 'fulfilled' && socialResult.value) {
          socialAccount = socialResult.value;
          console.log('🎯 [即時處理] 成功提取社群帳號資訊:', socialAccount);

          // 將社群帳號資訊加入 content
          finalContent = {
            ...finalContent,
            socialAccount: socialAccount
          };

          console.log('✅ [即時處理] 社群帳號資訊已加入 content');
        } else {
          console.log('⚠️ [即時處理] 社群帳戶提取失敗:', socialResult.reason?.message || '無錯誤訊息');
        }

        // 處理AI標籤生成結果
        if (aiResult.status === 'fulfilled' && aiResult.value) {
          console.log('✅ [即時處理] AI標籤生成成功');
        } else {
          console.log('⚠️ [即時處理] AI標籤生成失敗:', aiResult.reason?.message || '無錯誤訊息');
        }

        console.log('🎉 [即時處理] 完整處理完成:', {
          hasImage: !!finalContent.image,
          hasText: !!(finalContent.text || finalContent.description),
          hasSocialAccount: !!finalContent.socialAccount
        });

      } catch (processingError) {
        console.error('❌ [即時處理] 完整處理失敗:', processingError);
      }
    } else {
      console.log('📋 [一般連結] 非社群URL，跳過即時處理');
    }

    const newCollection = {
      user_id: userId,
      title: collectionData.title,
      description: collectionData.description || '',
      category: collectionData.category || 'general',
      content: finalContent,
      tags: collectionData.tags || [],
      color: collectionData.color || '#4169E1',
      icon: collectionData.icon || '📋',
      // 🚀 同時寫入獨立欄位，提升未來查詢效率
      social_platform: finalContent.socialAccount?.platform || null,
      social_account_name: finalContent.socialAccount?.accountName || null,
      social_profile_image: finalContent.socialAccount?.profileImage || null,
      social_account_url: finalContent.socialAccount?.url || null
    };

    console.log('💾 [collections-api] 準備儲存收藏卡:', {
      title: newCollection.title,
      hasSocialAccount: !!newCollection.content?.socialAccount,
      socialAccount: newCollection.content?.socialAccount
    });

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
    console.log('🎯 [收藏卡] 最終儲存的社群帳號資訊:', data.content?.socialAccount);

    // 🤖 收藏卡創建成功後，立即生成 AI 摘要
    try {
      console.log('🤖 [AI摘要] 開始為新收藏卡生成摘要...');
      const aiSummaryService = new AISummaryService();

      // 準備摘要生成的內容數據
      const summaryContentData = {
        title: data.title,
        description: data.description,
        content: data.content,
        category: data.category
      };

      const aiSummary = await aiSummaryService.generateSummary(summaryContentData);

      if (aiSummary) {
        // 更新收藏卡，添加 AI 摘要
        const { error: updateError } = await supabase
          .from('dev_collections')
          .update({ ai_summary: aiSummary })
          .eq('id', data.id);

        if (updateError) {
          console.error('❌ [AI摘要] 儲存摘要失敗:', updateError);
        } else {
          console.log('✅ [AI摘要] 摘要生成並儲存成功');
          // 將摘要添加到返回的數據中
          data.ai_summary = aiSummary;
        }
      } else {
        console.log('⚠️ [AI摘要] 摘要生成被跳過（內容太短或其他原因）');
      }
    } catch (summaryError) {
      console.error('❌ [AI摘要] 摘要生成過程發生錯誤:', summaryError.message);
      // 不影響收藏卡的正常創建，僅記錄錯誤
    }

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