const router = require('express').Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY sort ASC, id ASC').all(req.user.id);
  res.json(rows);
});

// 两级分类树：一级(category_groups) -> 二级(categories.group_id)。用于记账页分类选择。
router.get('/tree', (req, res) => {
  const uid = req.user.id;
  const cats = db.prepare('SELECT id, name, type, icon, color, sort, group_id FROM categories WHERE user_id = ? ORDER BY sort ASC, id ASC').all(uid);
  const groups = db.prepare('SELECT id, name, type, icon, sort FROM category_groups WHERE user_id = ? ORDER BY sort ASC, id ASC').all(uid);

  const build = type => {
    const gs = groups.filter(g => g.type === type);
    return gs.map(g => ({
      id: g.id, name: g.name, icon: g.icon,
      children: cats.filter(c => c.type === type && c.group_id === g.id)
        .map(c => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))
    }));
  };
  res.json({ expense: build('expense'), income: build('income') });
});

// ===== 一级分类 CRUD =====
router.get('/groups', (req, res) => {
  const rows = db.prepare('SELECT * FROM category_groups WHERE user_id = ? ORDER BY sort ASC, id ASC').all(req.user.id);
  res.json(rows);
});

router.post('/groups', (req, res) => {
  const { name, type, icon, sort } = req.body;
  if (!name || !['expense', 'income'].includes(type)) return res.status(400).json({ error: '参数不完整' });
  const exist = db.prepare('SELECT id FROM category_groups WHERE user_id=? AND name=? AND type=?').get(req.user.id, name, type);
  if (exist) return res.status(400).json({ error: '一级分类已存在' });
  const info = db.prepare('INSERT INTO category_groups (user_id, name, type, icon, sort) VALUES (?,?,?,?,?)')
    .run(req.user.id, name, type, icon || 'more', sort || 0);
  res.json({ id: info.lastInsertRowid });
});

router.put('/groups/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM category_groups WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: '一级分类不存在' });
  const { name, icon, sort } = req.body;
  // 改名时同步更新已有记录的 category1，保持历史流水一级名一致
  if (name && name !== row.name) {
    db.prepare('UPDATE records SET category1=? WHERE user_id=? AND category1=?').run(name, req.user.id, row.name);
  }
  db.prepare('UPDATE category_groups SET name=?, icon=?, sort=? WHERE id=?')
    .run(name || row.name, icon || row.icon, sort ?? row.sort, row.id);
  res.json({ ok: true });
});

router.delete('/groups/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM category_groups WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: '一级分类不存在' });
  const tx = db.transaction(() => {
    // 该一级下的二级分类解除关联（保留记录，归入未分组）
    db.prepare('UPDATE categories SET group_id=NULL WHERE group_id=? AND user_id=?').run(row.id, req.user.id);
    db.prepare('DELETE FROM category_groups WHERE id=?').run(row.id);
  });
  tx();
  res.json({ ok: true });
});

router.post('/', (req, res) => {
  const { name, type, icon, color, group_id } = req.body;
  if (!name || !['expense', 'income'].includes(type)) return res.status(400).json({ error: '参数不完整' });
  const info = db.prepare('INSERT INTO categories (user_id, name, type, icon, color, sort, group_id) VALUES (?,?,?,?,?,?,?)')
    .run(req.user.id, name, type, icon || 'more', color || '#ff7a45', req.body.sort || 99, group_id || null);
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: '分类不存在' });
  const { name, icon, color, sort, group_id } = req.body;
  db.prepare('UPDATE categories SET name=?, icon=?, color=?, sort=?, group_id=? WHERE id=?')
    .run(name || row.name, icon || row.icon, color || row.color, sort ?? row.sort, group_id ?? row.group_id, row.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: '分类不存在' });
  if (row.is_default) return res.status(400).json({ error: '默认分类不能删除' });
  db.prepare('UPDATE records SET category_id = NULL WHERE category_id = ?').run(row.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

module.exports = router;
