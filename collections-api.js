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
        // 🚀 使用 Open Graph API 獲取預覽內容
        console.log('🔄 [即時處理] 使用 Open Graph API 獲取預覽內容...');
        let previewResult = null;

        try {
          const { openGraphAPI } = require('./open-graph-api');

          const openGraphResult = await openGraphAPI.getPreview(url);

          if (openGraphResult) {
            // 🔥 修復：即使標題是'Error'，仍可能有有效的圖片
            const hasValidTitle = openGraphResult.title && openGraphResult.title !== 'Error';
            const hasValidImage = openGraphResult.image && !openGraphResult.image.includes('facebook.com/images/logos') && !openGraphResult.image.includes('facebook_2x.png');

            if (hasValidTitle && hasValidImage) {
              console.log('✅ [Open Graph] 獲取到有效預覽內容:', {
                title: openGraphResult.title,
                hasImage: !!openGraphResult.image
              });
              previewResult = {
                title: openGraphResult.title,
                description: openGraphResult.description || '無法獲取預覽內容',
                image: openGraphResult.image,
                text: openGraphResult.description || '無法獲取預覽內容',
                extraction_method: 'open_graph_api'
              };
            } else {
              console.log('⚠️ [Open Graph] 只獲取到 Logo 或無效內容，嘗試 Enhanced Preview...');

              // 🚀 使用 Enhanced Preview 作為回退
              try {
                const EnhancedLinkPreview = require('./enhanced-link-preview');
                const enhancedPreview = new EnhancedLinkPreview();

                console.log('🔍 [Enhanced Preview] 開始深度內容提取...');
                const enhancedResult = await enhancedPreview.getEnhancedPreview(url);

                if (enhancedResult && (enhancedResult.image || enhancedResult.description)) {
                  console.log('✅ [Enhanced Preview] 成功獲取內容:', {
                    title: enhancedResult.title,
                    hasImage: !!enhancedResult.image,
                    hasDescription: !!enhancedResult.description
                  });

                  previewResult = {
                    title: enhancedResult.title || new URL(url).hostname,
                    description: enhancedResult.description || '無法獲取預覽內容',
                    image: enhancedResult.image,
                    text: enhancedResult.description || '無法獲取預覽內容',
                    extraction_method: 'enhanced_preview_fix'
                  };
                } else {
                  console.log('❌ [Enhanced Preview] 也無法獲取有效內容');
                  previewResult = {
                    title: hasValidTitle ? openGraphResult.title : new URL(url).hostname,
                    description: openGraphResult.description || '無法獲取預覽內容',
                    image: hasValidImage ? openGraphResult.image : null,
                    text: openGraphResult.description || '無法獲取預覽內容',
                    extraction_method: 'open_graph_api_fallback'
                  };
                }
              } catch (enhancedError) {
                console.error('❌ [Enhanced Preview] 失敗:', enhancedError.message);
                previewResult = {
                  title: hasValidTitle ? openGraphResult.title : new URL(url).hostname,
                  description: openGraphResult.description || '無法獲取預覽內容',
                  image: hasValidImage ? openGraphResult.image : null,
                  text: openGraphResult.description || '無法獲取預覽內容',
                  extraction_method: 'open_graph_api_fallback'
                };
              }
            }
          } else {
            console.log('⚠️ [Open Graph] 無法獲取預覽內容，直接嘗試 Enhanced Preview...');

            // 🚀 直接使用 Enhanced Preview
            try {
              const EnhancedLinkPreview = require('./enhanced-link-preview');
              const enhancedPreview = new EnhancedLinkPreview();

              console.log('🔍 [Enhanced Preview] 開始深度內容提取...');
              const enhancedResult = await enhancedPreview.getEnhancedPreview(url);

              if (enhancedResult && (enhancedResult.image || enhancedResult.description)) {
                console.log('✅ [Enhanced Preview] 成功獲取內容:', {
                  title: enhancedResult.title,
                  hasImage: !!enhancedResult.image,
                  hasDescription: !!enhancedResult.description
                });

                previewResult = {
                  title: enhancedResult.title || new URL(url).hostname,
                  description: enhancedResult.description || '無法獲取預覽內容',
                  image: enhancedResult.image,
                  text: enhancedResult.description || '無法獲取預覽內容',
                  extraction_method: 'enhanced_preview'
                };
              } else {
                console.log('❌ [Enhanced Preview] 無法獲取有效內容');
                previewResult = {
                  title: new URL(url).hostname,
                  description: '無法獲取預覽內容',
                  image: null,
                  text: '無法獲取預覽內容',
                  extraction_method: 'fallback'
                };
              }
            } catch (enhancedError) {
              console.error('❌ [Enhanced Preview] 失敗:', enhancedError.message);
              previewResult = {
                title: new URL(url).hostname,
                description: '無法獲取預覽內容',
                image: null,
                text: '無法獲取預覽內容',
                extraction_method: 'fallback'
              };
            }
          }
        } catch (previewError) {
          console.error('❌ [內容預覽] Open Graph API 失敗:', previewError.message);

          // 🚀 最後嘗試 Enhanced Preview
          try {
            const EnhancedLinkPreview = require('./enhanced-link-preview');
            const enhancedPreview = new EnhancedLinkPreview();

            console.log('🔍 [Enhanced Preview] 作為最後回退嘗試...');
            const enhancedResult = await enhancedPreview.getEnhancedPreview(url);

            if (enhancedResult && (enhancedResult.image || enhancedResult.description)) {
              console.log('✅ [Enhanced Preview] 回退成功獲取內容');
              previewResult = {
                title: enhancedResult.title || new URL(url).hostname,
                description: enhancedResult.description || '無法獲取預覽內容',
                image: enhancedResult.image,
                text: enhancedResult.description || '無法獲取預覽內容',
                extraction_method: 'enhanced_preview_emergency'
              };
            } else {
              console.log('❌ [Enhanced Preview] 回退也失敗');
              previewResult = {
                title: new URL(url).hostname,
                description: '無法獲取預覽內容',
                image: null,
                text: '無法獲取預覽內容',
                extraction_method: 'final_fallback'
              };
            }
          } catch (enhancedError) {
            console.error('❌ [Enhanced Preview] 回退失敗:', enhancedError.message);
            previewResult = {
              title: new URL(url).hostname,
              description: '無法獲取預覽內容',
              image: null,
              text: '無法獲取預覽內容',
              extraction_method: 'final_fallback'
            };
          }
        }

        if (previewResult && previewResult.title) {
          console.log('✅ [即時處理] 預覽內容獲取成功:', {
            hasImage: !!previewResult.image,
            hasDescription: !!previewResult.description,
            title: previewResult.title?.substring(0, 50) || '無標題'
          });

          // 將預覽內容加入 finalContent
          finalContent = {
            ...finalContent,
            image: previewResult.image,
            text: previewResult.text || previewResult.description,
            title: previewResult.title,
            description: previewResult.description,
            // 🔥 重要：設置預覽欄位，讓前端能正確顯示
            preview_title: previewResult.title,
            preview_description: previewResult.description,
            preview_image: previewResult.image,
            extraction_method: previewResult.extraction_method || 'unknown',
            extraction_date: new Date().toISOString(),
            auto_processed: true
          };
        } else {
          console.log('⚠️ [即時處理] 預覽內容獲取失敗:', previewResult ? '格式錯誤' : '無返回數據');
        }

        // 🚀 第二步：使用獨立的社群帳戶提取器 (新架構)
        console.log('🔄 [即時處理] 步驟2: 呼叫獨立社群帳戶提取器 (新架構)...');
        const SocialAccountExtractor = require('./social-account-extractor');
        const socialExtractor = new SocialAccountExtractor();

        // 🔥 確定最終標題
        let finalTitle = collectionData.title; // 預設使用 URL
        let extractedRealTitle = null;

        // 🔍 檢查預覽結果的標題
        const possibleTitles = [
          previewResult?.title,
          finalContent?.title
        ].filter(Boolean);

        console.log('🔍 [標題處理] 檢查所有可能的標題來源:', {
          previewResultTitle: previewResult?.title,
          finalContentTitle: finalContent?.title,
          possibleTitlesCount: possibleTitles.length
        });

        // 找到第一個有效的標題
        for (const titleCandidate of possibleTitles) {
          if (titleCandidate &&
              titleCandidate !== 'www.facebook.com' &&
              titleCandidate !== 'facebook.com' &&
              titleCandidate !== 'Error' &&
              !titleCandidate.startsWith('http') &&
              !titleCandidate.includes('facebook.com/share/') &&
              titleCandidate.length > 2) {
            extractedRealTitle = titleCandidate;
            break;
          }
        }

        if (extractedRealTitle) {
          finalTitle = extractedRealTitle;
          console.log('✅ [標題處理] 找到有效標題:', finalTitle);
        } else {
          console.log('⚠️ [標題處理] 未找到有效標題，使用 URL 作為標題');
        }

        const contentData = {
          url: url,
          domain: new URL(url).hostname,
          title: finalTitle,
          description: (previewResult && previewResult.description) ? previewResult.description : collectionData.description || '',
          content: finalContent,
          metaTags: {},
          mainContent: (previewResult && previewResult.text) ? previewResult.text : ''
        };

        console.log('📋 [即時處理] 傳遞給社群帳戶提取器的數據:', {
          url: contentData.url,
          domain: contentData.domain,
          title: contentData.title,
          titleSource: previewResult?.title ? 'open_graph_api' : 'url_fallback',
          hasDescription: !!contentData.description,
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
      // 🔥 新增：同時寫入預覽獨立欄位（提升查詢效能）
      preview_image: finalContent.preview_image || null,
      preview_title: finalContent.preview_title || null,
      preview_description: finalContent.preview_description || null,
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