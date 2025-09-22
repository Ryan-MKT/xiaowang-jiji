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

      // 🚀 Facebook 特殊處理：直接抓取頁面HTML來尋找 scontent 圖片
      const domain = this.extractDomainFromUrl(url);
      if (domain.includes('facebook.com')) {
        console.log(`📘 [Open Graph] Facebook URL 特殊處理: ${url}`);
        const fbResult = await this.extractFacebookDirectImages(url);
        if (fbResult && fbResult.directImages && fbResult.directImages.length > 0) {
          console.log(`✅ [Open Graph] Facebook 直接圖片提取成功:`, fbResult.directImages[0]);

          // 還是要獲取基本的預覽資訊
          const basicResult = await getLinkPreview(url, {
            timeout: 15000,
            followRedirects: 'follow',
            headers: {
              'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          // 用直接圖片替換基本結果中的圖片
          basicResult.images = fbResult.directImages.map(img => ({ url: img }));

          const standardizedResult = this.standardizeResponse(basicResult, url);

          // 儲存快取
          this.cache.set(cacheKey, {
            data: standardizedResult,
            timestamp: Date.now()
          });

          return standardizedResult;
        }
      }

      // 呼叫 Open Graph API with enhanced headers for Facebook
      const result = await getLinkPreview(url, {
        timeout: 15000,
        followRedirects: 'follow',
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
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
    const domain = this.extractDomainFromUrl(originalUrl);
    const title = result.title || this.extractTitleFromUrl(originalUrl);

    // 智能 description 處理
    let description = result.description || '';

    // 如果 description 為空或是 "Error"，提供有意義的備用內容
    if (!description || description.trim() === '' || description === 'Error') {
      if (domain.includes('facebook.com')) {
        description = `來自 Facebook 的分享內容 - ${title}`;
      } else if (domain.includes('instagram.com')) {
        description = `來自 Instagram 的分享內容 - ${title}`;
      } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        description = `來自 YouTube 的影片內容 - ${title}`;
      } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
        description = `來自 Twitter/X 的推文 - ${title}`;
      } else {
        description = `來自 ${domain} 的網頁內容`;
      }
    }

    return {
      success: true,
      type: 'opengraph',
      url: result.url || originalUrl,
      title: title,
      description: description,
      image: this.selectBestImage(result.images),
      siteName: result.siteName || domain,
      domain: domain,

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

    // 🎯 第一優先：找 scontent.fbcdn.net 直接圖片 URL
    const scontentImages = images.filter(img => {
      const url = img?.url || img;
      return typeof url === 'string' && url.includes('scontent') && url.includes('fbcdn.net');
    });

    if (scontentImages.length > 0) {
      const selectedImage = scontentImages[0]?.url || scontentImages[0];
      console.log(`🎯 [圖片選擇] 找到 scontent 直接圖片 URL: ${selectedImage}`);
      return selectedImage;
    }

    // 🔍 記錄所有可用圖片以便除錯
    console.log(`🔍 [圖片除錯] 所有可用圖片:`, images.map(img => {
      const url = img?.url || img;
      return {
        url: typeof url === 'string' ? url.substring(0, 100) + '...' : url,
        isScontent: typeof url === 'string' && url.includes('scontent'),
        isFbcdn: typeof url === 'string' && url.includes('fbcdn'),
        isLookaside: typeof url === 'string' && url.includes('lookaside'),
        isDirectImage: typeof url === 'string' && (url.includes('.jpg') || url.includes('.png') || url.includes('.webp'))
      };
    }));

    // 🚀 第二優先：過濾掉 Facebook 相片頁面 URL，保留其他直接圖片
    const validImages = images.filter(img => {
      const url = img?.url || img;
      if (typeof url !== 'string') return false;

      // 排除 Facebook 相片頁面 URL，但保留 lookaside 作為備選
      if (url.includes('facebook.com/photo.php') ||
          url.includes('facebook.com/share/') ||
          url.includes('?fbid=')) {
        console.log(`🚫 [圖片過濾] 排除 Facebook 頁面 URL: ${url.substring(0, 80)}...`);
        return false;
      }

      // 接受所有可用的圖片格式（包括 lookaside 作為備選）
      return url.includes('fbcdn') ||
             url.includes('lookaside.fbsbx.com') ||
             url.includes('.jpg') ||
             url.includes('.png') ||
             url.includes('.webp') ||
             !url.includes('facebook.com'); // 非 Facebook 的圖片都接受
    });

    console.log(`🔍 [圖片選擇] 原始圖片數量: ${images.length}, 過濾後: ${validImages.length}`);

    if (validImages.length === 0) {
      console.log(`⚠️ [圖片選擇] 無有效圖片，回傳 null`);
      return null;
    }

    // 選擇最適合的圖片 (優先選擇較大的圖片)
    const sortedImages = validImages.sort((a, b) => {
      const aSize = (a.width || 0) * (a.height || 0);
      const bSize = (b.width || 0) * (b.height || 0);
      return bSize - aSize;
    });

    const selectedImage = sortedImages[0]?.url || sortedImages[0];
    console.log(`✅ [圖片選擇] 選中圖片: ${selectedImage}`);
    return selectedImage;
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

  // 🚀 新增：直接從 Facebook 頁面提取 scontent 圖片
  async extractFacebookDirectImages(url) {
    try {
      console.log(`📘 [Facebook Direct] 開始直接提取圖片: ${url}`);

      const fetch = require('node-fetch');
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      console.log(`📘 [Facebook Direct] 成功獲取頁面HTML，長度: ${html.length}`);

      // 尋找所有包含 scontent.fbcdn.net 的圖片URL
      const scontentRegex = /https:\/\/scontent[^"'\s]+\.fbcdn\.net\/[^"'\s]+/g;
      const scontentMatches = html.match(scontentRegex) || [];

      console.log(`📘 [Facebook Direct] 找到 ${scontentMatches.length} 個 scontent URL`);

      // 過濾和清理URL
      const directImages = scontentMatches
        .filter(url => {
          // 過濾掉過小或不相關的圖片
          return !url.includes('profile_pic') &&
                 !url.includes('safe_image') &&
                 !url.includes('&amp;') &&
                 (url.includes('.jpg') || url.includes('.png') || url.includes('.webp'));
        })
        .map(url => {
          // 清理URL中的HTML實體
          return url.replace(/&amp;/g, '&');
        })
        .slice(0, 5); // 只取前5個最相關的

      console.log(`📘 [Facebook Direct] 過濾後找到 ${directImages.length} 個有效圖片:`);
      directImages.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.substring(0, 100)}...`);
      });

      return {
        directImages: directImages,
        totalFound: scontentMatches.length
      };

    } catch (error) {
      console.error(`❌ [Facebook Direct] 提取失敗: ${url}`, error.message);
      return null;
    }
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