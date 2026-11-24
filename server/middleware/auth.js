const jwt = require('jsonwebtoken');
const SECRET = 'suisoji-secret-key-2026';

function sign(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '30d' });
}

function auth(req, res, next) {
  // 注意：发布平台网关会强制覆写 Authorization header 为自己的 JWT，
  // 因此优先使用自定义 header / query / cookie 传递 token。
  let token = null;
  if (req.headers['x-token']) token = req.headers['x-token'];
  if (!token && req.query && req.query.token) token = req.query.token;
  if (!token && req.headers.cookie) {
    const m = req.headers.cookie.match(/(?:^|;\s*)ssj_token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

module.exports = { sign, auth };
