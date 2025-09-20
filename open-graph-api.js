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

      // 呼叫 Open Graph API
      const result = await getLinkPreview(url, {
        timeout: 10000,
        followRedirects: 'follow',
        handleRedirects: (baseURL, forwardedURL) => {
          console.log(`🔄 [Open Graph] 重導向: ${baseURL} → ${forwardedURL}`);
          return true;
        }
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
    return {
      success: true,
      type: 'opengraph',
      url: result.url || originalUrl,
      title: result.title || this.extractTitleFromUrl(originalUrl),
      description: result.description || '',
      image: this.selectBestImage(result.images),
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

  selectBestImage(images) {
    if (!images || images.length === 0) return null;

    // 選擇最適合的圖片 (優先選擇較大的圖片)
    const sortedImages = images.sort((a, b) => {
      const aSize = (a.width || 0) * (a.height || 0);
      const bSize = (b.width || 0) * (b.height || 0);
      return bSize - aSize;
    });

    return sortedImages[0]?.url || sortedImages[0];
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
    // Facebook URL 通常有良好的 Open Graph 標籤
    return await this.getPreview(url);
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