/**
 * 智能內容分類器 - 自動區分代辦任務與收藏內容
 * 用於實現 TODOLIST 和收藏卡分離系統
 */

class ContentClassifier {
  constructor() {
    console.log('🎯 [ContentClassifier] 智能內容分類器初始化完成');
  }

  /**
   * 判斷內容是否為收藏品（而非代辦任務）
   * @param {string} content - 要分類的內容文字
   * @returns {Object} 分類結果 { isCollection: boolean, category: string, confidence: number }
   */
  classifyContent(content) {
    console.log('🔍 [ContentClassifier] 開始分析內容:', content.substring(0, 50));

    const cleanContent = content.trim().toLowerCase();
    let isCollection = false;
    let category = 'task';
    let confidence = 0.5;
    let reasons = [];

    // 1. 網址內容檢測 (高優先級)
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = content.match(urlPattern);

    if (urls && urls.length > 0) {
      console.log('🔗 [分類器] 偵測到網址:', urls);

      // 檢查網址類型
      const collectionUrlPatterns = [
        { pattern: /(youtube\.com|youtu\.be)/i, category: 'video', confidence: 0.9 },
        { pattern: /(instagram\.com|ig\.me)/i, category: 'social', confidence: 0.8 },
        { pattern: /(facebook\.com|fb\.com)/i, category: 'social', confidence: 0.8 },
        { pattern: /(tiktok\.com)/i, category: 'video', confidence: 0.9 },
        { pattern: /(pinterest\.com|pin\.it)/i, category: 'image', confidence: 0.8 },
        { pattern: /(github\.com)/i, category: 'reference', confidence: 0.7 },
        { pattern: /(wikipedia\.org)/i, category: 'reference', confidence: 0.7 },
        { pattern: /(medium\.com|substack\.com)/i, category: 'article', confidence: 0.8 },
        { pattern: /(spotify\.com|music\.apple\.com)/i, category: 'music', confidence: 0.9 },
        { pattern: /\.(jpg|jpeg|png|gif|webp)(\?|$)/i, category: 'image', confidence: 0.9 },
        { pattern: /\.(mp4|avi|mov|wmv|webm)(\?|$)/i, category: 'video', confidence: 0.9 }
      ];

      for (const { pattern, category: urlCategory, confidence: urlConfidence } of collectionUrlPatterns) {
        if (urls.some(url => pattern.test(url))) {
          isCollection = true;
          category = urlCategory;
          confidence = urlConfidence;
          reasons.push(`網址類型: ${urlCategory}`);
          break;
        }
      }

      // 如果沒有匹配特定類型，但包含網址，判斷文字內容
      if (!isCollection) {
        // 檢查是否包含任務性關鍵字
        const taskKeywords = ['要做', '完成', '處理', '解決', '辦理', '準備', '安排', '計劃', '記得', '提醒'];
        const hasTaskKeywords = taskKeywords.some(keyword => cleanContent.includes(keyword));

        if (hasTaskKeywords) {
          // 包含任務關鍵字，即使有網址也視為任務
          isCollection = false;
          category = 'task';
          confidence = 0.7;
          reasons.push('包含任務關鍵字，視為代辦事項');
        } else {
          // 純網址分享，視為收藏
          isCollection = true;
          category = 'link';
          confidence = 0.6;
          reasons.push('純網址分享');
        }
      }
    }

    // 2. 收藏關鍵字檢測
    const collectionKeywords = [
      { words: ['收藏', '保存', '儲存', '存起來', '記下來'], category: 'bookmark', confidence: 0.8 },
      { words: ['分享', '推薦', '好文', '好片', '值得看'], category: 'share', confidence: 0.7 },
      { words: ['參考', '資料', '文件', '筆記', '重要'], category: 'reference', confidence: 0.6 },
      { words: ['喜歡', '讚', '不錯', '有趣', '好看'], category: 'favorite', confidence: 0.6 }
    ];

    for (const { words, category: keywordCategory, confidence: keywordConfidence } of collectionKeywords) {
      if (words.some(keyword => cleanContent.includes(keyword))) {
        isCollection = true;
        category = keywordCategory;
        confidence = Math.max(confidence, keywordConfidence);
        reasons.push(`包含收藏關鍵字: ${words.find(w => cleanContent.includes(w))}`);
        break;
      }
    }

    // 3. 任務關鍵字檢測 (覆蓋收藏判斷)
    const taskKeywords = [
      { words: ['要做', '必須', '需要完成', '待辦', 'todo'], confidence: 0.9 },
      { words: ['提醒', '記得', '別忘了', '注意'], confidence: 0.8 },
      { words: ['計劃', '安排', '準備', '辦理'], confidence: 0.7 },
      { words: ['處理', '解決', '完成', '執行'], confidence: 0.7 },
      { words: ['今天', '明天', '這週', '下週'], confidence: 0.6 }
    ];

    for (const { words, confidence: taskConfidence } of taskKeywords) {
      if (words.some(keyword => cleanContent.includes(keyword))) {
        // 任務關鍵字優先級較高，覆蓋收藏判斷
        if (taskConfidence > confidence) {
          isCollection = false;
          category = 'task';
          confidence = taskConfidence;
          reasons.push(`強烈任務信號: ${words.find(w => cleanContent.includes(w))}`);
        }
        break;
      }
    }

    // 4. 內容長度和複雜度分析
    if (content.length > 100 && !isCollection) {
      // 長內容傾向於是收藏（文章、筆記等）
      confidence *= 0.8; // 降低任務確定度
      if (confidence < 0.5) {
        isCollection = true;
        category = 'note';
        confidence = 0.6;
        reasons.push('長內容，可能為筆記或文章');
      }
    }

    // 5. 時間相關檢測
    const timePattern = /\d{1,2}:\d{2}|\d{1,2}點|今天|明天|後天|這週|下週|月底/;
    if (timePattern.test(content) && !isCollection) {
      // 包含時間資訊，強化任務屬性
      isCollection = false;
      category = 'task';
      confidence = Math.max(confidence, 0.8);
      reasons.push('包含時間資訊，強化任務屬性');
    }

    // 最終結果
    const result = {
      isCollection,
      category,
      confidence: Math.round(confidence * 100) / 100,
      reasons: reasons.length > 0 ? reasons : ['基於基礎規則判斷'],
      rawContent: content.substring(0, 100)
    };

    console.log('🎯 [分類結果]', {
      isCollection: result.isCollection,
      category: result.category,
      confidence: result.confidence,
      reasons: result.reasons
    });

    return result;
  }

  /**
   * 取得內容類型的顯示名稱
   * @param {string} category - 內容類型
   * @returns {string} 顯示名稱
   */
  getCategoryDisplayName(category) {
    const categoryNames = {
      'task': '📝 代辦任務',
      'video': '🎬 影片收藏',
      'image': '🖼️ 圖片收藏',
      'article': '📰 文章收藏',
      'music': '🎵 音樂收藏',
      'social': '👥 社群內容',
      'reference': '📚 參考資料',
      'bookmark': '🔖 書籤收藏',
      'share': '🔗 分享內容',
      'favorite': '⭐ 喜愛內容',
      'link': '🔗 網址收藏',
      'note': '📔 筆記內容'
    };

    return categoryNames[category] || '📁 其他內容';
  }

  /**
   * 針對收藏內容生成適當的標籤
   * @param {string} content - 內容文字
   * @param {string} category - 內容類型
   * @returns {Array} 建議標籤陣列
   */
  generateCollectionTags(content, category) {
    const baseTags = {
      'video': ['影片', '娛樂'],
      'image': ['圖片', '視覺'],
      'article': ['文章', '閱讀'],
      'music': ['音樂', '聲音'],
      'social': ['社群', '分享'],
      'reference': ['參考', '學習'],
      'bookmark': ['收藏', '稍後讀'],
      'share': ['推薦', '分享'],
      'favorite': ['喜愛', '精選'],
      'link': ['網址', '連結'],
      'note': ['筆記', '記錄']
    };

    let tags = baseTags[category] || ['其他'];

    // 根據內容添加額外標籤
    const contentLower = content.toLowerCase();

    if (contentLower.includes('教學') || contentLower.includes('tutorial')) tags.push('教學');
    if (contentLower.includes('新聞') || contentLower.includes('news')) tags.push('新聞');
    if (contentLower.includes('食物') || contentLower.includes('restaurant') || contentLower.includes('food')) tags.push('美食');
    if (contentLower.includes('旅遊') || contentLower.includes('travel')) tags.push('旅遊');
    if (contentLower.includes('工作') || contentLower.includes('work')) tags.push('工作');
    if (contentLower.includes('程式') || contentLower.includes('code') || contentLower.includes('github')) tags.push('程式');

    return tags.slice(0, 3); // 限制最多3個標籤
  }
}

module.exports = ContentClassifier;