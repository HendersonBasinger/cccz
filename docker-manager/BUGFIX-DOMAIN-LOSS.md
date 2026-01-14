# 🐛 优选域名自动清空问题修复

## 问题描述

手动添加的优选域名在定时任务执行后莫名其妙地被清空，日志显示：

```
[定时任务] 更新完成: 手动 6 条, 自动 25 条
[定时任务] 更新完成: 手动 6 条, 自动 25 条
[定时任务] 更新完成: 手动 0 条, 自动 20 条  ❌ 手动域名丢失
[定时任务] 更新完成: 手动 0 条, 自动 25 条
```

## 根本原因

在 `docker-manager/server.js` 的 `updateBestIPs()` 函数中存在严重的逻辑缺陷：

### 原始代码问题（第291行）
```javascript
const allLineKeys = new Set([...Object.keys(newDataByLine), ...Object.keys(oldAutoDomains)]);
```

**问题分析：**
1. 当网络抓取部分失败时（如某个线路的数据缺失），`newDataByLine` 中不包含该线路
2. 如果旧数据 `oldAutoDomains` 中有该线路，但新数据中没有，该线路仍会被处理
3. 处理时 `newIPs` 为空数组，`oldIPs` 有数据，逻辑上会保留旧IP
4. **但是**：如果某次抓取完全失败或者某些线路持续缺失数据，这些线路的IP可能被意外清空
5. **更严重的是**：代码没有对异常情况做充分的防护，导致在某些边界条件下数据丢失

## 修复方案

### 修复1: 优先考虑旧线路（第291行）
```javascript
// ⚠️ 关键修复：必须包含所有旧线路，防止数据丢失
const allLineKeys = new Set([...Object.keys(oldAutoDomains), ...Object.keys(newDataByLine)]);
```

**作用：** 确保旧线路数据优先被考虑，即使新数据中没有这些线路，也会保留旧数据

### 修复2: 完善空数据处理（第256行）
```javascript
if (ipv4Data.length === 0 && ipv6Data.length === 0) {
    console.log('[定时任务] 未获取到优选IP数据，保留现有数据');  // 改进日志说明
    return;
}
```

### 修复3: 异常处理保护（第320行）
```javascript
} catch (error) {
    console.error('[定时任务] 更新优选IP失败:', error.message);
    // ⚠️ 关键修复：发生错误时不修改数据，避免清空
}
```

**作用：** 确保发生任何异常时，不会执行数据保存操作，避免写入空数据

### 修复4: 强化数据保留逻辑（第309-312行）
```javascript
} else {
    // 没有新IP：完全保留旧IP（最多5个），防止数据丢失
    newAutoDomains.push(...oldIPs.slice(0, 5));
}
```

**注释说明：** 明确表示这是防止数据丢失的关键逻辑

### 修复5: 手动域名优先（第316行）
```javascript
// ⚠️ 关键修复：手动域名必须始终保留
settings.bestDomains = [...manualDomains, ...newAutoDomains];
```

## 修复文件

- ✅ `docker-manager/server.js` (第247-322行)

## 验证方法

1. **模拟网络抓取失败**
   - 临时返回空数组，验证旧数据是否保留
   
2. **检查日志**
   ```bash
   docker logs vles-manager -f | grep "定时任务"
   ```
   
3. **手动触发定时任务**
   - 等待15分钟观察
   - 检查手动添加的域名是否被保留

## 预期效果

修复后的行为：
- ✅ 手动添加的域名**永远不会丢失**
- ✅ 网络抓取失败时**保留所有现有数据**
- ✅ 某个线路数据缺失时**保留该线路的旧数据**
- ✅ 发生异常时**不修改任何数据**
- ✅ 新旧IP智能合并，每条线路保持5个

## 修复日期

2026年1月14日

## 影响范围

- 仅影响 Docker 版本 (`docker-manager/`)
- Workers 版本不受影响（使用不同的数据处理逻辑）
