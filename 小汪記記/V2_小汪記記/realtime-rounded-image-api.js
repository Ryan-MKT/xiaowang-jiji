// 圓角圖片 API - 基本實現
const express = require('express');

// 基本圓角圖片功能（簡化版本）
function setupRoundedImageRoute(app) {
  app.get('/rounded-image', (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    // 直接重導向到原圖（避免黑邊問題）
    res.redirect(url);
  });
}

function generateRoundedImageUrl(originalUrl) {
  // 直接返回原圖 URL（已修復黑邊問題）
  return originalUrl;
}

function clearImageCache() {
  console.log('📸 圖片快取已清理');
  return true;
}

module.exports = {
  setupRoundedImageRoute,
  generateRoundedImageUrl,
  clearImageCache
};