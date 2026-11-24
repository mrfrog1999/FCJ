const router = require('express').Router();
const { db, canAccessBook } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

function bookFilter(req, reqBookId) {
  const bookId = reqBookId || req.query.book_id;
  let base;
  if (bookId) {
    if (!canAccessBook(req.user.id, bookId)) return null;
    base = { sql: ' AND r.book_id = ?', params: [bookId] };
  } else {
    base = {
      sql: ' AND (r.book_id IN (SELECT id FROM books WHERE user_id = ?) OR r.book_id IN (SELECT book_id FROM book_members WHERE user_id = ?))',
      params: [req.user.id, req.user.id]
    };
  }
  // 按成员筛选（归属成员优先取 member_id，兼容历史数据回落创建者）
  if (req.query.member_id) {
    return { sql: base.sql + ' AND COALESCE(r.member_id, r.user_id) = ?', params: [...base.params, Number(req.query.member_id)] };
  }
  return base;
}

// 月度汇总：收入、支出、结余
router.get('/summary', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const bf = bookFilter(req);
  if (!bf) return res.status(403).json({ error: '无权访问' });
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN r.type='income' THEN r.amount ELSE 0 END),0) AS income,
      COALESCE(SUM(CASE WHEN r.type='expense' THEN r.amount ELSE 0 END),0) AS expense,
      COUNT(*) AS count
    FROM records r WHERE r.record_date LIKE ? ${bf.sql}
  `).get(month + '%', ...bf.params);
  res.json({ month, income: +row.income.toFixed(2), expense: +row.expense.toFixed(2), balance: +(row.income - row.expense).toFixed(2), count: row.count });
});

// 分类占比
router.get('/category', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const type = req.query.type || 'expense';
  const bf = bookFilter(req);
  if (!bf) return res.status(403).json({ error: '无权访问' });
  const rows = db.prepare(`
    SELECT c.id, c.name, c.icon, c.color, SUM(r.amount) AS total
    FROM records r LEFT JOIN categories c ON c.id = r.category_id
    WHERE r.record_date LIKE ? AND r.type = ? ${bf.sql}
    GROUP BY c.id ORDER BY total DESC
  `).all(month + '%', type, ...bf.params);
  res.json(rows.map(r => ({ ...r, total: +r.total.toFixed(2) })));
});

// 近 N 个月趋势
router.get('/trend', (req, res) => {
  const months = Math.min(Number(req.query.months) || 6, 24);
  const bf = bookFilter(req);
  if (!bf) return res.status(403).json({ error: '无权访问' });
  const rows = db.prepare(`
    SELECT substr(r.record_date,1,7) AS month,
      SUM(CASE WHEN r.type='income' THEN r.amount ELSE 0 END) AS income,
      SUM(CASE WHEN r.type='expense' THEN r.amount ELSE 0 END) AS expense
    FROM records r
    WHERE r.record_date >= date('now','localtime','-${months - 1} months','start of month') ${bf.sql}
    GROUP BY month ORDER BY month ASC
  `).all(...bf.params);
  res.json(rows.map(r => ({ month: r.month, income: +r.income.toFixed(2), expense: +r.expense.toFixed(2) })));
});

// 通用分组统计：图表详情页使用
// 支持 group_by = category | category2 | account | merchant | project | member
// 支持时间范围(range=all/today/week/month/quarter/year/custom + start/end) 与各维度筛选
router.get('/group', (req, res) => {
  const bf = bookFilter(req);
  if (!bf) return res.status(403).json({ error: '无权访问' });

  const type = ['expense', 'income'].includes(req.query.type) ? req.query.type : 'expense';
  const groupBy = ['category', 'category2', 'account', 'merchant', 'project', 'member'].includes(req.query.group_by)
    ? req.query.group_by : 'category';

  // 分组字段表达式
  const groupExpr = {
    category: 'c.id',
    category2: 'COALESCE(NULLIF(r.category2, \'\'), r.category1)',
    account: 'r.account',
    merchant: 'r.merchant',
    project: 'r.project',
    member: 'COALESCE(r.member_id, r.user_id)'
  }[groupBy];

  // 名称/图标/颜色表达式
  const nameExpr = {
    category: 'COALESCE(c.name, \'未分类\')',
    category2: 'COALESCE(NULLIF(r.category2, \'\'), r.category1, \'未分类\')',
    account: 'COALESCE(r.account, \'未指定账户\')',
    merchant: 'COALESCE(NULLIF(r.merchant, \'\'), \'未指定商家\')',
    project: 'COALESCE(NULLIF(r.project, \'\'), \'未指定项目\')',
    member: 'COALESCE(u.nickname, u.username, \'未指定成员\')'
  }[groupBy];
  const iconExpr = groupBy === 'category' ? 'c.icon' : "''";
  const colorExpr = groupBy === 'category' ? 'c.color' : "''";

  let sql = `SELECT ${groupExpr} AS gid, ${nameExpr} AS name,
      ${iconExpr} AS icon, ${colorExpr} AS color,
      SUM(r.amount) AS total, COUNT(*) AS cnt
    FROM records r
    LEFT JOIN categories c ON c.id = r.category_id
    LEFT JOIN users u ON u.id = COALESCE(r.member_id, r.user_id)
    WHERE r.type = ? ${bf.sql}`;
  const params = [type, ...bf.params];

  // 时间范围
  const range = req.query.range || 'all';
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let dateFilter = null;
  if (range === 'today') {
    dateFilter = { op: '=', v: ymd(today) };
  } else if (range === 'custom') {
    const start = req.query.start_date, end = req.query.end_date;
    if (start && end) { sql += ' AND r.record_date BETWEEN ? AND ?'; params.push(start, end); }
    else if (start) { sql += ' AND r.record_date >= ?'; params.push(start); }
    else if (end) { sql += ' AND r.record_date <= ?'; params.push(end); }
  } else if (range !== 'all') {
    // week/month/quarter/year：从区间起始日到今天
    let start;
    if (range === 'week') {
      const d = new Date(today); const day = (d.getDay() + 6) % 7; // 周一为起点
      d.setDate(d.getDate() - day); start = d;
    } else if (range === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (range === 'quarter') {
      start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    } else if (range === 'year') {
      start = new Date(today.getFullYear(), 0, 1);
    }
    if (start) { sql += ' AND r.record_date >= ?'; params.push(ymd(start)); }
  }
  if (dateFilter) { sql += ' AND r.record_date ' + dateFilter.op + ' ?'; params.push(dateFilter.v); }

  // 各维度筛选
  if (req.query.category_id) { sql += ' AND r.category_id = ?'; params.push(Number(req.query.category_id)); }
  if (req.query.account) { sql += ' AND r.account = ?'; params.push(String(req.query.account)); }
  if (req.query.member_id) { /* bookFilter 已处理 */ }
  if (req.query.project) { sql += ' AND r.project = ?'; params.push(String(req.query.project)); }
  if (req.query.merchant) { sql += ' AND r.merchant = ?'; params.push(String(req.query.merchant)); }
  if (req.query.min_amount) { sql += ' AND r.amount >= ?'; params.push(Number(req.query.min_amount)); }
  if (req.query.max_amount) { sql += ' AND r.amount <= ?'; params.push(Number(req.query.max_amount)); }
  if (req.query.note) { sql += ' AND r.note LIKE ?'; params.push('%' + String(req.query.note) + '%'); }

  // 排除空分组（商家/项目未指定时通常不展示）
  if (groupBy === 'merchant' || groupBy === 'project') {
    sql += ` AND ${groupExpr} IS NOT NULL AND ${groupExpr} != ''`;
  }

  sql += ` GROUP BY ${groupExpr} ORDER BY total DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(r => ({ id: r.gid, name: r.name, icon: r.icon || '', color: r.color || '', total: +r.total.toFixed(2), count: r.cnt })));
});

// 筛选可选项：账户 / 分类 / 商家 / 项目（供筛选抽屉下拉用；成员与分类前端已有）
router.get('/filter-options', (req, res) => {
  const bf = bookFilter(req);
  if (!bf) return res.status(403).json({ error: '无权访问' });
  const pick = col => db.prepare(`SELECT DISTINCT ${col} AS v FROM records r WHERE ${col} IS NOT NULL AND ${col} != '' ${bf.sql}`).all(...bf.params).map(x => x.v).sort();
  const categories = db.prepare(`SELECT c.id, c.name, c.type FROM categories c WHERE c.user_id = ? ORDER BY c.sort`).all(req.user.id);
  res.json({ categories, accounts: pick('r.account'), merchants: pick('r.merchant'), projects: pick('r.project') });
});

// 按日汇总（用于明细页顶部或日历）
router.get('/daily', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const bf = bookFilter(req);
  if (!bf) return res.status(403).json({ error: '无权访问' });
  const rows = db.prepare(`
    SELECT r.record_date AS date,
      SUM(CASE WHEN r.type='income' THEN r.amount ELSE 0 END) AS income,
      SUM(CASE WHEN r.type='expense' THEN r.amount ELSE 0 END) AS expense
    FROM records r WHERE r.record_date LIKE ? ${bf.sql}
    GROUP BY r.record_date ORDER BY r.record_date DESC
  `).all(month + '%', ...bf.params);
  res.json(rows);
});

// 预算：获取/设置
router.get('/budget', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const bookId = req.query.book_id;
  if (!bookId) return res.json(null);
  const row = db.prepare('SELECT amount FROM budgets WHERE user_id=? AND book_id=? AND month=?')
    .get(req.user.id, bookId, month);
  res.json(row ? row.amount : null);
});

router.post('/budget', (req, res) => {
  const { book_id, month, amount } = req.body;
  if (!book_id || !month || amount == null) return res.status(400).json({ error: '参数不完整' });
  if (!canAccessBook(req.user.id, book_id)) return res.status(403).json({ error: '无权访问' });
  db.prepare(`INSERT INTO budgets (user_id, book_id, month, amount) VALUES (?,?,?,?)
    ON CONFLICT(user_id, book_id, month) DO UPDATE SET amount = excluded.amount`)
    .run(req.user.id, book_id, month, Number(amount).toFixed(2));
  res.json({ ok: true });
});

module.exports = router;
