# 随手记（FCJ）

基于 Docker 的多人协同记账应用，前后端分离、单端口部署。包含记一笔、流水、统计中心（立体饼图）、账户、备份恢复与定时邮件备份等功能。

## 功能

- 记一笔：支出 / 收入 / 转账，按账号自动归属成员
- 流水：按年份分组、多维度筛选、转账展示
- 统计中心：支出/收入/资产/月报共 18 类图表，立体饼图与条形图
- 账户：资产负债、多账户流水
- 备份恢复：XLS 导出导入、定时邮件备份（QQ 邮箱）
- 设置：主题切换（标准/炫彩）、分类管理、账号管理

默认管理员：`admin` / `admin123321`（首次启动自动创建）

## 部署（1Panel / 飞牛 fnOS）

镜像由 GitHub Actions 自动构建并推送至 GitHub Container Registry：
`ghcr.io/mrfrog1999/fcj:latest`

### 方式一：GHCR 镜像（推荐）

复制仓库根目录的 `docker-compose.yml` 内容：

- **1Panel**：容器 → 编排 → 创建编排 → 粘贴内容 → 启动
- **飞牛 fnOS**：Docker → 项目 / Compose → 新建项目 → 粘贴内容 → 启动

或在服务器命令行：

```bash
docker compose up -d
```

### 方式二：本地源码构建（无法访问 GHCR 时）

把源码上传到服务器后执行：

```bash
docker compose -f docker-compose.local.yml up -d --build
```

### 访问

浏览器打开：`http://服务器IP:8668`

默认账号 `admin` / `admin123321`，登录后请尽快修改密码。

## 数据持久化与备份

- 所有账本数据存于容器 `/app/data`，已映射到宿主机 `./data`
- **请定期备份宿主机的 `data` 目录**，内含全部账本数据
- 可在应用内「我的 → 备份与恢复」导出 XLS

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8668` | 服务监听端口 |
| `JWT_SECRET` | `suisoji-secret-key-2026` | JWT 签名密钥，建议部署前改成随机串 |
| `TZ` | `Asia/Shanghai` | 时区 |

## 本地开发

```bash
# 后端
cd server && npm install && node app.js

# 前端
cd web && npm install && npm run dev
```

## 技术栈

Vue 3 + Vant + Pinia + ECharts（前端） / Node.js + Express + SQLite（后端）
