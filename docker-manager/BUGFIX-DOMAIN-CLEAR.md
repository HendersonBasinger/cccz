# Bug 修复：保存反代 IP 时优选域名列表被清空

## 问题描述

在 Docker 版本中存在一个严重的数据丢失问题：
- 当在"默认反代 IP 列表"中添加/删除 IP 并点击"保存配置"时
- "优选域名管理"中的域名列表会被清空消失

## 问题原因

### 根本原因

1. **前端问题**：在 `views/admin.js` 的 `saveProxySettings()` 函数中，保存反代 IP 时会发送一个空字符串的 `bestDomains` 字段
   ```javascript
   bestDomains: (currentSettings.bestDomains && currentSettings.bestDomains.length > 0) 
       ? currentSettings.bestDomains.join('\n') 
       : ''  // 这里发送了空字符串
   ```

2. **后端问题**：在 `routes/admin.js` 的 `saveSettings()` 函数中，当接收到空字符串时会被解析为空数组，覆盖原有的优选域名列表
   ```javascript
   let bestDomainsList = bestDomains 
       ? bestDomains.split(/[\n,]+/).map(d => d.trim()).filter(d => d.length > 0) 
       : [];  // 空字符串被 split 后 filter 成空数组
   ```

## 修复方案

### 1. 后端修复（`routes/admin.js`）

修改 `saveSettings()` 函数，增加对 `bestDomains` 字段的智能处理：

```javascript
// 处理 bestDomains：如果未提供或为空字符串，则保留原有值
let bestDomainsList;
if (bestDomains === undefined || bestDomains === null) {
    // 未提供该字段，保留原有值
    bestDomainsList = currentSettings.bestDomains || [];
} else if (typeof bestDomains === 'string' && bestDomains.trim() === '') {
    // 提供了空字符串，保留原有值（不清空）
    bestDomainsList = currentSettings.bestDomains || [];
} else {
    // 提供了有效值，进行处理
    bestDomainsList = bestDomains.split(/[\n,]+/).map(d => d.trim()).filter(d => d.length > 0);
    bestDomainsList = validateAndLimitIPs(bestDomainsList);
}
```

### 2. 前端修复（`views/admin.js`）

修改 `saveProxySettings()` 函数，保存反代 IP 时不发送 `bestDomains` 字段：

```javascript
// 构建数据，不包含 bestDomains 字段，让后端保留原有值
const data = {
  proxyIP: proxyIPLines.join('\\n'),
  // 不发送 bestDomains 字段，后端会自动保留原有值
  subUrl: subUrl,
  websiteUrl: websiteUrl
};
```

## 修复效果

修复后的行为：
1. ✅ 保存反代 IP 配置时，优选域名列表不会被清空
2. ✅ 保存优选域名列表时，使用专用的 `/api/admin/saveBestDomains` 接口
3. ✅ 两个功能模块互不干扰，数据独立管理

## 测试步骤

1. 添加一些优选域名（例如：`www.visa.com:443#香港`）
2. 保存优选域名配置
3. 切换到反代 IP 列表，添加或删除一些 IP
4. 点击"保存配置"
5. 验证：切换回优选域名管理，确认域名列表依然存在

## 影响范围

- 修改文件：
  - `/docker-manager/routes/admin.js`（后端 API）
  - `/docker-manager/views/admin.js`（前端界面）

- 影响功能：
  - 反代 IP 列表保存
  - 优选域名列表保存

## 版本信息

- 修复日期：2026-01-16
- 修复类型：Critical Bug Fix（严重 Bug 修复）
- 兼容性：向后兼容，不影响现有数据

## 建议

为了避免类似问题，建议：
1. 不同的配置模块使用独立的 API 端点
2. 后端 API 应该明确区分"未提供字段"和"清空字段"的语义
3. 前端在保存时只发送需要更新的字段，避免不必要的字段传递
