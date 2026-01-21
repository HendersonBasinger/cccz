# 🚀 Turnstile 人机验证 - 5 分钟快速配置

## ⚡ 最快配置方法（3 步完成）

### 步骤 1: 获取 Cloudflare Turnstile 密钥（2 分钟）

1. 访问：https://dash.cloudflare.com/?to=/:account/turnstile
2. 点击 **"Add Site"** 创建站点
3. 填写信息：
   - Site Name: 随便填（如：My Site）
   - Domain: 你的域名（如：example.com，本地测试用 localhost）
   - Widget Mode: 选择 **Managed**
4. 点击 **Create** 创建
5. 复制两个密钥：
   - ✅ **Site Key** (类似：1x00000000000000000000AA)
   - ✅ **Secret Key** (类似：1x0000000000000000000000000000000AA)

### 步骤 2: 在后台配置密钥（1 分钟）

1. 登录你的管理后台
2. 点击左侧 **"仪表盘"**
3. 滚动到底部找到 **"🛡️ Turnstile 人机验证"**
4. 粘贴密钥：
   ```
   Site Key:    [粘贴你的 Site Key]
   Secret Key:  [粘贴你的 Secret Key]
   ```
5. 完成！（自动保存）

### 步骤 3: 测试验证（2 分钟）

1. 打开隐私浏览器窗口
2. 访问注册页面
3. 应该看到 **"☑ Verify you are human"** 验证框
4. 填写用户名、密码，完成验证
5. 提交注册测试

## ✅ 完成！

现在你的注册页面已经有强大的反机器人保护了！

---

## 🔄 后续操作

### 如何禁用验证？
- 在后台清空 Site Key 和 Secret Key，保存即可

### 如何更换密钥？
- 在后台直接修改密钥，保存即可（无需重启）

### 查看验证统计？
- 访问：https://dash.cloudflare.com/?to=/:account/turnstile

---

## 📱 快速参考卡片

```
┌─────────────────────────────────────────┐
│  Turnstile 配置清单                      │
├─────────────────────────────────────────┤
│  ☐ 获取 Site Key                         │
│  ☐ 获取 Secret Key                       │
│  ☐ 在后台粘贴 Site Key                   │
│  ☐ 在后台粘贴 Secret Key                 │
│  ☐ 测试注册页面                          │
│  ☑ 完成！                                │
└─────────────────────────────────────────┘
```

---

**就这么简单！** 🎉

如有问题，查看：[TURNSTILE-ADMIN-CONFIG.md](TURNSTILE-ADMIN-CONFIG.md)
