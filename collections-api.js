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
        // 🚀 第一步：優先使用快速 Open Graph API，失敗時才使用 Enhanced Preview
        console.log('🔄 [即時處理] 步驟1: 優先使用快速 Open Graph API... 🚀🚀🚀 新版本已載入!');
        let enhancedResult = null;

        try {
          // 🚀 直接使用 Enhanced Preview，跳過 Open Graph API
          console.log('🔄 [內容預覽] 直接使用 Enhanced Preview 獲取完整內容...');
          const EnhancedLinkPreview = require('./enhanced-link-preview');
          const enhancedPreview = new EnhancedLinkPreview();

          // 🔍 檢查是否為 Facebook 新分享格式，給予更長的超時時間
          const isFacebookNewFormat = url.includes('facebook.com/share/') &&
                                     (url.includes('/p/') || url.includes('/v/'));

          const timeoutDuration = isFacebookNewFormat ? 15000 : 10000; // Facebook 新格式給 15 秒
          console.log(`⏱️ [內容預覽] 設定超時時間: ${timeoutDuration / 1000} 秒`);

          // 使用 Promise.race 添加超時限制
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Enhanced Preview timeout')), timeoutDuration)
          );

          enhancedResult = await Promise.race([
            enhancedPreview.getEnhancedPreview(url),
            timeoutPromise
          ]);
        } catch (previewError) {
          console.error('❌ [內容預覽] 所有預覽方法都失敗:', previewError.message);
          // 使用基本 URL 信息作為回退
          enhancedResult = {
            title: new URL(url).hostname,
            description: '無法獲取預覽內容',
            image: null,
            text: '無法獲取預覽內容'
          };
        }

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

        // 🔥 等待 Enhanced Preview 徹底完成，確保獲取正確標題
        console.log('⏱️ [時序修復] 檢查 Enhanced Preview 結果:', {
          title: enhancedResult?.title,
          isValidTitle: enhancedResult?.title &&
                       enhancedResult.title !== 'www.facebook.com' &&
                       enhancedResult.title !== 'Error' &&
                       !enhancedResult.title.startsWith('http')
        });

        // 📋 準備內容數據，優先使用 Enhanced Preview 提取的正確標題
        let finalTitle = collectionData.title; // 預設使用 URL

        if (enhancedResult?.title &&
            enhancedResult.title !== 'www.facebook.com' &&
            enhancedResult.title !== 'Error' &&
            !enhancedResult.title.startsWith('http')) {
          finalTitle = enhancedResult.title;
          console.log('✅ [時序修復] 使用 Enhanced Preview 提取的標題:', finalTitle);
        } else {
          console.log('⚠️ [時序修復] Enhanced Preview 標題無效，使用 URL 作為標題');
        }

        const contentData = {
          url: url,
          domain: new URL(url).hostname,
          title: finalTitle, // 使用修復後的標題邏輯
          description: (enhancedResult && enhancedResult.description) ? enhancedResult.description : collectionData.description || '',
          content: finalContent,
          metaTags: (enhancedResult && enhancedResult.metaTags) ? enhancedResult.metaTags : {},
          mainContent: (enhancedResult && enhancedResult.text) ? enhancedResult.text : ''
        };

        console.log('📋 [即時處理] 傳遞給社群帳戶提取器的數據:', {
          url: contentData.url,
          domain: contentData.domain,
          title: contentData.title,
          titleSource: enhancedResult?.title ? 'enhanced_preview' : 'url_fallback',
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

    // 🚀 立即返回收藏卡，AI 摘要改為背景非同步處理 (效能優化)
    console.log('🤖 [AI摘要] 啟動背景生成任務 (非同步優化)...');

    // 🔥 背景非同步處理 AI 摘要 - 不影響使用者體驗
    setImmediate(async () => {
      try {
        console.log('🤖 [AI摘要] 背景開始生成摘要...');
        const aiSummaryService = new AISummaryService();

        // 準備摘要生成的內容數據 (修復 undefined 錯誤)
        const summaryContentData = {
          title: data.title || '',
          description: data.description || '',
          content: data.content || {},
          category: data.category || 'general'
        };

        const aiSummary = await aiSummaryService.generateSummary(summaryContentData);

        if (aiSummary) {
          // 背景更新收藏卡，添加 AI 摘要
          const { error: updateError } = await supabase
            .from('dev_collections')
            .update({ ai_summary: aiSummary })
            .eq('id', data.id);

          if (updateError) {
            console.error('❌ [AI摘要] 背景儲存摘要失敗:', updateError);
          } else {
            console.log(`✅ [AI摘要] 背景生成完成 (ID: ${data.id})`);
          }
        } else {
          console.log(`⚠️ [AI摘要] 背景生成被跳過 (ID: ${data.id})`);
        }
      } catch (summaryError) {
        console.error(`❌ [AI摘要] 背景生成失敗 (ID: ${data.id}):`, summaryError.message);
      }
    });

    // 🚀 立即返回，不等待 AI 摘要處理 (效能優化: 節省 3-5 秒)
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