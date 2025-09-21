// Open Graph API 服務 - 替代 Puppeteer 解決方案
const { getLinkPreview } = require('link-preview-js');

class OpenGraphAPI {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 60 * 60 * 1000; // 1小時快取
  }

  async getPreview(url) {
    try {
      console.log(`🔍 [Open Graph] 開始獲取預覽: ${url}`);

      // 檢查快取
      const cacheKey = url;
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
        console.log(`🎯 [Open Graph] 快取命中: ${url}`);
        return cached.data;
      }

      // 🔍 檢查是否需要特殊域名處理
      const specialResult = await this.handleSpecialDomains(url);
      if (specialResult) {
        console.log(`🎯 [Open Graph] 特殊域名處理完成: ${url}`);

        // 儲存快取
        this.cache.set(cacheKey, {
          data: specialResult,
          timestamp: Date.now()
        });

        return specialResult;
      }

      // 一般 Open Graph API 處理
      const result = await getLinkPreview(url, {
        timeout: 5000, // 縮短為5秒，提升響應速度
        followRedirects: 'follow',
        handleRedirects: (baseURL, forwardedURL) => {
          console.log(`🔄 [Open Graph] 重導向: ${baseURL} → ${forwardedURL}`);
          return true;
        }
      });

      // 🔍 添加詳細除錯資訊
      console.log(`🔍 [Open Graph Debug] 原始結果:`, {
        url: url,
        resultTitle: result.title,
        resultDescription: result.description,
        resultImages: result.images?.length || 0,
        resultType: typeof result,
        hasResult: !!result
      });

      // 標準化回應格式
      const standardizedResult = this.standardizeResponse(result, url);

      // 儲存快取
      this.cache.set(cacheKey, {
        data: standardizedResult,
        timestamp: Date.now()
      });

      console.log(`✅ [Open Graph] 獲取成功:`, {
        title: standardizedResult.title?.substring(0, 50) || '無標題',
        hasImage: !!standardizedResult.image,
        type: standardizedResult.type
      });

      return standardizedResult;

    } catch (error) {
      console.error(`❌ [Open Graph] 獲取失敗: ${url}`, error.message);

      // 回傳基本資訊避免系統中斷
      return this.getFallbackResponse(url);
    }
  }

  standardizeResponse(result, originalUrl) {
    // 統一回應格式，確保與現有系統相容

    // 如果 Facebook 特殊處理已選擇圖片，使用該圖片
    const selectedImage = result.selectedImage || this.selectBestImage(result.images, originalUrl);

    return {
      success: true,
      type: 'opengraph',
      url: result.url || originalUrl,
      title: result.title || this.extractTitleFromUrl(originalUrl),
      description: result.description || '',
      image: selectedImage,
      siteName: result.siteName || this.extractDomainFromUrl(originalUrl),
      domain: this.extractDomainFromUrl(originalUrl),

      // 額外資訊
      images: result.images || [],
      videos: result.videos || [],
      contentType: result.contentType || 'text/html',
      charset: result.charset || 'utf-8',

      // 時間戳記
      extractedAt: new Date().toISOString()
    };
  }

  selectBestImage(images, originalUrl) {
    if (!images || images.length === 0) {
      // 🔥 如果沒有圖片，使用默認圖片作為回退
      const domain = this.extractDomainFromUrl(originalUrl);
      const defaultImage = this.getDefaultImage(domain);
      console.log(`🖼️ [Open Graph] 使用默認圖片回退: ${domain} -> ${defaultImage}`);
      return defaultImage;
    }

    console.log(`🔍 [Open Graph] 分析圖片選擇，共 ${images.length} 張圖片:`);
    images.forEach((img, index) => {
      const imgUrl = img?.url || img;
      console.log(`   ${index + 1}. ${imgUrl}`);
    });

    // 過濾掉 Logo 和品牌圖片
    const filteredImages = images.filter(img => {
      const imgUrl = img?.url || img;
      if (!imgUrl) return false;

      // 排除常見的 Logo 和品牌圖片
      const logoPatterns = [
        'facebook.com/images/logos',
        'static.facebook.com/images/logos',
        'facebook.com/tr',
        'facebook_2x.png',
        'fb_icon_',
        'logo',
        'icon',
        'favicon',
        'avatar',
        'profile'
      ];

      const isLogo = logoPatterns.some(pattern =>
        imgUrl.toLowerCase().includes(pattern.toLowerCase())
      );

      // 排除過小的圖片 (可能是追蹤像素或小圖標)
      const width = img?.width || 0;
      const height = img?.height || 0;
      const isTooSmall = (width > 0 && height > 0) && (width < 100 || height < 100);

      if (isLogo) {
        console.log(`   ❌ 排除 Logo 圖片: ${imgUrl}`);
        return false;
      }

      if (isTooSmall) {
        console.log(`   ❌ 排除過小圖片 (${width}x${height}): ${imgUrl}`);
        return false;
      }

      console.log(`   ✅ 保留內容圖片: ${imgUrl}`);
      return true;
    });

    console.log(`🎯 [Open Graph] 過濾後剩餘 ${filteredImages.length} 張內容圖片`);

    // 如果過濾後還有圖片，選擇最大的
    if (filteredImages.length > 0) {
      const sortedImages = filteredImages.sort((a, b) => {
        const aSize = (a.width || 0) * (a.height || 0);
        const bSize = (b.width || 0) * (b.height || 0);
        return bSize - aSize;
      });

      const selectedImage = sortedImages[0]?.url || sortedImages[0];
      console.log(`🏆 [Open Graph] 選中最佳圖片: ${selectedImage}`);
      return selectedImage;
    }

    // 如果過濾後沒有圖片，嘗試選擇原始圖片中最大的（但記錄警告）
    console.log(`⚠️ [Open Graph] 過濾後無適合圖片，使用原始最大圖片`);
    const sortedImages = images.sort((a, b) => {
      const aSize = (a.width || 0) * (a.height || 0);
      const bSize = (b.width || 0) * (b.height || 0);
      return bSize - aSize;
    });

    const fallbackImage = sortedImages[0]?.url || sortedImages[0];
    console.log(`📷 [Open Graph] 回退圖片: ${fallbackImage}`);
    return fallbackImage;
  }

  extractTitleFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '網頁連結';
    }
  }

  extractDomainFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  getFallbackResponse(url) {
    const domain = this.extractDomainFromUrl(url);

    return {
      success: false,
      type: 'fallback',
      url: url,
      title: `來自 ${domain} 的內容`,
      description: '無法獲取詳細資訊，請點擊查看完整內容',
      image: this.getDefaultImage(domain),
      siteName: domain,
      domain: domain,
      extractedAt: new Date().toISOString(),
      error: 'Open Graph extraction failed'
    };
  }

  getDefaultImage(domain) {
    // 根據不同平台回傳預設圖片
    const defaultImages = {
      'facebook.com': 'https://www.facebook.com/images/fb_icon_325x325.png',
      'instagram.com': 'https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png',
      'youtube.com': 'https://www.youtube.com/s/desktop/12345678/img/favicon_144x144.png',
      'twitter.com': 'https://abs.twimg.com/responsive-web/client-web/icon-ios.b1fc7275.png',
      'x.com': 'https://abs.twimg.com/responsive-web/client-web/icon-ios.b1fc7275.png'
    };

    return defaultImages[domain] || 'https://via.placeholder.com/400x300?text=Preview';
  }

  // 特殊域名處理
  async handleSpecialDomains(url) {
    const domain = this.extractDomainFromUrl(url);

    // Facebook 特殊處理
    if (domain === 'facebook.com') {
      return await this.handleFacebookUrl(url);
    }

    // Instagram 特殊處理
    if (domain === 'instagram.com') {
      return await this.handleInstagramUrl(url);
    }

    return null; // 使用一般處理
  }

  async handleFacebookUrl(url) {
    console.log(`📘 [Open Graph] Facebook URL 特殊處理: ${url}`);

    try {
      // 嘗試多種 Facebook URL 格式
      const alternatives = [
        url,
        url.replace('m.facebook.com', 'www.facebook.com'),
        url.replace('mobile.facebook.com', 'www.facebook.com')
      ];

      for (const altUrl of alternatives) {
        try {
          const result = await getLinkPreview(altUrl, {
            timeout: 8000, // 給 Facebook 更多時間
            followRedirects: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          console.log(`📘 [Facebook] 獲取到 ${result.images?.length || 0} 張圖片`);

          // 特別處理 Facebook 圖片選擇
          if (result.images && result.images.length > 0) {
            const facebookBestImage = this.selectFacebookImage(result.images);
            if (facebookBestImage) {
              result.selectedImage = facebookBestImage;
              console.log(`🎯 [Facebook] 選中圖片: ${facebookBestImage}`);
            }
          }

          return this.standardizeResponse(result, url);
        } catch (error) {
          console.log(`⚠️ [Facebook] URL 失敗: ${altUrl}, 錯誤: ${error.message}`);
          continue;
        }
      }

      // 如果所有嘗試都失敗，回傳基本回退
      return this.getFallbackResponse(url);

    } catch (error) {
      console.error(`❌ [Facebook] 特殊處理失敗: ${error.message}`);
      return this.getFallbackResponse(url);
    }
  }

  selectFacebookImage(images) {
    console.log(`🔍 [Facebook] 分析 Facebook 圖片，共 ${images.length} 張:`);

    // Facebook 特定的圖片過濾規則
    const facebookFiltered = images.filter(img => {
      const imgUrl = img?.url || img;
      if (!imgUrl) return false;

      // Facebook 特定的排除規則
      const facebookExcludes = [
        'static.facebook.com/images/logos',
        'static.facebook.com/images/mobile',
        'facebook.com/tr',
        'facebook_2x.png',
        'fb_logo_small.gif',
        'fb_icon_',
        '/logos/',
        '/logo/',
      ];

      const isExcluded = facebookExcludes.some(pattern =>
        imgUrl.toLowerCase().includes(pattern.toLowerCase())
      );

      if (isExcluded) {
        console.log(`   ❌ [Facebook] 排除: ${imgUrl}`);
        return false;
      }

      // 優先選擇 scontent 或 external 域名的圖片（這些通常是實際內容）
      const isContentImage = imgUrl.includes('scontent') || imgUrl.includes('external');
      if (isContentImage) {
        console.log(`   ✅ [Facebook] 內容圖片: ${imgUrl}`);
        return true;
      }

      console.log(`   ⚪ [Facebook] 一般圖片: ${imgUrl}`);
      return true;
    });

    if (facebookFiltered.length > 0) {
      // 優先選擇尺寸較大的圖片
      const sorted = facebookFiltered.sort((a, b) => {
        const aSize = (a.width || 0) * (a.height || 0);
        const bSize = (b.width || 0) * (b.height || 0);
        return bSize - aSize;
      });

      return sorted[0]?.url || sorted[0];
    }

    return null;
  }

  async handleInstagramUrl(url) {
    console.log(`📸 [Open Graph] Instagram URL 特殊處理: ${url}`);
    // Instagram URL 處理
    return await this.getPreview(url);
  }

  // 清理快取
  clearCache() {
    this.cache.clear();
    console.log(`🧹 [Open Graph] 快取已清理`);
  }

  // 獲取快取統計
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// 建立全域實例
const openGraphAPI = new OpenGraphAPI();

module.exports = {
  OpenGraphAPI,
  openGraphAPI
};