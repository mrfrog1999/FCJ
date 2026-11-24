const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { db, canAccessBook } = require('../db');
const { auth } = require('../middleware/auth');
const { buildBackupBuffer } = require('../utils/backupExport');

router.use(auth);

// 上传走内存，限制 30MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

// 分类图标与配色的简易推断（按一级分类关键字）
const CATEGORY_HINTS = [
  ['食品', 'utensils', '#ff7a45'], ['餐', 'utensils', '#ff7a45'], ['酒', 'utensils', '#ff7a45'],
  ['交通', 'car', '#36cfc9'], ['车', 'car', '#36cfc9'], ['油', 'car', '#36cfc9'],
  ['购物', 'shopping', '#ff85c0'], ['衣服', 'shopping', '#ff85c0'], ['饰品', 'shopping', '#ff85c0'],
  ['娱乐', 'gamepad', '#9254de'], ['休闲', 'gamepad', '#9254de'], ['旅游', 'plane', '#40a9ff'],
  ['居家', 'home', '#597ef7'], ['物业', 'home', '#597ef7'], ['房租', 'home', '#597ef7'],
  ['医疗', 'medical', '#ff4d4f'], ['保健', 'medical', '#ff4d4f'], ['医保', 'medical', '#ff4d4f'],
  ['学习', 'book', '#73d13d'], ['教育', 'book', '#73d13d'], ['书', 'book', '#73d13d'], ['进修', 'book', '#73d13d'],
  ['人情', 'gift', '#ffa940'], ['礼', 'gift', '#ffa940'],
  ['工资', 'wallet', '#52c41a'], ['收入', 'wallet', '#52c41a'], ['奖金', 'trophy', '#faad14'],
  ['通讯', 'phone', '#1890ff'], ['手机', 'phone', '#1890ff'],
  ['金融', 'chartup', '#1890ff'], ['理财', 'chartup', '#1890ff'], ['利息', 'chartup', '#1890ff'],
];
function guessCatStyle(group, name) {
  const text = `${group || ''}${name || ''}`;
  for (const [kw, icon, color] of CATEGORY_HINTS) {
    if (text.includes(kw)) return { icon, color };
  }
  return { icon: 'more', color: '#8c8c8c' };
}

const normDate = v => String(v == null ? '' : v).trim().replace(' ', 'T').slice(0, 19);

function sheetRows(wb, names) {
  const n = names.find(x => wb.SheetNames.includes(x));
  if (!n) return null;
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' });
  if (!rows.length) return null;
  const header = rows[0].map(x => String(x).trim());
  const idx = keys => {
    for (const k of keys) { const i = header.findIndex(h => h.includes(k)); if (i >= 0) return i; }
    return -1;
  };
  return { header, idx, rows };
}

function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });

  const parseRecords = (names, type) => {
    const s = sheetRows(wb, names);
    if (!s) return [];
    const ci = {
      date: s.idx(['日期']), group: s.idx(['一级分类']), sub: s.idx(['二级分类']),
      account: s.idx(['支出账户', '收入账户', '账户']), amount: s.idx(['金额']),
      member: s.idx(['成员']), merchant: s.idx(['商家']), project: s.idx(['项目']), note: s.idx(['备注']),
    };
    const out = [];
    for (let r = 1; r < s.rows.length; r++) {
      const row = s.rows[r];
      if (!row || row.every(v => v === '' || v == null)) continue;
      const val = i => (i >= 0 && row[i] != null ? row[i] : '');
      const amount = Number(val(ci.amount));
      if (!isFinite(amount) || amount === 0) continue;
      const date = normDate(val(ci.date));
      if (date.length < 10) continue;
      // 保留原始符号：随手记 xls 中支出/收入的负数表示退款、报销、红包等反向流水，
      // 例如支出 -1000 等价于收入 +1000。取绝对值会让账户余额、统计全部算错。
      out.push({
        date, type, amount,
        group: String(val(ci.group)).trim(), sub: String(val(ci.sub)).trim(),
        account: String(val(ci.account)).trim(), member: String(val(ci.member)).trim(),
        merchant: String(val(ci.merchant)).trim(), project: String(val(ci.project)).trim(),
        note: String(val(ci.note)).trim(),
      });
    }
    return out;
  };

  const parseTransfers = () => {
    const s = sheetRows(wb, ['转账', 'transfer']);
    if (!s) return [];
    const ci = {
      date: s.idx(['日期']), from: s.idx(['转出账户']), to: s.idx(['转入账户']),
      amount: s.idx(['金额']), member: s.idx(['成员']), note: s.idx(['备注']),
    };
    const out = [];
    for (let r = 1; r < s.rows.length; r++) {
      const row = s.rows[r];
      if (!row || row.every(v => v === '' || v == null)) continue;
      const val = i => (i >= 0 && row[i] != null ? row[i] : '');
      const amount = Number(val(ci.amount));
      const from = String(val(ci.from)).trim(), to = String(val(ci.to)).trim();
      const date = normDate(val(ci.date));
      if (!isFinite(amount) || amount === 0 || !from || !to || date.length < 10) continue;
      out.push({ date, amount: Math.abs(amount), from, to, member: String(val(ci.member)).trim(), note: String(val(ci.note)).trim() });
    }
    return out;
  };

  const parseAdjustments = (names, kind) => {
    const s = sheetRows(wb, names);
    if (!s) return [];
    const ci = {
      date: s.idx(['日期']), acc1: s.idx(['账户1', '账户']), acc2: s.idx(['账户2']),
      amount: s.idx(['金额']), member: s.idx(['成员']), note: s.idx(['备注']),
    };
    const out = [];
    for (let r = 1; r < s.rows.length; r++) {
      const row = s.rows[r];
      if (!row || row.every(v => v === '' || v == null)) continue;
      const val = i => (i >= 0 && row[i] != null ? row[i] : '');
      const amount = Number(val(ci.amount));
      const account = String(val(ci.acc1)).trim();
      const date = normDate(val(ci.date));
      if (!isFinite(amount) || amount === 0 || !account || date.length < 10) continue;
      out.push({ date, amount, account, to: String(val(ci.acc2)).trim(), kind, member: String(val(ci.member)).trim(), note: String(val(ci.note)).trim() });
    }
    return out;
  };

  return {
    sheets: wb.SheetNames,
    expense: parseRecords(['支出', 'expense'], 'expense'),
    income: parseRecords(['收入', 'income'], 'income'),
    transfers: parseTransfers(),
    adjustments: [...parseAdjustments(['余额变更'], 'balance'), ...parseAdjustments(['负债变更'], 'debt')],
  };
}

// 预览
router.post('/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择 xls 文件' });
  try {
    const d = parseWorkbook(req.file.buffer);
    const members = new Set(), cats = new Set();
    [...d.expense, ...d.income].forEach(r => {
      if (r.member) members.add(r.member);
      if (r.group || r.sub) cats.add(`${r.group}|${r.sub}`);
    });
    const known = ['支出', '收入', '转账', '余额变更', '负债变更', 'expense', 'income', 'transfer'];
    const skippedSheets = d.sheets.filter(s => !known.some(k => s.toLowerCase().includes(k.toLowerCase())));
    res.json({
      sheets: d.sheets,
      expenseCount: d.expense.length, incomeCount: d.income.length,
      transferCount: d.transfers.length, adjustmentCount: d.adjustments.length,
      memberCount: members.size, members: [...members], categoryCount: cats.size,
      skippedSheets,
    });
  } catch (e) { res.status(400).json({ error: '解析失败：' + e.message }); }
});

// 导入
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择 xls 文件' });
  const bookId = req.body.book_id || req.query.book_id;
  if (!bookId || !canAccessBook(req.user.id, bookId)) return res.status(403).json({ error: '无权访问该账本' });
  const mode = req.body.mode === 'replace' ? 'replace' : 'append';
  let d;
  try { d = parseWorkbook(req.file.buffer); }
  catch (e) { return res.status(400).json({ error: '解析失败：' + e.message }); }

  const owner = db.prepare('SELECT user_id FROM books WHERE id=?').get(bookId).user_id;

  const memberCache = new Map();
  function resolveMember(name) {
    const key = (name || '').trim();
    if (!key) return req.user.id;
    if (memberCache.has(key)) return memberCache.get(key);
    let u = db.prepare('SELECT id FROM users WHERE nickname=? OR username=?').get(key, key);
    if (!u) {
      const info = db.prepare('INSERT INTO users (username, password_hash, nickname) VALUES (?,?,?)')
        .run('bak_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), '$2a$08$' + 'x'.repeat(53), key);
      u = { id: info.lastInsertRowid };
    }
    db.prepare('INSERT OR IGNORE INTO book_members (book_id, user_id, role) VALUES (?,?,?)').run(bookId, u.id, 'member');
    memberCache.set(key, u.id);
    return u.id;
  }
  const catCache = new Map();
  function resolveCategory(type, group, sub) {
    const name = (sub || group || '未分类').trim();
    const key = type + '|' + (group || '') + '|' + name;
    if (catCache.has(key)) return catCache.get(key);
    let c = db.prepare('SELECT id FROM categories WHERE user_id=? AND type=? AND name=?').get(owner, type, name);
    if (!c) {
      const style = guessCatStyle(group, name);
      const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0) m FROM categories WHERE user_id=?').get(owner).m;
      const info = db.prepare('INSERT INTO categories (user_id, name, type, icon, color, sort, is_default) VALUES (?,?,?,?,?,?,0)')
        .run(owner, name, type, style.icon, style.color, maxSort + 1);
      c = { id: info.lastInsertRowid };
    }
    catCache.set(key, c.id);
    return c.id;
  }

  const insRec = db.prepare(`INSERT INTO records
    (user_id, book_id, category_id, type, amount, note, record_date, member_id, category1, category2, account, merchant, project)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insTr = db.prepare(`INSERT INTO transfers
    (user_id, book_id, transfer_date, from_account, to_account, amount, member_id, note)
    VALUES (?,?,?,?,?,?,?,?)`);
  const insAdj = db.prepare(`INSERT INTO adjustments
    (user_id, book_id, adj_date, account, amount, kind, member_id, note)
    VALUES (?,?,?,?,?,?,?,?)`);

  const run = db.transaction(() => {
    if (mode === 'replace') {
      db.prepare('DELETE FROM records WHERE book_id=?').run(bookId);
      db.prepare('DELETE FROM transfers WHERE book_id=?').run(bookId);
      db.prepare('DELETE FROM adjustments WHERE book_id=?').run(bookId);
    }
    const noteOf = r => {
      const parts = [];
      if (r.account) parts.push('账户:' + r.account);
      if (r.merchant) parts.push('商家:' + r.merchant);
      if (r.project) parts.push('项目:' + r.project);
      if (r.note) parts.push(r.note);
      return parts.join(' ');
    };
    d.expense.forEach(r => insRec.run(req.user.id, bookId, resolveCategory('expense', r.group, r.sub), 'expense',
      r.amount.toFixed(2), noteOf(r), r.date, resolveMember(r.member), r.group || null, r.sub || null, r.account || null, r.merchant || null, r.project || null));
    d.income.forEach(r => insRec.run(req.user.id, bookId, resolveCategory('income', r.group, r.sub), 'income',
      r.amount.toFixed(2), noteOf(r), r.date, resolveMember(r.member), r.group || null, r.sub || null, r.account || null, r.merchant || null, r.project || null));
    d.transfers.forEach(t => insTr.run(req.user.id, bookId, t.date, t.from, t.to, t.amount.toFixed(2), resolveMember(t.member), t.note));
    d.adjustments.forEach(a => insAdj.run(req.user.id, bookId, a.date, a.account, a.amount.toFixed(2), a.kind, resolveMember(a.member), a.note));
  });
  try { run(); }
  catch (e) { return res.status(500).json({ error: '导入失败：' + e.message }); }

  res.json({
    ok: true, mode,
    inserted: d.expense.length + d.income.length + d.transfers.length + d.adjustments.length,
    expense: d.expense.length, income: d.income.length,
    transfers: d.transfers.length, adjustments: d.adjustments.length,
    members: memberCache.size, categories: catCache.size,
  });
});

// 清空当前账本的全部流水（收支、转账、余额/负债变更），保留成员/分类/账户/预算
router.post('/clear', (req, res) => {
  const bookId = req.body.book_id || req.query.book_id;
  if (!bookId || !canAccessBook(req.user.id, bookId)) return res.status(403).json({ error: '无权访问该账本' });
  try {
    const counts = db.transaction(() => {
      const records = db.prepare('DELETE FROM records WHERE book_id=?').run(bookId).changes;
      const transfers = db.prepare('DELETE FROM transfers WHERE book_id=?').run(bookId).changes;
      const adjustments = db.prepare('DELETE FROM adjustments WHERE book_id=?').run(bookId).changes;
      return { records, transfers, adjustments };
    })();
    res.json({ ok: true, ...counts });
  } catch (e) { res.status(500).json({ error: '清空失败：' + e.message }); }
});

// 导出
router.get('/export', (req, res) => {
  try {
    const { buf, stamp } = buildBackupBuffer(req.user.id, req.query.book_id);
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="suisoji_backup_${stamp}.xls"`);
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: '导出失败：' + e.message });
  }
});

module.exports = router;
