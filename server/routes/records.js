const router = require('express').Router();
const { db, canAccessBook } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

function validate(body) {
  const { book_id, type, amount, record_date } = body;
  if (!book_id) return '账本不能为空';
  if (!['expense', 'income'].includes(type)) return '类型不正确';
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return '金额必须大于0';
  if (!record_date) return '日期不能为空';
  return null;
}

// 校验 member_id 是否为该账本成员，非法则回落为当前用户
function resolveMemberId(bookId, memberId, fallbackUserId) {
  if (!memberId) return fallbackUserId;
  const mid = Number(memberId);
  if (!mid) return fallbackUserId;
  const owner = db.prepare('SELECT 1 FROM books WHERE id = ? AND user_id = ?').get(bookId, mid);
  if (owner) return mid;
  const member = db.prepare('SELECT 1 FROM book_members WHERE book_id = ? AND user_id = ?').get(bookId, mid);
  return member ? mid : fallbackUserId;
}

// 账单列表（支持按账本、月份、类型、成员筛选）
// with_transfers=1 时合并转账流水（转账不计收支，前端按 type='transfer' 特殊展示）
router.get('/', (req, res) => {
  const { book_id, month, type, member_id, limit, with_transfers } = req.query;
  let sql = `SELECT r.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
             b.name AS book_name,
             u.nickname AS member_nickname, u.username AS member_username, u.avatar AS member_avatar
             FROM records r
             LEFT JOIN categories c ON c.id = r.category_id
             LEFT JOIN books b ON b.id = r.book_id
             LEFT JOIN users u ON u.id = COALESCE(r.member_id, r.user_id)
             WHERE 1=1`;
  const params = [];

  if (book_id) {
    if (!canAccessBook(req.user.id, book_id)) return res.status(403).json({ error: '无权访问该账本' });
    sql += ' AND r.book_id = ?'; params.push(book_id);
  } else {
    // 仅返回有权访问的账本记录
    sql += ' AND (r.book_id IN (SELECT id FROM books WHERE user_id = ?) OR r.book_id IN (SELECT book_id FROM book_members WHERE user_id = ?))';
    params.push(req.user.id, req.user.id);
  }
  if (month) { sql += ' AND r.record_date LIKE ?'; params.push(month + '%'); }
  if (type) { sql += ' AND r.type = ?'; params.push(type); }
  if (member_id) {
    sql += ' AND COALESCE(r.member_id, r.user_id) = ?'; params.push(Number(member_id));
  }
  sql += ' ORDER BY r.record_date DESC, r.id DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }

  const rows = db.prepare(sql).all(...params);

  // 合并转账流水：转账在独立 transfers 表，仅在流水页请求时并入。
  // 统一映射为类 record 结构，type 记为 'transfer'，前端不计入收支汇总。
  if (with_transfers === '1' && type !== 'expense' && type !== 'income') {
    let ts = `SELECT t.id, t.transfer_date AS record_date, t.from_account, t.to_account, t.amount, t.note,
       t.member_id, t.book_id,
       u.nickname AS member_nickname, u.username AS member_username, u.avatar AS member_avatar
       FROM transfers t LEFT JOIN users u ON u.id = t.member_id WHERE 1=1`;
    const tp = [];
    if (book_id) {
      ts += ' AND t.book_id = ?'; tp.push(book_id);
    } else {
      ts += ' AND (t.book_id IN (SELECT id FROM books WHERE user_id = ?) OR t.book_id IN (SELECT book_id FROM book_members WHERE user_id = ?))';
      tp.push(req.user.id, req.user.id);
    }
    if (month) { ts += ' AND t.transfer_date LIKE ?'; tp.push(month + '%'); }
    if (member_id) { ts += ' AND COALESCE(t.member_id, t.user_id) = ?'; tp.push(Number(member_id)); }
    ts += ' ORDER BY t.transfer_date DESC, t.id DESC';
    const transfers = db.prepare(ts).all(...tp);
    for (const t of transfers) {
      rows.push({
        id: 'transfer_' + t.id,
        type: 'transfer',
        amount: t.amount,
        record_date: t.record_date,
        note: t.note || '',
        account: t.from_account || '',
        from_account: t.from_account || '',
        to_account: t.to_account || '',
        member_id: t.member_id,
        member_nickname: t.member_nickname,
        member_username: t.member_username,
        member_avatar: t.member_avatar,
        category_name: '转账',
        category1: '转账',
        category2: '',
        book_id: t.book_id
      });
    }
    rows.sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));
  }
  res.json(rows);
});

// 单条详情
router.get('/:id', (req, res) => {
  const row = db.prepare(`SELECT r.*, u.nickname AS member_nickname, u.username AS member_username, u.avatar AS member_avatar
    FROM records r LEFT JOIN users u ON u.id = COALESCE(r.member_id, r.user_id)
    WHERE r.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: '记录不存在' });
  if (!canAccessBook(req.user.id, row.book_id)) return res.status(403).json({ error: '无权访问' });
  res.json(row);
});

// 新增
router.post('/', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const { book_id, category_id, type, amount, note, record_date, member_id, account, category1, category2, merchant, project, client_id } = req.body;
  if (!canAccessBook(req.user.id, book_id)) return res.status(403).json({ error: '无权写入该账本' });
  const memberId = resolveMemberId(book_id, member_id, req.user.id);
  // 幂等：离线/弱网重试带着同一个 client_id 时，返回已写入的记录，不重复插入
  if (client_id) {
    const exist = db.prepare('SELECT id FROM records WHERE client_id = ?').get(String(client_id));
    if (exist) return res.json({ id: exist.id, duplicated: true });
  }
  const info = db.prepare(`
    INSERT INTO records (user_id, book_id, category_id, type, amount, note, record_date, member_id, account, category1, category2, merchant, project, client_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(req.user.id, book_id, category_id || null, type, Number(amount).toFixed(2), note || '', record_date, memberId,
    account || '', category1 || '', category2 || '', merchant || '', project || '', client_id ? String(client_id) : null);
  res.json({ id: info.lastInsertRowid });
});

// 更新
router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '记录不存在' });
  if (!canAccessBook(req.user.id, row.book_id)) return res.status(403).json({ error: '无权操作' });
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const { book_id, category_id, type, amount, note, record_date, member_id, account, category1, category2, merchant, project } = req.body;
  const memberId = resolveMemberId(book_id, member_id, row.user_id || req.user.id);
  db.prepare(`
    UPDATE records SET book_id=?, category_id=?, type=?, amount=?, note=?, record_date=?, member_id=?,
      account=?, category1=?, category2=?, merchant=?, project=?,
      updated_at = datetime('now','localtime') WHERE id=?
  `).run(book_id, category_id || null, type, Number(amount).toFixed(2), note || '', record_date, memberId,
    account || '', category1 || '', category2 || '', merchant || '', project || '', req.params.id);
  res.json({ ok: true });
});

// 删除
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '记录不存在' });
  if (!canAccessBook(req.user.id, row.book_id)) return res.status(403).json({ error: '无权操作' });
  db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
