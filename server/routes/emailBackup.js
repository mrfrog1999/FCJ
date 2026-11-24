// 定时邮件备份：设置读写、测试发送、立即发送
const router = require('express').Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');
const { sendTestMail, sendBackupMail } = require('../utils/mailer');

router.use(auth);

const DEFAULTS = {
  enabled: 0, frequency: 'daily', send_time: '09:00',
  weekday: 1, month_day: 1, month: 1, year_day: 1,
  smtp_user: '', smtp_pass: '', to_email: '', book_id: null, last_sent_key: ''
};

function maskPass(s) {
  if (!s) return '';
  if (s.length <= 4) return '****';
  return s.slice(0, 2) + '****' + s.slice(-2);
}

function getRow(userId) {
  return db.prepare('SELECT * FROM email_backup_settings WHERE user_id=?').get(userId) || null;
}

function publicConfig(row) {
  const c = { ...DEFAULTS, ...(row || {}) };
  return {
    enabled: !!c.enabled,
    frequency: c.frequency,
    send_time: c.send_time,
    weekday: c.weekday,
    month_day: c.month_day,
    month: c.month,
    year_day: c.year_day,
    smtp_user: c.smtp_user,
    smtp_pass: maskPass(c.smtp_pass),
    smtp_pass_set: !!c.smtp_pass,
    to_email: c.to_email,
    book_id: c.book_id,
    last_sent_key: c.last_sent_key || ''
  };
}

// 读取当前用户配置
router.get('/settings', (req, res) => {
  res.json(publicConfig(getRow(req.user.id)));
});

// 保存配置
router.put('/settings', (req, res) => {
  try {
    const b = req.body || {};
    const old = getRow(req.user.id);
    const frequency = ['daily', 'weekly', 'monthly', 'yearly'].includes(b.frequency) ? b.frequency : 'daily';
    const send_time = /^\d{1,2}:\d{2}$/.test(b.send_time || '')
      ? b.send_time.split(':').map((n, i) => String(Math.min(i === 0 ? 23 : 59, Math.max(0, parseInt(n, 10) || 0))).padStart(2, '0')).join(':')
      : '09:00';
    const clamp = (v, min, max, def) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
    };
    const enabled = b.enabled ? 1 : 0;
    // 授权码：掩码或留空表示保持不变
    let smtp_pass = String(b.smtp_pass || '');
    if (!smtp_pass || smtp_pass.includes('****')) smtp_pass = old?.smtp_pass || '';
    const smtp_user = String(b.smtp_user || '').trim();
    const to_email = String(b.to_email || '').trim();
    if (enabled && (!smtp_user || !smtp_pass || !to_email)) {
      return res.status(400).json({ error: '请填写发件 QQ 邮箱、授权码和收件邮箱' });
    }
    if (smtp_user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtp_user)) return res.status(400).json({ error: '发件邮箱格式不正确' });
    if (to_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) return res.status(400).json({ error: '收件邮箱格式不正确' });

    const cfg = {
      enabled, frequency, send_time,
      weekday: clamp(b.weekday, 0, 6, 1),
      month_day: clamp(b.month_day, 1, 31, 1),
      month: clamp(b.month, 1, 12, 1),
      year_day: clamp(b.year_day, 1, 31, 1),
      smtp_user, smtp_pass, to_email,
      book_id: b.book_id || null
    };
    db.prepare(`INSERT INTO email_backup_settings
      (user_id, enabled, frequency, send_time, weekday, month_day, month, year_day, smtp_user, smtp_pass, to_email, book_id, updated_at)
      VALUES (@user_id, @enabled, @frequency, @send_time, @weekday, @month_day, @month, @year_day, @smtp_user, @smtp_pass, @to_email, @book_id, datetime('now','localtime'))
      ON CONFLICT(user_id) DO UPDATE SET
        enabled=excluded.enabled, frequency=excluded.frequency, send_time=excluded.send_time,
        weekday=excluded.weekday, month_day=excluded.month_day, month=excluded.month, year_day=excluded.year_day,
        smtp_user=excluded.smtp_user, smtp_pass=excluded.smtp_pass, to_email=excluded.to_email,
        book_id=excluded.book_id, updated_at=excluded.updated_at`)
      .run({ user_id: req.user.id, ...cfg });
    res.json({ ok: true, config: publicConfig(getRow(req.user.id)) });
  } catch (e) {
    res.status(500).json({ error: '保存失败：' + e.message });
  }
});

// 解析授权码（支持掩码回退到已保存值）
function resolvePass(userId, input) {
  let pass = String(input || '');
  if (!pass || pass.includes('****')) pass = getRow(userId)?.smtp_pass || '';
  return pass;
}

// 测试发送
router.post('/test', async (req, res) => {
  try {
    const b = req.body || {};
    const cfg = {
      smtp_user: String(b.smtp_user || '').trim() || getRow(req.user.id)?.smtp_user || '',
      smtp_pass: resolvePass(req.user.id, b.smtp_pass),
      to_email: String(b.to_email || '').trim() || getRow(req.user.id)?.to_email || ''
    };
    if (!cfg.smtp_user || !cfg.smtp_pass || !cfg.to_email) return res.status(400).json({ error: '请先填写发件邮箱、授权码和收件邮箱' });
    await sendTestMail(cfg);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '测试发送失败：' + (e.message || e) });
  }
});

// 立即发送一次备份
router.post('/send-now', async (req, res) => {
  try {
    const b = req.body || {};
    const row = getRow(req.user.id) || {};
    const cfg = {
      smtp_user: String(b.smtp_user || row.smtp_user || '').trim(),
      smtp_pass: resolvePass(req.user.id, b.smtp_pass || row.smtp_pass),
      to_email: String(b.to_email || row.to_email || '').trim()
    };
    if (!cfg.smtp_user || !cfg.smtp_pass || !cfg.to_email) return res.status(400).json({ error: '请先填写发件邮箱、授权码和收件邮箱' });
    const result = await sendBackupMail(cfg, req.user.id, row.book_id || b.book_id);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: '发送失败：' + (e.message || e) });
  }
});

module.exports = router;
