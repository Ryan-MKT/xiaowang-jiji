-- Linus 式資料庫設計：簡單、直接、沒有廢話

-- 使用者表：只存必要資訊
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,  -- LINE userId，不要重新發明輪子
  display_name VARCHAR(255),
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 訊息表：保持原樣，已經夠簡單
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  message_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 就這樣，沒了。不需要 oauth_tokens、sessions、refresh_tokens 等垃圾