/**
 * 用户前端视图
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

// 渲染登录/注册页面
async function renderAuthPage() {
    const settings = db.getSettings() || {};
    const siteName = settings.siteName || 'CFly';
    const enableRegister = settings.enableRegister === true;
    const requireInviteCode = settings.requireInviteCode === true;
    
    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <title>${siteName} - 用户登录</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
            .auth-box { background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 100%; max-width: 400px; overflow: hidden; }
            .auth-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
            .auth-header h1 { font-size: 28px; margin-bottom: 5px; }
            .auth-header p { opacity: 0.9; }
            .auth-tabs { display: flex; border-bottom: 1px solid #eee; }
            .auth-tab { flex: 1; padding: 15px; text-align: center; cursor: pointer; background: #f9f9f9; border: none; font-size: 16px; transition: 0.3s; }
            .auth-tab.active { background: white; color: #667eea; font-weight: 600; }
            .auth-form { padding: 30px; display: none; }
            .auth-form.active { display: block; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; color: #666; font-size: 14px; }
            input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; transition: border-color 0.3s; }
            input:focus { outline: none; border-color: #667eea; }
            button[type=submit] { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; transition: 0.2s; }
            button[type=submit]:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
            .error { color: #ff4d4f; font-size: 14px; margin-top: 10px; text-align: center; display: none; }
            .success { color: #52c41a; font-size: 14px; margin-top: 10px; text-align: center; display: none; }
            .register-disabled { text-align: center; padding: 20px; color: #999; }
        </style>
    </head>
    <body>
        <div class="auth-box">
            <div class="auth-header">
                <h1>🚀 ${siteName}</h1>
                <p>欢迎使用</p>
            </div>
            <div class="auth-tabs">
                <button class="auth-tab active" onclick="switchAuthTab('login')">登录</button>
                <button class="auth-tab" onclick="switchAuthTab('register')">注册</button>
            </div>
            
            <!-- 登录表单 -->
            <form id="loginForm" class="auth-form active">
                <div class="form-group">
                    <label>用户名</label>
                    <input type="text" name="username" placeholder="请输入用户名" required>
                </div>
                <div class="form-group">
                    <label>密码</label>
                    <input type="password" name="password" placeholder="请输入密码" required>
                </div>
                <button type="submit">登 录</button>
                <div class="error" id="loginError"></div>
            </form>
            
            <!-- 注册表单 -->
            <form id="registerForm" class="auth-form">
                ${enableRegister ? `
                <div class="form-group">
                    <label>用户名</label>
                    <input type="text" name="username" placeholder="3-20个字符" required>
                </div>
                <div class="form-group">
                    <label>密码</label>
                    <input type="password" name="password" placeholder="至少6个字符" required>
                </div>
                ${requireInviteCode ? `
                <div class="form-group">
                    <label>邀请码</label>
                    <input type="text" name="invite_code" placeholder="请输入邀请码" required>
                </div>
                ` : ''}
                <button type="submit">注 册</button>
                <div class="error" id="registerError"></div>
                <div class="success" id="registerSuccess"></div>
                ` : `
                <div class="register-disabled">
                    <p>🔒 暂未开放注册</p>
                    <p style="font-size:12px;margin-top:10px;">请联系管理员获取账号</p>
                </div>
                `}
            </form>
        </div>
        
        <script>
            function switchAuthTab(tab) {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                event.target.classList.add('active');
                document.getElementById(tab + 'Form').classList.add('active');
            }
            
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const errorEl = document.getElementById('loginError');
                errorEl.style.display = 'none';
                
                try {
                    const formData = new FormData(this);
                    const response = await fetch('/api/user/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: formData.get('username'),
                            password: formData.get('password')
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        window.location.reload();
                    } else {
                        errorEl.textContent = result.error || '登录失败';
                        errorEl.style.display = 'block';
                    }
                } catch (e) {
                    errorEl.textContent = '网络错误，请重试';
                    errorEl.style.display = 'block';
                }
            });
            
            document.getElementById('registerForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const errorEl = document.getElementById('registerError');
                const successEl = document.getElementById('registerSuccess');
                errorEl.style.display = 'none';
                successEl.style.display = 'none';
                
                try {
                    const formData = new FormData(this);
                    const response = await fetch('/api/user/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: formData.get('username'),
                            password: formData.get('password'),
                            email: formData.get('email'),
                            invite_code: formData.get('invite_code')
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        successEl.textContent = result.message || '注册成功！';
                        successEl.style.display = 'block';
                        setTimeout(() => switchAuthTab('login'), 1500);
                    } else {
                        errorEl.textContent = result.error || '注册失败';
                        errorEl.style.display = 'block';
                    }
                } catch (e) {
                    errorEl.textContent = '网络错误，请重试';
                    errorEl.style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
    `;
}

// 渲染用户仪表板
async function renderUserPanel(userInfo) {
    const settings = db.getSettings() || {};
    const siteName = settings.siteName || 'CFly';
    const subUrl = settings.subUrl || '';
    
    // 处理自定义链接
    const customLink1Name = settings.customLink1Name || '';
    const customLink1Url = settings.customLink1Url || '';
    const customLink2Name = settings.customLink2Name || '';
    const customLink2Url = settings.customLink2Url || '';
    
    let customLinksHtml = '';
    if (customLink1Name && customLink1Url) {
        customLinksHtml += `<a href="${customLink1Url}" target="_blank" class="custom-link">${customLink1Name}</a>`;
    }
    if (customLink2Name && customLink2Url) {
        customLinksHtml += `<a href="${customLink2Url}" target="_blank" class="custom-link">${customLink2Name}</a>`;
    }
    
    // 计算账号状态
    const isExpired = userInfo.expiry && userInfo.expiry < Date.now();
    const statusText = !userInfo.enabled ? '已禁用' : (isExpired ? '已过期' : '正常');
    const statusClass = !userInfo.enabled ? 'status-disabled' : (isExpired ? 'status-expired' : 'status-active');
    const createdDate = formatBeijingDate(userInfo.createdAt);
    const expiryText = userInfo.expiry ? formatBeijingDateTime(userInfo.expiry) : '未激活';
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteName} 用户面板</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f0f2f5;
            height: 100vh;
            overflow: hidden;
        }
        
        /* 布局容器 */
        .layout {
            display: flex;
            height: 100vh;
        }
        
        /* 左侧边栏 */
        .sidebar {
            width: 240px;
            background: #001529;
            color: white;
            overflow-y: auto;
            flex-shrink: 0;
        }
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sidebar-header h1 {
            color: white;
            font-size: 18px;
            margin-bottom: 8px;
        }
        .user-info-mini {
            font-size: 12px;
            color: rgba(255,255,255,0.65);
            margin-top: 5px;
        }
        
        .menu {
            list-style: none;
            padding: 10px 0;
        }
        .menu-item {
            padding: 12px 20px;
            cursor: pointer;
            transition: all 0.3s;
            border-left: 3px solid transparent;
            display: flex;
            align-items: center;
            gap: 10px;
            color: rgba(255,255,255,0.85);
        }
        .menu-item:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .menu-item.active {
            background: #1890ff;
            border-left-color: #fff;
            color: white;
        }
        
        /* 右侧内容区 */
        .main-content {
            flex: 1;
            overflow-y: auto;
            background: #f0f2f5;
        }
        .content-header {
            background: white;
            padding: 16px 24px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .content-header h2 {
            font-size: 20px;
            margin: 0;
        }
        .content-body {
            padding: 24px;
        }
        
        .section {
            display: none;
        }
        .section.active {
            display: block;
        }
        
        .card {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .card h2 {
            font-size: 20px;
            margin-bottom: 20px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        .info-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .info-label {
            color: #999;
            font-size: 13px;
            margin-bottom: 5px;
        }
        .info-value {
            color: #333;
            font-size: 16px;
            font-weight: 600;
            word-break: break-all;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        .status-active {
            background: #f6ffed;
            color: #52c41a;
            border: 1px solid #b7eb8f;
        }
        .status-expired {
            background: #fff1f0;
            color: #ff4d4f;
            border: 1px solid #ffa39e;
        }
        .status-disabled {
            background: #fff7e6;
            color: #faad14;
            border: 1px solid #ffd591;
        }
        .copy-btn {
            background: #1890ff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
            transition: all 0.3s;
        }
        .copy-btn:hover {
            background: #40a9ff;
            transform: translateY(-2px);
        }
        .copy-btn:active {
            transform: translateY(0);
        }
        .sub-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin: 5px;
            transition: all 0.3s;
            display: inline-block;
            min-width: 140px;
            text-align: center;
        }
        .sub-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .sub-btn:active {
            transform: translateY(0);
        }
        .sub-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        .warning {
            background: #fff7e6;
            border: 1px solid #ffd591;
            color: #d46b08;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s;
            z-index: 1000;
        }
        .toast.show {
            opacity: 1;
            bottom: 50px;
        }
        
        /* 订阅按钮下拉菜单 */
        .sub-btn-wrapper {
            position: relative;
            display: inline-block;
        }
        .sub-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 180px;
            z-index: 100;
            margin-top: 5px;
            overflow: hidden;
        }
        .sub-dropdown.show {
            display: block;
            animation: dropdownFade 0.2s;
        }
        @keyframes dropdownFade {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .sub-dropdown-item {
            padding: 12px 16px;
            cursor: pointer;
            transition: background 0.2s;
            color: #333;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .sub-dropdown-item:hover {
            background: #f5f5f5;
        }
        .sub-dropdown-item:active {
            background: #e8e8e8;
        }
        
        /* 移动端汉堡菜单按钮 */
        .menu-toggle {
            display: none;
            position: fixed;
            top: 15px;
            left: 15px;
            z-index: 1001;
            background: #001529;
            color: white;
            border: none;
            border-radius: 8px;
            width: 45px;
            height: 45px;
            cursor: pointer;
            font-size: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: all 0.3s;
        }
        .menu-toggle:active {
            transform: scale(0.95);
        }
        
        /* 遮罩层 */
        .sidebar-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        }
        
        @media (max-width: 768px) {
            .menu-toggle {
                display: block;
            }
            .sidebar {
                position: fixed;
                left: -240px;
                top: 0;
                bottom: 0;
                width: 240px;
                z-index: 1000;
                transition: left 0.3s;
            }
            .sidebar.mobile-open {
                left: 0;
            }
            .sidebar-overlay.show {
                display: block;
            }
            .main-content {
                width: 100%;
            }
            .info-grid {
                grid-template-columns: 1fr;
            }
            .content-header {
                padding-left: 70px;
            }
        }
        
        /* 自定义链接样式 */
        .custom-links {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .custom-link {
            padding: 6px 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 6px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s;
            white-space: nowrap;
        }
        .custom-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        @media (max-width: 768px) {
            .custom-links {
                flex-wrap: wrap;
            }
            .custom-link {
                padding: 5px 10px;
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <!-- 移动端菜单按钮 -->
    <button class="menu-toggle" onclick="toggleMobileSidebar()">☰</button>
    
    <!-- 侧边栏遮罩层 -->
    <div class="sidebar-overlay" onclick="toggleMobileSidebar()"></div>
    
    <div class="layout">
        <!-- 左侧导航 -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h1>${siteName}</h1>
                <div class="user-info-mini">
                    ${userInfo.username}<br>
                    ${new Date().toLocaleDateString('zh-CN')}
                </div>
                <button onclick="handleLogout()" style="margin-top:10px;width:100%;padding:8px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:4px;cursor:pointer;font-size:13px;">🚪 退出登录</button>
            </div>
            <ul class="menu">
                <li class="menu-item active" onclick="switchSection('account', event)">
                    <span>📊</span>
                    <span>账号信息</span>
                </li>
                <li class="menu-item" onclick="switchSection('orders', event)">
                    <span>💳</span>
                    <span>我的订单</span>
                </li>
                <li class="menu-item" onclick="switchSection('plans', event)">
                    <span>📦</span>
                    <span>套餐购买</span>
                </li>
            </ul>
        </div>

        <!-- 右侧内容区 -->
        <div class="main-content">
            <!-- 账号信息页 -->
            <div id="section-account" class="section active">
                <div class="content-header">
                    <h2>📊 账号信息</h2>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <div class="custom-links">${customLinksHtml}</div>
                        <button onclick="viewAllAnnouncements()" style="padding:8px 16px;background:#1890ff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:6px;">
                            📢 查看公告
                        </button>
                    </div>
                </div>
                <div class="content-body">
                    <div class="card">
                        <h2>基本信息</h2>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">用户名</div>
                                <div class="info-value">${userInfo.username}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">账号状态</div>
                                <div class="info-value">
                                    <span class="status-badge ${statusClass}">${statusText}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">注册时间</div>
                                <div class="info-value">${createdDate}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">订阅到期时间</div>
                                <div class="info-value">${expiryText}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 订阅链接 -->
                    <div class="card">
                        <h2>📡 订阅链接</h2>
                        ${!subUrl ? `
                        <div class="warning">
                            ⚠️ 管理员尚未配置订阅地址，请联系管理员
                        </div>
                        ` : `
                        ${!userInfo.enabled || isExpired ? `
                        <div class="warning">
                            ⚠️ 您的账号${isExpired ? '已过期' : '已被禁用'}，无法使用订阅功能<br>
                            请联系管理员处理
                        </div>
                        ` : ''}
                        
                        <div class="sub-buttons">
                            <div class="sub-btn-wrapper">
                                <button class="sub-btn" onclick="toggleSubDropdown('original')">🔗 通用订阅 ▼</button>
                                <div class="sub-dropdown" id="sub-dropdown-original">
                                    <div class="sub-dropdown-item" onclick="copySubOnly('original')">📋 复制订阅</div>
                                    <div class="sub-dropdown-item" onclick="importSub('original')">⬇️ 一键导入</div>
                                </div>
                            </div>
                            <div class="sub-btn-wrapper">
                                <button class="sub-btn" onclick="toggleSubDropdown('clash')">⚡ Clash ▼</button>
                                <div class="sub-dropdown" id="sub-dropdown-clash">
                                    <div class="sub-dropdown-item" onclick="copySubOnly('clash')">📋 复制 Clash 订阅</div>
                                    <div class="sub-dropdown-item" onclick="importSub('clash')">⬇️ 一键导入 Clash</div>
                                </div>
                            </div>
                            <div class="sub-btn-wrapper">
                                <button class="sub-btn" onclick="toggleSubDropdown('singbox')">📦 SingBox ▼</button>
                                <div class="sub-dropdown" id="sub-dropdown-singbox">
                                    <div class="sub-dropdown-item" onclick="copySubOnly('singbox')">📋 复制 SingBox 订阅</div>
                                    <div class="sub-dropdown-item" onclick="importSub('singbox')">⬇️ 一键导入 SingBox</div>
                                </div>
                            </div>
                            <div class="sub-btn-wrapper">
                                <button class="sub-btn" onclick="toggleSubDropdown('surge')">🌊 Surge ▼</button>
                                <div class="sub-dropdown" id="sub-dropdown-surge">
                                    <div class="sub-dropdown-item" onclick="copySubOnly('surge')">📋 复制 Surge 订阅</div>
                                    <div class="sub-dropdown-item" onclick="importSub('surge')">⬇️ 一键导入 Surge</div>
                                </div>
                            </div>
                            <div class="sub-btn-wrapper">
                                <button class="sub-btn" onclick="toggleSubDropdown('shadowrocket')">🚀 Shadowrocket ▼</button>
                                <div class="sub-dropdown" id="sub-dropdown-shadowrocket">
                                    <div class="sub-dropdown-item" onclick="copySubOnly('shadowrocket')">📋 复制 Shadowrocket 订阅</div>
                                    <div class="sub-dropdown-item" onclick="importSub('shadowrocket')">⬇️ 一键导入 Shadowrocket</div>
                                </div>
                            </div>
                            <div class="sub-btn-wrapper">
                                <button class="sub-btn" onclick="toggleSubDropdown('quanx')">🔮 Quantumult X ▼</button>
                                <div class="sub-dropdown" id="sub-dropdown-quanx">
                                    <div class="sub-dropdown-item" onclick="copySubOnly('quanx')">📋 复制 Quantumult X 订阅</div>
                                    <div class="sub-dropdown-item" onclick="importSub('quanx')">⬇️ 一键导入 Quantumult X</div>
                                </div>
                            </div>
                        </div>
                        `}
                    </div>

                    <!-- 每日签到 + 重置订阅地址 -->
                    <div class="card">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:20px;">
                            <div style="flex:1;min-width:200px;">
                                <h2>📅 每日签到</h2>
                                <p style="color:#666;margin-bottom:15px;">每日签到可获得1天使用时长奖励</p>
                                <button onclick="userCheckin()" class="copy-btn" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:12px 40px;font-size:16px;">✨ 立即签到</button>
                            </div>
                            <div style="flex:1;min-width:200px;">
                                <h2>🔄 重置订阅地址</h2>
                                <p style="color:#666;margin-bottom:15px;">重置后原订阅链接将失效</p>
                                <button onclick="resetUserUUID()" class="copy-btn" style="background:linear-gradient(135deg, #f093fb 0%, #f5576c 100%);padding:12px 40px;font-size:16px;">🔄 重置地址</button>
                            </div>
                        </div>
                    </div>

                    <!-- 修改密码 -->
                    <div class="card">
                        <h2>🔒 修改密码</h2>
                        <div style="max-width: 400px;">
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; color: #666; font-size: 14px;">旧密码</label>
                                <input type="password" id="oldPassword" placeholder="请输入旧密码" style="width: 100%; padding: 10px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; color: #666; font-size: 14px;">新密码</label>
                                <input type="password" id="newPassword" placeholder="请输入新密码" style="width: 100%; padding: 10px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; color: #666; font-size: 14px;">确认新密码</label>
                                <input type="password" id="confirmPassword" placeholder="请再次输入新密码" style="width: 100%; padding: 10px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;">
                            </div>
                            <button class="copy-btn" onclick="changeUserPassword()" style="margin-top: 10px;">🔄 修改密码</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 订单管理页 -->
            <div id="section-orders" class="section">
                <div class="content-header">
                    <h2>💳 我的订单</h2>
                </div>
                <div class="content-body">
                    <div id="userOrdersList"></div>
                </div>
            </div>

            <!-- 套餐购买页 -->
            <div id="section-plans" class="section">
                <div class="content-header">
                    <h2>📦 套餐购买</h2>
                </div>
                <div class="content-body">
                    <div id="userPlansList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;"></div>
                </div>
            </div>

        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        // 北京时间转换辅助函数（前端）
        function toBeijingTime(date) {
          const d = new Date(date);
          const beijingTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
          return beijingTime;
        }

        function formatBeijingDateTime(date) {
          if (!date) return '-';
          const d = toBeijingTime(date);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          const hour = String(d.getUTCHours()).padStart(2, '0');
          const minute = String(d.getUTCMinutes()).padStart(2, '0');
          return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
        }

        function formatBeijingDate(date) {
          if (!date) return '-';
          const d = toBeijingTime(date);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          return year + '-' + month + '-' + day;
        }
        
        // 订阅转换后端配置
        const apiBaseUrl = 'https://url.v1.mk/sub';
        const subUrlList = \`${subUrl}\`.split(',').map(s => s.trim()).filter(s => s);
        const uuid = \`${userInfo.uuid}\`;
        
        // 随机获取一个订阅地址
        function getRandomSubUrl() {
            if (subUrlList.length === 0) return '';
            const randomIndex = Math.floor(Math.random() * subUrlList.length);
            return subUrlList[randomIndex];
        }

        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(function() { toast.classList.remove('show'); }, 3000);
        }

        function copyText(text, label) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('✅ ' + label + ' 已复制');
            }).catch(function() {
                showToast('❌ 复制失败');
            });
        }

        function toggleSubDropdown(type) {
            event.stopPropagation();
            const dropdown = document.getElementById('sub-dropdown-' + type);
            const allDropdowns = document.querySelectorAll('.sub-dropdown');
            allDropdowns.forEach(function(d) {
                if (d !== dropdown) d.classList.remove('show');
            });
            dropdown.classList.toggle('show');
        }
        
        function copySubOnly(type) {
            event.stopPropagation();
            const subUrl = getRandomSubUrl();
            if (!subUrl) {
                showToast('❌ 订阅地址未配置');
                return;
            }

            // 确保 URL有https://前缀
            let normalizedSubUrl = subUrl.trim();
            if (!normalizedSubUrl.startsWith('http://') && !normalizedSubUrl.startsWith('https://')) {
                normalizedSubUrl = 'https://' + normalizedSubUrl;
            }
            const originalUrl = normalizedSubUrl + '/' + uuid;
            let finalUrl, clientName;

            if (type === 'original') {
                finalUrl = originalUrl;
                clientName = '通用订阅';
            } else {
                const clientNames = {
                    'clash': 'Clash',
                    'surge': 'Surge',
                    'shadowrocket': 'Shadowrocket',
                    'quanx': 'Quantumult X',
                    'singbox': 'SingBox'
                };
                const targetMap = {
                    'clash': 'clash',
                    'surge': 'surge',
                    'shadowrocket': 'shadowrocket',
                    'quanx': 'quanx',
                    'singbox': 'singbox'
                };
                finalUrl = apiBaseUrl + '?target=' + targetMap[type] + '&url=' + encodeURIComponent(originalUrl);
                clientName = clientNames[type];
            }

            navigator.clipboard.writeText(finalUrl).then(function() {
                showToast('✅ ' + clientName + ' 订阅链接已复制');
                document.getElementById('sub-dropdown-' + type).classList.remove('show');
            }).catch(function() {
                showToast('❌ 复制失败');
            });
        }
        
        function importSub(type) {
            event.stopPropagation();
            const subUrl = getRandomSubUrl();
            if (!subUrl) {
                showToast('❌ 订阅地址未配置');
                return;
            }

            // 确保 URL有https://前缀
            let normalizedSubUrl = subUrl.trim();
            if (!normalizedSubUrl.startsWith('http://') && !normalizedSubUrl.startsWith('https://')) {
                normalizedSubUrl = 'https://' + normalizedSubUrl;
            }
            const originalUrl = normalizedSubUrl + '/' + uuid;
            let finalUrl, clientName, schemeUrl;

            if (type === 'original') {
                finalUrl = originalUrl;
                clientName = '通用客户端';
                schemeUrl = originalUrl;
            } else {
                const clientNames = {
                    'clash': 'Clash',
                    'surge': 'Surge',
                    'shadowrocket': 'Shadowrocket',
                    'quanx': 'Quantumult X',
                    'singbox': 'SingBox'
                };
                const schemeMap = {
                    'clash': 'clash://install-config?url=',
                    'surge': 'surge:///install-config?url=',
                    'shadowrocket': 'shadowrocket://add/',
                    'quanx': 'quantumult-x:///add-resource?remote-resource=',
                    'singbox': 'sing-box://import-remote-profile?url='
                };
                const targetMap = {
                    'clash': 'clash',
                    'surge': 'surge',
                    'shadowrocket': 'shadowrocket',
                    'quanx': 'quanx',
                    'singbox': 'singbox'
                };
                finalUrl = apiBaseUrl + '?target=' + targetMap[type] + '&url=' + encodeURIComponent(originalUrl);
                clientName = clientNames[type];
                schemeUrl = schemeMap[type] + encodeURIComponent(finalUrl);
            }

            window.location.href = schemeUrl;
            showToast('✅ 正在打开 ' + clientName + '...');
            document.getElementById('sub-dropdown-' + type).classList.remove('show');
        }
        
        // 点击页面其他地方关闭下拉菜单
        document.addEventListener('click', function() {
            document.querySelectorAll('.sub-dropdown').forEach(function(d) {
                d.classList.remove('show');
            });
        });

        function switchSection(sectionName, event) {
            var items = document.querySelectorAll('.menu-item');
            for(var i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            var sections = document.querySelectorAll('.section');
            for(var i = 0; i < sections.length; i++) {
                sections[i].classList.remove('active');
            }
            
            if(event && event.currentTarget) {
                event.currentTarget.classList.add('active');
            }
            document.getElementById('section-' + sectionName).classList.add('active');
            
            // 保存当前标签
            localStorage.setItem('userCurrentSection', sectionName);
            
            // 加载对应数据
            if(sectionName === 'plans') {
                loadUserPlans();
            }
            if(sectionName === 'orders') {
                loadUserOrders();
            }
            
            // 移动端切换页面时关闭侧边栏
            if (window.innerWidth <= 768) {
                var sidebar = document.getElementById('sidebar');
                var overlay = document.querySelector('.sidebar-overlay');
                if(sidebar && sidebar.classList.contains('mobile-open')) {
                    sidebar.classList.remove('mobile-open');
                    overlay.classList.remove('show');
                }
            }
        }
        
        function toggleMobileSidebar() {
            var sidebar = document.getElementById('sidebar');
            var overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('show');
        }
        
        // 页面加载时恢复上次的标签
        window.addEventListener('DOMContentLoaded', function() {
            const lastSection = localStorage.getItem('userCurrentSection');
            if(lastSection && lastSection !== 'account') {
                var items = document.querySelectorAll('.menu-item');
                for(var i = 0; i < items.length; i++) {
                    items[i].classList.remove('active');
                    if(items[i].getAttribute('onclick') && items[i].getAttribute('onclick').indexOf(lastSection) > -1) {
                        items[i].classList.add('active');
                    }
                }
                var sections = document.querySelectorAll('.section');
                for(var i = 0; i < sections.length; i++) {
                    sections[i].classList.remove('active');
                }
                var targetSection = document.getElementById('section-' + lastSection);
                if(targetSection) {
                    targetSection.classList.add('active');
                    if(lastSection === 'plans') {
                        loadUserPlans();
                    }
                    if(lastSection === 'orders') {
                        loadUserOrders();
                    }
                }
            }
            
            // 页面加载后显示公告
            setTimeout(loadAndShowAnnouncement, 500);
        });

        async function handleLogout() {
            if (!confirm('确定要退出登录吗？')) return;
            
            // 清除保存的标签状态
            localStorage.removeItem('userCurrentSection');
            
            try {
                const response = await fetch('/api/user/logout', {
                    method: 'POST'
                });
                
                if (response.ok) {
                    window.location.href = '/';
                } else {
                    showToast('❌ 退出失败');
                }
            } catch (error) {
                showToast('❌ 网络错误');
            }
        }

        async function userCheckin() {
            try {
                const res = await fetch('/api/user/checkin', { method: 'POST' });
                const result = await res.json();
                
                if(res.ok && result.success) {
                    const newExpiry = new Date(result.new_expiry).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'});
                    alert('✅ 签到成功！\\n已延长 1 天使用时长\\n新到期时间：' + newExpiry);
                    location.reload();
                } else {
                    showToast('❌ ' + (result.error || '签到失败'));
                }
            } catch(e) {
                showToast('❌ 签到失败: ' + e.message);
            }
        }
        
        async function resetUserUUID() {
            if(!confirm('⚠️ 确定要重置订阅地址吗？\\n\\n重置后：\\n• 原订阅链接将立即失效\\n• 需要重新复制新的订阅链接\\n• 已导入客户端的订阅需要重新添加')) {
                return;
            }
            
            try {
                const res = await fetch('/api/user/reset-uuid', { method: 'POST' });
                const result = await res.json();
                
                if(res.ok && result.success) {
                    showToast('✅ ' + result.message);
                    // 刷新页面显示新订阅地址
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showToast('❌ ' + (result.error || '重置失败'));
                }
            } catch(e) {
                showToast('❌ 重置失败: ' + e.message);
            }
        }
        
        async function changeUserPassword() {
            const oldPassword = document.getElementById('oldPassword').value.trim();
            const newPassword = document.getElementById('newPassword').value.trim();
            const confirmPassword = document.getElementById('confirmPassword').value.trim();

            if (!oldPassword || !newPassword || !confirmPassword) {
                showToast('❌ 请填写所有字段');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('❌ 两次输入的新密码不一致');
                return;
            }

            if (newPassword.length < 6) {
                showToast('❌ 新密码长度至少6位');
                return;
            }

            try {
                const response = await fetch('/api/user/changePassword', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({oldPassword, newPassword})
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showToast('✅ 密码修改成功，请重新登录');
                    setTimeout(function() {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    showToast('❌ ' + (result.error || '修改失败'));
                }
            } catch (error) {
                showToast('❌ 网络错误');
            }

            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        }
        
        // 订单和套餐加载函数
        async function loadUserOrders() {
            try {
                const res = await fetch('/api/user/orders');
                const data = await res.json();
                
                const container = document.getElementById('userOrdersList');
                if(!container) return;
                
                if(!data.success || data.orders.length === 0) {
                    container.innerHTML = '<div class="card"><p style="text-align:center;color:#999;padding:40px 0;">暂无订单记录</p></div>';
                    return;
                }
                
                var html = '';
                for(var i = 0; i < data.orders.length; i++) {
                    var o = data.orders[i];
                    var statusColor = '#faad14';
                    var statusText = '待审核';
                    if(o.status === 'approved') {
                        statusColor = '#52c41a';
                        statusText = '已通过';
                    } else if(o.status === 'rejected') {
                        statusColor = '#ff4d4f';
                        statusText = '已拒绝';
                    } else if(o.status === 'expired') {
                        statusColor = '#999999';
                        statusText = '已过期';
                    }
                    var createTime = formatBeijingDateTime(o.created_at);
                    var paidTime = o.paid_at ? formatBeijingDateTime(o.paid_at) : '-';
                    
                    html += '<div class="card" style="margin-bottom:15px;">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:15px;">';
                    html += '<div>';
                    html += '<h3 style="margin:0 0 10px 0;color:#333;">订单 #' + o.id + '</h3>';
                    html += '<p style="color:#666;margin:5px 0;">📦 套餐：' + o.plan_name + ' (' + o.duration_days + '天)</p>';
                    html += '<p style="color:#666;margin:5px 0;">💰 金额：￥' + (o.amount || 0) + '</p>';
                    html += '<p style="color:#999;font-size:13px;margin:5px 0;">🕒 下单时间：' + createTime + '</p>';
                    if(o.status === 'approved') {
                        html += '<p style="color:#999;font-size:13px;margin:5px 0;">✅ 审核时间：' + paidTime + '</p>';
                    }
                    html += '</div>';
                    html += '<span style="padding:6px 16px;border-radius:20px;font-size:14px;font-weight:600;background:' + statusColor + '20;color:' + statusColor + ';border:1px solid ' + statusColor + ';">' + statusText + '</span>';
                    html += '</div>';
                    
                    if(o.status === 'pending') {
                        html += '<div style="padding:12px;background:#fff7e6;border:1px solid #ffd591;border-radius:8px;color:#d46b08;font-size:13px;display:flex;justify-content:space-between;align-items:center;">';
                        if(o.amount > 0) {
                            html += '<span>💳 订单等待支付，请尽快完成支付</span>';
                        } else {
                            html += '<span>⏳ 订单已提交，请耐心等待管理员审核</span>';
                        }
                        html += '<button onclick="cancelUserOrder(' + o.id + ')" style="padding:6px 16px;background:#ff4d4f;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">取消订单</button>';
                        html += '</div>';
                    } else if(o.status === 'approved') {
                        html += '<div style="padding:12px;background:#f6ffed;border:1px solid #b7eb8f;border-radius:8px;color:#52c41a;font-size:13px;">';
                        html += '✅ 订单已通过，套餐时长已增加到您的账号';
                        html += '</div>';
                    } else if(o.status === 'rejected') {
                        html += '<div style="padding:12px;background:#fff1f0;border:1px solid #ffa39e;border-radius:8px;color:#ff4d4f;font-size:13px;">';
                        html += '❌ 订单已被拒绝';
                        html += '</div>';
                    } else if(o.status === 'expired') {
                        html += '<div style="padding:12px;background:#f5f5f5;border:1px solid #d9d9d9;border-radius:8px;color:#999999;font-size:13px;">';
                        html += '⏰ 订单已过期';
                        html += '</div>';
                    }
                    
                    html += '</div>';
                }
                container.innerHTML = html;
            } catch(e) {
                console.error('加载订单失败:', e);
                var container = document.getElementById('userOrdersList');
                if(container) {
                    container.innerHTML = '<div class="card"><p style="text-align:center;color:#ff4d4f;padding:40px 0;">加载订单失败，请刷新页面重试</p></div>';
                }
            }
        }
        
        async function loadUserPlans() {
            try {
                // 同时加载套餐和支付通道
                const [plansRes, channelsRes] = await Promise.all([
                    fetch('/api/plans'),
                    fetch('/api/payment/channels')
                ]);
                const plansData = await plansRes.json();
                const channelsData = await channelsRes.json();
                
                if(!plansData.success) return;
                
                const container = document.getElementById('userPlansList');
                if(!container) return;
                
                // 保存支付通道到全局
                window.paymentChannels = channelsData.success ? channelsData.channels : [];
                
                if(plansData.plans.length === 0) {
                    container.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;">暂无可购买套餐</p>';
                    return;
                }
                
                var html = '';
                for(var i = 0; i < plansData.plans.length; i++) {
                    var p = plansData.plans[i];
                    html += '<div class="card" style="text-align:center;padding:25px;">';
                    html += '<h3 style="margin:0 0 10px 0;font-size:20px;color:#1890ff;">' + p.name + '</h3>';
                    html += '<p style="color:#666;font-size:14px;margin:10px 0;min-height:40px;">' + (p.description || '无描述') + '</p>';
                    html += '<div style="margin:15px 0;">';
                    html += '<span style="font-size:32px;font-weight:bold;color:#1890ff;">' + p.duration_days + '</span>';
                    html += '<span style="font-size:16px;color:#999;">天</span>';
                    html += '</div>';
                    html += '<div style="margin:15px 0;color:#ff4d4f;font-size:20px;font-weight:600;">￥' + (p.price || 0) + '</div>';
                    html += '<button onclick="buyPlan(' + p.id + ', ' + (p.price || 0) + ')" data-plan-name="' + p.name.replace(/"/g, '&quot;') + '" class="copy-btn" style="width:100%;padding:10px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">立即订购</button>';
                    html += '</div>';
                }
                container.innerHTML = html;
            } catch(e) {
                console.error('加载套餐失败:', e);
            }
        }
        
        async function buyPlan(planId, price) {
            const planName = event.target.getAttribute('data-plan-name');
            const channels = window.paymentChannels || [];
            
            // 免费套餐或没有配置支付通道时，直接创建订单
            if(price === 0 || channels.length === 0) {
                if(!confirm('确定要订购套餐「' + planName + '」吗？' + (price === 0 ? '' : '\\n订单提交后需等待管理员审核通过。'))) return;
                
                try {
                    const res = await fetch('/api/user/orders/create', { 
                        method: 'POST', 
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({plan_id: planId})
                    });
                    const result = await res.json();
                    
                    if(res.ok && result.success) {
                        showToast('✅ ' + result.message);
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showToast('❌ ' + (result.error || '订购失败'));
                    }
                } catch(e) {
                    showToast('❌ 订购失败: ' + e.message);
                }
                return;
            }
            
            // 显示支付方式选择弹窗
            showPaymentModal(planId, planName, price, channels);
        }
        
        function showPaymentModal(planId, planName, price, channels) {
            // 创建弹窗
            var modal = document.createElement('div');
            modal.id = 'paymentModal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1000;';
            
            var content = '<div style="background:white;padding:25px;border-radius:12px;max-width:400px;width:90%;">';
            content += '<h3 style="margin:0 0 20px 0;text-align:center;">选择支付方式</h3>';
            content += '<div style="padding:15px;background:#f5f5f5;border-radius:8px;margin-bottom:20px;">';
            content += '<p style="margin:0;"><strong>套餐：</strong>' + planName + '</p>';
            content += '<p style="margin:5px 0 0 0;color:#ff4d4f;font-size:18px;font-weight:600;">金额：￥' + price + '</p>';
            content += '</div>';
            
            content += '<div style="margin-bottom:20px;">';
            content += '<label style="display:block;margin-bottom:8px;font-weight:600;">支付通道</label>';
            content += '<select id="payChannelSelect" style="width:100%;padding:10px;border:1px solid #d9d9d9;border-radius:4px;">';
            for(var i = 0; i < channels.length; i++) {
                content += '<option value="' + channels[i].id + '" data-code="' + channels[i].code + '">' + channels[i].name + '</option>';
            }
            content += '</select>';
            content += '</div>';
            
            content += '<div style="display:flex;gap:10px;">';
            content += '<button onclick="closePaymentModal()" style="flex:1;padding:10px;background:#999;color:white;border:none;border-radius:4px;cursor:pointer;">取消</button>';
            content += '<button onclick="submitPayment(' + planId + ')" style="flex:1;padding:10px;background:#52c41a;color:white;border:none;border-radius:4px;cursor:pointer;">确认支付</button>';
            content += '</div>';
            content += '</div>';
            
            modal.innerHTML = content;
            document.body.appendChild(modal);
        }
        
        function closePaymentModal() {
            var modal = document.getElementById('paymentModal');
            if(modal) modal.remove();
        }
        
        async function submitPayment(planId) {
            const channelSelect = document.getElementById('payChannelSelect');
            if(!channelSelect || !channelSelect.value) {
                showToast('❌ 请选择支付通道');
                return;
            }
            const channelId = channelSelect.value;
            const selectedOption = channelSelect.options[channelSelect.selectedIndex];
            const tradeType = selectedOption ? selectedOption.getAttribute('data-code') : 'usdt.trc20';
            
            closePaymentModal();
            showToast('⏳ 正在创建订单...');
            
            try {
                const createRes = await fetch('/api/user/orders/create', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({plan_id: planId})
                });
                const createResult = await createRes.json();
                
                if(!createRes.ok || !createResult.success) {
                    showToast('❌ ' + (createResult.error || '创建订单失败'));
                    return;
                }
                
                // 如果不需要支付（免费套餐已自动审核或待审核），直接显示消息
                if(!createResult.needPayment) {
                    showToast('✅ ' + createResult.message);
                    setTimeout(() => location.reload(), 1500);
                    return;
                }
                
                // 获取订单ID并发起支付
                const orderId = createResult.orderId;
                if(!orderId) {
                    showToast('❌ 订单已创建，请到订单列表查看');
                    return;
                }
                
                showToast('⏳ 正在发起支付...');
                
                // 调用支付接口 - 改为JSON格式
                const payRes = await fetch('/api/user/orders/pay', { 
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        order_id: orderId,
                        channel_id: channelId,
                        trade_type: tradeType || 'usdt.trc20'
                    })
                });
                const payResult = await payRes.json();
                
                if(payRes.ok && payResult.success && payResult.data && payResult.data.payment_url) {
                    // 新窗口打开支付页面，避免丢失当前会话
                    showToast('✅ 支付页面已打开，请在新窗口完成支付');
                    window.open(payResult.data.payment_url, '_blank');
                } else {
                    showToast('❌ ' + (payResult.error || '发起支付失败，请检查支付通道配置'));
                }
            } catch(e) {
                showToast('❌ 支付失败: ' + e.message);
            }
        }
        
        if(document.getElementById('userPlansList')) {
            loadUserPlans();
        }
        
        // 公告函数
        async function viewAllAnnouncements() {
            try {
                const res = await fetch('/api/announcement');
                const data = await res.json();
                
                if (!data.success || !data.announcements || data.announcements.length === 0) {
                    showToast('📢 暂无公告');
                    return;
                }
                
                // 显示公告列表选择器
                showAnnouncementList(data.announcements);
            } catch(e) {
                showToast('❌ 加载公告失败');
            }
        }
        
        // 显示公告列表选择界面
        function showAnnouncementList(announcements) {
            const overlay = document.createElement('div');
            overlay.id = 'announcementListOverlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;justify-content:center;align-items:center;';
            
            const modal = document.createElement('div');
            modal.style.cssText = 'background:white;border-radius:12px;max-width:600px;width:90%;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
            
            const header = document.createElement('div');
            header.style.cssText = 'padding:20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;';
            header.innerHTML = '<h3 style="margin:0;font-size:18px;color:#1890ff;">📢 系统公告列表</h3>';
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = 'background:none;border:none;font-size:24px;color:#999;cursor:pointer;padding:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:4px;';
            closeBtn.onmouseover = function() { this.style.background = '#f0f0f0'; this.style.color = '#333'; };
            closeBtn.onmouseout = function() { this.style.background = 'none'; this.style.color = '#999'; };
            closeBtn.onclick = function() { document.body.removeChild(overlay); };
            header.appendChild(closeBtn);
            
            const body = document.createElement('div');
            body.style.cssText = 'padding:0;overflow-y:auto;flex:1;';
            
            announcements.forEach((ann, index) => {
                const item = document.createElement('div');
                item.style.cssText = 'padding:15px 20px;border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background 0.2s;';
                item.onmouseover = function() { this.style.background = '#f9f9f9'; };
                item.onmouseout = function() { this.style.background = 'white'; };
                item.onclick = function() {
                    document.body.removeChild(overlay);
                    showAnnouncementModal(ann.id, ann.title, ann.content, true);
                };
                
                const title = document.createElement('div');
                title.style.cssText = 'font-size:16px;font-weight:500;color:#333;margin-bottom:5px;';
                title.textContent = ann.title;
                
                const time = document.createElement('div');
                time.style.cssText = 'font-size:12px;color:#999;';
                time.textContent = new Date(ann.created_at).toLocaleString('zh-CN');
                
                item.appendChild(title);
                item.appendChild(time);
                body.appendChild(item);
            });
            
            modal.appendChild(header);
            modal.appendChild(body);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        }
        
        // 公告功能
        async function loadAndShowAnnouncement() {
            try {
                const res = await fetch('/api/announcement');
                const data = await res.json();
                
                if (!data.success || !data.announcements || data.announcements.length === 0) return;
                
                // 获取本次登录已经dismissed的公告ID列表(使用sessionStorage)
                const dismissedIds = JSON.parse(sessionStorage.getItem('dismissed_announcements') || '[]');
                
                // 过滤出未被dismiss的公告
                const unreadAnnouncements = data.announcements.filter(ann => !dismissedIds.includes(ann.id));
                
                if (unreadAnnouncements.length === 0) return;
                
                // 显示第一个未读公告
                const announcement = unreadAnnouncements[0];
                showAnnouncementModal(announcement.id, announcement.title, announcement.content);
            } catch(e) {
                console.error('加载公告失败:', e);
            }
        }
        
        function showAnnouncementModal(id, title, content, isManualView = false) {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.id = 'announcementOverlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;justify-content:center;align-items:center;';
            
            // 创建弹窗
            const modal = document.createElement('div');
            modal.style.cssText = 'background:white;border-radius:12px;max-width:500px;width:90%;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
            
            // 标题栏
            const header = document.createElement('div');
            header.style.cssText = 'padding:20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;';
            header.innerHTML = '<h3 style="margin:0;font-size:18px;color:#1890ff;">📢 ' + (title || '系统公告') + '</h3>';
            
            // 关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = 'background:none;border:none;font-size:24px;color:#999;cursor:pointer;padding:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:4px;';
            closeBtn.onmouseover = function() { this.style.background = '#f0f0f0'; this.style.color = '#333'; };
            closeBtn.onmouseout = function() { this.style.background = 'none'; this.style.color = '#999'; };
            closeBtn.onclick = function() { document.body.removeChild(overlay); };
            header.appendChild(closeBtn);
            
            // 内容区域
            const body = document.createElement('div');
            body.style.cssText = 'padding:20px;overflow-y:auto;flex:1;line-height:1.8;color:#333;white-space:pre-wrap;word-wrap:break-word;';
            body.textContent = content || '暂无公告内容';
            
            // 底部按钮区
            const footer = document.createElement('div');
            footer.style.cssText = 'padding:15px 20px;border-top:1px solid #f0f0f0;display:flex;gap:10px;justify-content:flex-end;';
            
            // 手动查看时不显示"不再提醒"按钮
            if (!isManualView) {
                const dismissBtn = document.createElement('button');
                dismissBtn.textContent = '本次登录不再提醒';
                dismissBtn.style.cssText = 'padding:8px 20px;background:#f5f5f5;color:#666;border:1px solid #d9d9d9;border-radius:6px;cursor:pointer;font-size:14px;';
                dismissBtn.onclick = function() {
                    // 将此公告ID添加到session级别的已dismiss列表
                    const dismissedIds = JSON.parse(sessionStorage.getItem('dismissed_announcements') || '[]');
                    if (!dismissedIds.includes(id)) {
                        dismissedIds.push(id);
                        sessionStorage.setItem('dismissed_announcements', JSON.stringify(dismissedIds));
                    }
                    document.body.removeChild(overlay);
                    showToast('✅ 本次登录不再提醒此公告');
                };
                footer.appendChild(dismissBtn);
            }
            
            const closeBtn2 = document.createElement('button');
            closeBtn2.textContent = isManualView ? '关闭' : '我知道了';
            closeBtn2.style.cssText = 'padding:8px 20px;background:#1890ff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;';
            closeBtn2.onclick = function() { 
                document.body.removeChild(overlay);
            };
            
            footer.appendChild(closeBtn2);
            
            // 组装弹窗
            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            
            // 添加到页面
            document.body.appendChild(overlay);
        }
        
        // 取消订单
        async function cancelUserOrder(orderId) {
            if(!confirm('确定要取消这个订单吗？')) return;
            
            try {
                const res = await fetch('/api/user/orders/cancel', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({order_id: orderId})
                });
                const result = await res.json();
                
                if(res.ok && result.success) {
                    showToast('✅ ' + result.message);
                    loadUserOrders();
                } else {
                    showToast('❌ ' + (result.error || '取消失败'));
                }
            } catch(e) {
                showToast('❌ 取消失败: ' + e.message);
            }
        }
    </script>
</body>
</html>`;
}

module.exports = {
    renderAuthPage,
    renderUserPanel
};
