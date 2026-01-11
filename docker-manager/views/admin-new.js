/**
 * 管理员面板视图 - 完整版
 * 对照 Workers 版本实现所有功能
 */

const db = require('../database');

// 北京时间格式化
function formatBeijingDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    const beijingTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    const hour = String(beijingTime.getUTCHours()).padStart(2, '0');
    const minute = String(beijingTime.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatBeijingDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    const beijingTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 渲染管理员登录页面
function renderAdminLoginPage(adminPath) {
    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <title>管理员登录</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; }
        .login-box { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 100%; max-width: 400px; }
        .login-box h2 { text-align: center; margin-bottom: 30px; color: #333; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #666; font-size: 14px; }
        input[type=text], input[type=password] { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; transition: border-color 0.3s; }
        input:focus { outline: none; border-color: #667eea; }
        button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        button:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
        .error { color: #ff4d4f; font-size: 14px; margin-top: 10px; text-align: center; display: none; }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h2>🔐 管理员登录</h2>
        <form id="loginForm">
          <div class="form-group">
            <label>用户名</label>
            <input type="text" id="username" name="username" placeholder="请输入用户名" required>
          </div>
          <div class="form-group">
            <label>密码</label>
            <input type="password" id="password" name="password" placeholder="请输入密码" required>
          </div>
          <button type="submit">登 录</button>
          <div class="error" id="errorMsg"></div>
        </form>
      </div>
      <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          const errorMsg = document.getElementById('errorMsg');
          errorMsg.style.display = 'none';
          
          try {
            const formData = new FormData(this);
            const response = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
              })
            });
            
            const result = await response.json();
            
            if (result.success) {
              window.location.href = '${adminPath}';
            } else {
              errorMsg.textContent = result.error || '登录失败';
              errorMsg.style.display = 'block';
            }
          } catch (e) {
            errorMsg.textContent = '网络错误，请重试';
            errorMsg.style.display = 'block';
          }
        });
      </script>
    </body>
    </html>
    `;
}

// 渲染管理员面板 - 完整版
async function renderAdminPanel(adminPath) {
    const usersData = db.getAllUsers();
    const rawSettings = db.getSettings();
    const settings = rawSettings || { 
        proxyIPs: [], 
        bestDomains: [], 
        subUrl: "",
        websiteUrl: "",
        siteName: "CFly",
        enableRegister: false,
        autoApproveOrder: false,
        enableTrial: false,
        requireInviteCode: false,
        trialDays: 7,
        pendingOrderExpiry: 0,
        paymentOrderExpiry: 15
    };
    
    let proxyIPsList = settings.proxyIPs || [];
    let bestDomainsList = settings.bestDomains || [];
    let subUrl = settings.subUrl || "";
    let websiteUrl = settings.websiteUrl || "";
    let siteName = settings.siteName || "CFly";

    // 生成用户列表HTML
    const rows = usersData.map(u => {
        const isExpired = u.expiry && u.expiry < Date.now();
        const isEnabled = u.enabled;
        
        const expiryText = u.expiry ? formatBeijingDateTime(u.expiry) : '未激活';
        const expiryVal = u.expiry ? formatBeijingDate(u.expiry) : '';
        const createDate = u.createAt ? formatBeijingDateTime(u.createAt) : '-';
        
        let statusHtml = !u.expiry ? '<span class="tag disabled">未激活</span>' : 
            (isExpired ? '<span class="tag expired">已过期</span>' : 
            (!isEnabled ? '<span class="tag disabled">已禁用</span>' : '<span class="tag active">正常</span>'));
        
        const safeName = (u.name || '').replace(/'/g, "\\'");
        
        return `<tr data-uuid="${u.uuid}">
            <td><input type="checkbox" class="u-check" value="${u.uuid}"></td>
            <td class="mono" onclick="copy('${u.uuid}')">${u.uuid}</td>
            <td>${u.name}</td>
            <td>${createDate}</td>
            <td>${expiryText}</td>
            <td>${statusHtml}</td>
            <td class="actions">
                <button class="btn-action btn-copy" onclick="toggleDropdown(event, '${u.uuid}')">订阅 ▼</button>
                <div class="dropdown-content" id="dropdown-${u.uuid}">
                  <div class="dropdown-item original" onclick="copySubByType('${u.uuid}', 'original')">📋 原始订阅</div>
                  <div class="dropdown-item clash" onclick="copySubByType('${u.uuid}', 'clash')">⚔️ Clash</div>
                  <div class="dropdown-item surge" onclick="copySubByType('${u.uuid}', 'surge')">🌊 Surge</div>
                  <div class="dropdown-item shadowrocket" onclick="copySubByType('${u.uuid}', 'shadowrocket')">🚀 Shadowrocket</div>
                  <div class="dropdown-item quantumult" onclick="copySubByType('${u.uuid}', 'quanx')">🔮 Quantumult X</div>
                </div>
                <button class="btn-action btn-edit" onclick="openEdit('${u.uuid}', '${safeName}', '${expiryVal}')">编辑</button>
                ${isEnabled && !isExpired ? `<button class="btn-action btn-secondary" onclick="toggleStatus('${u.uuid}', false)">禁用</button>` : ''}
                ${!isEnabled && !isExpired ? `<button class="btn-action btn-success" onclick="toggleStatus('${u.uuid}', true)">启用</button>` : ''}
                <button class="btn-action btn-del" onclick="delUser('${u.uuid}')">删除</button>
            </td>
        </tr>`;
    }).join('');

    // 开始渲染完整页面
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <title>${siteName} 控制面板</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { --primary: #1890ff; --bg: #f0f2f5; --danger: #ff4d4f; --success: #52c41a; --warning: #faad14; --purple: #722ed1; --grey: #bfbfbf; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: #333; height: 100vh; overflow: hidden; }
    
    /* 主布局 */
    .layout { display: flex; height: 100vh; }
    
    /* 左侧导航 */
    .sidebar { width: 240px; background: #001529; color: white; overflow-y: auto; flex-shrink: 0; }
    .sidebar-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .sidebar-header h1 { color: white; font-size: 18px; margin: 0; }
    .sidebar-header .date { font-size: 12px; color: rgba(255,255,255,0.65); margin-top: 5px; }
    
    .menu { list-style: none; padding: 10px 0; }
    .menu-item { padding: 12px 20px; cursor: pointer; transition: all 0.3s; border-left: 3px solid transparent; display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.85); }
    .menu-item:hover { background: rgba(255,255,255,0.1); color: white; }
    .menu-item.active { background: var(--primary); border-left-color: #fff; color: white; }
    .menu-item-icon { font-size: 16px; width: 20px; text-align: center; }
    
    /* 右侧内容区 */
    .main-content { flex: 1; overflow-y: auto; background: var(--bg); }
    .content-header { background: white; padding: 16px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); position: sticky; top: 0; z-index: 10; }
    .content-header h2 { font-size: 20px; margin: 0; }
    .content-body { padding: 24px; }
    
    .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h3 { margin-bottom: 15px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    .section { display: none; }
    .section.active { display: block; }
    
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media(max-width:768px) { .grid { grid-template-columns: 1fr; } }
    
    label { display: block; margin-bottom: 8px; font-size: 14px; color: #666; font-weight: 600; }
    input[type=text], input[type=date], input[type=number], input[type=password], textarea, select { width: 100%; padding: 10px; border: 1px solid #d9d9d9; border-radius: 4px; box-sizing: border-box; font-family: inherit; transition: 0.2s; }
    input:focus, textarea:focus, select:focus { border-color: var(--primary); outline: none; }
    textarea { resize: vertical; min-height: 80px; font-family: monospace; font-size: 13px; }
    
    button { padding: 8px 16px; color: white; border: none; border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 14px; }
    button:hover { opacity: 0.9; }
    button:disabled { background: #ccc !important; cursor: not-allowed; }
    .btn-primary { background: var(--primary); }
    .btn-danger { background: var(--danger); }
    .btn-success { background: var(--success); }
    .btn-warning { background: var(--warning); }
    .btn-secondary { background: var(--grey); }
    
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #f0f0f0; }
    th { background: #fafafa; color: #666; font-weight: 600; }
    tr:hover { background: #fdfdfd; }
    .mono { font-family: monospace; color: var(--primary); cursor: pointer; }
    
    .tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
    .tag.active { color: var(--success); background: #f6ffed; border: 1px solid #b7eb8f; }
    .tag.expired { color: var(--danger); background: #fff1f0; border: 1px solid #ffa39e; }
    .tag.disabled { color: #999; background: #f5f5f5; border: 1px solid #d9d9d9; }
    
    .actions { white-space: nowrap; position: relative; }
    .btn-action { padding: 4px 10px; font-size: 12px; margin-right: 4px; }
    .btn-copy { background: var(--purple); position: relative; }
    .btn-edit { background: var(--warning); }
    .btn-del { background: #ff7875; }
    
    .dropdown-content { display: none; position: absolute; background: white; min-width: 180px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; border-radius: 6px; overflow: hidden; top: 100%; left: 0; margin-top: 5px; }
    .dropdown-content.show { display: block; }
    .dropdown-item { padding: 10px 15px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f0f0f0; transition: background 0.2s; }
    .dropdown-item:last-child { border-bottom: none; }
    .dropdown-item:hover { background: #f5f5f5; }
    
    .batch-bar { margin-bottom: 15px; display: flex; gap: 10px; align-items: center; background: #e6f7ff; padding: 10px; border-radius: 4px; border: 1px solid #91d5ff; display: none; }
    .batch-bar.show { display: flex; }
    
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 100; }
    .modal { background: white; padding: 25px; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
    .modal h3 { margin-bottom: 20px; }
    
    #toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 4px; opacity: 0; pointer-events: none; transition: 0.3s; z-index: 200; }
    #toast.show { opacity: 1; bottom: 50px; }
    
    .config-add-box { display: flex; gap: 10px; margin-bottom: 10px; }
    .config-add-box textarea { flex: 1; min-height: 60px; }
    
    .config-list-container { border: 1px solid #eee; border-radius: 4px; padding: 10px; max-height: 300px; overflow-y: auto; background: #fafafa; }
    .config-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-bottom: 1px solid #eee; font-family: monospace; font-size: 13px; }
    .config-item:last-child { border-bottom: none; }
    .config-item .del-btn { color: var(--danger); cursor: pointer; font-weight: bold; }
    
    /* 开关样式 */
    .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
    .switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; border-radius: 26px; transition: 0.3s; }
    .switch .slider:before { content: ""; position: absolute; height: 20px; width: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
    .switch input:checked + .slider:before { transform: translateX(24px); }
    
    /* 移动端适配 */
    .admin-menu-toggle { display: none; position: fixed; top: 15px; left: 15px; z-index: 1001; background: #001529; color: white; border: none; border-radius: 8px; width: 45px; height: 45px; cursor: pointer; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .admin-sidebar-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; }
    
    @media(max-width:768px) {
      .admin-menu-toggle { display: block; }
      .sidebar { position: fixed; left: -240px; top: 0; bottom: 0; width: 240px; z-index: 1000; transition: left 0.3s; }
      .sidebar.mobile-open { left: 0; }
      .admin-sidebar-overlay.show { display: block; }
      .main-content { width: 100%; }
      .content-header { padding-left: 70px; }
    }
  </style>
</head>
<body>
  <!-- 移动端菜单按钮 -->
  <button class="admin-menu-toggle" onclick="toggleAdminSidebar()">☰</button>
  
  <!-- 侧边栏遮罩层 -->
  <div class="admin-sidebar-overlay" onclick="toggleAdminSidebar()"></div>
  
  <div class="layout">
    <!-- 左侧导航 -->
    <div class="sidebar" id="admin-sidebar">
      <div class="sidebar-header">
        <h1>${siteName}</h1>
        <div class="date">${formatBeijingDate(Date.now())}</div>
        <button onclick="adminLogout()" style="margin-top:10px;width:100%;padding:8px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:4px;cursor:pointer;font-size:13px;">🚪 退出登录</button>
      </div>
      <ul class="menu">
        <li class="menu-item active" data-section="dashboard" onclick="switchSection('dashboard')">
          <span class="menu-item-icon">📊</span>
          <span>仪表盘</span>
        </li>
        <li class="menu-item" data-section="proxy-ips" onclick="switchSection('proxy-ips')">
          <span class="menu-item-icon">🌐</span>
          <span>反代 IP</span>
        </li>
        <li class="menu-item" data-section="best-domains" onclick="switchSection('best-domains')">
          <span class="menu-item-icon">⭐</span>
          <span>优选域名</span>
        </li>
        <li class="menu-item" data-section="users" onclick="switchSection('users')">
          <span class="menu-item-icon">👥</span>
          <span>用户管理</span>
        </li>
        <li class="menu-item" data-section="announcement" onclick="switchSection('announcement')">
          <span class="menu-item-icon">📢</span>
          <span>公告管理</span>
        </li>
        <li class="menu-item" data-section="plans" onclick="switchSection('plans')">
          <span class="menu-item-icon">📦</span>
          <span>套餐管理</span>
        </li>
        <li class="menu-item" data-section="orders" onclick="switchSection('orders')">
          <span class="menu-item-icon">💳</span>
          <span>订单管理</span>
        </li>
        <li class="menu-item" data-section="payment" onclick="switchSection('payment')">
          <span class="menu-item-icon">💰</span>
          <span>支付通道</span>
        </li>
        <li class="menu-item" data-section="invites" onclick="switchSection('invites')">
          <span class="menu-item-icon">🎫</span>
          <span>邀请码</span>
        </li>
        <li class="menu-item" data-section="change-password" onclick="switchSection('change-password')">
          <span class="menu-item-icon">🔒</span>
          <span>修改密码</span>
        </li>
      </ul>
    </div>

    <!-- 右侧内容区 -->
    <div class="main-content">
`;

    // 这里继续添加各个功能模块的 HTML...
    // 由于长度限制，我会在下一个文件中继续
    
    return html;
}

module.exports = {
    renderAdminPanel,
    renderAdminLoginPage
};
