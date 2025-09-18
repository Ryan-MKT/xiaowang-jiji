/**
 * Enhanced Link Preview 備份版本 - 緊急修復
 * 臨時禁用Instagram專用功能，確保服務器正常運行
 */

const puppeteer = require('puppeteer');

class EnhancedLinkPreview {
    constructor() {
        this.browser = null;
    }

    async getEnhancedPreview(url) {
        console.log('🔍 [內容提取] 開始提取社交媒體內容...');
        console.log('🔍 [社交媒體] 開始提取內容...');

        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await this.browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        try {
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            let extractedText = '';
            let extractedImage = null;

            // === 判斷平台並選擇提取策略 ===
            const isInstagram = url.includes('instagram.com');
            const isFacebook = url.includes('facebook.com');

            if (isInstagram) {
                console.log('📱 [Instagram] 優先從頁面內容提取貼文文字...');

                // 先嘗試直接從頁面提取實際內容
                const instagramData = await page.evaluate(() => {
                    // Instagram 特定選擇器
                    const textSelectors = [
                        'span[dir="auto"]',  // 主要文字內容
                        'article span',
                        'div[role="text"]'
                    ];

                    let extractedContent = '';
                    const allTexts = [];

                    // 收集所有文字元素
                    for (const selector of textSelectors) {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(element => {
                            const text = element.textContent.trim();
                            if (text.length > 20) {  // 過濾太短的文字
                                allTexts.push(text);
                            }
                        });
                    }

                    // 智能識別主要貼文內容（排除留言）
                    let mainContent = '';
                    const potentialContent = [];

                    for (const text of allTexts) {
                        // 跳過明顯的UI元素和統計信息，但保留有價值的內容
                        if (text.includes('likes') || text.includes('comments') ||
                            text.includes('個讚') || text.includes('查看更多') ||
                            text.includes('登入以') || text.includes('Instagram') ||
                            text.includes('Meta') || text.includes('© 20') ||
                            text.includes('繼續操作') || text.includes('隱私政策') ||
                            text.length < 30) {
                            continue;
                        }

                        // 特殊處理：如果文字很長且包含關鍵概念，即使有"已驗證"也要保留
                        if (text.length > 100 &&
                            (text.includes('ROMO') || text.includes('FOMO') ||
                             text.includes('Relief of missing out') || text.includes('Fear of missing out'))) {
                            // 移除開頭的帳號驗證信息
                            const cleanedText = text.replace(/^[a-zA-Z0-9_.]+已驗證\s*\d+\s*[週周天日时]*\s*/, '');
                            potentialContent.push(cleanedText);
                            continue;
                        }

                        // 跳過單純的帳號驗證信息
                        if (text.match(/^[a-zA-Z0-9_.]+已驗證/) && text.length < 100) {
                            continue;
                        }

                        // 收集候選內容
                        potentialContent.push(text);
                    }

                    // 優先選擇包含關鍵概念的內容
                    const priorityKeywords = ['ROMO', 'FOMO', 'Relief of missing out', 'Fear of missing out'];
                    for (const text of potentialContent) {
                        if (priorityKeywords.some(keyword => text.includes(keyword))) {
                            mainContent = text;
                            break;
                        }
                    }

                    // 如果沒有找到關鍵概念，選擇最長的有意義內容
                    if (!mainContent && potentialContent.length > 0) {
                        mainContent = potentialContent.reduce((longest, current) =>
                            current.length > longest.length ? current : longest, '');
                    }

                    // 獲取圖片
                    const image = document.querySelector('meta[property="og:image"]');

                    return {
                        mainText: mainContent,
                        image: image ? image.getAttribute('content') : null,
                        allTextsCount: allTexts.length
                    };
                });

                if (instagramData.image) {
                    extractedImage = instagramData.image;
                    console.log('✅ [Instagram圖片] OpenGraph圖片:', extractedImage);
                }

                if (instagramData.mainText) {
                    extractedText = instagramData.mainText;
                    console.log('✅ [Instagram文字] 從頁面提取:', extractedText.substring(0, 80) + '...');
                } else {
                    console.log('⚠️ [Instagram] 頁面內容提取失敗，回退到OpenGraph...');

                    // 回退到OpenGraph，但仍要跳過統計信息
                    const ogData = await page.evaluate(() => {
                        const description = document.querySelector('meta[property="og:description"]');
                        return {
                            description: description ? description.getAttribute('content') : null
                        };
                    });

                    if (ogData.description &&
                        !(ogData.description.includes('likes') ||
                          ogData.description.includes('comments') ||
                          ogData.description.match(/^\d+\s+(likes?|comments?)/i))) {
                        extractedText = ogData.description;
                        console.log('✅ [Instagram文字] OpenGraph描述:', extractedText.substring(0, 50) + '...');
                    } else {
                        console.log('⚠️ [Instagram] OpenGraph描述為統計信息，跳過:', ogData.description ? ogData.description.substring(0, 50) + '...' : 'N/A');
                    }
                }
            }

            // === Facebook 提取 ===
            if (isFacebook) {
                console.log('📘 [Facebook] 開始提取...');

                const fbData = await page.evaluate(() => {
                    // Facebook特定選擇器
                    const selectors = [
                        'div[data-testid="post_message"]',
                        'div[data-ad-preview="message"]',
                        '.userContent',
                        '[data-testid="story-subtitle"]'
                    ];

                    let text = '';
                    for (const selector of selectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            text = element.textContent.trim();
                            console.log(`✅ [Facebook] 找到文字 (${selector}):`, text.substring(0, 50));
                            break;
                        }
                    }

                    // 獲取圖片
                    const img = document.querySelector('meta[property="og:image"]');
                    const image = img ? img.getAttribute('content') : null;

                    return { text, image };
                });

                if (fbData.text) {
                    extractedText = fbData.text;
                    console.log('✅ [Facebook文字] 成功提取:', extractedText.substring(0, 50) + '...');
                }

                if (fbData.image) {
                    extractedImage = fbData.image;
                    console.log('✅ [Facebook圖片] 成功提取:', extractedImage);
                }
            }

            // === 通用OpenGraph提取 (備用) ===
            if (!extractedText || !extractedImage) {
                console.log('📝 [文字提取] 使用通用OpenGraph方法...');

                const ogData = await page.evaluate(() => {
                    const title = document.querySelector('meta[property="og:title"]');
                    const description = document.querySelector('meta[property="og:description"]');
                    const image = document.querySelector('meta[property="og:image"]');

                    return {
                        title: title ? title.getAttribute('content') : null,
                        description: description ? description.getAttribute('content') : null,
                        image: image ? image.getAttribute('content') : null
                    };
                });

                if (!extractedText && ogData.description) {
                    extractedText = ogData.description;
                    console.log('✅ [通用文字] OpenGraph描述:', extractedText.substring(0, 50) + '...');
                }

                if (!extractedImage && ogData.image) {
                    extractedImage = ogData.image;
                    console.log('✅ [通用圖片] OpenGraph圖片:', extractedImage);
                }
            }

            // === 文字清理和限制 ===
            if (extractedText) {
                // 清理提取的文字，移除帳戶名、日期、按讚數等
                let cleanedText = extractedText;

                // 移除帳戶名和時間標記
                cleanedText = cleanedText
                    .replace(/^[a-zA-Z0-9_.]+\s+\d+[wdhms]\s*/, '') // mkter_salon 16w
                    .replace(/^[a-zA-Z0-9_.]+\s+Edited•\d+[wdhms]\s*/, '') // ryan_ryan_lin Edited•2w
                    .replace(/Edited•\d+[wdhms]\s*/, '') // Edited•2w

                    // 移除按讚數和留言數
                    .replace(/^\d+\s+(likes?|comments?).*?-\s*/, '') // 81 likes, 1 comments -
                    .replace(/^\d+\s+(likes?|comments?)\s*/, '') // 81 likes, 1 comments

                    // 移除日期格式
                    .replace(/\s+on\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d+.*/, '')
                    .replace(/\s*-\s*[a-zA-Z0-9_.]+\s+on\s+.*/, '')

                    // 移除開頭的標點符號和空白
                    .replace(/^[:\-\s]+/, '')
                    .trim();

                // 智能文字長度處理 - 移除20字硬性限制
                let finalDescription = cleanedText;

                if (cleanedText) {
                    // 如果文字過長（超過200字），取前150字並加上省略號
                    if (cleanedText.length > 200) {
                        // 嘗試在句號、感嘆號或問號處截斷
                        const sentenceEnd = cleanedText.substring(0, 150).search(/[。！？]/);
                        if (sentenceEnd > 50) {
                            finalDescription = cleanedText.substring(0, sentenceEnd + 1);
                        } else {
                            finalDescription = cleanedText.substring(0, 150) + '...';
                        }
                    }
                    // 保留有意義的中短文字（200字以內）
                    else {
                        finalDescription = cleanedText;
                    }
                }

                extractedText = finalDescription;
            }

            console.log('📊 [提取結果] 文字:', extractedText ? extractedText : '未找到');
            console.log('📊 [提取結果] 圖片:', extractedImage ? '已提取' : '未找到');

            // === 返回結果 ===
            const domain = new URL(url).hostname;
            const hasContent = extractedText || extractedImage;

            const result = {
                title: extractedText ? 'Instagram' : domain,
                description: extractedText || null,
                image: extractedImage,
                domain: domain,
                url: url,
                type: hasContent ? 'extracted' : 'fallback'
            };

            console.log('✅ [內容提取] 成功提取內容:', {
                hasImage: !!extractedImage,
                hasDescription: !!extractedText,
                descriptionPreview: extractedText ? extractedText.substring(0, 30) + '...' : 'N/A'
            });

            return result;

        } catch (error) {
            console.error('❌ [內容提取] 錯誤:', error.message);
            const domain = new URL(url).hostname;
            return {
                title: `${domain} - ${url.split('/').pop()}`,
                description: '無法獲取預覽內容',
                image: null,
                domain: domain,
                url: url,
                type: 'fallback'
            };
        } finally {
            await this.cleanup();
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🔄 [截圖服務] 瀏覽器已關閉');
        }
    }
}

module.exports = EnhancedLinkPreview;