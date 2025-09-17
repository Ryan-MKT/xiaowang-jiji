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

                // 嘗試提取Facebook貼文的主要圖片
                console.log('🔍 [圖片提取] 嘗試提取Facebook貼文圖片...');
                const extractedImage = await this.extractFacebookImage(page, url);

                if (extractedImage) {
                    console.log('✅ [圖片提取] 成功提取Facebook圖片:', extractedImage);
                    return {
                        title: title || this.extractTitleFromUrl(url),
                        description: '社交媒體內容預覽',
                        image: extractedImage,
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
     * 提取Facebook貼文的主要圖片
     */
    async extractFacebookImage(page, url) {
        try {
            // 等待圖片載入
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 嘗試多種Facebook圖片選擇器
            const imageSelectors = [
                // Facebook貼文主要圖片
                'img[data-imgperflogname="profileCoverPhoto"]',
                'img[data-testid="post-image"]',
                'div[data-pagelet="MediaViewer"] img',
                'div[data-testid="photo-viewer"] img',
                'div[role="dialog"] img',

                // OpenGraph圖片 meta 標籤
                'meta[property="og:image"]',
                'meta[property="og:image:url"]',

                // 一般大尺寸圖片（過濾掉小的icon和頭像）
                'img[src*="fbcdn"]',
                'img[src*="facebook"]',

                // 任何足夠大的圖片
                'img'
            ];

            // 嘗試從頁面HTML直接提取OpenGraph圖片
            const ogImage = await page.evaluate(() => {
                const ogImageMeta = document.querySelector('meta[property="og:image"]') ||
                                  document.querySelector('meta[property="og:image:url"]');
                return ogImageMeta ? ogImageMeta.getAttribute('content') : null;
            });

            if (ogImage && ogImage.length > 0) {
                console.log('📸 [圖片提取] 找到OpenGraph圖片:', ogImage);
                return ogImage;
            }

            // 如果沒有OpenGraph，嘗試尋找頁面中的大圖片
            for (const selector of imageSelectors) {
                if (selector.startsWith('meta')) continue; // 跳過已處理的meta標籤

                const images = await page.evaluate((sel) => {
                    const imgs = document.querySelectorAll(sel);
                    const results = [];

                    imgs.forEach(img => {
                        const src = img.src || img.getAttribute('src');
                        const width = img.naturalWidth || img.width || 0;
                        const height = img.naturalHeight || img.height || 0;

                        // 過濾掉太小的圖片（可能是icon或頭像）
                        if (src && width > 200 && height > 200) {
                            results.push({
                                src: src,
                                width: width,
                                height: height,
                                size: width * height
                            });
                        }
                    });

                    // 按圖片大小排序，返回最大的
                    return results.sort((a, b) => b.size - a.size);
                }, selector);

                if (images && images.length > 0) {
                    console.log(`📸 [圖片提取] 透過選擇器 "${selector}" 找到 ${images.length} 張圖片`);
                    return images[0].src; // 返回最大的圖片
                }
            }

            // 最後嘗試：查找任何合理大小的圖片
            const fallbackImage = await page.evaluate(() => {
                const allImages = document.querySelectorAll('img');
                let bestImage = null;
                let maxSize = 0;

                allImages.forEach(img => {
                    const src = img.src || img.getAttribute('src');
                    const width = img.naturalWidth || img.width || 0;
                    const height = img.naturalHeight || img.height || 0;
                    const size = width * height;

                    // 尋找足夠大的圖片，但排除明顯的UI元素
                    if (src &&
                        size > 50000 && // 至少 224x224 px
                        !src.includes('emoji') &&
                        !src.includes('icon') &&
                        !src.includes('logo') &&
                        size > maxSize) {
                        bestImage = src;
                        maxSize = size;
                    }
                });

                return bestImage;
            });

            if (fallbackImage) {
                console.log('📸 [圖片提取] 找到備用圖片:', fallbackImage);
                return fallbackImage;
            }

            console.log('⚠️ [圖片提取] 未找到合適的圖片');
            return null;

        } catch (error) {
            console.error('❌ [圖片提取] 提取Facebook圖片失敗:', error.message);
            return null;
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