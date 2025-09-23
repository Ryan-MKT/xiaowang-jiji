// LINE Login 路由模組
const express = require('express');
const router = express.Router();

// 基本的 LINE Login 路由
router.get('/auth/line', (req, res) => {
  res.status(503).json({ error: 'LINE Login disabled' });
});

router.get('/auth/line/callback', (req, res) => {
  res.status(503).json({ error: 'LINE Login disabled' });
});

module.exports = router;