const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
// 大明细接口（上万条流水，JSON 可达数十 MB）必须压缩后传输，否则公网网关超时/截断导致前端拿不到数据
app.use(compression({ threshold: 1024 }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/books', require('./routes/books'));
app.use('/api/records', require('./routes/records'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/email-backup', require('./routes/emailBackup'));
app.use('/api/accounts', require('./routes/accounts'));

// 托管前端静态资源（单端口部署）
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  // 图标文件名固定（随机名，内容不变），设置长期强缓存，避免切页重复加载
  const iconCache = { maxAge: '365d', immutable: true, setHeaders: res => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable') };
  app.use('/category-icons', express.static(path.join(publicDir, 'category-icons'), iconCache));
  app.use('/bank-icons', express.static(path.join(publicDir, 'bank-icons'), iconCache));
  app.use('/fancy-icons', express.static(path.join(publicDir, 'fancy-icons'), iconCache));
  app.use(express.static(publicDir, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: '接口不存在' });
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message || '服务器错误' });
});

const PORT = process.env.PORT || 8668;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`随手记服务已启动: http://0.0.0.0:${PORT}`);
  require('./utils/backupScheduler').startBackupScheduler();
});
