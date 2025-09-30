// Supabase Storage 圖片處理模組
const supabase = require('./supabase-client');
const stream = require('stream');

// Supabase Storage Bucket 名稱
const BUCKET_NAME = 'photo';

/**
 * 將 LINE 圖片上傳到 Supabase Storage
 * @param {AsyncIterable} imageStream - LINE Bot SDK 的圖片串流
 * @param {string} userId - 使用者 ID
 * @param {string} messageId - 訊息 ID
 * @returns {Promise<string>} - 圖片的公開網址
 */
async function uploadLineImageToSupabase(imageStream, userId, messageId) {
  try {
    console.log('📸 [圖片上傳] 開始上傳圖片到 Supabase Storage...');
    console.log(`📸 [圖片上傳] User ID: ${userId}, Message ID: ${messageId}`);

    // 將 AsyncIterable 轉換為 Buffer
    const chunks = [];
    for await (const chunk of imageStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    console.log(`📸 [圖片上傳] 圖片大小: ${(buffer.length / 1024).toFixed(2)} KB`);

    // 生成唯一的檔案名稱
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}-${messageId}.jpg`;

    console.log(`📸 [圖片上傳] 檔案路徑: ${fileName}`);

    // 上傳到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ [圖片上傳] Supabase Storage 上傳失敗:', error);
      throw new Error(`上傳失敗: ${error.message}`);
    }

    console.log('✅ [圖片上傳] 上傳成功:', data);

    // 獲取公開網址
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`✅ [圖片上傳] 公開網址: ${publicUrl}`);

    return publicUrl;

  } catch (error) {
    console.error('❌ [圖片上傳] 上傳過程發生錯誤:', error);
    throw error;
  }
}

/**
 * 刪除 Supabase Storage 中的圖片
 * @param {string} imageUrl - 圖片的公開網址
 * @returns {Promise<boolean>} - 是否刪除成功
 */
async function deleteImageFromSupabase(imageUrl) {
  try {
    // 從 URL 提取檔案路徑
    const urlParts = imageUrl.split(`/${BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      console.error('❌ [圖片刪除] 無效的圖片 URL:', imageUrl);
      return false;
    }

    const filePath = urlParts[1];
    console.log(`🗑️ [圖片刪除] 準備刪除: ${filePath}`);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('❌ [圖片刪除] 刪除失敗:', error);
      return false;
    }

    console.log('✅ [圖片刪除] 刪除成功:', data);
    return true;

  } catch (error) {
    console.error('❌ [圖片刪除] 刪除過程發生錯誤:', error);
    return false;
  }
}

/**
 * 檢查 Bucket 是否存在，不存在則創建
 * 注意：這個函數需要 service_role key 才能創建 bucket
 * 建議直接在 Supabase Dashboard 手動創建 bucket
 */
async function ensureBucketExists() {
  try {
    const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);

    if (error) {
      console.log(`⚠️ [Storage] Bucket "${BUCKET_NAME}" 不存在或無法訪問`);
      console.log('📝 [Storage] 請在 Supabase Dashboard 手動創建 bucket:');
      console.log(`   1. 前往 Supabase Dashboard > Storage`);
      console.log(`   2. 創建名為 "${BUCKET_NAME}" 的 bucket`);
      console.log(`   3. 設定為 Public（公開訪問）`);
      return false;
    }

    console.log(`✅ [Storage] Bucket "${BUCKET_NAME}" 已存在`);
    return true;

  } catch (error) {
    console.error('❌ [Storage] 檢查 Bucket 時發生錯誤:', error);
    return false;
  }
}

module.exports = {
  uploadLineImageToSupabase,
  deleteImageFromSupabase,
  ensureBucketExists,
  BUCKET_NAME
};