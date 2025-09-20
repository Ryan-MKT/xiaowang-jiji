// 測試 Facebook 新格式標題修復
console.log('🧪 [測試] 開始測試 Facebook 新格式標題修復...');

const url = 'https://www.facebook.com/share/p/15VAsHSaam/';

// 模擬 Enhanced Preview 結果
const mockEnhancedResult = {
    title: 'FAST Sports 體育頻道',
    description: '江坤宇 關鍵自踩壘包策動雙殺 李振昌登板留下殘壘安全下庄 CPBL中華職棒一軍例行賽 統一獅 vs 中信兄弟',
    text: '江坤宇 關鍵自踩壘包策動雙殺 李振昌登板留下殘壘安全下庄...',
    image: 'https://scontent.ftpe13-1.fna.fbcdn.net/v/t39.30808-6/549849217_1316911193781122_3127529699545696758_n.jpg'
};

// 測試修復後的標題邏輯
function testTitleLogic(enhancedResult, collectionDataTitle) {
    console.log('🔍 [測試] 檢查 Enhanced Preview 結果:', {
        title: enhancedResult?.title,
        isValidTitle: enhancedResult?.title &&
                     enhancedResult.title !== 'www.facebook.com' &&
                     enhancedResult.title !== 'Error' &&
                     !enhancedResult.title.startsWith('http')
    });

    let finalTitle = collectionDataTitle; // 預設使用 URL

    if (enhancedResult?.title &&
        enhancedResult.title !== 'www.facebook.com' &&
        enhancedResult.title !== 'Error' &&
        !enhancedResult.title.startsWith('http')) {
        finalTitle = enhancedResult.title;
        console.log('✅ [測試] 使用 Enhanced Preview 提取的標題:', finalTitle);
    } else {
        console.log('⚠️ [測試] Enhanced Preview 標題無效，使用 URL 作為標題');
    }

    return finalTitle;
}

// 測試修復後的社群帳戶提取器標題驗證
function testSocialExtractorTitleValidation(title) {
    const isValidTitle = title &&
                       title !== 'Error' &&
                       title !== 'www.facebook.com' &&
                       title !== 'facebook.com' &&
                       !title.includes('無法獲取') &&
                       !title.startsWith('http') &&
                       !title.includes('facebook.com/share/') &&
                       title.length > 2;

    console.log('🔍 [測試] 社群提取器標題驗證:', {
        originalTitle: title,
        isValidTitle: isValidTitle,
        titleLength: title?.length || 0
    });

    if (isValidTitle) {
        // 清理標題
        const cleanTitle = title
            .replace(/\s*-\s*Facebook.*$/i, '')
            .replace(/\s*\|\s*Facebook.*$/i, '')
            .replace(/^Facebook\s*-?\s*/i, '')
            .replace(/^www\.\s*/i, '')
            .trim();

        if (cleanTitle && cleanTitle.length > 2 && cleanTitle.length < 50) {
            console.log(`✅ [測試] 提取帳戶名稱: ${cleanTitle}`);
            return cleanTitle;
        } else {
            console.log(`⚠️ [測試] 標題清理後無效: "${cleanTitle}"`);
        }
    } else {
        console.log(`⚠️ [測試] 標題不符合要求: "${title}"`);
    }

    return null;
}

// 執行測試
console.log('\n=== 測試案例 1: 正確的 Enhanced Preview 結果 ===');
const correctTitle = testTitleLogic(mockEnhancedResult, url);
const extractedAccountName = testSocialExtractorTitleValidation(correctTitle);

console.log('\n=== 測試案例 2: 錯誤的 Enhanced Preview 結果 ===');
const wrongEnhancedResult = { title: 'www.facebook.com', description: '無法獲取預覽內容' };
const wrongTitle = testTitleLogic(wrongEnhancedResult, url);
const wrongAccountName = testSocialExtractorTitleValidation(wrongTitle);

console.log('\n=== 測試結果總結 ===');
console.log('✅ 正確流程 - 帳戶名稱:', extractedAccountName || '提取失敗');
console.log('❌ 錯誤流程 - 帳戶名稱:', wrongAccountName || '提取失敗');

console.log('\n🎯 [測試結論] 修復是否有效:', extractedAccountName === 'FAST Sports 體育頻道' ? '✅ 有效' : '❌ 無效');