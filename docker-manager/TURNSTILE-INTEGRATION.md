# 🛡️ Turnstile 人机验证集成 - 更新说明

## ✨ 功能概述

已成功为注册界面集成 **Cloudflare Turnstile 人机验证**，有效防止恶意注册和机器人攻击。

### 界面效果

- ✅ 在注册表单的"密码"输入框和"注册"按钮之间添加了人机验证组件
- ✅ 采用 Cloudflare 官方极简样式（"Verify you are human"）
- ✅ 单色调设计，完美融入系统界面
- ✅ 自动适配深色/浅色主题
- ✅ 验证通过前注册按钮保持禁用状态

## 📦 文件变更

### 1. 前端界面 - `views/user.js`

**变更内容:**
- 添加 Turnstile SDK 脚本引用
- 在注册表单中添加人机验证组件
- 添加 CSS 样式（支持深色模式）
- 添加验证成功回调函数
- 修改注册逻辑，验证通过后才允许提交

**关键代码:**
```javascript
// 验证组件
<div class="cf-turnstile" 
     data-sitekey="YOUR_SITE_KEY"     // 👈 需要配置
     data-callback="onTurnstileSuccess" 
     data-theme="auto" 
     data-size="normal">
</div>

// 注册按钮（默认禁用）
<button id="registerButton" disabled>注册</button>
```

### 2. 后端验证 - `routes/user.js`

**变更内容:**
- 添加 `verifyTurnstileToken()` 函数，调用 Cloudflare API 验证 token
- 修改 `register()` 函数，在创建用户前验证 Turnstile token
- 支持环境变量配置 `TURNSTILE_SECRET_KEY`

**验证流程:**
```
用户提交注册 → 验证 Turnstile token → 验证通过 → 创建用户
                                   ↓
                              验证失败 → 返回错误
```

### 3. 新增文件

| 文件 | 说明 |
|------|------|
| **TURNSTILE-SETUP.md** | 详细配置指南，包含获取密钥、配置步骤、常见问题等 |
| **setup-turnstile.sh** | 快速配置脚本，自动替换 Site Key 和 Secret Key |
| **test-turnstile.html** | 测试页面，用于验证 Turnstile 配置是否正确 |

## 🚀 快速配置（3 步）

### 方法 1: 使用配置脚本（推荐）

```bash
cd docker-manager
./setup-turnstile.sh
```

按提示输入 Site Key 和 Secret Key，脚本会自动配置。

### 方法 2: 手动配置

#### 步骤 1: 获取密钥

访问 [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) 创建站点并获取：
- **Site Key** (用于前端)
- **Secret Key** (用于后端)

#### 步骤 2: 配置前端

编辑 `views/user.js`，找到第 253 行左右：

```javascript
data-sitekey="YOUR_SITE_KEY"  // 替换为你的 Site Key
```

#### 步骤 3: 配置后端

编辑 `docker-compose.yml`，添加环境变量：

```yaml
environment:
  - TURNSTILE_SECRET_KEY=你的_Secret_Key
```

或在 `.env` 文件中添加：

```bash
TURNSTILE_SECRET_KEY=你的_Secret_Key
```

#### 步骤 4: 重启服务

```bash
docker-compose down
docker-compose up -d --build
```

## 🧪 测试验证

### 方法 1: 访问注册页面

1. 打开系统注册页面
2. 填写用户名和密码
3. 应该看到人机验证组件
4. 完成验证后注册按钮变为可点击
5. 提交注册测试

### 方法 2: 使用测试页面

```bash
# 1. 编辑测试页面，配置 Site Key
nano test-turnstile.html

# 2. 在浏览器中打开测试页面
# 如果成功显示 token，说明配置正确
```

## 📸 界面预览

### 浅色模式
```
┌─────────────────────────────────┐
│  用户名                          │
│  [输入框]                        │
│                                 │
│  密码                           │
│  [输入框]                        │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ☑ Verify you are human   │   │ ← Turnstile 验证
│  └─────────────────────────┘   │
│                                 │
│  [注册按钮]                      │
└─────────────────────────────────┘
```

## 🔒 安全特性

- ✅ **前端验证**: 未通过验证时按钮保持禁用
- ✅ **后端验证**: 调用 Cloudflare API 二次验证 token
- ✅ **Token 一次性**: 每个 token 只能使用一次
- ✅ **时效性**: Token 有效期约 5 分钟
- ✅ **跨域保护**: Token 绑定域名，防止跨站攻击

## 🛠️ 高级配置

### 自定义验证主题

```javascript
data-theme="auto"     // 自动适配（推荐）
data-theme="light"    // 浅色主题
data-theme="dark"     // 深色主题
```

### 调整验证大小

```javascript
data-size="normal"    // 正常大小（推荐）
data-size="compact"   // 紧凑模式
```

### 开发环境跳过验证

如果未配置 `TURNSTILE_SECRET_KEY`，系统会自动跳过后端验证（仅用于测试）。

**⚠️ 生产环境务必配置密钥！**

## 📚 相关文档

- **详细配置指南**: [`TURNSTILE-SETUP.md`](TURNSTILE-SETUP.md)
- **Cloudflare 官方文档**: https://developers.cloudflare.com/turnstile/
- **获取密钥**: https://dash.cloudflare.com/?to=/:account/turnstile

## ❓ 常见问题

### Q: 验证框不显示？

**A:** 检查 Site Key 是否正确配置，查看浏览器控制台是否有错误。

### Q: 验证总是失败？

**A:** 检查 Secret Key 是否正确，确认后端能访问 `challenges.cloudflare.com`。

### Q: 本地开发怎么测试？

**A:** 可以暂不配置 Secret Key，系统会自动跳过验证（仅开发环境）。

### Q: 需要付费吗？

**A:** Cloudflare Turnstile 有免费额度，每月 100 万次验证免费。

---

## 📞 支持

如有问题，请查看 [`TURNSTILE-SETUP.md`](TURNSTILE-SETUP.md) 或提交 Issue。

**配置完成后，你的系统将拥有强大的反机器人保护！** 🎉
