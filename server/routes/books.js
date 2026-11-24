const router = require('express').Router();
const { db, seedDefaults, canAccessBook } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

function genCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// 我的账本列表（含共享加入的）
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT b.*,
      CASE WHEN b.user_id = ? THEN 'owner' ELSE bm.role END AS my_role,
      (SELECT COUNT(*) FROM records r WHERE r.book_id = b.id) AS record_count
    FROM books b
    LEFT JOIN book_members bm ON bm.book_id = b.id AND bm.user_id = ?
    WHERE b.user_id = ? OR bm.id IS NOT NULL
    ORDER BY b.id ASC
  `).all(req.user.id, req.user.id, req.user.id);
  res.json(rows);
});

// 创建账本
router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: '账本名称不能为空' });
  const info = db.prepare('INSERT INTO books (user_id, name, invite_code) VALUES (?,?,?)')
    .run(req.user.id, name, genCode());
  db.prepare('INSERT INTO book_members (book_id, user_id, role) VALUES (?,?,?)').run(info.lastInsertRowid, req.user.id, 'owner');
  res.json({ id: info.lastInsertRowid, name, invite_code: genCode() });
});

// 更新账本名称
router.put('/:id', (req, res) => {
  const id = req.params.id;
  if (!canAccessBook(req.user.id, id)) return res.status(403).json({ error: '无权操作' });
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (book.user_id !== req.user.id) return res.status(403).json({ error: '只有账本创建者可修改' });
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: '账本名称不能为空' });
  db.prepare('UPDATE books SET name = ? WHERE id = ?').run(name, id);
  res.json({ ok: true });
});

// 删除账本
router.delete('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: '账本不存在' });
  if (book.user_id !== req.user.id) return res.status(403).json({ error: '只有账本创建者可删除' });
  const defaultBook = db.prepare('SELECT id FROM books WHERE user_id = ? ORDER BY id LIMIT 1').get(req.user.id);
  if (defaultBook && defaultBook.id === book.id) return res.status(400).json({ error: '不能删除默认账本' });
  db.prepare('DELETE FROM books WHERE id = ?').run(book.id);
  res.json({ ok: true });
});

// 生成/获取邀请码
router.post('/:id/invite', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book || book.user_id !== req.user.id) return res.status(403).json({ error: '只有账本创建者可邀请' });
  let code = book.invite_code;
  if (!code) {
    code = genCode();
    db.prepare('UPDATE books SET invite_code = ? WHERE id = ?').run(code, book.id);
  }
  res.json({ invite_code: code });
});

// 通过邀请码加入账本
router.post('/join', (req, res) => {
  const code = (req.body.code || '').trim().toUpperCase();
  const book = db.prepare('SELECT * FROM books WHERE invite_code = ?').get(code);
  if (!book) return res.status(404).json({ error: '邀请码无效' });
  if (book.user_id === req.user.id) return res.status(400).json({ error: '这是你自己的账本' });
  db.prepare('INSERT OR IGNORE INTO book_members (book_id, user_id, role) VALUES (?,?,?)').run(book.id, req.user.id, 'member');
  res.json({ ok: true, book: { id: book.id, name: book.name } });
});

// 账本成员列表
router.get('/:id/members', (req, res) => {
  if (!canAccessBook(req.user.id, req.params.id)) return res.status(403).json({ error: '无权查看' });
  const rows = db.prepare(`
    SELECT u.id, u.nickname, u.username, u.avatar, bm.role, bm.joined_at
    FROM book_members bm JOIN users u ON u.id = bm.user_id
    WHERE bm.book_id = ? ORDER BY bm.id
  `).all(req.params.id);
  res.json(rows);
});

module.exports = router;
