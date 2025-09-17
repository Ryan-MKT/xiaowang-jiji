/**
 * 自動標籤API
 * 網頁分析和AI標籤生成的API端點
 */

const WebContentAnalyzer = require('./web-content-analyzer');
const AITagGenerator = require('./ai-tag-generator');

// 初始化服務
const contentAnalyzer = new WebContentAnalyzer();
const tagGenerator = new AITagGenerator();

/**
 * 設置自動標籤相關的API路由
 * @param {Express} app - Express應用實例
 * @param {Map} aiTagsCache - AI標籤暫存 Map
 */
function setupAutoTagRoutes(app, aiTagsCache) {

    // 自動分析網址並生成標籤 API
    app.post('/api/auto-tag', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            const { url } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: '缺少用戶ID'
                });
            }

            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: '缺少網址'
                });
            }

            console.log(`🏷️ [自動標籤] 用戶 ${userId} 請求分析: ${url}`);

            // 檢查 cache 中是否已有此 URL 的標籤
            const cacheKey = `${userId}_${url}`;
            const isFacebookUrl = url.includes('facebook.com');

            // 對於Facebook URL，如果快取的標籤是通用標籤，則跳過快取重新分析
            if (aiTagsCache && aiTagsCache.has(cacheKey)) {
                const cachedTags = aiTagsCache.get(cacheKey);

                // 檢查是否為Facebook的通用標籤，如果是則重新分析
                if (isFacebookUrl && cachedTags.length === 3 &&
                    cachedTags.includes('社群') && cachedTags.includes('分享') &&
                    (cachedTags.includes('貼文') || cachedTags.includes('分享內容'))) {
                    console.log(`🔄 [自動標籤] Facebook URL 檢測到通用標籤，重新分析: ${cachedTags.join(', ')}`);
                    // 清除舊快取，讓系統重新分析
                    aiTagsCache.delete(cacheKey);
                } else {
                    console.log(`💾 [自動標籤] 使用快取標籤: ${cachedTags.join(', ')}`);

                    return res.json({
                        success: true,
                        url: url,
                        tags: cachedTags,
                        metadata: {
                            title: '快取內容',
                            description: '從快取取得的AI標籤',
                            contentType: 'cached',
                            confidence: 1.0,
                            method: 'cache',
                            language: 'zh-TW',
                            processingTime: new Date().toISOString()
                        }
                    });
                }
            }

            // 第一步：分析網頁內容
            const analysisResult = await contentAnalyzer.analyzeUrl(url);

            if (!analysisResult.success) {
                console.error('🚫 [自動標籤] 網頁分析失敗:', analysisResult.error);
                return res.status(400).json({
                    success: false,
                    error: `網頁分析失敗: ${analysisResult.error}`,
                    step: 'content_analysis'
                });
            }

            console.log('✅ [自動標籤] 網頁分析成功，開始生成標籤...');

            // 第二步：生成AI標籤
            // 為 contentData 添加 URL 信息，以便智能標籤分析
            const enrichedContentData = {
                ...analysisResult.data,
                url: analysisResult.url || url
            };
            const tagResult = await tagGenerator.generateTags(enrichedContentData);

            if (!tagResult.success) {
                console.error('🚫 [自動標籤] 標籤生成失敗:', tagResult.error);
                return res.status(500).json({
                    success: false,
                    error: `標籤生成失敗: ${tagResult.error}`,
                    step: 'tag_generation'
                });
            }

            console.log('🎉 [自動標籤] 標籤生成成功:', tagResult.tags);

            // 將新生成的標籤儲存到 cache
            if (aiTagsCache && tagResult.tags && tagResult.tags.length > 0) {
                aiTagsCache.set(cacheKey, tagResult.tags);
                console.log(`💾 [自動標籤] 標籤已儲存到快取: ${cacheKey} -> ${tagResult.tags.join(', ')}`);
            }

            // 返回完整結果
            const response = {
                success: true,
                url: analysisResult.url,
                tags: tagResult.tags,
                metadata: {
                    title: analysisResult.data.title,
                    description: analysisResult.data.description,
                    contentType: analysisResult.data.contentType,
                    confidence: tagResult.confidence,
                    method: tagResult.method,
                    language: analysisResult.data.language,
                    processingTime: new Date().toISOString()
                }
            };

            res.json(response);

        } catch (error) {
            console.error('❌ [自動標籤] API 發生意外錯誤:', error);
            res.status(500).json({
                success: false,
                error: '伺服器內部錯誤',
                details: error.message
            });
        }
    });

    // 批量分析多個網址 API
    app.post('/api/auto-tag/batch', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            const { urls } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: '缺少用戶ID'
                });
            }

            if (!Array.isArray(urls) || urls.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: '請提供有效的網址陣列'
                });
            }

            if (urls.length > 5) {
                return res.status(400).json({
                    success: false,
                    error: '一次最多只能分析5個網址'
                });
            }

            console.log(`🏷️ [批量自動標籤] 用戶 ${userId} 請求分析 ${urls.length} 個網址`);

            const results = [];

            // 依序處理每個網址（避免併發太多請求）
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                console.log(`🔄 [批量分析] 處理第 ${i + 1}/${urls.length} 個網址: ${url}`);

                try {
                    // 分析網頁內容
                    const analysisResult = await contentAnalyzer.analyzeUrl(url);

                    if (analysisResult.success) {
                        // 生成標籤
                        const tagResult = await tagGenerator.generateTags(analysisResult.data);

                        results.push({
                            url: url,
                            success: tagResult.success,
                            tags: tagResult.tags || [],
                            metadata: {
                                title: analysisResult.data.title,
                                description: analysisResult.data.description,
                                contentType: analysisResult.data.contentType,
                                confidence: tagResult.confidence,
                                method: tagResult.method
                            }
                        });
                    } else {
                        results.push({
                            url: url,
                            success: false,
                            error: analysisResult.error,
                            tags: []
                        });
                    }
                } catch (error) {
                    console.error(`❌ [批量分析] 處理網址失敗: ${url}`, error.message);
                    results.push({
                        url: url,
                        success: false,
                        error: error.message,
                        tags: []
                    });
                }

                // 在請求之間稍作延遲，避免過度負載
                if (i < urls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            console.log(`✅ [批量自動標籤] 完成處理，成功: ${results.filter(r => r.success).length}/${results.length}`);

            res.json({
                success: true,
                results: results,
                summary: {
                    total: results.length,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length
                }
            });

        } catch (error) {
            console.error('❌ [批量自動標籤] API 發生意外錯誤:', error);
            res.status(500).json({
                success: false,
                error: '伺服器內部錯誤',
                details: error.message
            });
        }
    });

    // 測試網頁分析功能 API
    app.post('/api/analyze-content', async (req, res) => {
        try {
            const { url } = req.body;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: '缺少網址'
                });
            }

            console.log(`🔍 [內容分析測試] 分析網址: ${url}`);

            const analysisResult = await contentAnalyzer.analyzeUrl(url);

            if (analysisResult.success) {
                console.log('✅ [內容分析測試] 分析成功');
                res.json({
                    success: true,
                    url: analysisResult.url,
                    data: analysisResult.data
                });
            } else {
                console.error('🚫 [內容分析測試] 分析失敗:', analysisResult.error);
                res.status(400).json({
                    success: false,
                    error: analysisResult.error,
                    url: url
                });
            }

        } catch (error) {
            console.error('❌ [內容分析測試] API 發生意外錯誤:', error);
            res.status(500).json({
                success: false,
                error: '伺服器內部錯誤',
                details: error.message
            });
        }
    });

    // 清除特定URL快取的API
    app.post('/api/clear-tag-cache', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            const { url } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: '缺少用戶ID'
                });
            }

            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: '缺少網址'
                });
            }

            const cacheKey = `${userId}_${url}`;

            if (aiTagsCache && aiTagsCache.has(cacheKey)) {
                aiTagsCache.delete(cacheKey);
                console.log(`🗑️ [快取清除] 已清除快取: ${cacheKey}`);

                res.json({
                    success: true,
                    message: '快取已清除',
                    cacheKey: cacheKey
                });
            } else {
                res.json({
                    success: true,
                    message: '快取中沒有此URL',
                    cacheKey: cacheKey
                });
            }

        } catch (error) {
            console.error('❌ [快取清除] API 發生意外錯誤:', error);
            res.status(500).json({
                success: false,
                error: '伺服器內部錯誤',
                details: error.message
            });
        }
    });

    console.log('🏷️ [自動標籤] API 路由設置完成');
}

module.exports = { setupAutoTagRoutes };