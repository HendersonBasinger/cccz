/**
 * 管理员面板视图 - Shadcn UI 风格
 */

const db = require('../database');

// 时间格式化
function formatBeijingDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    const beijingTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    const hour = String(beijingTime.getUTCHours()).padStart(2, '0');
    const minute = String(beijingTime.getUTCMinutes()).padStart(2, '0');
    return `\${year}-\${month}-\${day} \${hour}:\${minute}`;
}

function formatBeijingDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    const beijingTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    return `\${year}-\${month}-\${day}`;
}

function renderAdminLoginPage(adminPath) {
    return `<!DOCTYPE html><html><head><title>管理员登录</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center}.login-box{background:white;padding:40px;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.2);width:100%;max-width:400px}.login-box h2{text-align:center;margin-bottom:30px;color:#333}.form-group{margin-bottom:20px}label{display:block;margin-bottom:8px;color:#666;font-size:14px}input[type=text],input[type=password]{width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:16px}input:focus{outline:none;border-color:#667eea}button{width:100%;padding:14px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:6px;font-size:16px;cursor:pointer}button:hover{transform:translateY(-2px);box-shadow:0 5px 20px rgba(102,126,234,0.4)}.error{color:#ff4d4f;font-size:14px;margin-top:10px;text-align:center;display:none}</style></head><body><div class="login-box"><h2>🔐 管理员登录</h2><form id="loginForm"><div class="form-group"><label>用户名</label><input type="text" id="username" required></div><div class="form-group"><label>密码</label><input type="password" id="password" required></div><button type="submit">登 录</button><div class="error" id="errorMsg"></div></form></div><script>
document.getElementById('loginForm').addEventListener('submit',async function(e){e.preventDefault();const errorMsg=document.getElementById('errorMsg');errorMsg.style.display='none';try{const formData=new FormData(this);const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:formData.get('username'),password:formData.get('password')})});const result=await response.json();if(result.success){window.location.href='${adminPath}';}else{errorMsg.textContent=result.error||'登录失败';errorMsg.style.display='block';}}catch(e){errorMsg.textContent='网络错误，请重试';errorMsg.style.display='block';}});</script></body></html>`;
}

function renderAdminPanel() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CFly Panel - VLES 管理端</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%23000'/><path d='M 60 15 L 30 50 h 15 L 40 85 L 70 50 H 55 Z' fill='%23fff'/></svg>">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
  <script>
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            primary: "#000000",
            "background-light": "#ffffff",
            "background-dark": "#09090b",
            border: {
              light: "#e4e4e7",
              dark: "#27272a"
            },
            muted: {
              light: "#71717a",
              dark: "#a1a1aa"
            }
          },
          fontFamily: {
            display: ["Inter", "sans-serif"],
          },
          borderRadius: {
            DEFAULT: "0.5rem",
            'lg': "0.75rem",
          },
        },
      },
    };
  </script>
  <style>
    body { font-family: 'Inter', sans-serif; }
    .material-symbols-outlined { font-size: 20px; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #d1d1d1; border-radius: 10px; }
    .dark ::-webkit-scrollbar-thumb { background: #3f3f46; }
    .section-content { display: none; }
    .section-content.active { display: block; }
  </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-950 dark:text-slate-50 transition-colors duration-200">
  <div class="flex min-h-screen">
    <!-- 侧边栏 -->
    <aside class="w-64 border-r border-border-light dark:border-border-dark flex flex-col fixed inset-y-0 left-0 z-50 bg-background-light dark:bg-background-dark">
      <div class="p-6 border-b border-border-light dark:border-border-dark flex items-center gap-2">
        <div class="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white">
          <span class="material-symbols-outlined">terminal</span>
        </div>
        <span class="font-bold text-lg tracking-tight">CFly Panel</span>
      </div>
      
      <nav class="flex-1 overflow-y-auto p-4 space-y-1">
        <div class="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-2 px-2">Main</div>
        
        <a onclick="switchSection('dashboard')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">dashboard</span>
          <span>仪表盘</span>
        </a>
        
        <a onclick="switchSection('users')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">group</span>
          <span>用户管理</span>
        </a>
        
        <a onclick="switchSection('proxy-ips')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">language</span>
          <span>反代 IP</span>
        </a>
        
        <a onclick="switchSection('best-domains')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">star</span>
          <span>优选域名</span>
        </a>
        
        <div class="pt-6 pb-2">
          <div class="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-2 px-2">Sales</div>
        </div>
        
        <a onclick="switchSection('plans')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">inventory_2</span>
          <span>套餐管理</span>
        </a>
        
        <a onclick="switchSection('orders')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">receipt_long</span>
          <span>订单管理</span>
        </a>
        
        <a onclick="switchSection('announcements')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">campaign</span>
          <span>公告管理</span>
        </a>
        
        <div class="pt-6 pb-2">
          <div class="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-2 px-2">System</div>
        </div>
        
        <a onclick="switchSection('payment')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">payments</span>
          <span>支付渠道</span>
        </a>
        
        <a onclick="switchSection('invites')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">confirmation_number</span>
          <span>邀请码</span>
        </a>
        
        <a onclick="switchSection('password')" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">lock</span>
          <span>修改密码</span>
        </a>
      </nav>
      
      <div class="p-4 border-t border-border-light dark:border-border-dark space-y-2">
        <button onclick="adminLogout()" class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border-light dark:border-border-dark hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-sm font-medium">
          <span class="material-symbols-outlined text-sm">logout</span>
          退出登录
        </button>
      </div>
    </aside>
    
    <!-- 主内容区 -->
    <main class="flex-1 ml-64 min-h-screen">
      <header class="h-16 border-b border-border-light dark:border-border-dark flex items-center justify-between px-8 bg-background-light dark:bg-background-dark">
        <h1 id="section-title" class="text-xl font-bold tracking-tight">仪表盘概览</h1>
        <div class="flex items-center gap-4">
          <button class="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-light dark:text-muted-dark" id="themeToggle">
            <span class="material-symbols-outlined dark:hidden">dark_mode</span>
            <span class="material-symbols-outlined hidden dark:block">light_mode</span>
          </button>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              <span class="material-symbols-outlined">person</span>
            </div>
            <span class="text-sm font-medium">Admin</span>
          </div>
        </div>
      </header>
      
      <div class="p-8 space-y-8 max-w-7xl mx-auto">
        <!-- 仪表盘部分 -->
        <div id="section-dashboard" class="section-content active">
          <section>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold tracking-tight">系统概览</h2>
              <span class="text-xs text-muted-light dark:text-muted-dark">最后更新: <span id="last-update-time"></span></span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="p-6 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-muted-light dark:text-muted-dark">总用户数</span>
                  <span class="material-symbols-outlined text-muted-light dark:text-muted-dark">group</span>
                </div>
                <div id="stat-total-users" class="text-3xl font-bold tracking-tight">0</div>
                <div class="mt-2 text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                  <span class="material-symbols-outlined text-xs">trending_up</span>
                  系统总用户
                </div>
              </div>
              
              <div class="p-6 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-muted-light dark:text-muted-dark">活跃用户</span>
                  <span class="material-symbols-outlined text-muted-light dark:text-muted-dark">bolt</span>
                </div>
                <div id="stat-active-users" class="text-3xl font-bold tracking-tight">0</div>
                <div class="mt-2 text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                  <span class="material-symbols-outlined text-xs">trending_up</span>
                  未过期用户
                </div>
              </div>
              
              <div class="p-6 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-muted-light dark:text-muted-dark">配置节点数</span>
                  <span class="material-symbols-outlined text-muted-light dark:text-muted-dark">dns</span>
                </div>
                <div id="stat-config-nodes" class="text-3xl font-bold tracking-tight">0</div>
                <div class="mt-2 text-[10px] text-muted-light dark:text-muted-dark font-medium">
                  正常运行中
                </div>
              </div>
              
              <div class="p-6 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-muted-light dark:text-muted-dark">已过期用户</span>
                  <span class="material-symbols-outlined text-muted-light dark:text-muted-dark">event_busy</span>
                </div>
                <div id="stat-expired-users" class="text-3xl font-bold tracking-tight">0</div>
                <div class="mt-2 text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                  <span class="material-symbols-outlined text-xs">warning</span>
                  需要关注
                </div>
              </div>
            </div>
          </section>
          
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
              <section class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
                <div class="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                  <div>
                    <h3 class="font-semibold">核心配置</h3>
                    <p class="text-xs text-muted-light dark:text-muted-dark">调整全局系统参数</p>
                  </div>
                  <span class="material-symbols-outlined text-muted-light">settings</span>
                </div>
                
                <div class="p-6 space-y-6">
                  <div class="flex items-center justify-between">
                    <div>
                      <label class="text-sm font-medium block">新用户注册试用</label>
                      <p class="text-xs text-muted-light dark:text-muted-dark">开启后，新注册用户自动获得免费试用时长</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input id="input-enableTrial" class="sr-only peer" type="checkbox"/>
                      <div class="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <label class="text-xs font-semibold text-muted-light uppercase">试用时长 (天)</label>
                      <select id="input-trialDays" class="w-full h-9 px-3 rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm focus:ring-1 focus:ring-primary outline-none">
                        <option value="1">1 天</option>
                        <option value="3">3 天</option>
                        <option value="7">7 天</option>
                      </select>
                    </div>
                    
                    <div class="space-y-2">
                      <label class="text-xs font-semibold text-muted-light uppercase">注册邀请码</label>
                      <div class="flex items-center gap-4 mt-3">
                        <span class="text-xs text-muted-light">强制开启邀请码注册</span>
                        <input id="input-requireInviteCode" class="rounded border-zinc-300 dark:border-zinc-700 text-primary focus:ring-primary" type="checkbox"/>
                      </div>
                    </div>
                  </div>
                  
                  <div class="pt-4 border-t border-border-light dark:border-border-dark">
                    <h4 class="text-xs font-semibold text-muted-light uppercase mb-4 tracking-wider">订单自动过期设置</h4>
                    
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-2">
                        <label class="text-xs font-medium">待审核订单时长</label>
                        <select id="input-pendingOrderExpiry" class="w-full h-9 px-3 rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm outline-none">
                          <option value="15">15 分钟</option>
                          <option value="30">30 分钟</option>
                          <option value="60">60 分钟</option>
                        </select>
                      </div>
                      
                      <div class="space-y-2">
                        <label class="text-xs font-medium">支付订单时长</label>
                        <select id="input-paymentOrderExpiry" class="w-full h-9 px-3 rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm outline-none">
                          <option value="10">10 分钟</option>
                          <option value="15">15 分钟</option>
                          <option value="30">30 分钟</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
                  <button onclick="saveSystemSettings()" class="bg-primary text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
                    保存配置
                  </button>
                </div>
              </section>
            </div>
            
            <div class="space-y-6">
              <section class="p-6 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <h3 class="font-semibold mb-4 text-sm flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm">bolt</span>
                  快速操作
                </h3>
                <div class="flex flex-wrap gap-2">
                  <button onclick="switchSection('proxy-ips')" class="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-zinc-800 transition-colors">
                    <span class="material-symbols-outlined text-xs">public</span>
                    反代 IP
                  </button>
                  <button onclick="switchSection('best-domains')" class="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-zinc-800 transition-colors">
                    <span class="material-symbols-outlined text-xs">star</span>
                    优选域名
                  </button>
                  <button onclick="switchSection('users')" class="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-zinc-800 transition-colors">
                    <span class="material-symbols-outlined text-xs">person_add</span>
                    用户管理
                  </button>
                </div>
              </section>
              
              <section class="p-6 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <h3 class="font-semibold mb-1 text-sm flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm">database</span>
                  数据备份
                </h3>
                <p class="text-[10px] text-muted-light mb-4">导出或导入所有系统配置与用户数据</p>
                
                <div class="space-y-3">
                  <button onclick="exportData()" class="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border-light dark:border-border-dark rounded-md text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <span class="material-symbols-outlined text-xs">download</span>
                    导出全部数据 (.JSON)
                  </button>
                  <button onclick="importData()" class="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border-light dark:border-border-dark rounded-md text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <span class="material-symbols-outlined text-xs">upload_file</span>
                    导入备份数据
                  </button>
                </div>
                
                <div class="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-md">
                  <p class="text-[10px] text-amber-700 dark:text-amber-500 leading-relaxed font-medium">
                    <span class="font-bold">⚠️ 注意:</span> 导入操作会覆盖现有数据，建议操作前先导出备份。
                  </p>
                </div>
              </section>
            </div>
          </div>
          
          <section class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
              <h3 class="font-semibold">最近注册用户</h3>
              <button onclick="switchSection('users')" class="text-xs font-medium text-muted-light hover:text-primary transition-colors">查看全部</button>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="bg-zinc-50 dark:bg-zinc-900/50 text-muted-light dark:text-muted-dark font-medium border-b border-border-light dark:border-border-dark">
                    <th class="px-6 py-3">UID / 账号</th>
                    <th class="px-6 py-3">注册时间</th>
                    <th class="px-6 py-3">套餐状态</th>
                    <th class="px-6 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody id="users-table-body" class="divide-y divide-border-light dark:divide-border-dark">
                  <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-muted-light">
                      加载中...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
        
        <!-- 用户管理部分 -->
        <div id="section-users" class="section-content">
          <div class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark">
              <h2 class="text-lg font-semibold">用户管理</h2>
              <p class="text-xs text-muted-light mt-1">管理所有注册用户账号</p>
            </div>
            <div class="p-6">
              <p class="text-muted-light">用户管理功能开发中...</p>
            </div>
          </div>
        </div>
        
        <!-- 其他部分占位 -->
        <div id="section-proxy-ips" class="section-content">
          <div class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark">
              <h2 class="text-lg font-semibold">反代 IP 管理</h2>
            </div>
            <div class="p-6">
              <p class="text-muted-light">反代 IP 功能开发中...</p>
            </div>
          </div>
        </div>
        
        <div id="section-best-domains" class="section-content">
          <div class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark">
              <h2 class="text-lg font-semibold">优选域名管理</h2>
            </div>
            <div class="p-6">
              <p class="text-muted-light">优选域名功能开发中...</p>
            </div>
          </div>
        </div>
        
        <div id="section-plans" class="section-content">
          <div class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark">
              <h2 class="text-lg font-semibold">套餐管理</h2>
            </div>
            <div class="p-6">
              <p class="text-muted-light">套餐管理功能开发中...</p>
            </div>
          </div>
        </div>
        
        <div id="section-orders" class="section-content">
          <div class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark">
              <h2 class="text-lg font-semibold">订单管理</h2>
            </div>
            <div class="p-6">
              <p class="text-muted-light">订单管理功能开发中...</p>
            </div>
          </div>
        </div>
        
        <div id="section-announcements" class="section-content">
          <div class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark">
              <h2 class="text-lg font-semibold">公告管理</h2>
            </div>
            <div class="p-6">
              <p class="text-muted-light">公告管理功能开发中...</p>
            </div>
          </div>
        </div>
        
        <div id="section-payment" class="section-content">
          <div class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark">
              <h2 class="text-lg font-semibold">支付渠道</h2>
            </div>
            <div class="p-6">
              <p class="text-muted-light">支付渠道功能开发中...</p>
            </div>
          </div>
        </div>
        
        <div id="section-invites" class="section-content">
          <div class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark">
              <h2 class="text-lg font-semibold">邀请码</h2>
            </div>
            <div class="p-6">
              <p class="text-muted-light">邀请码功能开发中...</p>
            </div>
          </div>
        </div>
        
        <div id="section-password" class="section-content">
          <div class="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden">
            <div class="p-6 border-b border-border-light dark:border-border-dark">
              <h2 class="text-lg font-semibold">修改密码</h2>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">旧密码</label>
                <input id="oldPassword" type="password" class="w-full h-9 px-3 rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm outline-none focus:ring-1 focus:ring-primary"/>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">新密码</label>
                <input id="newPassword" type="password" class="w-full h-9 px-3 rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm outline-none focus:ring-1 focus:ring-primary"/>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">确认新密码</label>
                <input id="confirmPassword" type="password" class="w-full h-9 px-3 rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm outline-none focus:ring-1 focus:ring-primary"/>
              </div>
              <button onclick="changePassword()" class="bg-primary text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
                修改密码
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
  
  <script>
    // 主题切换
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      htmlElement.classList.add('dark');
    }
    
    themeToggle.addEventListener('click', () => {
      if (htmlElement.classList.contains('dark')) {
        htmlElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        htmlElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    });
    
    // 页面切换
    function switchSection(sectionName) {
      // 隐藏所有部分
      document.querySelectorAll('.section-content').forEach(el => {
        el.classList.remove('active');
      });
      
      // 显示目标部分
      const targetSection = document.getElementById('section-' + sectionName);
      if (targetSection) {
        targetSection.classList.add('active');
      }
      
      // 更新导航高亮
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('bg-zinc-100', 'dark:bg-zinc-800', 'text-primary', 'dark:text-white', 'font-medium');
      });
      
      event.target.closest('.nav-link').classList.add('bg-zinc-100', 'dark:bg-zinc-800', 'text-primary', 'dark:text-white', 'font-medium');
      
      // 更新标题
      const titles = {
        'dashboard': '仪表盘概览',
        'users': '用户管理',
        'proxy-ips': '反代 IP 管理',
        'best-domains': '优选域名管理',
        'plans': '套餐管理',
        'orders': '订单管理',
        'announcements': '公告管理',
        'payment': '支付渠道',
        'invites': '邀请码管理',
        'password': '修改密码'
      };
      document.getElementById('section-title').textContent = titles[sectionName] || '管理面板';
    }
    
    // 获取仪表盘统计数据
    async function fetchDashboardStats() {
      try {
        const response = await fetch('/api/admin/statistics');
        if (!response.ok) throw new Error('Failed to fetch statistics');
        
        const stats = await response.json();
        
        document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
        document.getElementById('stat-active-users').textContent = stats.activeUsers || 0;
        document.getElementById('stat-config-nodes').textContent = stats.configNodes || 0;
        document.getElementById('stat-expired-users').textContent = stats.expiredUsers || 0;
      } catch (error) {
        console.error('获取统计数据失败:', error);
      }
    }
    
    // 加载系统配置
    async function loadSystemSettings() {
      try {
        const response = await fetch('/api/admin/getSystemSettings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        
        const data = await response.json();
        
        if (data.success && data.settings) {
          const settings = data.settings;
          
          document.getElementById('input-enableTrial').checked = settings.enableTrial || false;
          document.getElementById('input-trialDays').value = settings.trialDays || 1;
          document.getElementById('input-requireInviteCode').checked = settings.requireInviteCode || false;
          document.getElementById('input-pendingOrderExpiry').value = settings.pendingOrderExpiry || 30;
          document.getElementById('input-paymentOrderExpiry').value = settings.paymentOrderExpiry || 15;
        }
      } catch (error) {
        console.error('加载系统配置失败:', error);
      }
    }
    
    // 保存系统配置
    async function saveSystemSettings() {
      try {
        const settings = {
          enableTrial: document.getElementById('input-enableTrial').checked,
          trialDays: parseInt(document.getElementById('input-trialDays').value),
          requireInviteCode: document.getElementById('input-requireInviteCode').checked,
          pendingOrderExpiry: parseInt(document.getElementById('input-pendingOrderExpiry').value),
          paymentOrderExpiry: parseInt(document.getElementById('input-paymentOrderExpiry').value)
        };
        
        const response = await fetch('/api/admin/updateSystemSettings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('✅ 保存成功');
        } else {
          alert('❌ 保存失败: ' + (result.error || '未知错误'));
        }
      } catch (error) {
        console.error('保存系统配置失败:', error);
        alert('❌ 保存失败: ' + error.message);
      }
    }
    
    // 加载最近注册用户
    async function loadRecentUsers() {
      try {
        const accountResponse = await fetch('/api/admin/getUserAccount');
        if (!accountResponse.ok) throw new Error('Failed to fetch user accounts');
        
        const accounts = await accountResponse.json();
        const recentAccounts = accounts.slice(0, 5);
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        
        for (const account of recentAccounts) {
          const detailResponse = await fetch(\`/api/admin/user/\${account.uuid}\`);
          if (!detailResponse.ok) continue;
          
          const userDetail = await detailResponse.json();
          
          let statusClass = '';
          let statusText = '';
          
          if (!userDetail.enabled) {
            statusClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            statusText = '已禁用';
          } else if (userDetail.expiry && userDetail.expiry < Date.now()) {
            statusClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            statusText = '已过期';
          } else {
            statusClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            statusText = '正常';
          }
          
          const registerTime = userDetail.registeredAt 
            ? new Date(userDetail.registeredAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }).replace(/\\//g, '-')
            : '未知';
          
          const shortUuid = account.uuid.substring(0, 13) + '...';
          
          const row = \`
            <tr>
              <td class="px-6 py-4">
                <div class="font-medium">\${shortUuid}</div>
                <div class="text-[10px] text-muted-light">\${account.account || '无账号'}</div>
              </td>
              <td class="px-6 py-4 text-muted-light">\${registerTime}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium \${statusClass}">
                  \${statusText}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button class="text-primary dark:text-white hover:underline text-xs font-medium" onclick="switchSection('users')">编辑</button>
              </td>
            </tr>
          \`;
          
          tbody.innerHTML += row;
        }
        
        if (recentAccounts.length === 0) {
          tbody.innerHTML = \`
            <tr>
              <td colspan="4" class="px-6 py-8 text-center text-muted-light">
                暂无注册用户
              </td>
            </tr>
          \`;
        }
      } catch (error) {
        console.error('加载最近注册用户失败:', error);
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = \`
          <tr>
            <td colspan="4" class="px-6 py-8 text-center text-red-600">
              加载用户数据失败: \${error.message}
            </td>
          </tr>
        \`;
      }
    }
    
    // 导出数据
    async function exportData() {
      try {
        const res = await fetch('/api/admin/export-all');
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vles-data-' + Date.now() + '.json';
        a.click();
        alert('✅ 数据导出成功');
      } catch (e) {
        alert('❌ 导出失败: ' + e.message);
      }
    }
    
    // 导入数据
    async function importData() {
      alert('数据导入功能开发中...');
    }
    
    // 修改密码
    async function changePassword() {
      const oldPassword = document.getElementById('oldPassword').value.trim();
      const newPassword = document.getElementById('newPassword').value.trim();
      const confirmPassword = document.getElementById('confirmPassword').value.trim();
      
      if (!oldPassword || !newPassword || !confirmPassword) return alert('请填写完整信息');
      if (newPassword.length < 6) return alert('新密码至少6位');
      if (newPassword !== confirmPassword) return alert('两次输入的新密码不一致');
      
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({oldPassword, newPassword})
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert('✅ 密码修改成功，请重新登录');
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        setTimeout(() => adminLogout(), 2000);
      } else {
        alert('❌ ' + (data.error || '修改失败'));
      }
    }
    
    // 退出登录
    async function adminLogout() {
      await fetch('/api/admin/logout', {method: 'POST'});
      location.reload();
    }
    
    // 更新时间显示
    function updateTime() {
      const now = new Date();
      const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      const elem = document.getElementById('last-update-time');
      if (elem) elem.textContent = timeStr;
    }
    
    // 页面加载时获取数据
    document.addEventListener('DOMContentLoaded', () => {
      updateTime();
      fetchDashboardStats();
      loadSystemSettings();
      loadRecentUsers();
      
      // 默认激活第一个导航项
      const firstNavLink = document.querySelector('.nav-link');
      if (firstNavLink) {
        firstNavLink.classList.add('bg-zinc-100', 'dark:bg-zinc-800', 'text-primary', 'dark:text-white', 'font-medium');
      }
    });
  </script>
</body>
</html>`;
}

module.exports = {
    renderAdminPanel,
    renderAdminLoginPage
};
