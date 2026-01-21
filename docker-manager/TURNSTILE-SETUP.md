# Cloudflare Turnstile 人机验证集成指南

## 功能说明

本系统已集成 Cloudflare Turnstile 人机验证，用于防止注册滥用和机器人攻击。

### 集成特点

- ✅ **极简设计**：采用 Cloudflare 官方极简样式（"Verify you are human"）
- ✅ **视觉融合**：单色调（Monochrome）设计，完美融入系统界面
- ✅ **深色模式支持**：自动适配系统的深色/浅色主题
- ✅ **交互优化**：验证通过前按钮不可点击，防止重复提交
- ✅ **无感验证**：支持 Cloudflare 的隐式验证模式

## 配置步骤

### 1. 获取 Cloudflare Turnstile 密钥

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的账户，进入 **Turnstile** 页面
3. 点击 **Add Site** 创建新站点
4. 填写站点信息：
   - **Site Name**: 你的站点名称（如：CFly User Portal）
   - **Domain**: 你的域名（如：example.com）
   - **Widget Mode**: 选择 **Managed** （推荐）
5. 创建后会获得两个密钥：
   - **Site Key** （网站密钥，用于前端）
   - **Secret Key** （密钥，用于后端验证）

### 2. 配置前端 Site Key

编辑 [`docker-manager/views/user.js`](docker-manager/views/user.js)，找到 Turnstile 组件配置：

```javascript
<div class="cf-turnstile" 
     data-sitekey="YOUR_SITE_KEY"     // 👈 替换为你的 Site Key
     data-callback="onTurnstileSuccess" 
     data-theme="light" 
     data-size="normal">
</div>
```

**将 `YOUR_SITE_KEY` 替换为你在 Cloudflare 获取的 Site Key**

### 3. 配置后端 Secret Key

有两种配置方式：

#### 方式 A：使用环境变量（推荐）

在 [`docker-manager/docker-compose.yml`](docker-manager/docker-compose.yml) 中添加环境变量：

```yaml
services:
  app:
    environment:
      - TURNSTILE_SECRET_KEY=你的_Secret_Key
```

或者在 `.env` 文件中添加：

```bash
TURNSTILE_SECRET_KEY=你的_Secret_Key
```

#### 方式 B：直接修改代码

编辑 [`docker-manager/routes/user.js`](docker-manager/routes/user.js)，找到 `verifyTurnstileToken` 函数：

```javascript
async function verifyTurnstileToken(token) {
    const secretKey = process.env.TURNSTILE_SECRET_KEY || '你的_Secret_Key';
    // ...
}
```

### 4. 重新部署应用

```bash
cd /workspaces/cccz/docker-manager
docker-compose down
docker-compose up -d --build
```

## 测试验证

1. 访问注册页面
2. 填写用户名和密码
3. 应该看到 "Verify you are human" 验证框
4. 完成验证后，注册按钮变为可点击状态
5. 提交注册，后端会验证 token 有效性

## 高级配置

### 自定义验证主题

在前端 Turnstile 配置中可以修改主题：

```javascript
data-theme="light"    // 浅色主题
data-theme="dark"     // 深色主题
data-theme="auto"     // 自动适配
```

### 调整验证大小

```javascript
data-size="normal"    // 正常大小（推荐）
data-size="compact"   // 紧凑模式
```

### 开发环境跳过验证

如果未配置 `TURNSTILE_SECRET_KEY`，系统会自动跳过验证（仅用于开发测试）。

**⚠️ 生产环境务必配置密钥！**

## 验证流程

```
用户填写注册信息
    ↓
完成 Turnstile 人机验证
    ↓
前端获取 turnstileToken
    ↓
提交注册请求（包含 token）
    ↓
后端调用 Cloudflare API 验证 token
    ↓
验证通过 → 创建账户
验证失败 → 返回错误
```

## 常见问题

### Q1: 验证框显示异常？

- 检查 Site Key 是否正确配置
- 确认域名与 Cloudflare 配置的域名匹配
- 查看浏览器控制台是否有错误信息

### Q2: 验证总是失败？

- 检查 Secret Key 是否正确
- 确认后端能访问 Cloudflare API（`challenges.cloudflare.com`）
- 查看后端日志：`docker-compose logs -f`

### Q3: 本地开发环境如何测试？

- 可以使用 Cloudflare 提供的测试密钥
- 或者暂不配置 Secret Key（系统会跳过验证）

### Q4: 深色模式下验证框样式异常？

系统已经通过 CSS 自动处理深色模式的样式反转，如果仍有问题，可以调整：

```css
.dark .cf-turnstile iframe {
  filter: invert(1) hue-rotate(180deg);
}
```

## 安全建议

1. ✅ **妥善保管 Secret Key**：不要将 Secret Key 提交到版本控制系统
2. ✅ **使用环境变量**：推荐使用环境变量而不是硬编码
3. ✅ **定期轮换密钥**：建议每 3-6 个月更换一次密钥
4. ✅ **监控验证率**：在 Cloudflare Dashboard 查看验证通过率，发现异常及时处理

## 相关链接

- [Cloudflare Turnstile 官方文档](https://developers.cloudflare.com/turnstile/)
- [Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
- [API 文档](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

---

**配置完成后，你的注册页面将拥有强大的反机器人保护！** 🛡️
