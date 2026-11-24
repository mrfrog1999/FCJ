const router = require('express').Router();
const { db, canAccessBook } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// 账本访问范围：返回各表的 WHERE 片段
function scopes(req, bookId) {
  if (bookId) {
    if (!canAccessBook(req.user.id, bookId)) return null;
    const w = ' WHERE book_id = ' + Number(bookId);
    return { rec: w, tr: w, adj: w };
  }
  const uid = Number(req.user.id);
  const w = ` WHERE (book_id IN (SELECT id FROM books WHERE user_id=${uid}) OR book_id IN (SELECT book_id FROM book_members WHERE user_id=${uid}))`;
  return { rec: w, tr: w, adj: w };
}

// 负债账户识别：信用卡/花呗/白条/贷款等。负债账户的“余额”代表欠款值，
// 记账方向与资产账户相反（随手记官方规则）：
//   刷卡消费(支出) -> 欠款增加；还款(转入) -> 欠款减少；退款(收入) -> 欠款减少。
const LIABILITY_RE = /信用卡|花呗|白条|贷款|借呗|分期|欠款|借入|车贷|房贷/;
function isLiability(account) { return LIABILITY_RE.test(account || ''); }

// 计算某笔流水对「账户余额」的影响 delta（随手记官方口径）
// flow: income/expense/transfer_in/transfer_out/balance_change/debt_change
function balanceDelta(flow, amount, account) {
  const a = Number(amount || 0);
  if (flow === 'balance_change' || flow === 'debt_change') return a; // 调整本身就是带符号的增减量
  const sign = isLiability(account) ? -1 : 1;
  // income / transfer_in 增加资产（负债账户则减少欠款）；expense / transfer_out 相反
  const positive = (flow === 'income' || flow === 'transfer_in');
  return positive ? sign * a : -sign * a;
}

// 账户列表：资产账户余额 = 收入-支出-转出+转入+调整；负债账户欠款 = 支出-收入+转出-转入+调整
router.get('/', (req, res) => {
  const sc = scopes(req, req.query.book_id);
  if (!sc) return res.status(403).json({ error: '无权访问' });

  const recRows = db.prepare(`SELECT account, type, SUM(amount) amt, COUNT(*) cnt
    FROM records ${sc.rec} AND account IS NOT NULL AND account<>'' GROUP BY account, type`).all();
  const trRows = db.prepare(`SELECT from_account, to_account, amount FROM transfers ${sc.tr}`).all();
  const adjRows = db.prepare(`SELECT account, amount, kind FROM adjustments ${sc.adj}`).all();

  const map = new Map();
  const ensure = a => {
    if (!map.has(a)) map.set(a, { account: a, balance: 0, inCount: 0, outCount: 0, adjustCount: 0 });
    return map.get(a);
  };
  recRows.forEach(r => {
    const e = ensure(r.account);
    e.balance += balanceDelta(r.type, r.amt, r.account);
    // 真实收支笔数（转账不计入）
    if (r.type === 'income') e.inCount += r.cnt; else e.outCount += r.cnt;
  });
  trRows.forEach(t => {
    const f = ensure(t.from_account), to = ensure(t.to_account);
    f.balance += balanceDelta('transfer_out', t.amount, t.from_account);
    to.balance += balanceDelta('transfer_in', t.amount, t.to_account);
    f.outCount += 1; to.inCount += 1;
  });
  adjRows.forEach(a => {
    const e = ensure(a.account);
    e.balance += balanceDelta(a.kind === 'debt' ? 'debt_change' : 'balance_change', a.amount, a.account);
    e.adjustCount += 1;
  });

  // 读取账户展示元数据（排序/显示名/图标/备注）
  let metaMap = new Map();
  if (req.query.book_id) {
    const mRows = db.prepare('SELECT account, display_name, icon, color, note, category, sort FROM account_meta WHERE book_id = ?').all(Number(req.query.book_id));
    mRows.forEach(m => metaMap.set(m.account, m));
  }

  const list = [...map.values()].map(e => {
    const m = metaMap.get(e.account) || {};
    return {
      account: e.account,
      balance: +e.balance.toFixed(2),
      inCount: e.inCount, outCount: e.outCount, adjustCount: e.adjustCount,
      count: e.inCount + e.outCount + e.adjustCount,
      kind: isLiability(e.account) ? 'liability' : 'asset',
      display_name: m.display_name || null,
      icon: m.icon || null,
      color: m.color || null,
      note: m.note || '',
      category: m.category || null,
      sort: m.sort == null ? null : m.sort
    };
  }).filter(e => e.count > 0);

  // 有自定义排序的按 sort 升序（排在前），未排序的按余额绝对值降序（排在后）
  list.sort((a, b) => {
    const ha = a.sort != null, hb = b.sort != null;
    if (ha && hb) return a.sort - b.sort;
    if (ha) return -1;
    if (hb) return 1;
    return Math.abs(b.balance) - Math.abs(a.balance);
  });

  res.json(list);
});

// 保存账户排序：接收账户名有序数组，按索引写入 sort
router.post('/sort', (req, res) => {
  const bookId = Number(req.body.book_id);
  if (!bookId || !canAccessBook(req.user.id, bookId)) return res.status(403).json({ error: '无权访问' });
  const names = Array.isArray(req.body.accounts) ? req.body.accounts : [];
  const upsert = db.prepare(`INSERT INTO account_meta (book_id, account, sort)
    VALUES (?,?,?)
    ON CONFLICT(book_id, account) DO UPDATE SET sort=excluded.sort`);
  const tx = db.transaction(() => { names.forEach((name, i) => upsert.run(bookId, String(name), i)); });
  tx();
  res.json({ ok: true });
});

// 编辑账户展示信息：显示名、图标、颜色、备注
router.post('/meta', (req, res) => {
  const bookId = Number(req.body.book_id);
  if (!bookId || !canAccessBook(req.user.id, bookId)) return res.status(403).json({ error: '无权访问' });
  const account = String(req.body.account || '');
  if (!account) return res.status(400).json({ error: '缺少账户名' });
  const dName = req.body.display_name == null ? null : String(req.body.display_name).trim() || null;
  const icon = req.body.icon == null ? null : String(req.body.icon).trim() || null;
  const color = req.body.color == null ? null : String(req.body.color).trim() || null;
  const note = req.body.note == null ? '' : String(req.body.note).trim();
  const category = req.body.category == null ? null : String(req.body.category).trim() || null;
  db.prepare(`INSERT INTO account_meta (book_id, account, display_name, icon, color, note, category)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(book_id, account) DO UPDATE SET
      display_name=excluded.display_name, icon=excluded.icon, color=excluded.color, note=excluded.note, category=excluded.category`)
    .run(bookId, account, dName, icon, color, note, category);
  res.json({ ok: true });
});

// 账户明细：收支 + 转账 + 调整三类流水
router.get('/detail', (req, res) => {
  const account = req.query.account;
  if (!account) return res.status(400).json({ error: '缺少账户名' });
  const sc = scopes(req, req.query.book_id);
  if (!sc) return res.status(403).json({ error: '无权访问' });
  const month = req.query.month || '';
  const liab = isLiability(account);

  const recs = db.prepare(`SELECT r.id, r.record_date AS date, r.type AS flow, r.amount, r.note,
      r.category1, r.category2, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
      u.nickname AS member_nickname, u.username AS member_username, u.avatar AS member_avatar
    FROM records r
    LEFT JOIN categories c ON c.id=r.category_id
    LEFT JOIN users u ON u.id=COALESCE(r.member_id,r.user_id)
    ${sc.rec} AND r.account=? ${month ? 'AND r.record_date LIKE ?' : ''}
    ORDER BY r.record_date DESC`).all(...(month ? [account, month + '%'] : [account]));

  const trans = db.prepare(`SELECT t.id, transfer_date AS date,
      CASE WHEN from_account=? THEN 'transfer_out' ELSE 'transfer_in' END AS flow,
      amount, note, from_account, to_account,
      u.nickname AS member_nickname, u.username AS member_username, u.avatar AS member_avatar
    FROM transfers t LEFT JOIN users u ON u.id=t.member_id
    ${sc.tr} AND (from_account=? OR to_account=?) ${month ? 'AND transfer_date LIKE ?' : ''}
    ORDER BY transfer_date DESC`).all(...(month ? [account, account, account, month + '%'] : [account, account, account]));

  const adjs = db.prepare(`SELECT a.id, adj_date AS date,
      CASE WHEN kind='debt' THEN 'debt_change' ELSE 'balance_change' END AS flow,
      amount, note, account,
      u.nickname AS member_nickname, u.username AS member_username, u.avatar AS member_avatar
    FROM adjustments a LEFT JOIN users u ON u.id=a.member_id
    ${sc.adj} AND a.account=? ${month ? 'AND adj_date LIKE ?' : ''}
    ORDER BY adj_date DESC`).all(...(month ? [account, month + '%'] : [account]));

  // 为每条流水附加 delta（对账户余额的实际影响，已按资产/负债账户调整符号）
  const all = [...recs, ...trans, ...adjs].map(f => ({ ...f, delta: balanceDelta(f.flow, f.amount, account) }));
  all.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  // 收支汇总只统计真实收支（转账不计入收入/支出）；net 为该账户全部流水的余额变动合计
  let income = 0, expense = 0, net = 0, transferIn = 0, transferOut = 0, adjust = 0;
  recs.forEach(r => { if (r.flow === 'income') income += r.amount; else expense += r.amount; });
  trans.forEach(t => { if (t.flow === 'transfer_in') transferIn += t.amount; else transferOut += t.amount; });
  adjs.forEach(a => { adjust += a.amount; });
  all.forEach(f => { net += f.delta; });

  res.json({
    account,
    kind: liab ? 'liability' : 'asset',
    summary: {
      income: +income.toFixed(2), expense: +expense.toFixed(2),
      transferIn: +transferIn.toFixed(2), transferOut: +transferOut.toFixed(2),
      adjust: +adjust.toFixed(2), net: +net.toFixed(2), count: all.length
    },
    flows: all
  });
});

module.exports = router;
