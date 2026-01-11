# VLES 用户管理系统 - Docker 服务器版

将管理端部署到自己的服务器，不受 Cloudflare Workers 请求数限制。

## 📁 目录结构

```
docker-manager/
├── server.js           # 主服务器入口
├── database.js         # SQLite 数据库操作
├── package.json        # Node.js 依赖
├── Dockerfile          # Docker 镜像配置
├── docker-compose.yml  # Docker Compose 配置
├── routes/
│   ├── api.js         # 公共 API 路由
│   ├── admin.js       # 管理员 API 路由
│   └── user.js        # 用户 API 路由
└── views/
    ├── admin.js       # 管理面板视图
    └── user.js        # 用户面板视图
```

## 🚀 快速部署

### 方式一：Docker Compose（推荐）

1. **修改配置**
   
   编辑 `docker-compose.yml`，修改环境变量：
   ```yaml
   environment:
     - ADMIN_USERNAME=admin          # 管理员用户名
     - ADMIN_PASSWORD=your_password  # 管理员密码（必须修改！）
     - ADMIN_PATH=/admin            # 管理面板路径
   ```

2. **启动服务**
   ```bash
   cd docker-manager
   docker-compose up -d
   ```

3. **访问服务**
   - 用户面板: `http://your-server:3000`
   - 管理面板: `http://your-server:3000/admin`
   - 节点 API: `http://your-server:3000/api/users`

### 方式二：手动 Docker 构建

```bash
cd docker-manager

# 构建镜像
docker build -t vles-manager .

# 运行容器
docker run -d \
  --name vles-manager \
  -p 3000:3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  -e ADMIN_PATH=/admin \
  -v $(pwd)/data:/app/data \
  vles-manager
```

### 方式三：直接运行 Node.js

```bash
cd docker-manager

# 安装依赖
npm install

# 设置环境变量
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your_password
export ADMIN_PATH=/admin
export DATABASE_PATH=./data/vles.db

# 启动服务
npm start
```

## 🔧 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | 3000 |
| `ADMIN_USERNAME` | 管理员用户名 | admin |
| `ADMIN_PASSWORD` | 管理员密码 | admin123 |
| `ADMIN_PATH` | 管理面板路径 | /admin |
| `DATABASE_PATH` | 数据库文件路径 | /app/data/vles.db |

## 📡 API 接口

### 节点端调用

节点端（Node-Worker.js）需要配置 API 地址指向你的服务器：

```javascript
const REMOTE_API_URL = 'http://your-server:3000/api/users';
```

### API 列表

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/users` | GET | 获取用户列表（供节点端拉取） |
| `/api/plans` | GET | 获取套餐列表 |
| `/api/announcement` | GET | 获取公告 |
| `/api/user/register` | POST | 用户注册 |
| `/api/user/login` | POST | 用户登录 |
| `/api/admin/login` | POST | 管理员登录 |

## 🔒 安全建议

1. **修改默认密码** - 务必修改 `ADMIN_PASSWORD`
2. **使用反向代理** - 建议使用 Nginx 反向代理并配置 HTTPS
3. **限制访问** - 可以通过防火墙限制 `/admin` 路径的访问 IP

### Nginx 反向代理配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 功能特性

- ✅ 用户管理（添加/编辑/删除/启用/禁用）
- ✅ 套餐管理
- ✅ 订单管理（手动审核/自动审核）
- ✅ 公告管理
- ✅ 邀请码系统
- ✅ 支付通道（BEpusdt）
- ✅ 定时任务（自动更新优选IP、清理非活跃用户）
- ✅ 数据导入导出
- ✅ 用户注册/登录
- ✅ 新用户试用

## 🔄 数据迁移

如果你之前使用 Cloudflare Workers 版本，可以：

1. 在 Workers 管理面板导出数据（JSON 格式）
2. 在 Docker 版本的管理面板导入数据

## 📝 更新日志

### v1.0.0
- 初始版本
- 从 Cloudflare Workers 迁移到 Node.js + SQLite
- 支持 Docker 部署

## ❓ 常见问题

**Q: 数据存储在哪里？**
A: 数据存储在 SQLite 数据库中，默认路径为 `/app/data/vles.db`。使用 Docker 时，建议挂载 `data` 目录以持久化数据。

**Q: 如何备份数据？**
A: 可以通过管理面板的"数据导出"功能导出 JSON 格式备份，或直接备份 `data/vles.db` 文件。

**Q: 忘记管理员密码怎么办？**
A: 修改 Docker 环境变量中的 `ADMIN_PASSWORD` 并重启容器。

## 🤝 与节点端配合

节点端（部署在 Cloudflare Snippets）需要修改 API 地址：

```javascript
// Node-Worker.js
const REMOTE_API_URL = 'https://your-manager-domain.com/api/users';
```

这样节点端仍然免费运行在 Snippets，只有管理端在你自己的服务器上。
