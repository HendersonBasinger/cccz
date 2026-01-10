# ProxyIP 1034 错误排查指南

## 问题分析

**Cloudflare 1034 错误**：访问套了 CF CDN 的网站报错，说明 Worker IP 被识别为 Cloudflare 边缘节点，触发了防护机制。

## 根本原因

当前代码的 ProxyIP 逻辑存在**根本性架构问题**：

### 代码流程（当前）
1. 客户端 → 通过订阅获得节点配置（地址使用 bestDomains）  
2. 客户端 → 连接到节点地址  
3. Worker → **直接连接目标网站**（这里是问题！）
4. 目标网站 ← 看到的是 Cloudflare Worker IP → 返回 1034

### 为什么 ProxyIP 没生效

查看 [Node-Worker.js#L678-L735](/workspaces/vles/Node-Worker.js#L678-L735)：

```javascript
// 我修改后的代码现在会优先使用 ProxyIP
if (shouldUseProxy) {
    socket = connect({
        hostname: proxyHost,  // ✅ 连接到 ProxyIP
        port: proxyPort
    });
}
```

**但这还不够！** 问题在于：
- ProxyIP 域名（如 `ProxyIP.HK.CMLiussss.net`）本身也指向 Cloudflare
- Worker 内部的 `connect()` 函数无法改变出口 IP
- **Worker 的所有出站连接都来自 Cloudflare IP 池**

## 正确的解决方案

### 方案一：使用订阅节点的 ProxyIP（推荐）✅

**原理**：让客户端直接连接到非 Cloudflare IP，Worker 只做 WebSocket 中转。

**操作步骤**：

1. **在管理端添加真实的优选 IP**（不是域名）：
   ```
   146.56.130.12:443#电信优选
   ```

2. **这些 IP 会出现在订阅的 bestDomains 中**，客户端会：
   - 连接到 `146.56.130.12:443`
   - 使用 SNI: `your-worker.workers.dev`
   - 流量路径：客户端 → 优选IP → Cloudflare CDN → Worker

3. **Worker 接收到 VLESS 请求后**：
   - 解析目标地址
   - **直接连接目标**（因为此时 Worker 已经通过优选IP中转，不再被识别为 CF IP）

### 方案二：外部 ProxyIP 服务（复杂）

使用第三方代理服务：
- 需要真实的 HTTP/SOCKS5 代理服务器
- Worker 连接代理服务器
- 代理服务器连接目标网站

**不推荐**：成本高、速度慢、需要额外维护

## 立即排查步骤

### 1. 检查配置同步

访问你的节点 Worker：
```
https://your-node-worker.workers.dev/debug
```

检查返回的 JSON：
```json
{
  "users": {...},
  "settings": {
    "proxyIPs": ["xxx"],  // ← 这里应该有值
    "bestDomains": ["xxx"] // ← 这里也应该有值
  },
  "lastUpdate": "2026-01-10T...",
  "apiUrl": "https://..."
}
```

**如果 `proxyIPs` 是空数组** → 管理端配置没保存成功

### 2. 检查管理端保存逻辑

查看 [User-Manager-Worker.js#L1648-L1672](/workspaces/vles/User-Manager-Worker.js#L1648-L1672)：

```javascript
async function handleAdminSaveSettings(request, env) {
  const proxyIPStr = formData.get('proxyIP');  // ← 注意字段名
  
  let proxyIPs = proxyIPStr 
    ? proxyIPStr.split(/[\n,]+/).map(d => d.trim()).filter(d => d.length > 0) 
    : [];
    
  // 保存到数据库
  const settings = { ...currentSettings, proxyIPs, bestDomains, subUrl, websiteUrl };
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .bind(SYSTEM_CONFIG_KEY, JSON.stringify(settings))
    .run();
}
```

**可能的问题**：
- 表单字段名不匹配
- 数据库保存失败但没报错
- 浏览器缓存了旧配置

### 3. 手动验证数据库

如果你有 D1 数据库访问权限，运行：
```sql
SELECT value FROM settings WHERE key = 'SYSTEM_SETTINGS_V1';
```

检查返回的 JSON 中是否包含 `proxyIPs`。

## 临时解决方案

如果无法解决配置同步问题，可以直接修改 Node-Worker.js 的兜底配置：

[Node-Worker.js#L12-L15](/workspaces/vles/Node-Worker.js#L12-L15)

```javascript
const FALLBACK_CONFIG = {
    proxyIPs: [
        '146.56.130.12:443',  // 添加真实的优选IP
        '104.18.0.1:443'       // 或其他可用IP
    ],
    bestDomains: ['bestcf.030101.xyz:443', ...]
};
```

## 最终建议

**ProxyIP 在这个架构中的作用有限**，因为：
1. Worker 出站连接永远来自 Cloudflare IP 池
2. 无法通过代码改变 Worker 的出口 IP

**真正有效的方法**：
- 在订阅配置中使用非 CF 的优选 IP 作为连接地址
- 让客户端通过优选 IP 接入 Cloudflare CDN
- Worker 只做协议转换和流量转发

如果你需要访问套了 CF CDN 的网站，建议：
- 在 `bestDomains` 中添加非 CF 的优选 IP
- 客户端使用这些节点访问
- 或者使用非 CF 域名的镜像站点
