/**
 * 網頁內容分析模組 - 方案二實現
 * 爬取網頁內容並提取關鍵資訊用於AI標籤生成
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

class WebContentAnalyzer {
    constructor() {
        this.timeout = 10000; // 10秒超時
        this.maxContentLength = 3000; // 最大內容長度
    }

    /**
     * 分析網頁URL並提取內容
     * @param {string} url - 要分析的網址
     * @returns {Object} 分析結果
     */
    async analyzeUrl(url) {
        try {
            // 驗證URL格式
            const validatedUrl = this.validateAndNormalizeUrl(url);

            // 檢查是否為社交媒體連結，使用智能分析
            if (this.isSocialMediaUrl(validatedUrl)) {
                console.log('🔍 [內容分析] 檢測到社交媒體連結，使用智能分析');
                return await this.analyzeSocialMediaUrl(validatedUrl);
            }

            // 爬取網頁內容
            const htmlContent = await this.fetchWebContent(validatedUrl);

            // 解析並提取關鍵資訊
            const extractedData = this.extractContentData(htmlContent, validatedUrl);

            // 判斷內容類型
            const contentType = this.detectContentType(extractedData);

            return {
                success: true,
                url: validatedUrl,
                data: {
                    ...extractedData,
                    contentType,
                    analyzedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('網頁分析失敗:', error.message);

            // 如果爬取失敗，嘗試智能分析URL本身
            try {
                const fallbackResult = this.analyzeUrlFallback(url);
                return fallbackResult;
            } catch (fallbackError) {
                return {
                    success: false,
                    error: error.message,
                    url: url
                };
            }
        }
    }

    /**
     * 驗證並標準化URL
     */
    validateAndNormalizeUrl(url) {
        try {
            // 如果沒有協議，自動添加 https://
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }

            const parsedUrl = new URL(url);
            return parsedUrl.href;
        } catch (error) {
            throw new Error('無效的網址格式');
        }
    }

    /**
     * 爬取網頁內容
     */
    async fetchWebContent(url) {
        try {
            const response = await axios.get(url, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate'
                },
                maxRedirects: 5,
                validateStatus: (status) => status < 400
            });

            return response.data;
        } catch (error) {
            if (error.code === 'ENOTFOUND') {
                throw new Error('無法連接到該網站');
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error('網頁載入超時');
            } else if (error.response?.status === 403) {
                throw new Error('網站拒絕訪問');
            } else if (error.response?.status === 404) {
                throw new Error('網頁不存在');
            } else {
                throw new Error(`網頁載入失敗: ${error.message}`);
            }
        }
    }

    /**
     * 提取網頁關鍵內容資訊
     */
    extractContentData(html, url) {
        const $ = cheerio.load(html);

        // 移除不需要的元素
        $('script, style, nav, footer, aside, .advertisement, .ads, .sidebar').remove();

        // 提取基本資訊
        const title = this.extractTitle($);
        const description = this.extractDescription($);
        const keywords = this.extractKeywords($);

        // 提取結構化內容
        const headings = this.extractHeadings($);
        const mainContent = this.extractMainContent($);
        const images = this.extractImages($);

        // 獲取域名資訊
        const domain = new URL(url).hostname;

        // 提取作者信息
        const author = this.extractAuthor($);

        // 提取高頻詞彙作為標籤
        const frequentWords = this.extractFrequentWords(mainContent);

        return {
            title: title.trim(),
            description: description.trim(),
            keywords: keywords,
            headings: headings,
            mainContent: mainContent.trim(),
            images: images,
            domain: domain,
            wordCount: mainContent.length,
            language: this.detectLanguage(title + ' ' + description + ' ' + mainContent),
            author: author,
            frequentWords: frequentWords
        };
    }

    /**
     * 提取頁面標題
     */
    extractTitle($) {
        // 嘗試多種標題提取方式
        let title = $('title').text() ||
                   $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="twitter:title"]').attr('content') ||
                   $('h1').first().text() ||
                   '';

        return title.substring(0, 100); // 限制長度
    }

    /**
     * 提取頁面描述
     */
    extractDescription($) {
        let description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="twitter:description"]').attr('content') ||
                         $('p').first().text() ||
                         '';

        return description.substring(0, 300); // 限制長度
    }

    /**
     * 提取關鍵字
     */
    extractKeywords($) {
        const keywords = $('meta[name="keywords"]').attr('content');
        if (keywords) {
            return keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
        }
        return [];
    }

    /**
     * 提取標題結構
     */
    extractHeadings($) {
        const headings = [];
        $('h1, h2, h3, h4').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text && text.length < 100) {
                headings.push({
                    level: elem.tagName.toLowerCase(),
                    text: text
                });
            }
        });
        return headings.slice(0, 10); // 最多10個標題
    }

    /**
     * 提取主要內容
     */
    extractMainContent($) {
        // 嘗試提取主要內容區域
        let content = '';

        // 常見的主要內容選擇器
        const contentSelectors = [
            'main', 'article', '.content', '.main-content',
            '.post-content', '.entry-content', '.article-content',
            '.page-content', '#content', '#main'
        ];

        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                content = element.text();
                break;
            }
        }

        // 如果沒找到主要內容區域，提取所有段落
        if (!content) {
            content = $('p').map((i, elem) => $(elem).text()).get().join(' ');
        }

        // 清理和限制內容長度
        content = content.replace(/\s+/g, ' ').trim();
        return content.substring(0, this.maxContentLength);
    }

    /**
     * 提取圖片資訊
     */
    extractImages($) {
        const images = [];
        $('img').each((i, elem) => {
            const alt = $(elem).attr('alt');
            const src = $(elem).attr('src');
            if (alt && alt.trim()) {
                images.push(alt.trim());
            }
        });
        return images.slice(0, 5); // 最多5個圖片alt文字
    }

    /**
     * 檢測內容語言
     */
    detectLanguage(content) {
        // 簡單的語言檢測
        const chineseRegex = /[\u4e00-\u9fff]/;
        const englishRegex = /[a-zA-Z]/;

        const chineseCount = (content.match(chineseRegex) || []).length;
        const englishCount = (content.match(englishRegex) || []).length;

        if (chineseCount > englishCount) {
            return 'zh';
        } else if (englishCount > 0) {
            return 'en';
        } else {
            return 'unknown';
        }
    }

    /**
     * 檢測內容類型
     */
    detectContentType(data) {
        const { title, description, mainContent, domain, keywords } = data;
        const fullText = `${title} ${description} ${mainContent}`.toLowerCase();

        // 技術內容檢測
        const techKeywords = [
            'javascript', 'python', 'react', 'vue', 'api', 'code', 'programming',
            '程式', '開發', '技術', '框架', '函數', '變數', 'css', 'html', 'node'
        ];

        // 新聞內容檢測
        const newsKeywords = [
            'news', 'report', 'breaking', '新聞', '報導', '消息', '記者', '今天', '昨天'
        ];

        // 教學內容檢測
        const tutorialKeywords = [
            'tutorial', 'guide', 'how to', 'learn', 'step', '教學', '指南', '步驟', '學習', '如何'
        ];

        // 產品內容檢測
        const productKeywords = [
            'product', 'buy', 'price', 'purchase', 'download', '產品', '購買', '價格', '下載', '功能'
        ];

        // 計算匹配分數
        const scores = {
            technical: this.calculateKeywordScore(fullText, techKeywords),
            news: this.calculateKeywordScore(fullText, newsKeywords),
            tutorial: this.calculateKeywordScore(fullText, tutorialKeywords),
            product: this.calculateKeywordScore(fullText, productKeywords)
        };

        // 域名加權
        if (domain.includes('github') || domain.includes('stackoverflow') || domain.includes('developer')) {
            scores.technical += 20;
        }
        if (domain.includes('news') || domain.includes('bbc') || domain.includes('cnn')) {
            scores.news += 20;
        }

        // 返回最高分的類型
        const maxScore = Math.max(...Object.values(scores));
        const detectedType = Object.keys(scores).find(key => scores[key] === maxScore);

        return {
            type: detectedType || 'general',
            confidence: maxScore,
            scores: scores
        };
    }

    /**
     * 計算關鍵字匹配分數
     */
    calculateKeywordScore(content, keywords) {
        let score = 0;
        keywords.forEach(keyword => {
            const regex = new RegExp(keyword, 'gi');
            const matches = content.match(regex);
            if (matches) {
                score += matches.length;
            }
        });
        return score;
    }

    /**
     * 檢查是否為社交媒體URL
     */
    isSocialMediaUrl(url) {
        const socialDomains = [
            'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
            'threads.net', 'tiktok.com', 'linkedin.com', 'youtube.com',
            'youtu.be', 'pinterest.com', 'snapchat.com'
        ];

        try {
            const domain = new URL(url).hostname.toLowerCase();
            return socialDomains.some(socialDomain => domain.includes(socialDomain));
        } catch {
            return false;
        }
    }

    /**
     * 社交媒體URL智能分析
     */
    async analyzeSocialMediaUrl(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.toLowerCase();
            const pathname = urlObj.pathname;

            let title = '';
            let description = '';
            let contentType = { type: 'general', confidence: 60 };

            // 根據不同平台進行分析
            if (domain.includes('facebook.com')) {
                console.log('🔍 [Facebook分析] 嘗試分析 Facebook 內容...');

                // 先嘗試真實抓取 Facebook 內容
                try {
                    const htmlContent = await this.fetchWebContent(url);
                    const extractedData = this.extractContentData(htmlContent, url);

                    if (extractedData.title && extractedData.title !== 'Facebook') {
                        title = extractedData.title;
                        description = extractedData.description || 'Facebook 分享內容';
                        console.log(`✅ [Facebook分析] 成功抓取內容: ${title}`);
                    } else {
                        throw new Error('無法抓取Facebook內容');
                    }
                } catch (error) {
                    console.log(`⚠️ [Facebook分析] 內容抓取失敗，使用預設分析: ${error.message}`);
                    // 回退到預設分析
                    title = 'Facebook 貼文';
                    description = 'Facebook 社群分享內容';

                    if (pathname.includes('/photo/')) {
                        title = 'Facebook 相片';
                        description = 'Facebook 相片分享';
                    } else if (pathname.includes('/video/')) {
                        title = 'Facebook 影片';
                        description = 'Facebook 影片分享';
                    } else if (pathname.includes('/share/')) {
                        title = 'Facebook 分享內容';
                        description = 'Facebook 用戶分享的內容';
                    }
                }

                contentType = { type: 'social', confidence: 80 };
            } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
                title = 'YouTube 影片';
                description = 'YouTube 影片內容';
                contentType = { type: 'tutorial', confidence: 70 };
            } else if (domain.includes('instagram.com')) {
                title = 'Instagram 貼文';
                description = 'Instagram 圖片或影片分享';
                contentType = { type: 'social', confidence: 80 };
            } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
                title = 'Twitter/X 貼文';
                description = 'Twitter/X 社群動態';
                contentType = { type: 'social', confidence: 80 };
            } else if (domain.includes('linkedin.com')) {
                title = 'LinkedIn 內容';
                description = 'LinkedIn 專業分享';
                contentType = { type: 'professional', confidence: 75 };
            }

            return {
                success: true,
                url: url,
                data: {
                    title: title,
                    description: description,
                    mainContent: description,
                    domain: domain,
                    keywords: [],
                    headings: [],
                    images: [],
                    wordCount: description.length,
                    language: 'zh',
                    contentType: contentType,
                    analyzedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            throw new Error(`社交媒體分析失敗: ${error.message}`);
        }
    }

    /**
     * URL後備分析（當爬取失敗時）
     */
    analyzeUrlFallback(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.toLowerCase();
            const pathname = urlObj.pathname;

            // 從域名推測內容類型和標題
            let title = domain;
            let description = '網頁內容';
            let contentType = { type: 'general', confidence: 40 };

            // 域名分析
            if (domain.includes('github')) {
                title = 'GitHub 專案';
                description = 'GitHub 開源程式碼專案';
                contentType = { type: 'technical', confidence: 70 };
            } else if (domain.includes('stackoverflow')) {
                title = 'Stack Overflow 問答';
                description = '程式設計問題與解答';
                contentType = { type: 'technical', confidence: 75 };
            } else if (domain.includes('medium')) {
                title = 'Medium 文章';
                description = 'Medium 部落格文章';
                contentType = { type: 'tutorial', confidence: 65 };
            } else if (domain.includes('wikipedia')) {
                title = 'Wikipedia 條目';
                description = 'Wikipedia 百科全書條目';
                contentType = { type: 'general', confidence: 70 };
            } else if (domain.includes('blog')) {
                title = '部落格文章';
                description = '部落格分享內容';
                contentType = { type: 'tutorial', confidence: 60 };
            } else if (domain.includes('doc') || domain.includes('api')) {
                title = '技術文檔';
                description = '技術文檔或API說明';
                contentType = { type: 'technical', confidence: 65 };
            }

            // 路徑分析
            if (pathname.includes('tutorial')) {
                title += ' - 教學';
                contentType = { type: 'tutorial', confidence: contentType.confidence + 10 };
            } else if (pathname.includes('guide')) {
                title += ' - 指南';
                contentType = { type: 'tutorial', confidence: contentType.confidence + 10 };
            } else if (pathname.includes('api')) {
                title += ' - API';
                contentType = { type: 'technical', confidence: contentType.confidence + 10 };
            }

            console.log('⚠️ [後備分析] 使用URL結構分析，準確度較低');

            return {
                success: true,
                url: url,
                data: {
                    title: title,
                    description: description,
                    mainContent: description,
                    domain: domain,
                    keywords: [],
                    headings: [],
                    images: [],
                    wordCount: description.length,
                    language: 'zh',
                    contentType: contentType,
                    analyzedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            throw new Error(`後備分析失敗: ${error.message}`);
        }
    }

    /**
     * 提取文章作者
     */
    extractAuthor($) {
        // 方法1: Meta標籤
        let author = $('meta[name="author"]').attr('content') ||
                    $('meta[property="article:author"]').attr('content') ||
                    $('meta[name="twitter:creator"]').attr('content') ||
                    $('meta[property="og:author"]').attr('content');

        // 方法2: 常見的CSS選擇器
        if (!author) {
            const authorSelectors = [
                '.author', '.byline', '.writer', '.post-author',
                '.article-author', '[rel="author"]', '.author-name',
                '.entry-author', '.post-meta .author'
            ];

            for (const selector of authorSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    author = element.first().text().trim();
                    if (author) break;
                }
            }
        }

        // 方法3: JSON-LD結構化數據
        if (!author) {
            try {
                $('script[type="application/ld+json"]').each((i, elem) => {
                    const jsonText = $(elem).html();
                    if (jsonText) {
                        const data = JSON.parse(jsonText);
                        if (data.author?.name) {
                            author = data.author.name;
                            return false; // break
                        }
                        if (Array.isArray(data.author) && data.author[0]?.name) {
                            author = data.author[0].name;
                            return false; // break
                        }
                    }
                });
            } catch (error) {
                // JSON解析失敗，忽略
            }
        }

        // 清理作者名稱
        if (author) {
            author = author.replace(/^(by|作者[:：]?|writer[:：]?)\s*/i, '').trim();
            author = author.replace(/\s*\|.*$/, '').trim(); // 移除後綴

            // 如果太長，可能不是作者名稱
            if (author.length > 50) {
                return null;
            }
        }

        return author || null;
    }

    /**
     * 提取高頻詞彙作為標籤
     */
    extractFrequentWords(content) {
        if (!content || content.length < 100) return [];

        // 中文停用詞
        const stopWords = new Set([
            '的', '是', '和', '在', '有', '這', '也', '都', '會', '可以', '一個',
            '我們', '他們', '她們', '它們', '什麼', '怎麼', '為什麼', '因為',
            '所以', '但是', '如果', '雖然', '然後', '首先', '其次', '最後',
            '不是', '沒有', '或者', '而且', '不過', '另外', '此外', '例如',
            '比如', '就是', '只是', '還是', '已經', '正在', '將要', '能夠',
            '應該', '必須', '可能', '一定', '非常', '很多', '更多', '一些',
            '所有', '每個', '任何', '其他', '自己', '大家', '今天', '現在',
            '這裡', '那裡', '時候', '地方', '方面', '問題', '情況', '方法',
            '內容', '文章', '網站', '連結', '頁面', '資料', '資訊', '介紹'
        ]);

        // 提取中文詞彙（2-4個字）
        const chineseWords = content.match(/[\u4e00-\u9fff]{2,4}/g) || [];

        // 提取英文詞彙
        const englishWords = content.match(/[a-zA-Z]{3,}/g) || [];

        // 合併所有詞彙
        const allWords = [...chineseWords, ...englishWords.map(word => word.toLowerCase())];

        // 詞頻統計
        const wordCount = {};
        allWords.forEach(word => {
            if (!stopWords.has(word) && word.length >= 2 && word.length <= 8) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        // 過濾掉出現次數太少的詞（至少出現2次）
        const filteredWords = Object.entries(wordCount).filter(([word, count]) => count >= 2);

        // 按頻率排序，取前5個
        const topWords = filteredWords
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);

        console.log('📊 [詞頻分析] 高頻詞彙:', topWords);
        return topWords;
    }
}

module.exports = WebContentAnalyzer;