const router = require('express').Router();
const { db, canAccessBook } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

function validate(body) {
  const { book_id, from_account, to_account, amount, transfer_date } = body;
  if (!book_id) return '账本不能为空';
  if (!from_account) return '请选择转出账户';
  if (!to_account) return '请选择转入账户';
  if (String(from_account) === String(to_account)) return '转出与转入账户不能相同';
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return '金额必须大于0';
  if (!transfer_date) return '日期不能为空';
  return null;
}

function resolveMemberId(bookId, memberId, fallbackUserId) {
  if (!memberId) return fallbackUserId;
  const mid = Number(memberId);
  if (!mid) return fallbackUserId;
  const owner = db.prepare('SELECT 1 FROM books WHERE id = ? AND user_id = ?').get(bookId, mid);
  if (owner) return mid;
  const member = db.prepare('SELECT 1 FROM book_members WHERE book_id = ? AND user_id = ?').get(bookId, mid);
  return member ? mid : fallbackUserId;
}

// 详情
router.get('/:id', (req, res) => {
  const row = db.prepare(`SELECT t.*, u.nickname AS member_nickname, u.username AS member_username, u.avatar AS member_avatar
    FROM transfers t LEFT JOIN users u ON u.id = t.member_id WHERE t.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: '转账记录不存在' });
  if (!canAccessBook(req.user.id, row.book_id)) return res.status(403).json({ error: '无权访问' });
  res.json(row);
});

// 新增
router.post('/', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const { book_id, from_account, to_account, amount, note, transfer_date, member_id, client_id } = req.body;
  if (!canAccessBook(req.user.id, book_id)) return res.status(403).json({ error: '无权访问该账本' });
  const mid = resolveMemberId(book_id, member_id, req.user.id);
  // 幂等：离线/弱网重试带着同一个 client_id 时，返回已写入的记录，不重复插入
  if (client_id) {
    const exist = db.prepare('SELECT id FROM transfers WHERE client_id = ?').get(String(client_id));
    if (exist) return res.json({ id: exist.id, ok: true, duplicated: true });
  }
  const info = db.prepare(`INSERT INTO transfers
    (user_id, book_id, transfer_date, from_account, to_account, amount, member_id, note, client_id)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(req.user.id, book_id, transfer_date, from_account, to_account, Number(amount).toFixed(2), mid, note || '', client_id ? String(client_id) : null);
  res.json({ id: info.lastInsertRowid, ok: true });
});

// 编辑
router.put('/:id', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const row = db.prepare('SELECT * FROM transfers WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '转账记录不存在' });
  if (!canAccessBook(req.user.id, row.book_id)) return res.status(403).json({ error: '无权访问' });
  const { book_id, from_account, to_account, amount, note, transfer_date, member_id } = req.body;
  const mid = resolveMemberId(book_id, member_id, req.user.id);
  db.prepare(`UPDATE transfers SET book_id=?, transfer_date=?, from_account=?, to_account=?, amount=?, member_id=?, note=? WHERE id=?`)
    .run(book_id, transfer_date, from_account, to_account, Number(amount).toFixed(2), mid, note || '', req.params.id);
  res.json({ ok: true });
});

// 删除
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM transfers WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '转账记录不存在' });
  if (!canAccessBook(req.user.id, row.book_id)) return res.status(403).json({ error: '无权访问' });
  db.prepare('DELETE FROM transfers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
