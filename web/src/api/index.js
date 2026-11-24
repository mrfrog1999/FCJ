import axios from 'axios'

// 捕获分享链接中的 sharecode 并持久化，作为平台访问凭据的兜底
;(function captureSharecode() {
  try {
    const m = location.search.match(/[?&]sharecode=([^&]+)/)
    if (m) localStorage.setItem('ssj_sharecode', decodeURIComponent(m[1]))
  } catch (e) {}
})()

function withSharecode(url) {
  const code = localStorage.getItem('ssj_sharecode')
  if (!code || !url) return url
  const sep = url.includes('?') ? '&' : '?'
  return url + sep + 'sharecode=' + encodeURIComponent(code)
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 60000
})

request.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ssj_token')
  if (token) {
    // 用自定义 header 传递（发布平台网关会覆写 Authorization）
    cfg.headers['X-Token'] = token
  }
  cfg.url = withSharecode(cfg.url)
  if (token) {
    const sep = cfg.url.includes('?') ? '&' : '?'
    cfg.url = cfg.url + sep + 'token=' + encodeURIComponent(token)
  }
  return cfg
})

request.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || '网络错误'
    const status = err.response?.status
    // isNetwork=true 表示请求根本没到服务器（断网/DNS/超时），这类写入可安全入队重试
    const isNetwork = !err.response || status >= 500
    if (status === 401) {
      localStorage.removeItem('ssj_token')
      localStorage.removeItem('ssj_user')
      if (location.hash !== '#/login') location.hash = '#/login'
    }
    const wrapped = new Error(msg)
    wrapped.isNetwork = isNetwork
    wrapped.status = status || 0
    return Promise.reject(wrapped)
  }
)

export const api = {
  auth: {
    register: data => request.post('/api/auth/register', data),
    login: data => request.post('/api/auth/login', data),
    me: () => request.get('/api/auth/me'),
    updateProfile: data => request.put('/api/auth/me', data)
  },
  admin: {
    users: () => request.get('/api/admin/users'),
    createUser: data => request.post('/api/admin/users', data),
    updateUser: (id, data) => request.put('/api/admin/users/' + id, data),
    deleteUser: id => request.delete('/api/admin/users/' + id)
  },
  books: {
    list: () => request.get('/api/books'),
    create: name => request.post('/api/books', { name }),
    update: (id, name) => request.put('/api/books/' + id, { name }),
    remove: id => request.delete('/api/books/' + id),
    invite: id => request.post('/api/books/' + id + '/invite'),
    join: code => request.post('/api/books/join', { code }),
    members: id => request.get('/api/books/' + id + '/members')
  },
  records: {
    list: params => request.get('/api/records', { params }),
    get: id => request.get('/api/records/' + id),
    create: data => request.post('/api/records', data),
    update: (id, data) => request.put('/api/records/' + id, data),
    remove: id => request.delete('/api/records/' + id)
  },
  transfers: {
    get: id => request.get('/api/transfers/' + id),
    create: data => request.post('/api/transfers', data),
    update: (id, data) => request.put('/api/transfers/' + id, data),
    remove: id => request.delete('/api/transfers/' + id)
  },
  categories: {
    list: () => request.get('/api/categories'),
    tree: () => request.get('/api/categories/tree'),
    create: data => request.post('/api/categories', data),
    update: (id, data) => request.put('/api/categories/' + id, data),
    remove: id => request.delete('/api/categories/' + id),
    groups: () => request.get('/api/categories/groups'),
    groupCreate: data => request.post('/api/categories/groups', data),
    groupUpdate: (id, data) => request.put('/api/categories/groups/' + id, data),
    groupRemove: id => request.delete('/api/categories/groups/' + id)
  },
  stats: {
    summary: params => request.get('/api/stats/summary', { params }),
    category: params => request.get('/api/stats/category', { params }),
    trend: params => request.get('/api/stats/trend', { params }),
    daily: params => request.get('/api/stats/daily', { params }),
    group: params => request.get('/api/stats/group', { params }),
    filterOptions: params => request.get('/api/stats/filter-options', { params }),
    getBudget: params => request.get('/api/stats/budget', { params }),
    setBudget: data => request.post('/api/stats/budget', data)
  },
  accounts: {
    list: params => request.get('/api/accounts', { params }),
    detail: params => request.get('/api/accounts/detail', { params }),
    sort: data => request.post('/api/accounts/sort', data),
    saveMeta: data => request.post('/api/accounts/meta', data)
  },
  backup: {
    preview: file => {
      const fd = new FormData()
      fd.append('file', file)
      return request.post('/api/backup/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
    },
    import: (file, bookId, mode) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('book_id', bookId)
      fd.append('mode', mode || 'append')
      return request.post('/api/backup/import', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
    },
    clear: bookId => request.post('/api/backup/clear', { book_id: bookId }),
    exportUrl: bookId => {
      const token = localStorage.getItem('ssj_token') || ''
      const code = localStorage.getItem('ssj_sharecode') || ''
      const q = []
      if (bookId) q.push('book_id=' + encodeURIComponent(bookId))
      q.push('token=' + encodeURIComponent(token))
      if (code) q.push('sharecode=' + encodeURIComponent(code))
      return '/api/backup/export?' + q.join('&')
    }
  },
  emailBackup: {
    getSettings: () => request.get('/api/email-backup/settings'),
    saveSettings: data => request.put('/api/email-backup/settings', data),
    test: data => request.post('/api/email-backup/test', data, { timeout: 120000 }),
    sendNow: data => request.post('/api/email-backup/send-now', data || {}, { timeout: 120000 })
  }
}

export default request
