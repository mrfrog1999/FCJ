import { defineStore } from 'pinia'
import { api } from '../api'
import { clearCache } from '../utils/cache'
import { setIconTheme } from '../utils/theme'

export const useStore = defineStore('main', {
  state: () => ({
    token: localStorage.getItem('ssj_token') || '',
    user: JSON.parse(localStorage.getItem('ssj_user') || 'null'),
    categories: [],
    books: [],
    members: [],
    currentBookId: localStorage.getItem('ssj_book') || null,
    ready: false,
    // 数据版本号：任何写操作后递增，供 keep-alive 缓存页面判断是否需要刷新
    dataVersion: 0
  }),
  getters: {
    currentBook(state) {
      return state.books.find(b => b.id == state.currentBookId) || state.books[0] || null
    },
    expenseCats(state) { return state.categories.filter(c => c.type === 'expense') },
    incomeCats(state) { return state.categories.filter(c => c.type === 'income') }
  },
  actions: {
    touch() { this.dataVersion++ },
    setAuth(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('ssj_token', token)
      localStorage.setItem('ssj_user', JSON.stringify(user))
      if (user && user.theme) setIconTheme(user.theme)
    },
    updateUser(patch) {
      this.user = { ...(this.user || {}), ...patch }
      localStorage.setItem('ssj_user', JSON.stringify(this.user))
      if (patch.theme) setIconTheme(patch.theme)
    },
    logout() {
      clearCache()
      this.token = ''
      this.user = null
      this.books = []
      this.categories = []
      localStorage.clear()
    },
    setBook(id) {
      this.currentBookId = id
      localStorage.setItem('ssj_book', String(id))
      // 切换账本后异步刷新成员列表
      this.loadMembers().catch(() => {})
    },
    async loadMembers() {
      const id = this.currentBookId
      if (!id) { this.members = []; return [] }
      try {
        this.members = await api.books.members(id)
        return this.members
      } catch (e) { this.members = []; return [] }
    },
    async loadBase() {
      const [cats, books] = await Promise.all([api.categories.list(), api.books.list()])
      this.categories = cats
      this.books = books
      // 刷新当前用户信息（含管理员设置的关联记账成员），失败不影响主流程
      if (this.token) {
        try {
          const me = await api.auth.me()
          if (me && me.id === this.user?.id) this.updateUser({
            bind_member_id: me.bind_member_id,
            theme: me.theme || 'fancy'
          })
        } catch (e) {}
      }
      if (!this.currentBookId || !books.find(b => b.id == this.currentBookId)) {
        if (books[0]) this.setBook(books[0].id)
      }
      await this.loadMembers()
      this.ready = true
    }
  }
})

// 应用启动时：若本地已登录用户带有主题则同步（服务端值会在 loadBase 中二次校准）
try {
  const cached = JSON.parse(localStorage.getItem('ssj_user') || 'null')
  if (cached && cached.theme) setIconTheme(cached.theme)
} catch (e) {}
