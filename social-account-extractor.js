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
}

module.exports = SocialAccountExtractor;