/**
 * 增強版連結預覽服務
 * 支援 Facebook 等社交媒體連結的截圖預覽
 */

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

class EnhancedLinkPreview {
    constructor() {
        this.browser = null;
        this.screenshotDir = path.join(__dirname, 'public', 'screenshots');
        this.initializeScreenshotDir();

        // 社交媒體平台清單
        this.socialMediaDomains = [
            'facebook.com',
            'instagram.com',
            'twitter.com',
            'x.com',
            'threads.net',
            'tiktok.com',
            'linkedin.com'
        ];
    }

    /**
     * 初始化截圖目錄
     */
    async initializeScreenshotDir() {
        try {
            await fs.ensureDir(this.screenshotDir);
        } catch (error) {
            console.error('❌ [截圖服務] 建立目錄失敗:', error.message);
        }
    }

    /**
     * 初始化瀏覽器
     */
    async initBrowser() {
        if (!this.browser) {
            try {
                this.browser = await puppeteer.launch({
                    headless: 'new',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor'
                    ]
                });
            } catch (error) {
                console.error('❌ [截圖服務] 瀏覽器啟動失敗:', error.message);
                throw error;
            }
        }
    }

    /**
     * 檢查是否為社交媒體連結
     */
    isSocialMediaLink(url) {
        try {
            const domain = new URL(url).hostname.toLowerCase();
            return this.socialMediaDomains.some(socialDomain =>
                domain.includes(socialDomain)
            );
        } catch {
            return false;
        }
    }

    /**
     * 生成截圖檔名
     */
    generateScreenshotFilename(url) {
        const crypto = require('crypto');
        // 使用完整的URL + 時間戳確保唯一性
        const uniqueString = url + '_' + Date.now();
        const hash = crypto.createHash('sha256')
            .update(uniqueString)
            .digest('hex')
            .substring(0, 32); // 使用32個字符確保唯一性
        return `screenshot_${hash}.png`;
    }

    /**
     * 獲取增強預覽
     */
    async getEnhancedPreview(url) {

        // 檢查是否為社交媒體連結
        if (this.isSocialMediaLink(url)) {
            return await this.getScreenshotPreview(url);
        } else {
            return await this.getStandardPreview(url);
        }
    }

    /**
     * 截圖預覽方案
     */
    async getScreenshotPreview(url) {
        try {
            await this.initBrowser();

            const filename = this.generateScreenshotFilename(url);
            const screenshotPath = path.join(this.screenshotDir, filename);
            const publicUrl = `/screenshots/${filename}`;

            // 檢查是否已有截圖快取
            if (await fs.pathExists(screenshotPath)) {
                return {
                    title: this.extractTitleFromUrl(url),
                    description: '社交媒體內容預覽',
                    image: publicUrl,
                    domain: new URL(url).hostname,
                    url: url,
                    type: 'screenshot'
                };
            }

            const page = await this.browser.newPage();

            try {
                // 設定視窗大小和像素密度
                await page.setViewport({
                    width: 1200,
                    height: 800,
                    deviceScaleFactor: 1
                });

                // 設定更現代的User-Agent
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

                // 設定額外的請求標頭
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                });


                // 載入頁面，使用更寬鬆的等待條件
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                // 等待頁面載入完成，並嘗試等待主要內容
                await new Promise(resolve => setTimeout(resolve, 5000));

                // 嘗試滾動頁面以觸發動態載入
                await page.evaluate(() => {
                    window.scrollTo(0, 300);
                });
                await new Promise(resolve => setTimeout(resolve, 2000));

                // 滾動回頂部
                await page.evaluate(() => {
                    window.scrollTo(0, 0);
                });
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 獲取頁面標題
                const title = await page.title().catch(() => '');

                // 嘗試提取社交媒體貼文的內容（圖片和文字）
                console.log('🔍 [內容提取] 開始提取社交媒體內容...');
                const extractedContent = await this.extractSocialMediaContent(page, url);

                if (extractedContent && (extractedContent.image || extractedContent.description)) {
                    console.log('✅ [內容提取] 成功提取內容:', {
                        hasImage: !!extractedContent.image,
                        hasDescription: !!extractedContent.description,
                        descriptionPreview: extractedContent.description ? extractedContent.description.substring(0, 50) + '...' : 'N/A'
                    });
                    return {
                        title: title || this.extractTitleFromUrl(url),
                        description: extractedContent.description || '社交媒體內容預覽',
                        image: extractedContent.image,
                        domain: new URL(url).hostname,
                        url: url,
                        type: 'extracted'
                    };
                }

                console.log('⚠️ [圖片提取] 無法提取主要圖片，回退到截圖方案...');

                console.log('📸 [截圖服務] 正在截圖...');

                // 隱藏可能的cookie橫幅和彈窗
                await page.evaluate(() => {
                    // 隱藏常見的cookie和隱私彈窗
                    const selectors = [
                        '[role="dialog"]',
                        '[data-testid="cookie-policy-manage-dialog"]',
                        '[data-testid="cookie-policy-banner"]',
                        '.js_banner',
                        '#globalContainer > div:first-child'
                    ];

                    selectors.forEach(selector => {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => {
                            if (el && el.style) {
                                el.style.display = 'none';
                            }
                        });
                    });
                }).catch(() => {});

                // 等待隱藏動畫完成
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 截圖，使用全頁面截圖然後裁切
                await page.screenshot({
                    path: screenshotPath,
                    type: 'png',
                    clip: {
                        x: 0,
                        y: 0,
                        width: 1200,
                        height: 800  // 增加高度以捕獲更多內容
                    }
                });

                console.log('✅ [截圖服務] 截圖完成:', publicUrl);

                return {
                    title: title || this.extractTitleFromUrl(url),
                    description: '社交媒體內容預覽',
                    image: publicUrl,
                    domain: new URL(url).hostname,
                    url: url,
                    type: 'screenshot'
                };

            } finally {
                await page.close();
            }

        } catch (error) {
            console.error('❌ [截圖服務] 截圖失敗:', error.message);

            // 降級到基本預覽
            return {
                title: this.extractTitleFromUrl(url),
                description: '無法獲取預覽內容',
                image: null,
                domain: new URL(url).hostname,
                url: url,
                type: 'fallback'
            };
        }
    }

    /**
     * 標準預覽方案（非社交媒體）
     */
    async getStandardPreview(url) {
        const axios = require('axios');

        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const html = response.data;

            // 解析 meta 標籤
            const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
            const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                                    html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
            const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                              html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']*)["'][^>]*>/i);

            const title = titleMatch ? titleMatch[1].trim() : '';
            const description = descriptionMatch ? descriptionMatch[1].trim() : '';
            const image = imageMatch ? imageMatch[1].trim() : null;

            return {
                title: title || this.extractTitleFromUrl(url),
                description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
                image: image,
                domain: new URL(url).hostname,
                url: url,
                type: 'standard'
            };

        } catch (error) {
            console.error('❌ [標準預覽] 失敗:', error.message);

            return {
                title: this.extractTitleFromUrl(url),
                description: '無法獲取網頁描述',
                image: null,
                domain: new URL(url).hostname,
                url: url,
                type: 'fallback'
            };
        }
    }

    /**
     * 提取社交媒體內容（文字和圖片）
     */
    async extractSocialMediaContent(page, url) {
        try {
            console.log('🔍 [社交媒體] 開始提取內容...');

            // 等待內容載入
            await new Promise(resolve => setTimeout(resolve, 3000));

            let extractedText = '';
            let extractedImage = null;

            // === 優先提取OpenGraph描述（最可靠） ===
            console.log('📝 [文字提取] 嘗試提取OpenGraph描述...');
            const ogContent = await page.evaluate(() => {
                const ogDesc = document.querySelector('meta[property="og:description"]') ||
                              document.querySelector('meta[name="description"]');
                const ogImg = document.querySelector('meta[property="og:image"]') ||
                             document.querySelector('meta[property="og:image:url"]');

                return {
                    description: ogDesc ? ogDesc.getAttribute('content') : null,
                    image: ogImg ? ogImg.getAttribute('content') : null
                };
            });

            if (ogContent.description && ogContent.description.length > 10) {
                extractedText = ogContent.description;
                console.log('✅ [文字提取] OpenGraph描述:', extractedText.substring(0, 80) + '...');
            }

            if (ogContent.image) {
                extractedImage = ogContent.image;
                console.log('✅ [圖片提取] OpenGraph圖片:', extractedImage);
            }

            // === 如果沒有OpenGraph描述，嘗試從頁面內容提取文字 ===
            if (!extractedText) {
                console.log('📝 [文字提取] OpenGraph無內容，嘗試從頁面提取...');

                const textSelectors = [
                    // Facebook特定選擇器
                    'div[data-testid="post_message"]',
                    'div[data-ad-preview="message"]',
                    'div[role="article"] span',
                    '[data-testid="post-text"]',

                    // Instagram特定選擇器
                    'article h1',
                    'article span[dir="auto"]',

                    // 通用選擇器
                    '[role="article"] h1',
                    'h1',
                    'span[style*="break-word"]',
                    'p'
                ];

                for (const selector of textSelectors) {
                    const text = await page.evaluate((sel) => {
                        const elements = document.querySelectorAll(sel);
                        let bestText = '';

                        elements.forEach(el => {
                            const content = el.textContent || el.innerText || '';
                            // 尋找較長且有意義的文字
                            if (content.length > bestText.length &&
                                content.length > 15 &&
                                !content.match(/^[\d\s\.\,]*$/) && // 排除純數字
                                !content.includes('Cookie') &&
                                !content.includes('登入') &&
                                !content.includes('Sign in') &&
                                !content.includes('Log in')) {
                                bestText = content;
                            }
                        });

                        return bestText;
                    }, selector);

                    if (text && text.length > 15) {
                        extractedText = text;
                        console.log(`✅ [文字提取] 透過 "${selector}" 找到:`, text.substring(0, 80) + '...');
                        break;
                    }
                }
            }

            // === 如果還沒有圖片，嘗試從頁面提取 ===
            if (!extractedImage) {
                console.log('🖼️ [圖片提取] 嘗試從頁面提取圖片...');

                const images = await page.evaluate(() => {
                    const imgs = document.querySelectorAll('img');
                    const results = [];

                    imgs.forEach(img => {
                        const src = img.src || img.getAttribute('src');
                        const width = img.naturalWidth || img.width || 0;
                        const height = img.naturalHeight || img.height || 0;

                        // 過濾掉太小的圖片
                        if (src && width > 200 && height > 200 &&
                            !src.includes('emoji') &&
                            !src.includes('icon')) {
                            results.push({
                                src: src,
                                width: width,
                                height: height,
                                size: width * height
                            });
                        }
                    });

                    return results.sort((a, b) => b.size - a.size);
                });

                if (images && images.length > 0) {
                    extractedImage = images[0].src;
                    console.log('✅ [圖片提取] 找到頁面圖片:', extractedImage);
                }
            }

            // === 清理文字 ===
            if (extractedText) {
                extractedText = extractedText.replace(/\s+/g, ' ').trim();
                if (extractedText.length > 150) {
                    extractedText = extractedText.substring(0, 150) + '...';
                }
            }

            console.log('📊 [提取結果] 文字:', extractedText ? extractedText.substring(0, 50) + '...' : '未找到');
            console.log('📊 [提取結果] 圖片:', extractedImage ? '已提取' : '未找到');

            return {
                description: extractedText || null,
                image: extractedImage || null
            };

        } catch (error) {
            console.error('❌ [內容提取] 失敗:', error.message);
            return {
                description: null,
                image: null
            };
        }
    }

    /**
     * 從 URL 提取標題
     */
    extractTitleFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            const path = urlObj.pathname.split('/').filter(Boolean);

            if (path.length > 0) {
                return `${domain} - ${path[path.length - 1]}`;
            }

            return domain;
        } catch {
            return '連結預覽';
        }
    }

    /**
     * 清理瀏覽器資源
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🔄 [截圖服務] 瀏覽器已關閉');
        }
    }

    /**
     * 清理舊截圖（可選）
     */
    async cleanupOldScreenshots(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7天
        try {
            const files = await fs.readdir(this.screenshotDir);
            const now = Date.now();

            for (const file of files) {
                if (file.startsWith('screenshot_')) {
                    const filePath = path.join(this.screenshotDir, file);
                    const stats = await fs.stat(filePath);

                    if (now - stats.mtime.getTime() > maxAge) {
                        await fs.unlink(filePath);
                        console.log('🗑️ [截圖服務] 已清理舊截圖:', file);
                    }
                }
            }
        } catch (error) {
            console.error('❌ [截圖服務] 清理失敗:', error.message);
        }
    }
}

module.exports = EnhancedLinkPreview;