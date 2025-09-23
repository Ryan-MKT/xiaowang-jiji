// Auth 模組 - 基本驗證功能
const express = require('express');

// 基本的驗證中間件
const requireAuth = (req, res, next) => {
  // 簡單的驗證邏輯
  const userId = req.session?.userId || req.headers['x-user-id'];
  if (userId) {
    req.userId = userId;
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// 獲取用戶 ID 的輔助函數
const getUserId = (req) => {
  return req.session?.userId || req.headers['x-user-id'] || 'default-user';
};

// 簡單的用戶驗證函數
const authenticateUser = async (userId) => {
  // 基本的用戶驗證邏輯
  if (!userId) {
    return null;
  }

  // 回傳簡單的用戶物件
  return {
    id: userId,
    authenticated: true,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  requireAuth,
  getUserId,
  authenticateUser
};