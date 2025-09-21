/**
 * 獨立的社群帳戶提取器
 * 專門負責從社群平台URL提取帳戶名稱和資訊
 * 與AI標籤生成器分離，提升穩定性
 */

class SocialAccountExtractor {
    constructor() {
        // 支援的社群平台列表
        this.supportedPlatforms = [
            'facebook.com',
            'instagram.com',
            'twitter.com',
            'x.com',
            'threads.net',
            'linkedin.com'
        ];
    }

    /**
     * 主要方法：提取社群帳戶資訊
     * @param {Object} contentData - 內容數據
     * @returns {Object|null} 社群帳戶資訊
     */
    async extractAccountInfo(contentData) {
        try {
            const { url, domain, title, description, mainContent, metaTags } = contentData;

            if (!url || !domain) {
                console.log('🔍 [社群帳戶] 缺少URL或域名資訊');
                return null;
            }

            console.log('👥 [社群帳戶] 開始提取帳戶資訊...');
            console.log(`   URL: ${url}`);
            console.log(`   Domain: ${domain}`);
            console.log(`   Title: ${title || '無'}`);

            // 檢查是否為支援的社群平台
            const isSocialPlatform = this.supportedPlatforms.some(platform =>
                domain.includes(platform)
            );

            if (!isSocialPlatform) {
                console.log('🔍 [社群帳戶] 非支援的社群平台，跳過');
                return null;
            }

            // 根據平台調用相應的提取方法
            let result = null;

            if (domain.includes('facebook.com')) {
                result = this.extractFacebookAccount(url, contentData);
            } else if (domain.includes('instagram.com')) {
                result = this.extractInstagramAccount(url, contentData);
            } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
                result = this.extractTwitterAccount(url, contentData);
            } else if (domain.includes('threads.net')) {
                result = this.extractThreadsAccount(url, contentData);
            } else if (domain.includes('linkedin.com')) {
                result = this.extractLinkedInAccount(url, contentData);
            }

            if (result) {
                console.log('✅ [社群帳戶] 提取成功:', {
                    platform: result.platform,
                    accountName: result.accountName,
                    hasProfileImage: !!result.profileImage
                });
            } else {
                console.log('⚠️ [社群帳戶] 無法提取到有效帳戶資訊');
            }

            return result;

        } catch (error) {
            console.error('❌ [社群帳戶] 提取失敗:', error.message);
            return null;
        }
    }

    /**
     * Facebook 帳戶提取
     */
    extractFacebookAccount(url, contentData) {
        console.log('📘 [Facebook] 開始提取Facebook帳戶資訊');

        // 🆕 檢查是否為新分享格式 /share/p/ 或 /share/v/
        const isNewShareFormat = url.includes('/share/') && (url.includes('/p/') || url.includes('/v/'));

        if (isNewShareFormat) {
            console.log('🆕 [Facebook] 偵測到新分享格式，使用智能提取器');
            return this.handleFacebookNewShareFormat(url, contentData);
        }

        const { title, description, metaTags, mainContent } = contentData;
        let accountName = null;
        let profileImage = null;

        // 方法1: 從標題提取（最可靠）
        if (title) {
            // Facebook 標題格式處理
            const titlePatterns = [
                /^(.+?)\s*[-|]\s*Facebook/i,  // "帳號名稱 - Facebook"
                /^(.+?)\s*\|\s*Facebook/i,   // "帳號名稱 | Facebook"
                /^([^-|]{2,30})$/            // 簡單標題（不含分隔符）
            ];

            for (const pattern of titlePatterns) {
                const match = title.match(pattern);
                if (match && match[1]) {
                    const candidate = match[1].trim();
                    // 過濾掉明顯的URL或無效名稱
                    if (!candidate.includes('facebook.com') &&
                        !candidate.includes('http') &&
                        candidate.length >= 2 &&
                        candidate.length <= 50) {
                        accountName = candidate;
                        console.log('✅ [Facebook] 從標題提取帳戶名稱:', accountName);
                        break;
                    }
                }
            }
        }

        // 方法2: 從描述提取
        if (!accountName && description) {
            const descPatterns = [
                /^([^.,。，\n]{2,30})/,      // 描述開頭
                /歡迎來到\s*([^，。,.\n]{2,20})/,
                /這裡是\s*([^，。,.\n]{2,20})/,
                /([^，。,.\n]{2,20})\s*官方/,
                /([^，。,.\n]{2,20})\s*粉絲專頁/
            ];

            for (const pattern of descPatterns) {
                const match = description.match(pattern);
                if (match && match[1]) {
                    const candidate = match[1].trim();
                    if (!candidate.includes('facebook.com') &&
                        !candidate.includes('http')) {
                        accountName = candidate;
                        console.log('✅ [Facebook] 從描述提取帳戶名稱:', accountName);
                        break;
                    }
                }
            }
        }

        // 方法3: 從內容提取
        if (!accountName && mainContent) {
            accountName = this.extractAccountNameFromContent(mainContent, 'facebook');
            if (accountName) {
                console.log('✅ [Facebook] 從內容提取帳戶名稱:', accountName);
            }
        }

        // 方法4: 從meta標籤提取圖片
        if (metaTags) {
            profileImage = metaTags['og:image'] ||
                          metaTags['twitter:image'] ||
                          metaTags['image'] ||
                          null;
        }

        // 如果所有方法都失敗，返回null而不是URL
        if (!accountName) {
            console.log('⚠️ [Facebook] 無法提取有效帳戶名稱');
            return null;
        }

        return {
            platform: 'Facebook',
            accountName: accountName,
            profileImage: profileImage,
            url: url
        };
    }

    /**
     * Instagram 帳戶提取
     */
    extractInstagramAccount(url, contentData) {
        console.log('📸 [Instagram] 開始提取Instagram帳戶資訊');

        const { title, description } = contentData;
        let accountName = null;

        // Instagram URL模式: /p/xxx 是貼文，/@username 是帳戶
        const usernameMatch = url.match(/instagram\.com\/@([^/]+)/);
        if (usernameMatch) {
            accountName = usernameMatch[1];
        }

        // 從標題提取
        if (!accountName && title) {
            const titleMatch = title.match(/^(.+?)\s*[-|·]\s*Instagram/i);
            if (titleMatch) {
                accountName = titleMatch[1].trim();
            }
        }

        if (!accountName) {
            console.log('⚠️ [Instagram] 無法提取有效帳戶名稱');
            return null;
        }

        return {
            platform: 'Instagram',
            accountName: accountName,
            profileImage: null,
            url: url
        };
    }

    /**
     * Twitter/X 帳戶提取
     */
    extractTwitterAccount(url, contentData) {
        console.log('🐦 [Twitter] 開始提取Twitter帳戶資訊');

        const { title, description } = contentData;
        let accountName = null;

        // Twitter URL模式: /username/status/xxx
        const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([^/]+)/);
        if (usernameMatch && usernameMatch[1] !== 'status') {
            accountName = usernameMatch[1];
        }

        if (!accountName) {
            console.log('⚠️ [Twitter] 無法提取有效帳戶名稱');
            return null;
        }

        return {
            platform: 'Twitter',
            accountName: accountName,
            profileImage: null,
            url: url
        };
    }

    /**
     * Threads 帳戶提取
     */
    extractThreadsAccount(url, contentData) {
        console.log('🧵 [Threads] 開始提取Threads帳戶資訊');

        const { title } = contentData;
        let accountName = null;

        // Threads URL模式
        const usernameMatch = url.match(/threads\.net\/@([^/]+)/);
        if (usernameMatch) {
            accountName = usernameMatch[1];
        }

        if (!accountName) {
            console.log('⚠️ [Threads] 無法提取有效帳戶名稱');
            return null;
        }

        return {
            platform: 'Threads',
            accountName: accountName,
            profileImage: null,
            url: url
        };
    }

    /**
     * LinkedIn 帳戶提取
     */
    extractLinkedInAccount(url, contentData) {
        console.log('💼 [LinkedIn] 開始提取LinkedIn帳戶資訊');

        const { title } = contentData;
        let accountName = null;

        // 從標題提取
        if (title) {
            const titleMatch = title.match(/^(.+?)\s*[-|]\s*LinkedIn/i);
            if (titleMatch) {
                accountName = titleMatch[1].trim();
            }
        }

        if (!accountName) {
            console.log('⚠️ [LinkedIn] 無法提取有效帳戶名稱');
            return null;
        }

        return {
            platform: 'LinkedIn',
            accountName: accountName,
            profileImage: null,
            url: url
        };
    }

    /**
     * 從內容中提取帳戶名稱的通用方法
     */
    extractAccountNameFromContent(content, platform) {
        if (!content) return null;

        const strategies = {
            facebook: [
                /歡迎來到\s*([^，。,.\n]{2,20})/,
                /這裡是\s*([^，。,.\n]{2,20})/,
                /([^，。,.\n]{2,20})\s*官方/,
                /([^，。,.\n]{2,20})\s*粉絲專頁/
            ],
            instagram: [
                /@([a-zA-Z0-9_.]{2,30})/,
                /Follow\s*@([a-zA-Z0-9_.]{2,30})/i
            ],
            general: [
                /^([^，。,.\n]{2,30})/
            ]
        };

        const patterns = strategies[platform] || strategies.general;

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                const candidate = match[1].trim();
                if (!candidate.includes('http') && candidate.length >= 2) {
                    return candidate;
                }
            }
        }

        return null;
    }

    /**
     * 🆕 處理 Facebook 新分享格式的一勞永逸解決方案 (增強版)
     * 支援 /share/p/ 和 /share/v/ 等所有新格式
     * 新增：等待並處理延遲到達的正確標題
     */
    async handleFacebookNewShareFormat(url, contentData) {
        console.log('🆕 [Facebook 新格式] 開始智能處理 (增強版)');
        console.log(`🔗 [Facebook 新格式] URL: ${url}`);
        console.log('🔍 [Facebook 新格式] 接收到的內容數據:', {
            title: contentData.title,
            description: contentData.description,
            hasMainContent: !!contentData.mainContent
        });

        const { title, description, mainContent } = contentData;

        // 🎯 策略1: 從 URL 結構提取類型信息
        let contentType = 'unknown';
        let shareId = '';

        if (url.includes('/share/p/')) {
            contentType = 'post';
            const match = url.match(/\/share\/p\/([^\/\?]+)/);
            shareId = match ? match[1] : '';
        } else if (url.includes('/share/v/')) {
            contentType = 'video';
            const match = url.match(/\/share\/v\/([^\/\?]+)/);
            shareId = match ? match[1] : '';
        }

        console.log(`📋 [Facebook 新格式] 內容類型: ${contentType}, ID: ${shareId}`);

        // 🎯 策略2: 智能生成合理的帳戶名稱 (增強版標題處理)
        let accountName = null;

        // 2.1 增強版標題檢查 - 支援多重標題來源檢查
        const possibleTitles = [
            title,
            contentData.metaTags?.['og:title'],
            contentData.metaTags?.title,
            mainContent && mainContent.includes(':') ? mainContent.split('\n')[0] : null
        ].filter(Boolean);

        console.log('🔍 [Facebook 新格式] 檢查所有可能的標題來源:', {
            mainTitle: title,
            ogTitle: contentData.metaTags?.['og:title'],
            metaTitle: contentData.metaTags?.title,
            possibleTitlesCount: possibleTitles.length
        });

        // 從所有可能的標題中找到最佳的
        for (const titleCandidate of possibleTitles) {
            const isValidTitle = titleCandidate &&
                               titleCandidate !== 'Error' &&
                               titleCandidate !== 'www.facebook.com' &&
                               titleCandidate !== 'facebook.com' &&
                               !titleCandidate.includes('無法獲取') &&
                               !titleCandidate.startsWith('http') &&
                               !titleCandidate.includes('facebook.com/share/') &&
                               titleCandidate.length > 2;

            if (isValidTitle) {
                // 清理標題，移除常見的無用信息
                const cleanTitle = titleCandidate
                    .replace(/\s*-\s*Facebook.*$/i, '')
                    .replace(/\s*\|\s*Facebook.*$/i, '')
                    .replace(/^Facebook\s*-?\s*/i, '')
                    .replace(/^www\.\s*/i, '') // 移除 www. 前綴
                    .trim();

                if (cleanTitle && cleanTitle.length > 2 && cleanTitle.length < 50) {
                    accountName = cleanTitle;
                    console.log(`✅ [Facebook 新格式] 從標題提取帳戶名稱: ${accountName} (來源: ${titleCandidate === title ? '主標題' : '次要標題'})`);
                    break;
                } else {
                    console.log(`⚠️ [Facebook 新格式] 標題清理後無效: "${cleanTitle}"`);
                }
            }
        }

        if (!accountName) {
            console.log(`⚠️ [Facebook 新格式] 所有標題候選都不符合要求`);
        }

        // 2.2 從描述中嘗試提取
        if (!accountName && description && !description.includes('無法獲取')) {
            const descLines = description.split('\n').filter(line => line.trim());
            for (const line of descLines) {
                const cleanLine = line.trim();
                if (cleanLine.length > 2 && cleanLine.length < 50 &&
                    !cleanLine.includes('http') &&
                    !cleanLine.includes('facebook.com') &&
                    !cleanLine.toLowerCase().includes('see more')) {
                    accountName = cleanLine;
                    console.log(`✅ [Facebook 新格式] 從描述提取帳戶名稱: ${accountName}`);
                    break;
                }
            }
        }

        // 2.3 智能回退策略
        if (!accountName) {
            // 根據內容類型生成合理的名稱
            if (contentType === 'post') {
                accountName = `Facebook 貼文 ${shareId.substring(0, 8)}`;
            } else if (contentType === 'video') {
                accountName = `Facebook 影片 ${shareId.substring(0, 8)}`;
            } else {
                accountName = `Facebook 分享內容`;
            }
            console.log(`🔄 [Facebook 新格式] 使用智能回退名稱: ${accountName}`);
        }

        // 🎯 策略3: 確保帳戶名稱的質量
        if (accountName) {
            // 最終清理和驗證
            accountName = accountName
                .replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/g, ' ') // 保留中英文和數字
                .replace(/\s+/g, ' ')
                .trim();

            // 確保長度合理
            if (accountName.length > 30) {
                accountName = accountName.substring(0, 30) + '...';
            }
        }

        const result = {
            platform: 'Facebook',
            accountName: accountName || 'Facebook 用戶',
            profileImage: null,
            url: url,
            contentType: contentType,
            shareId: shareId,
            extractionMethod: 'new_share_format_handler'
        };

        console.log(`🎉 [Facebook 新格式] 處理完成:`, {
            accountName: result.accountName,
            contentType: result.contentType,
            extractionMethod: result.extractionMethod
        });

        return result;
    }
}

module.exports = SocialAccountExtractor;