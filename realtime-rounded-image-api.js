// 即時圓角圖片 API - 不需要儲存圖片
const sharp = require('sharp');

// 圓角 SVG 遮罩模板
const createRoundedMask = (width, height, radius) => {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>
  `);
};

// 簡單的記憶體快取
const imageCache = new Map();
const CACHE_MAX_SIZE = 100; // 最多快取100張圖片
const CACHE_TTL = 30 * 60 * 1000; // 30分鐘

// 即時圓角圖片處理路由
function setupRoundedImageRoute(app) {

  // 圓角圖片 API: /rounded-image?url=xxx&radius=20&size=400x300
  app.get('/rounded-image', async (req, res) => {
    try {
      const { url, radius = 20, size = '400x300' } = req.query;

      if (!url) {
        return res.status(400).json({ error: '缺少圖片URL參數' });
      }

      // 解析尺寸
      const [width, height] = size.split('x').map(Number);
      if (!width || !height) {
        return res.status(400).json({ error: '尺寸格式錯誤，應為 400x300' });
      }

      // 檢查快取
      const cacheKey = `${url}-${size}-${radius}`;
      const cached = imageCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`🎯 [圓角API] 快取命中: ${url}`);
        res.set({
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
          'ETag': `"${Buffer.from(url + size + radius).toString('base64')}"`
        });
        return res.send(cached.buffer);
      }

      console.log(`🎨 [圓角API] 處理圖片: ${url} (${width}x${height}, radius:${radius})`);

      // 1. 下載原始圖片 (處理 Facebook 圖片權限問題)
      const fetch = (await import('node-fetch')).default;

      // 設定適當的 headers 以處理 Facebook 等社群平台的圖片權限
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };

      // 如果是 Facebook 圖片，加入額外的 header
      if (url.includes('fbcdn.net') || url.includes('facebook.com')) {
        headers['Referer'] = 'https://www.facebook.com/';
        headers['sec-fetch-dest'] = 'image';
        headers['sec-fetch-mode'] = 'no-cors';
        headers['sec-fetch-site'] = 'cross-site';
      }

      const imageResponse = await fetch(url, { headers });
      if (!imageResponse.ok) {
        throw new Error(`圖片下載失敗: ${imageResponse.status}`);
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // 2. 建立圓角遮罩
      const maskBuffer = createRoundedMask(width, height, radius);

      // 3. 處理圖片: 調整大小 + 套用圓角
      const roundedImageBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .composite([{
          input: maskBuffer,
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();

      // 4. 設定快取標頭
      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // 快取1天
        'ETag': `"${Buffer.from(url + size + radius).toString('base64')}"`
      });

      // 儲存到快取
      if (imageCache.size >= CACHE_MAX_SIZE) {
        // 清除最舊的快取項目
        const firstKey = imageCache.keys().next().value;
        imageCache.delete(firstKey);
      }

      imageCache.set(cacheKey, {
        buffer: roundedImageBuffer,
        timestamp: Date.now()
      });

      console.log(`✅ [圓角API] 處理完成: ${roundedImageBuffer.length} bytes (已快取)`);
      res.send(roundedImageBuffer);

    } catch (error) {
      console.error('❌ [圓角API] 處理失敗:', error);
      res.status(500).json({
        error: '圖片處理失敗',
        details: error.message
      });
    }
  });

  console.log('🎨 [圓角API] 路由已設定: /rounded-image');
}

// 產生圓角圖片URL的輔助函數
function generateRoundedImageUrl(originalUrl, options = {}) {
  const {
    radius = 20,
    size = '400x300',
    baseUrl = process.env.BASE_URL || 'https://ec95feb2b722.ngrok-free.app'
  } = options;

  const params = new URLSearchParams({
    url: originalUrl,
    radius: radius.toString(),
    size: size
  });

  return `${baseUrl}/rounded-image?${params.toString()}`;
}

module.exports = {
  setupRoundedImageRoute,
  generateRoundedImageUrl
};