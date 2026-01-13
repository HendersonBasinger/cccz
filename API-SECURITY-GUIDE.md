# API 密钥安全配置指南

## 📋 功能说明

为了保护用户数据接口 `/api/users` 的安全，系统新增了 API 密钥验证功能。节点端访问管理端接口时需要携带正确的密钥，否则将被拒绝访问。

## 🔐 配置步骤

### 1. 在管理端生成密钥

1. 登录管理后台
2. 进入 **系统设置** 页面
3. 找到 **API 密钥** 配置项
4. 点击 **生成密钥** 按钮，系统会自动生成一个 64 位的随机密钥
5. 点击 **保存更改** 按钮

### 2. 配置节点端

编辑 `Node-Worker.js` 文件，找到以下配置：

```javascript
const REMOTE_API_URL = 'https://你的域名/api/users';
const API_TOKEN = '';  // 将管理端生成的密钥填写到这里
```

将管理端生成的密钥复制到 `API_TOKEN` 中，例如：

```javascript
const API_TOKEN = 'a1b2c3d4e5f6...你的密钥';
```

### 3. 部署节点端

将修改后的 `Node-Worker.js` 部署到 Cloudflare Workers。

## ✅ 验证配置

1. 访问节点端的订阅链接，检查是否能正常获取节点
2. 如果配置正确，订阅应该能正常工作
3. 如果访问 `https://你的域名/api/users` 返回 `401 Unauthorized` 或 `403 Forbidden`，说明密钥验证生效

## 🔄 更新密钥

如果需要更换密钥（例如密钥泄露）：

1. 在管理后台重新生成新密钥
2. 保存设置
3. 更新所有节点端的 `API_TOKEN` 配置
4. 重新部署节点端

## ⚠️ 安全建议

1. **定期更换密钥**：建议每 3-6 个月更换一次 API 密钥
2. **不要共享密钥**：每个节点应使用独立的密钥（如有多个节点）
3. **保护好密钥**：不要将密钥提交到公开的代码仓库
4. **启用 HTTPS**：确保管理端使用 HTTPS 协议，防止密钥在传输过程中被窃取

## 🛠️ 故障排查

### 问题 1: 节点端无法获取用户数据

**症状**：订阅链接无法获取节点，或显示 "Unauthorized" 错误

**解决方案**：
- 检查节点端 `API_TOKEN` 是否与管理端设置的一致
- 检查是否拼写错误或有多余的空格
- 查看 Cloudflare Workers 日志是否有错误信息

### 问题 2: 管理端未设置密钥

**症状**：管理端设置中 API 密钥为空

**解决方案**：
- 如果未设置密钥，系统会向后兼容，允许访问（不推荐）
- 建议尽快配置密钥以提高安全性

### 问题 3: 多个节点如何管理

**最佳实践**：
- 所有节点使用相同的密钥（简单但不够安全）
- 或者为每个节点配置独立密钥（需要修改管理端支持多密钥验证）

## 📝 技术实现

### 管理端验证逻辑

```javascript
// 中间件验证 Authorization 头
function verifyApiToken(req, res, next) {
    const apiToken = settings.apiToken;
    const authHeader = req.headers['authorization'];
    
    // 支持 Bearer Token 格式
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;
    
    if (token !== apiToken) {
        return res.status(403).json({ error: 'Invalid API token' });
    }
    
    next();
}
```

### 节点端请求格式

```javascript
const headers = { 'User-Agent': 'CF-Node-Worker/1.0' };
if (API_TOKEN) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`;
}

const response = await fetch(REMOTE_API_URL, { headers });
```

## 🎯 总结

通过配置 API 密钥，您可以有效防止未授权访问用户数据接口，大幅提升系统安全性。建议所有用户都启用此功能。

如有任何问题，请查看管理后台日志或联系技术支持。
