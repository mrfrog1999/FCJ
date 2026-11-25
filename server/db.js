const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'suisoji.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT,
    avatar TEXT,
    bind_member_id INTEGER,
    theme TEXT DEFAULT 'fancy',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS book_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(book_id, user_id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    color TEXT DEFAULT '#ff7a45',
    sort INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    group_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- 一级分类（实体化，可增删改；二级分类通过 categories.group_id 归属）
  CREATE TABLE IF NOT EXISTS category_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    icon TEXT DEFAULT 'more',
    sort INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    UNIQUE(user_id, name, type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    category_id INTEGER,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    record_date TEXT NOT NULL,
    member_id INTEGER,
    category1 TEXT,
    category2 TEXT,
    account TEXT,
    merchant TEXT,
    project TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(user_id, book_id, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  -- 账户间转账（不影响总收支/净资产）
  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    transfer_date TEXT NOT NULL,
    from_account TEXT NOT NULL,
    to_account TEXT NOT NULL,
    amount REAL NOT NULL,
    member_id INTEGER,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  -- 余额 / 负债变更（对账户余额的直接调整，影响净资产）
  CREATE TABLE IF NOT EXISTS adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    adj_date TEXT NOT NULL,
    account TEXT NOT NULL,
    amount REAL NOT NULL,
    kind TEXT DEFAULT 'balance',
    member_id INTEGER,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  -- 账户展示元数据：持久化账户自定义排序、显示名、图标（账户本身仍从流水动态聚合）
  CREATE TABLE IF NOT EXISTS account_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    account TEXT NOT NULL,
    display_name TEXT,
    icon TEXT,
    color TEXT,
    note TEXT DEFAULT '',
    category TEXT,
    sort INTEGER DEFAULT 0,
    hidden INTEGER DEFAULT 0,
    UNIQUE(book_id, account),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_records_user_date ON records(user_id, record_date);
  CREATE INDEX IF NOT EXISTS idx_records_book ON records(book_id);
  CREATE INDEX IF NOT EXISTS idx_members_user ON book_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_account_meta_book ON account_meta(book_id);
`);

const DEFAULT_EXPENSE = [
  ['餐饮', 'utensils', '#ff7a45'], ['交通', 'car', '#36cfc9'], ['购物', 'shopping', '#ff85c0'],
  ['娱乐', 'gamepad', '#9254de'], ['居家', 'home', '#597ef7'], ['医疗', 'medical', '#ff4d4f'],
  ['教育', 'book', '#73d13d'], ['人情', 'gift', '#ffa940'], ['旅行', 'plane', '#40a9ff'],
  ['其他', 'more', '#bfbfbf']
];
const DEFAULT_INCOME = [
  ['工资', 'wallet', '#52c41a'], ['奖金', 'trophy', '#faad14'], ['理财', 'chartup', '#1890ff'],
  ['兼职', 'briefcase', '#722ed1'], ['红包', 'redpacket', '#ff4d4f'], ['其他', 'more', '#bfbfbf']
];

// 按分类中文名映射到简约图标名（用于迁移历史 emoji 数据）
const ICON_BY_NAME = {
  '餐饮': 'utensils', '交通': 'car', '购物': 'shopping', '娱乐': 'gamepad', '居家': 'home',
  '医疗': 'medical', '教育': 'book', '人情': 'gift', '旅行': 'plane', '其他': 'more',
  '工资': 'wallet', '奖金': 'trophy', '理财': 'chartup', '兼职': 'briefcase', '红包': 'redpacket'
};

function seedDefaults(userId) {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM categories WHERE user_id = ?').get(userId);
  if (existing.c > 0) return;
  const ins = db.prepare('INSERT INTO categories (user_id, name, type, icon, color, sort, is_default) VALUES (?,?,?,?,?,?,1)');
  const tx = db.transaction(() => {
    DEFAULT_EXPENSE.forEach((c, i) => ins.run(userId, c[0], 'expense', c[1], c[2], i));
    DEFAULT_INCOME.forEach((c, i) => ins.run(userId, c[0], 'income', c[1], c[2], i));
    db.prepare('INSERT OR IGNORE INTO books (user_id, name, invite_code) VALUES (?,?,?)')
      .run(userId, '日常账本', Math.random().toString(36).slice(2, 10).toUpperCase());
    const book = db.prepare('SELECT id FROM books WHERE user_id = ? ORDER BY id LIMIT 1').get(userId);
    db.prepare('INSERT OR IGNORE INTO book_members (book_id, user_id, role) VALUES (?,?,?)').run(book.id, userId, 'owner');
  });
  tx();
}

function canAccessBook(userId, bookId) {
  const owner = db.prepare('SELECT 1 FROM books WHERE id = ? AND user_id = ?').get(bookId, userId);
  if (owner) return true;
  const member = db.prepare('SELECT 1 FROM book_members WHERE book_id = ? AND user_id = ?').get(bookId, userId);
  return !!member;
}

// 一次性迁移：users 增加 is_admin（管理员标识，与登录名解耦，登录名可修改）
function migrateUserIsAdmin() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!cols.includes('is_admin')) {
    db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
    // 已有库：原管理员账号标记为管理员
    db.exec("UPDATE users SET is_admin = 1 WHERE username = 'admin'");
  }
}
migrateUserIsAdmin();

// 默认管理员账号：admin / admin123321（每次启动确保存在，密码重置为初始值）
// 注意：不再覆盖 nickname / avatar / username，否则管理员修改的资料会在重启后丢失
// 管理员身份由 is_admin 标识，与登录名解耦，因此登录名可以修改
function seedAdmin() {
  const hash = bcrypt.hashSync('admin123321', 8);
  let exist = db.prepare('SELECT id FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1').get();
  if (exist) {
    db.prepare('UPDATE users SET password_hash = ?, is_admin = 1 WHERE id = ?').run(hash, exist.id);
    seedDefaults(exist.id);
  } else {
    const info = db.prepare('INSERT INTO users (username, password_hash, nickname, is_admin) VALUES (?,?,?,1)')
      .run('admin', hash, '管理员');
    seedDefaults(info.lastInsertRowid);
  }
}
// 一次性迁移：users 增加 avatar（头像，存 data URL 或空），兼容已有库
function migrateUserAvatar() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!cols.includes('avatar')) {
    db.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
  }
}
migrateUserAvatar();
// 一次性迁移：users 增加 bind_member_id（账号关联的记账成员），null 表示未关联（记在自己名下）
function migrateUserBindMember() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!cols.includes('bind_member_id')) {
    db.exec('ALTER TABLE users ADD COLUMN bind_member_id INTEGER');
  }
}
migrateUserBindMember();
// 一次性迁移：users 增加 theme（图标主题：standard 标准 / fancy 炫彩，默认炫彩）
function migrateUserTheme() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!cols.includes('theme')) {
    db.exec("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'fancy'");
    db.exec("UPDATE users SET theme = 'fancy' WHERE theme IS NULL OR theme = ''");
  }
}
migrateUserTheme();
// 一次性迁移：把历史 emoji 图标按分类名转成简约图标标识
function migrateIcons() {
  const rows = db.prepare('SELECT id, name, icon FROM categories').all();
  const upd = db.prepare('UPDATE categories SET icon = ? WHERE id = ?');
  const tx = db.transaction(() => {
    rows.forEach(r => {
      if (ICON_BY_NAME[r.name]) upd.run(ICON_BY_NAME[r.name], r.id);
    });
  });
  tx();
}
migrateIcons();
// 一次性迁移：records 增加 member_id（归属成员），历史记录回填为创建者
function migrateRecordMember() {
  const cols = db.prepare('PRAGMA table_info(records)').all().map(c => c.name);
  if (!cols.includes('member_id')) {
    db.exec('ALTER TABLE records ADD COLUMN member_id INTEGER');
  }
  db.exec('UPDATE records SET member_id = user_id WHERE member_id IS NULL');
}
migrateRecordMember();
// 一次性迁移：备份导入所需的扩展字段
function migrateRecordBackupFields() {
  const cols = db.prepare('PRAGMA table_info(records)').all().map(c => c.name);
  const add = c => { if (!cols.includes(c)) db.exec('ALTER TABLE records ADD COLUMN ' + c + ' TEXT'); };
  ['category1', 'category2', 'account', 'merchant', 'project'].forEach(add);
}
migrateRecordBackupFields();
seedAdmin();

// 一次性迁移：categories 增加 group_id（兼容旧库）
function migrateCategoryGroup() {
  const cols = db.prepare('PRAGMA table_info(categories)').all().map(c => c.name);
  if (!cols.includes('group_id')) db.exec('ALTER TABLE categories ADD COLUMN group_id INTEGER');

  // 对每个用户：从记录反查「二级分类名 -> 一级名」映射，建立一级分类并回填 group_id
  const users = db.prepare('SELECT DISTINCT user_id AS uid FROM categories').all().map(r => r.uid);
  const ensureGroup = db.prepare('INSERT OR IGNORE INTO category_groups (user_id, name, type, icon, sort, is_default) VALUES (?,?,?,?,?,0)');
  const findGroup = db.prepare('SELECT id FROM category_groups WHERE user_id=? AND name=? AND type=?');
  const linkCat = db.prepare('UPDATE categories SET group_id=? WHERE id=?');
  users.forEach(uid => {
    // 记录反查映射（取每个二级分类出现最多的一级名）
    const mapRows = db.prepare(`SELECT c.name AS sub, c.type AS ctype, r.category1 AS parent, COUNT(*) AS cnt
      FROM records r JOIN categories c ON c.id = r.category_id
      WHERE r.user_id=? AND r.category1 IS NOT NULL AND r.category1<>''
      GROUP BY c.name, c.type, r.category1 ORDER BY cnt DESC`).all(uid);
    const parentOf = {};   // sub -> {parent, type}
    mapRows.forEach(x => { if (!parentOf[x.sub]) parentOf[x.sub] = { parent: x.parent, type: x.ctype }; });
    // 兜底默认一级分组
    const defaultGroup = type => type === 'income' ? '其他收入' : '其他杂项';

    const cats = db.prepare('SELECT id, name, type, group_id FROM categories WHERE user_id=?').all(uid);
    const tx = db.transaction(() => {
      // 建立所有需要的一级分类（记录反查到的 + 兜底）
      const groupNames = {}; // type -> Set
      groupNames.expense = new Set(); groupNames.income = new Set();
      cats.forEach(c => {
        const p = parentOf[c.name];
        groupNames[c.type].add(p && p.type === c.type ? p.parent : defaultGroup(c.type));
      });
      Object.keys(groupNames).forEach(type => {
        let sort = 0;
        [...groupNames[type]].forEach(name => { ensureGroup.run(uid, name, type, 'more', sort++); });
      });
      // 回填 group_id（仅在未关联时）
      cats.forEach(c => {
        if (c.group_id) return;
        const p = parentOf[c.name];
        const gname = p && p.type === c.type ? p.parent : defaultGroup(c.type);
        const g = findGroup.get(uid, gname, c.type);
        if (g) linkCat.run(g.id, c.id);
      });
    });
    tx();
  });
}
migrateCategoryGroup();
// 账户自定义分类字段（兼容旧库）
function migrateAccountCategory() {
  const cols = db.prepare("PRAGMA table_info(account_meta)").all().map(c => c.name);
  if (!cols.includes('category')) db.exec('ALTER TABLE account_meta ADD COLUMN category TEXT');
}
migrateAccountCategory();
// 账户隐藏开关（兼容旧库）：1=在账户列表页隐藏该账户
function migrateAccountHidden() {
  const cols = db.prepare("PRAGMA table_info(account_meta)").all().map(c => c.name);
  if (!cols.includes('hidden')) db.exec('ALTER TABLE account_meta ADD COLUMN hidden INTEGER DEFAULT 0');
}
migrateAccountHidden();

// 离线同步幂等键：client_id 唯一（部分索引，NULL 不冲突）。
// 客户端在离线/弱网时生成 client_id 随记录提交，重试同一条不会重复插入。
function migrateSyncClientId() {
  for (const t of ['records', 'transfers']) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
    if (!cols.includes('client_id')) db.exec(`ALTER TABLE ${t} ADD COLUMN client_id TEXT`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${t}_client_id ON ${t}(client_id) WHERE client_id IS NOT NULL`);
  }
}
migrateSyncClientId();
// 一次性迁移：把所有非管理员账号补进管理员拥有的账本（修复"建了账号但不在成员里"的历史数据）
function migrateAccountsIntoAdminBooks() {
  const adminRows = db.prepare('SELECT id FROM users WHERE is_admin = 1').all();
  if (!adminRows.length) return;
  const addMember = db.prepare('INSERT OR IGNORE INTO book_members (book_id, user_id, role) VALUES (?,?,?)');
  const tx = db.transaction(() => {
    adminRows.forEach(admin => {
      const books = db.prepare('SELECT id FROM books WHERE user_id = ?').all(admin.id);
      const others = db.prepare('SELECT id FROM users WHERE id != ?').all(admin.id);
      books.forEach(b => others.forEach(u => addMember.run(b.id, u.id, 'member')));
    });
  });
  tx();
}
migrateAccountsIntoAdminBooks();

// 定时邮件备份设置（每个用户独立保存，含 QQ 邮箱授权码）
function migrateEmailBackupSettings() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_backup_settings (
      user_id INTEGER PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      frequency TEXT DEFAULT 'daily',
      send_time TEXT DEFAULT '09:00',
      weekday INTEGER DEFAULT 1,
      month_day INTEGER DEFAULT 1,
      month INTEGER DEFAULT 1,
      year_day INTEGER DEFAULT 1,
      smtp_user TEXT DEFAULT '',
      smtp_pass TEXT DEFAULT '',
      to_email TEXT DEFAULT '',
      book_id INTEGER,
      last_sent_key TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}
migrateEmailBackupSettings();

// 头像值校验：接受 data URL 图片、#RRGGBB 预设色，或 null/'' 清空
function sanitizeAvatar(value, fallback) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 1200000) return fallback;
  if (/^data:image\//.test(value)) return value;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return fallback;
}

module.exports = { db, seedDefaults, canAccessBook, sanitizeAvatar };
