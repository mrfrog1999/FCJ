const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { db, seedDefaults, sanitizeAvatar } = require('../db');
const { sign, auth } = require('../middleware/auth');

// 注册已关闭：账号统一由管理员创建
router.post('/register', (req, res) => {
  return res.status(403).json({ error: '注册已关闭，请联系管理员创建账号' });
  const { username, password, nickname } = req.body;
  if (!username || !password) return res.status(400).json({ error: '账号和密码不能为空' });
  if (String(username).length < 3 || String(password).length < 6)
    return res.status(400).json({ error: '账号至少3位，密码至少6位' });
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username))
    return res.status(400).json({ error: '账号已存在' });

  const hash = bcrypt.hashSync(password, 8);
  const info = db.prepare('INSERT INTO users (username, password_hash, nickname) VALUES (?,?,?)')
    .run(username, hash, nickname || username);
  const user = { id: info.lastInsertRowid, username, nickname: nickname || username };
  seedDefaults(user.id);
  res.json({ token: sign(user), user });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!row || !bcrypt.compareSync(password || '', row.password_hash))
    return res.status(400).json({ error: '账号或密码错误' });
  seedDefaults(row.id);
  const user = { id: row.id, username: row.username, nickname: row.nickname, avatar: row.avatar, bind_member_id: row.bind_member_id, theme: row.theme || 'fancy', is_admin: row.is_admin === 1 };
  res.json({ token: sign(user), user });
});

// 当前用户
router.get('/me', auth, (req, res) => {
  const row = db.prepare('SELECT id, username, nickname, avatar, bind_member_id, theme, is_admin, created_at FROM users WHERE id = ?').get(req.user.id);
  if (row && !row.theme) row.theme = 'fancy';
  if (!row) return res.status(401).json({ error: '用户不存在' });
  row.is_admin = row.is_admin === 1;
  res.json(row);
});

// 修改当前用户资料（登录名 / 昵称 / 头像）
// avatar 存 data URL 图片或预设键；传 null / '' 表示清空头像
router.put('/me', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(401).json({ error: '用户不存在' });
  let { username, nickname, avatar, theme } = req.body;
  // 登录名可修改：格式 + 唯一性校验
  let finalName = row.username;
  if (username != null && String(username).trim()) {
    finalName = String(username).trim();
    if (finalName.length < 2) return res.status(400).json({ error: '账号至少2位' });
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(finalName, req.user.id);
    if (dup) return res.status(400).json({ error: '登录名已存在' });
  }
  const finalNick = nickname != null && String(nickname).trim() ? String(nickname).trim() : row.nickname;
  const finalAvatar = sanitizeAvatar(avatar, row.avatar);
  const finalTheme = theme === 'standard' || theme === 'fancy' ? theme : (row.theme || 'fancy');
  db.prepare('UPDATE users SET username = ?, nickname = ?, avatar = ?, theme = ? WHERE id = ?')
    .run(finalName, finalNick, finalAvatar, finalTheme, req.user.id);
  res.json({ id: req.user.id, username: finalName, nickname: finalNick, avatar: finalAvatar, theme: finalTheme });
});

module.exports = router;
