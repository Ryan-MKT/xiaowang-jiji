/**
 * AI 重點摘要服務
 * 為收藏卡內容生成 3 個重點摘要（15-30字）
 */

const crypto = require('crypto');

class AISummaryService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.enabled = !!this.apiKey;

        if (!this.enabled) {
            console.log('⚠️ [AI摘要] OpenAI API Key 未設定，將使用模擬摘要');
        }
    }

    /**
     * 為收藏卡內容生成 AI 摘要
     * @param {Object} contentData - 收藏卡內容數據
     * @returns {Object} AI摘要結果
     */
    async generateSummary(contentData) {
        try {
            console.log('🤖 [AI摘要] 開始生成摘要...');

            // 提取文本內容
            const textContent = this.extractTextContent(contentData);

            if (!textContent || textContent.length < 10) {
                console.log('⚠️ [AI摘要] 內容太短，跳過摘要生成');
                return null;
            }

            // 生成內容雜湊值
            const contentHash = this.generateContentHash(textContent);

            let summaries;

            if (this.enabled) {
                // 使用真實 AI 生成摘要
                summaries = await this.generateRealSummaries(textContent);
            } else {
                // 使用模擬摘要
                summaries = this.generateMockSummaries(contentData);
            }

            const result = {
                summaries: summaries,
                generated_at: new Date().toISOString(),
                content_hash: contentHash,
                model: this.enabled ? 'gpt-4' : 'mock',
                version: '1.0'
            };

            console.log('✅ [AI摘要] 摘要生成完成:', summaries);
            return result;

        } catch (error) {
            console.error('❌ [AI摘要] 生成失敗:', error.message);

            // 失敗時返回基本摘要
            return this.generateFallbackSummary(contentData);
        }
    }

    /**
     * 從內容數據中提取文本
     */
    extractTextContent(contentData) {
        let textContent = '';

        // 從不同來源提取文本
        if (contentData.title) {
            textContent += contentData.title + ' ';
        }

        if (contentData.description) {
            textContent += contentData.description + ' ';
        }

        if (contentData.content) {
            // 處理 content 物件
            if (typeof contentData.content === 'object') {
                if (contentData.content.text) {
                    textContent += contentData.content.text + ' ';
                }
                if (contentData.content.preview_title) {
                    textContent += contentData.content.preview_title + ' ';
                }
                if (contentData.content.preview_description) {
                    textContent += contentData.content.preview_description + ' ';
                }
            } else {
                textContent += String(contentData.content) + ' ';
            }
        }

        // 清理文本
        textContent = textContent
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\u4e00-\u9fff.,!?;:()\-]/g, '')
            .trim();

        console.log(`📝 [AI摘要] 提取的文本內容 (${textContent.length}字): ${textContent.substring(0, 100)}...`);

        return textContent;
    }

    /**
     * 使用 OpenAI API 生成真實摘要
     */
    async generateRealSummaries(textContent) {
        const prompt = `請為以下內容生成 3 個重點摘要，每個摘要 15-30 個字：

內容：
${textContent}

要求：
1. 每個摘要都要抓住不同的重點
2. 使用繁體中文
3. 簡潔有力，突出核心價值
4. 每個摘要 15-30 字
5. 返回格式為純文字，一行一個摘要，不要編號

摘要：`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 300,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API 請求失敗: ${response.status}`);
        }

        const data = await response.json();
        const summaryText = data.choices[0].message.content.trim();

        // 解析摘要
        const summaries = summaryText
            .split('\n')
            .filter(line => line.trim())
            .slice(0, 3)
            .map(line => line.replace(/^\d+[.)]?\s*/, '').trim());

        return summaries.length === 3 ? summaries : this.generateMockSummaries();
    }

    /**
     * 生成模擬摘要（當 API 不可用時）
     */
    generateMockSummaries(contentData) {
        const mockTemplates = [
            '這是一個有價值的內容分享',
            '包含實用的資訊和見解',
            '值得深入了解和學習'
        ];

        // 根據內容類型調整模擬摘要
        if (contentData.category === 'social') {
            return [
                '社群平台的精彩內容分享',
                '具有話題性的討論內容',
                '值得關注的社群動態'
            ];
        } else if (contentData.content?.url) {
            return [
                '網頁內容的重點整理',
                '包含豐富的資訊內容',
                '提供有用的參考資料'
            ];
        }

        return mockTemplates;
    }

    /**
     * 生成失敗時的基本摘要
     */
    generateFallbackSummary(contentData) {
        return {
            summaries: [
                '收藏的重要內容',
                '值得保存的資訊',
                '待深入研讀的材料'
            ],
            generated_at: new Date().toISOString(),
            content_hash: this.generateContentHash('fallback'),
            model: 'fallback',
            version: '1.0'
        };
    }

    /**
     * 生成內容雜湊值
     */
    generateContentHash(content) {
        return crypto
            .createHash('sha256')
            .update(content)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * 檢查內容是否已更改（避免重複生成）
     */
    shouldRegenerateSummary(contentData, existingSummary) {
        if (!existingSummary) {
            return true;
        }

        const currentHash = this.generateContentHash(this.extractTextContent(contentData));
        return currentHash !== existingSummary.content_hash;
    }
}

module.exports = AISummaryService;