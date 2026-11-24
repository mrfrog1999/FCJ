const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { db, seedDefaults, sanitizeAvatar } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// 仅管理员可访问（管理员身份由 is_admin 标识，与登录名解耦）
function requireAdmin(req, res, next) {
  const row = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  const isAdmin = row && row.is_admin === 1;
  if (!isAdmin) return res.status(403).json({ error: '仅管理员可操作' });
  next();
}
router.use(requireAdmin);

const isAdminRow = u => !!(u && u.is_admin === 1);

// 账号列表（含关联的记账成员）
router.get('/users', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.nickname, u.avatar, u.created_at, u.bind_member_id, u.is_admin,
      bm.nickname AS bind_member_nickname,
      (SELECT COUNT(*) FROM book_members x WHERE x.user_id = u.id) AS book_count
    FROM users u
    LEFT JOIN users bm ON bm.id = u.bind_member_id
    ORDER BY u.id ASC
  `).all();
  res.json(rows.map(r => ({ ...r, is_admin: isAdminRow(r) })));
});

// 新增账号
router.post('/users', (req, res) => {
  const { username, password, nickname, avatar } = req.body;
  const name = String(username || '').trim();
  if (!name || !password) return res.status(400).json({ error: '账号和密码不能为空' });
  if (name.length < 2) return res.status(400).json({ error: '账号至少2位' });
  if (String(password).length < 6) return res.status(400).json({ error: '密码至少6位' });
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(name))
    return res.status(400).json({ error: '账号已存在' });

  const hash = bcrypt.hashSync(password, 8);
  const validAvatar = sanitizeAvatar(avatar, null);
  const bindId = req.body.bind_member_id ? Number(req.body.bind_member_id) : null;
  const info = db.prepare('INSERT INTO users (username, password_hash, nickname, avatar, bind_member_id) VALUES (?,?,?,?,?)')
    .run(name, hash, String(nickname || '').trim() || name, validAvatar, bindId);
  const newId = info.lastInsertRowid;
  seedDefaults(newId); // 新账号自动初始化分类和账本

  // 关键：把新账号加入管理员拥有的账本，使其立即出现在成员列表和「记一笔」中
  const adminBooks = db.prepare('SELECT id FROM books WHERE user_id = ?').all(req.user.id);
  const addMember = db.prepare('INSERT OR IGNORE INTO book_members (book_id, user_id, role) VALUES (?,?,?)');
  adminBooks.forEach(b => addMember.run(b.id, newId, 'member'));

  res.json({ id: newId, username: name, nickname: nickname || name, avatar: validAvatar });
});

// 修改账号（登录名 / 昵称 / 重置密码）
router.put('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '账号不存在' });
  const { username, nickname, password, avatar, bind_member_id } = req.body;
  if (password && String(password).length < 6) return res.status(400).json({ error: '密码至少6位' });

  // 登录名可修改；做格式与唯一性校验
  let finalName = row.username;
  if (username != null && String(username).trim()) {
    finalName = String(username).trim();
    if (finalName.length < 2) return res.status(400).json({ error: '账号至少2位' });
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(finalName, id);
    if (dup) return res.status(400).json({ error: '登录名已存在' });
  }
  const finalNick = (nickname != null && String(nickname).trim()) ? String(nickname).trim() : row.nickname;
  const finalAvatar = sanitizeAvatar(avatar, row.avatar);
  const finalBind = (bind_member_id === undefined) ? row.bind_member_id : (bind_member_id ? Number(bind_member_id) : null);
  if (password) {
    db.prepare('UPDATE users SET username=?, nickname=?, avatar=?, bind_member_id=?, password_hash=? WHERE id=?')
      .run(finalName, finalNick, finalAvatar, finalBind, bcrypt.hashSync(password, 8), id);
  } else {
    db.prepare('UPDATE users SET username=?, nickname=?, avatar=?, bind_member_id=? WHERE id=?')
      .run(finalName, finalNick, finalAvatar, finalBind, id);
  }
  // 改的是当前登录账号 → 同步返回新登录名，便于前端刷新本地缓存
  res.json({ ok: true, username: finalName, nickname: finalNick });
});

// 删除账号
router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '账号不存在' });
  if (isAdminRow(row)) return res.status(400).json({ error: '不能删除管理员账号' });
  if (id === req.user.id) return res.status(400).json({ error: '不能删除自己' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
