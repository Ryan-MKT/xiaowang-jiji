/**
 * AI標籤生成服務
 * 基於網頁內容分析結果，使用OpenAI生成智能標籤
 */

const OpenAI = require('openai');

class AITagGenerator {
    constructor() {
        // 初始化 OpenAI 客戶端
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        }) : null;

        this.maxRetries = 2;
        this.fallbackTags = ['網站', '資源', '資訊', '內容', '連結'];
    }

    /**
     * 根據網頁分析結果生成標籤
     * @param {Object} contentData - 網頁內容分析結果
     * @returns {Object} 標籤生成結果
     */
    async generateTags(contentData) {
        try {
            console.log('🏷️ [標籤生成] 開始生成標籤，優先使用智能爬蟲方案');

            // 直接使用增強版基礎標籤生成（智能爬蟲方案）
            return this.generateEnhancedBasicTags(contentData);

        } catch (error) {
            console.error('❌ [標籤生成] 生成失敗:', error.message);

            // 降級到簡單標籤生成
            const fallbackResult = this.generateBasicTags(contentData);
            return {
                ...fallbackResult,
                error: error.message,
                method: 'fallback'
            };
        }
    }

    /**
     * 構建 AI 分析提示
     */
    buildAnalysisPrompt(contentData) {
        const { title, description, mainContent, contentType, headings, keywords, domain } = contentData;

        // 基礎提示模板
        let prompt = `你是一個專業的內容分析師，請基於以下網頁資訊生成5個精確的中文標籤：

## 網頁資訊
標題：${title || '無標題'}
網域：${domain || '未知'}
描述：${description || '無描述'}`;

        // 添加關鍵字資訊
        if (keywords && keywords.length > 0) {
            prompt += `\n關鍵字：${keywords.join(', ')}`;
        }

        // 添加標題結構
        if (headings && headings.length > 0) {
            const headingTexts = headings.map(h => h.text).slice(0, 5);
            prompt += `\n主要標題：${headingTexts.join(', ')}`;
        }

        // 添加內容摘要
        if (mainContent) {
            const contentSummary = mainContent.substring(0, 800);
            prompt += `\n內容摘要：${contentSummary}`;
        }

        // 添加內容類型資訊
        if (contentType && contentType.type) {
            prompt += `\n內容類型：${contentType.type}`;
        }

        // 根據內容類型調整標籤要求
        prompt += this.getTypeSpecificRequirements(contentType?.type);

        // 標籤生成規則
        prompt += `

## 標籤生成要求
1. 生成5個中文標籤，每個標籤2-4個字
2. 標籤必須具體且實用，避免「網站」、「文章」等籠統詞彙
3. 優先順序：主題技術 > 應用領域 > 特色功能 > 目標對象 > 實用性
4. 適合做為書籤分類和搜尋使用
5. 避免重複概念，確保標籤多樣性

## 輸出格式
請只輸出5個標籤，用逗號分隔，不要其他文字：
標籤1, 標籤2, 標籤3, 標籤4, 標籤5`;

        return prompt;
    }

    /**
     * 根據內容類型調整標籤要求
     */
    getTypeSpecificRequirements(contentType) {
        const requirements = {
            technical: `
## 技術內容標籤重點
- 具體技術名稱（如「React Hooks」而非「前端」）
- 程式語言或框架
- 應用場景或解決問題
- 難度等級（初學、進階等）
- 實用程度`,

            tutorial: `
## 教學內容標籤重點
- 學習主題
- 目標技能
- 適用對象
- 實作性質
- 學習價值`,

            news: `
## 新聞內容標籤重點
- 事件主題
- 影響領域
- 時效性
- 重要程度
- 相關產業`,

            product: `
## 產品內容標籤重點
- 產品類型
- 主要功能
- 目標用戶
- 應用場景
- 競爭優勢`,

            general: `
## 一般內容標籤重點
- 主要主題
- 內容特色
- 實用程度
- 目標讀者
- 價值定位`
        };

        return requirements[contentType] || requirements.general;
    }

    /**
     * 呼叫 OpenAI API
     */
    async callOpenAI(prompt, retryCount = 0) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 150,
                temperature: 0.7,
                top_p: 1,
                frequency_penalty: 0.5,
                presence_penalty: 0.3
            });

            const content = response.choices[0]?.message?.content?.trim();
            if (!content) {
                throw new Error('OpenAI 回應內容為空');
            }

            return content;

        } catch (error) {
            if (retryCount < this.maxRetries) {
                console.log(`OpenAI API 呼叫失敗，重試 ${retryCount + 1}/${this.maxRetries}`);
                await this.delay(1000 * (retryCount + 1)); // 漸進式延遲
                return this.callOpenAI(prompt, retryCount + 1);
            }
            throw error;
        }
    }

    /**
     * 解析並驗證 AI 生成的標籤
     */
    parseAndValidateTags(aiResponse, contentData) {
        try {
            // 解析標籤
            let tags = aiResponse.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

            // 移除無效標籤
            tags = this.filterInvalidTags(tags);

            // 確保有足夠的標籤
            if (tags.length < 3) {
                const basicTags = this.generateBasicTags(contentData).tags;
                tags = [...tags, ...basicTags].slice(0, 5);
            }

            // 限制標籤數量
            tags = tags.slice(0, 5);

            // 去重
            tags = [...new Set(tags)];

            return tags;

        } catch (error) {
            console.error('標籤解析失敗:', error.message);
            return this.generateBasicTags(contentData).tags;
        }
    }

    /**
     * 過濾無效標籤
     */
    filterInvalidTags(tags) {
        const invalidPatterns = [
            /^(網站|文章|內容|資料|資訊|連結|頁面|線上|數位)$/,
            /^(很好|推薦|有用|不錯|優質)$/,
            /^.{1}$/, // 單字標籤
            /^.{8,}$/, // 過長標籤
            /^\d+$/, // 純數字
            /^[a-zA-Z\s]+$/ // 純英文（除非是專有名詞）
        ];

        return tags.filter(tag => {
            // 檢查是否為無效模式
            for (const pattern of invalidPatterns) {
                if (pattern.test(tag)) {
                    return false;
                }
            }

            // 檢查長度
            if (tag.length < 2 || tag.length > 6) {
                return false;
            }

            return true;
        });
    }

    /**
     * 生成增強版基礎標籤（智能爬蟲方案）
     */
    generateEnhancedBasicTags(contentData) {
        const { title, description, mainContent, domain, contentType, keywords, headings, author, frequentWords, url } = contentData;
        const tags = new Set(); // 使用Set避免重複

        console.log('🔍 [智能標籤] 開始分析網頁內容...');

        // 1. 根據域名進行智能標籤分配
        const domainTags = this.getSmartDomainTags(domain, url);
        domainTags.forEach(tag => tags.add(tag));

        // 2. 分析標題中的關鍵技術詞彙
        const titleTags = this.extractSmartKeywords(title);
        titleTags.forEach(tag => tags.add(tag));

        // 3. 從描述中提取主題標籤
        const descTags = this.extractSmartKeywords(description);
        descTags.forEach(tag => tags.add(tag));

        // 4. 基於內容類型的智能標籤
        if (contentType?.type) {
            const typeTags = this.getEnhancedTypeTag(contentType.type, title, description);
            typeTags.forEach(tag => tags.add(tag));
        }

        // 5. 從關鍵字中選擇最相關的
        if (keywords && keywords.length > 0) {
            const relevantKeywords = this.selectRelevantKeywords(keywords, title);
            relevantKeywords.forEach(tag => tags.add(tag));
        }

        // 6. 從標題結構中提取主題
        if (headings && headings.length > 0) {
            const headingTags = this.extractFromHeadings(headings);
            headingTags.forEach(tag => tags.add(tag));
        }

        // 7. 使用高頻詞彙作為標籤（優先級較高）
        if (frequentWords && frequentWords.length > 0) {
            console.log('📊 [智能標籤] 發現高頻詞彙:', frequentWords);
            // 取前2個高頻詞彙，但要過濾掉過於通用的詞
            const validFrequentWords = frequentWords
                .filter(word => this.isValidFrequentWordTag(word))
                .slice(0, 2);
            validFrequentWords.forEach(tag => tags.add(tag));
        }

        // 8. 如果有作者信息，可以作為附加標籤（可選）
        if (author && this.shouldIncludeAuthor(author, domain)) {
            console.log('👤 [智能標籤] 發現作者:', author);
            tags.add(`作者:${author}`);
        }

        // 轉換為陣列並限制數量
        const finalTags = Array.from(tags).slice(0, 5);

        // 如果標籤不足，添加通用標籤
        if (finalTags.length < 3) {
            const fallbackTags = this.getContextualFallback(domain, contentType?.type);
            fallbackTags.forEach(tag => {
                if (finalTags.length < 3 && !finalTags.includes(tag)) {
                    finalTags.push(tag);
                }
            });
        }

        console.log('✅ [智能標籤] 生成成功:', finalTags);

        return {
            success: true,
            tags: finalTags,
            method: 'enhanced_crawler',
            confidence: this.calculateEnhancedConfidence(finalTags, contentData),
            metadata: {
                contentType: contentType?.type || 'unknown',
                language: contentData.language || 'unknown',
                processingTime: new Date().toISOString()
            }
        };
    }

    /**
     * 生成基礎標籤（降級方案）
     */
    generateBasicTags(contentData) {
        const { title, description, mainContent, domain, contentType, keywords } = contentData;
        const tags = [];

        // 從標題提取關鍵詞
        if (title) {
            const titleTags = this.extractKeywordsFromText(title);
            tags.push(...titleTags);
        }

        // 從關鍵字提取
        if (keywords && keywords.length > 0) {
            tags.push(...keywords.slice(0, 2));
        }

        // 根據域名推測標籤
        const domainTags = this.extractTagsFromDomain(domain);
        tags.push(...domainTags);

        // 根據內容類型添加標籤
        if (contentType?.type) {
            const typeTags = this.getTagsFromContentType(contentType.type);
            tags.push(...typeTags);
        }

        // 清理和去重
        const cleanTags = [...new Set(tags.filter(tag => tag && tag.length >= 2 && tag.length <= 6))];

        // 確保至少有一些標籤
        if (cleanTags.length === 0) {
            cleanTags.push(...this.fallbackTags.slice(0, 3));
        }

        return {
            success: true,
            tags: cleanTags.slice(0, 5),
            method: 'basic'
        };
    }

    /**
     * 從文本提取關鍵詞
     */
    extractKeywordsFromText(text) {
        // 簡單的關鍵詞提取邏輯
        const commonWords = ['的', '是', '和', '或', '與', '及', '等', '也', '而', '但', '如', '在', '上', '下', '中', '內', '外'];
        const words = text.split(/[\s\-_,.，。、]/).filter(word =>
            word.length >= 2 &&
            word.length <= 6 &&
            !commonWords.includes(word)
        );

        return words.slice(0, 2);
    }

    /**
     * 從域名推測標籤
     */
    extractTagsFromDomain(domain) {
        const domainMappings = {
            'github.com': ['開源', '程式碼'],
            'stackoverflow.com': ['程式設計', 'Q&A'],
            'youtube.com': ['影片', '教學'],
            'medium.com': ['部落格', '文章'],
            'wikipedia.org': ['百科', '知識'],
            'news': ['新聞'],
            'blog': ['部落格'],
            'shop': ['購物'],
            'store': ['商店']
        };

        for (const [key, tags] of Object.entries(domainMappings)) {
            if (domain.includes(key)) {
                return tags;
            }
        }

        return [];
    }

    /**
     * 根據內容類型獲取標籤
     */
    getTagsFromContentType(type) {
        const typeMappings = {
            technical: ['技術', '開發'],
            tutorial: ['教學', '指南'],
            news: ['新聞', '資訊'],
            product: ['產品', '服務'],
            general: ['資源']
        };

        return typeMappings[type] || ['內容'];
    }

    /**
     * 計算標籤置信度
     */
    calculateConfidence(tags, contentData) {
        let confidence = 50; // 基礎分數

        // 根據內容完整度調整
        if (contentData.title) confidence += 10;
        if (contentData.description) confidence += 10;
        if (contentData.mainContent && contentData.mainContent.length > 200) confidence += 15;
        if (contentData.keywords && contentData.keywords.length > 0) confidence += 10;

        // 根據標籤品質調整
        const validTags = tags.filter(tag => tag.length >= 2 && tag.length <= 6);
        confidence += (validTags.length * 3);

        return Math.min(confidence, 95); // 最高95%
    }

    /**
     * 延遲函數
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 智能域名標籤分配
     */
    getSmartDomainTags(domain, url = '') {
        const smartMappings = {
            'github.com': ['開源', '程式碼'],
            'stackoverflow.com': ['程式設計', '技術問答'],
            'youtube.com': ['影片', '教學'],
            'youtu.be': ['影片', '分享'],
            'medium.com': ['部落格', '文章'],
            'dev.to': ['開發', '技術'],
            'hackernews.ycombinator.com': ['科技', '新聞'],
            'reddit.com': ['討論', '社群'],
            'twitter.com': ['社群', '動態'],
            'x.com': ['社群', '動態'],
            'facebook.com': ['社群', '分享'],
            'instagram.com': ['圖片', '社群'],
            'linkedin.com': ['職場', '專業'],
            'notion.so': ['筆記', '工具'],
            'figma.com': ['設計', '協作'],
            'behance.net': ['設計', '作品'],
            'dribbble.com': ['設計', '靈感'],
            'wikipedia.org': ['百科', '知識'],
            'mdn.mozilla.org': ['文檔', '開發'],
            'w3schools.com': ['教學', '網頁'],
            'codepen.io': ['程式碼', '展示'],
            'jsfiddle.net': ['程式碼', '測試'],
            'codesandbox.io': ['開發', '原型'],
            'npmjs.com': ['套件', 'JavaScript'],
            'pypi.org': ['套件', 'Python'],
            'packagist.org': ['套件', 'PHP']
        };

        // Facebook 特殊智能分析
        if (domain.includes('facebook.com')) {
            console.log('🔍 [智能域名] 偵測到Facebook，使用智能分析');
            return this.getSmartFacebookTags(url, domain);
        }

        // 精確匹配
        for (const [domainKey, tags] of Object.entries(smartMappings)) {
            if (domain.includes(domainKey)) {
                return tags;
            }
        }

        // 模糊匹配
        if (domain.includes('blog')) return ['部落格'];
        if (domain.includes('news')) return ['新聞'];
        if (domain.includes('shop') || domain.includes('store')) return ['購物'];
        if (domain.includes('doc') || domain.includes('api')) return ['文檔'];
        if (domain.includes('tutorial')) return ['教學'];

        return [];
    }

    /**
     * 提取智能關鍵詞
     */
    extractSmartKeywords(text) {
        if (!text) return [];

        const text_lower = text.toLowerCase();
        const keywords = [];

        // 技術關鍵詞庫
        const techKeywords = {
            'javascript': 'JS',
            'typescript': 'TS',
            'python': 'Python',
            'react': 'React',
            'vue': 'Vue',
            'angular': 'Angular',
            'nodejs': 'Node.js',
            'express': 'Express',
            'mongodb': 'MongoDB',
            'mysql': 'MySQL',
            'postgresql': 'PostgreSQL',
            'redis': 'Redis',
            'docker': 'Docker',
            'kubernetes': 'K8s',
            'aws': 'AWS',
            'azure': 'Azure',
            'firebase': 'Firebase',
            'nextjs': 'Next.js',
            'gatsby': 'Gatsby',
            'svelte': 'Svelte',
            'tailwind': 'Tailwind',
            'bootstrap': 'Bootstrap',
            'sass': 'Sass',
            'webpack': 'Webpack',
            'vite': 'Vite'
        };

        // 主題關鍵詞庫
        const topicKeywords = {
            'tutorial': '教學',
            'guide': '指南',
            'documentation': '文檔',
            'api': 'API',
            'framework': '框架',
            'library': '函式庫',
            'tool': '工具',
            'design': '設計',
            'ui': 'UI設計',
            'ux': 'UX設計',
            'performance': '效能',
            'security': '資安',
            'testing': '測試',
            'deployment': '部署',
            'optimization': '優化'
        };

        // 檢查技術關鍵詞
        for (const [key, value] of Object.entries(techKeywords)) {
            if (text_lower.includes(key)) {
                keywords.push(value);
            }
        }

        // 檢查主題關鍵詞
        for (const [key, value] of Object.entries(topicKeywords)) {
            if (text_lower.includes(key)) {
                keywords.push(value);
            }
        }

        // 中文關鍵詞直接提取
        const chineseKeywords = text.match(/[\u4e00-\u9fff]{2,4}/g) || [];
        const validChineseKeywords = chineseKeywords.filter(word =>
            !['的是', '和或', '與及', '等也', '而但', '如在', '上下', '中內', '外'].includes(word)
        ).slice(0, 2);

        keywords.push(...validChineseKeywords);

        return [...new Set(keywords)].slice(0, 3);
    }

    /**
     * 增強版內容類型標籤
     */
    getEnhancedTypeTag(type, title, description) {
        const typeMapping = {
            technical: ['技術', '開發'],
            tutorial: ['教學', '學習'],
            news: ['新聞', '資訊'],
            product: ['產品', '工具'],
            general: ['內容']
        };

        const baseTags = typeMapping[type] || typeMapping.general;

        // 根據標題和描述進一步細化
        const combined = `${title} ${description}`.toLowerCase();

        if (combined.includes('beginner') || combined.includes('入門')) {
            baseTags.push('入門');
        }
        if (combined.includes('advanced') || combined.includes('進階')) {
            baseTags.push('進階');
        }
        if (combined.includes('best practice') || combined.includes('最佳實踐')) {
            baseTags.push('最佳實踐');
        }

        return baseTags.slice(0, 2);
    }

    /**
     * 選擇相關關鍵字
     */
    selectRelevantKeywords(keywords, title) {
        if (!keywords || keywords.length === 0) return [];

        // 優先選擇在標題中出現的關鍵字
        const titleWords = title ? title.toLowerCase() : '';
        const relevant = keywords.filter(keyword =>
            titleWords.includes(keyword.toLowerCase())
        );

        // 如果相關的不夠，補充其他有用的關鍵字
        if (relevant.length < 2) {
            const additional = keywords.filter(keyword =>
                !relevant.includes(keyword) &&
                keyword.length >= 2 &&
                keyword.length <= 6
            );
            relevant.push(...additional.slice(0, 2 - relevant.length));
        }

        return relevant.slice(0, 2);
    }

    /**
     * 從標題結構提取標籤
     */
    extractFromHeadings(headings) {
        const tags = [];

        // 優先處理 h1 和 h2
        const importantHeadings = headings.filter(h => h.level === 'h1' || h.level === 'h2');

        for (const heading of importantHeadings.slice(0, 3)) {
            const extractedKeywords = this.extractSmartKeywords(heading.text);
            tags.push(...extractedKeywords);
        }

        return [...new Set(tags)].slice(0, 2);
    }

    /**
     * 獲取情境化後備標籤
     */
    getContextualFallback(domain, contentType) {
        // 根據域名提供更好的後備標籤
        if (domain.includes('github')) return ['程式碼', '開源', '專案'];
        if (domain.includes('youtube') || domain.includes('youtu.be')) return ['影片', '教學', '娛樂'];
        if (domain.includes('medium') || domain.includes('blog')) return ['文章', '部落格', '分享'];
        if (domain.includes('stackoverflow')) return ['問答', '程式設計', '解決方案'];
        if (domain.includes('facebook') || domain.includes('instagram')) return ['社群', '分享', '動態'];

        // 根據內容類型提供後備標籤
        switch (contentType) {
            case 'technical': return ['技術', '開發', '程式設計'];
            case 'tutorial': return ['教學', '學習', '指南'];
            case 'news': return ['新聞', '資訊', '時事'];
            case 'product': return ['產品', '工具', '服務'];
            default: return ['資源', '內容', '參考'];
        }
    }

    /**
     * 計算增強版置信度
     */
    calculateEnhancedConfidence(tags, contentData) {
        let confidence = 60; // 基礎分數提高

        // 內容完整度加分
        if (contentData.title) confidence += 15;
        if (contentData.description) confidence += 15;
        if (contentData.keywords && contentData.keywords.length > 0) confidence += 10;

        // 標籤品質加分
        const validTags = tags.filter(tag => tag && tag.length >= 2 && tag.length <= 6);
        confidence += validTags.length * 5;

        // 如果有技術關鍵詞，增加置信度
        const techTerms = ['JS', 'React', 'Vue', 'Python', 'API', '開發', '程式'];
        const hasTechTerms = tags.some(tag => techTerms.includes(tag));
        if (hasTechTerms) confidence += 10;

        return Math.min(confidence, 90);
    }

    /**
     * 判斷高頻詞彙是否適合作為標籤
     */
    isValidFrequentWordTag(word) {
        // 過濾掉過於通用或無意義的詞
        const invalidWords = [
            '使用', '可以', '這個', '如何', '什麼', '怎麼',
            '功能', '操作', '設定', '方式', '步驟', '教學',
            '介紹', '說明', '內容', '網站', '頁面', '文章',
            'how', 'what', 'when', 'where', 'this', 'that',
            'with', 'from', 'more', 'other', 'some', 'many'
        ];

        // 檢查是否在無效詞列表中
        if (invalidWords.includes(word.toLowerCase())) {
            return false;
        }

        // 檢查長度（2-6個字元比較合適）
        if (word.length < 2 || word.length > 6) {
            return false;
        }

        // 如果是英文，至少3個字元
        if (/^[a-zA-Z]+$/.test(word) && word.length < 3) {
            return false;
        }

        return true;
    }

    /**
     * 判斷是否應該包含作者作為標籤
     */
    shouldIncludeAuthor(author, domain) {
        // 作者名稱不能太短或太長
        if (!author || author.length < 2 || author.length > 20) {
            return false;
        }

        // 過濾掉明顯不是人名的作者
        const invalidAuthors = [
            'admin', 'administrator', 'editor', 'author',
            '管理員', '編輯', '作者', '網站管理員'
        ];

        if (invalidAuthors.includes(author.toLowerCase())) {
            return false;
        }

        // 技術部落格或知名網站的作者比較有價值
        const valuableDomains = [
            'medium.com', 'dev.to', 'hackernoon.com',
            'blog', 'github.io', 'blogspot', 'wordpress'
        ];

        const isDomainValuable = valuableDomains.some(d => domain.includes(d));

        // 只有在有價值的域名上才包含作者標籤
        return isDomainValuable;
    }

    /**
     * 智能Facebook標籤分析
     * 根據URL路徑和參數分析特定內容類型
     */
    getSmartFacebookTags(url, domain) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const searchParams = urlObj.searchParams;

            console.log(`🔍 [Facebook智能分析] 分析路徑: ${pathname}`);

            // 分析URL結構來推斷內容類型
            if (pathname.includes('/posts/')) {
                // 個人或粉絲專頁貼文
                if (pathname.includes('pfbid')) {
                    // 新版Facebook貼文格式
                    return this.analyzeFacebookPostFromPath(pathname, searchParams);
                }
                return ['貼文', '動態', '分享'];
            }

            if (pathname.includes('/photo/')) {
                return ['相片', '圖片', '社群'];
            }

            if (pathname.includes('/video/')) {
                return ['影片', '視頻', '分享'];
            }

            if (pathname.includes('/events/')) {
                return ['活動', '聚會', '社群'];
            }

            if (pathname.includes('/groups/')) {
                return ['社團', '討論', '群組'];
            }

            if (pathname.includes('/pages/')) {
                return ['粉專', '品牌', '官方'];
            }

            // 分析用戶名稱或粉專名稱
            const pathSegments = pathname.split('/').filter(segment => segment);
            if (pathSegments.length > 0) {
                const firstSegment = pathSegments[0];

                // 檢查是否是特定類型的粉專
                const pageTags = this.analyzeFacebookPageType(firstSegment);
                if (pageTags.length > 0) {
                    return pageTags;
                }
            }

            // 預設回退標籤
            return ['社群', '分享', '動態'];

        } catch (error) {
            console.log(`⚠️ [Facebook智能分析] 分析失敗: ${error.message}`);
            return ['社群', '分享', '貼文'];
        }
    }

    /**
     * 從Facebook貼文路徑分析內容類型
     */
    analyzeFacebookPostFromPath(pathname, searchParams) {
        // 根據常見的Facebook貼文特徵分析

        // 優先檢查特定用戶類型（比通用參數檢查更具體）
        if (pathname.includes('HERSTON')) {
            // 這個特定案例看起來像是餐廳或商家
            console.log('🍽️ [Facebook分析] 偵測到 HERSTON 餐廳頁面');
            return ['餐廳', '美食', '商家'];
        }

        // 檢查是否有特定參數
        if (searchParams.has('rdid')) {
            // 推薦動態，可能是熱門內容
            console.log('🔥 [Facebook分析] 偵測到推薦動態 (rdid)');
            return ['熱門', '推薦', '動態'];
        }

        // 其他通用貼文
        console.log('📝 [Facebook分析] 使用通用貼文標籤');
        return ['貼文', '分享', '動態'];
    }

    /**
     * 分析Facebook粉專類型
     */
    analyzeFacebookPageType(pageName) {
        // 常見粉專名稱模式分析
        const patterns = {
            restaurant: /restaurant|cafe|coffee|food|kitchen|dining|herston/i,
            business: /shop|store|company|business|service/i,
            media: /news|media|tv|radio|press/i,
            education: /school|university|education|learning/i,
            health: /health|medical|clinic|hospital/i,
            tech: /tech|software|app|digital|computer/i,
            entertainment: /music|game|entertainment|fun|party/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(pageName)) {
                return this.getFacebookPageTags(type);
            }
        }

        return [];
    }

    /**
     * 根據粉專類型返回相應標籤
     */
    getFacebookPageTags(pageType) {
        const typeTags = {
            restaurant: ['餐廳', '美食', '用餐'],
            business: ['商家', '服務', '營業'],
            media: ['新聞', '媒體', '資訊'],
            education: ['教育', '學習', '知識'],
            health: ['健康', '醫療', '保健'],
            tech: ['科技', '技術', '數位'],
            entertainment: ['娛樂', '音樂', '遊戲']
        };

        return typeTags[pageType] || ['社群', '分享'];
    }
}

module.exports = AITagGenerator;