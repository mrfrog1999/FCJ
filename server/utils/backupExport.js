// 共享备份导出逻辑：手动下载与定时邮件附件共用，保证 xls 格式完全一致
const XLSX = require('xlsx');
const { db, canAccessBook } = require('../db');

const pureNote = s => (s || '').replace(/(^|\s)(账户|商家|项目|备注):[^\s]*/g, '').trim();

// 生成工作簿（5 个工作表，与随手记备份格式完全一致）
function buildBackupWorkbook(userId, bookId) {
  const mkScope = alias => {
    const col = alias ? alias + '.book_id' : 'book_id';
    if (bookId && canAccessBook(userId, bookId)) return { sql: ` WHERE ${col} = ?`, params: [bookId] };
    return { sql: ` WHERE (${col} IN (SELECT id FROM books WHERE user_id=?) OR ${col} IN (SELECT book_id FROM book_members WHERE user_id=?))`, params: [userId, userId] };
  };
  const rs = mkScope('r'), ts = mkScope('t'), as = mkScope('a');
  const recs = db.prepare(`SELECT r.*, u.nickname AS member_nickname, u.username AS member_username FROM records r
    LEFT JOIN users u ON u.id=COALESCE(r.member_id,r.user_id) ${rs.sql} ORDER BY r.record_date DESC`).all(...rs.params);
  const trans = db.prepare(`SELECT t.*, u.nickname AS member_nickname FROM transfers t
    LEFT JOIN users u ON u.id=t.member_id ${ts.sql} ORDER BY t.transfer_date DESC`).all(...ts.params);
  const adjs = db.prepare(`SELECT a.*, u.nickname AS member_nickname FROM adjustments a
    LEFT JOIN users u ON u.id=a.member_id ${as.sql} ORDER BY a.adj_date DESC`).all(...as.params);

  const expHead = ['交易类型', '日期', '一级分类', '二级分类', '支出账户', '金额', '成员', '商家', '项目', '备注'];
  const incHead = ['交易类型', '日期', '一级分类', '二级分类', '收入账户', '金额', '成员', '商家', '项目', '备注'];
  const exp = [expHead], inc = [incHead];
  recs.forEach(r => {
    const arr = [r.type === 'expense' ? '支出' : '收入', (r.record_date || '').replace('T', ' '),
      r.category1 || '', r.category2 || '', r.account || '', Number(r.amount),
      r.member_nickname || r.member_username || '', r.merchant || '', r.project || '', pureNote(r.note)];
    (r.type === 'expense' ? exp : inc).push(arr);
  });
  const trHead = ['交易类型', '日期', '转出账户', '转入账户', '金额', '成员', '商家', '项目', '备注'];
  const tr = [trHead];
  trans.forEach(t => tr.push(['转账', (t.transfer_date || '').replace('T', ' '), t.from_account, t.to_account,
    Number(t.amount), t.member_nickname || '', '', '', t.note || '']));
  const adjHead = ['交易类型', '日期', '一级分类', '二级分类', '账户1', '账户2', '金额', '成员', '商家', '项目', '备注'];
  const bal = [adjHead], debt = [adjHead];
  adjs.forEach(a => {
    const arr = [a.kind === 'debt' ? '负债变更' : '余额变更', (a.adj_date || '').replace('T', ' '),
      '', '', a.account, a.to || '', Number(a.amount), a.member_nickname || '', '', '', a.note || ''];
    (a.kind === 'debt' ? debt : bal).push(arr);
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exp), '支出');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inc), '收入');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bal), '余额变更');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(debt), '负债变更');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tr), '转账');
  return wb;
}

// 生成 xls buffer 与文件名日期戳
function buildBackupBuffer(userId, bookId) {
  const wb = buildBackupWorkbook(userId, bookId);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'biff8' });
  const stamp = new Date().toISOString().slice(0, 10);
  return { buf, stamp };
}

module.exports = { buildBackupWorkbook, buildBackupBuffer };
