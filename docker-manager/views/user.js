/**
 * 用户前端视图 - Shadcn UI 风格
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

// 生成一周签到日历
function generateWeekCalendar(lastCheckin, checkinStreak) {
    const now = new Date();
    const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayDay = beijingNow.getUTCDay(); // 0=Sunday, 1=Monday, ...
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    let html = '';
    
    for (let i = 0; i < 7; i++) {
        const dayOffset = i - todayDay;
        const date = new Date(beijingNow);
        date.setUTCDate(date.getUTCDate() + dayOffset);
        
        const isToday = dayOffset === 0;
        const isPast = dayOffset < 0;
        const isFuture = dayOffset > 0;
        const isSunday = i === 0;
        
        // 判断是否已签到
        let isCheckedIn = false;
        if (isPast && checkinStreak > 0) {
            const daysAgo = Math.abs(dayOffset);
            isCheckedIn = daysAgo < checkinStreak;
        } else if (isToday && lastCheckin) {
            const todayStart = new Date(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth(), beijingNow.getUTCDate());
            todayStart.setTime(todayStart.getTime() - 8 * 60 * 60 * 1000);
            isCheckedIn = lastCheckin >= todayStart.getTime();
        }
        
        html += '<div class="flex flex-col items-center gap-1">';
        
        if (isCheckedIn) {
            // 已签到 - 黑色打勾
            html += '<div class="w-full aspect-square rounded border-2 border-slate-900 dark:border-zinc-100 bg-slate-900 dark:bg-zinc-100 flex items-center justify-center">';
            html += '<span class="material-symbols-outlined text-white dark:text-slate-900 text-[14px] md:text-[16px]">check</span>';
            html += '</div>';
        } else if (isToday) {
            // 今天未签到 - 高亮边框
            html += '<div class="w-full aspect-square rounded border-2 border-primary flex items-center justify-center bg-primary/5">';
            html += '<span class="text-[10px] font-bold text-primary">今天</span>';
            html += '</div>';
        } else if (isSunday && isFuture) {
            // 未来的周日 - 显示礼物图标（额外奖励提示）
            html += '<div class="w-full aspect-square rounded border border-dashed border-amber-300 dark:border-amber-700 flex items-center justify-center bg-amber-50/50 dark:bg-amber-900/10">';
            html += '<span class="material-symbols-outlined text-amber-500 text-[14px] md:text-[16px]">redeem</span>';
            html += '</div>';
        } else if (isFuture) {
            // 未来的日期 - 显示 +1
            html += '<div class="w-full aspect-square rounded border border-slate-200 dark:border-zinc-800 flex items-center justify-center">';
            html += '<span class="text-[10px] text-slate-400">+1</span>';
            html += '</div>';
        } else {
            // 过去未签到的日期 - 灰色
            html += '<div class="w-full aspect-square rounded border border-slate-200 dark:border-zinc-800 flex items-center justify-center opacity-40">';
            html += '<span class="text-[10px] text-slate-400">-</span>';
            html += '</div>';
        }
        
        // 星期标签 - 今天加粗显示
        const dayLabel = weekDays[i];
        const labelClass = isToday 
            ? 'font-bold text-primary text-[11px]' 
            : 'text-slate-500 dark:text-zinc-500 text-[10px]';
        html += `<span class="${labelClass}">${dayLabel}</span>`;
        html += '</div>';
    }
    
    return html;
}

// 渲染登录/注册页面
async function renderAuthPage() {
    const settings = db.getSettings() || {};
    const siteName = settings.siteName || 'CloudDash';
    const enableRegister = settings.enableRegister === true;
    const requireInviteCode = settings.requireInviteCode === true;
    const enableTurnstile = settings.enableTurnstile === true;
    const turnstileSiteKey = settings.turnstileSiteKey || '';
    
    return `<!DOCTYPE html>
<html class="light" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>${siteName} - 登录</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%23000'/><path d='M 60 15 L 30 50 h 15 L 40 85 L 70 50 H 55 Z' fill='%23fff'/></svg>">
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script>
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#09090b",
        "background-light": "#ffffff",
        "background-dark": "#09090b",
        border: { light: "#e4e4e7", dark: "#27272a" }
      },
      fontFamily: {
        display: ["Inter", "Noto Sans SC", "sans-serif"],
        sans: ["Inter", "Noto Sans SC", "sans-serif"],
      },
      borderRadius: { DEFAULT: "0.5rem", lg: "0.75rem" }
    }
  }
};
</script>
<style>
body { font-family: 'Inter', 'Noto Sans SC', sans-serif; -webkit-font-smoothing: antialiased; }
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; }

/* 全球边缘节点网络背景 */
#network-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0.4;
}

#network-bg canvas {
  width: 100%;
  height: 100%;
}

.content-wrapper {
  position: relative;
  z-index: 1;
}

/* 登录卡片增强对比 */
.login-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02);
}

.dark .login-card {
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 60px rgba(255, 255, 255, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.08);
}

/* Cloudflare Turnstile 样式 */
.cf-turnstile-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem 0;
  min-height: 65px;
}

.cf-turnstile {
  margin: 0 auto;
}

/* 深色模式下调整 Turnstile */
.dark .cf-turnstile iframe {
  filter: invert(1) hue-rotate(180deg);
}

/* 禁用状态的按钮样式 */
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
</head>
<body class="bg-slate-50 dark:bg-zinc-950 min-h-screen flex items-center justify-center p-4 overflow-hidden">
<!-- 全球边缘节点网络背景 -->
<div id="network-bg"></div>

<div class="content-wrapper w-full max-w-md">
<div class="text-center mb-8">
<div class="inline-flex items-center gap-2 mb-4">
<div class="w-10 h-10 bg-primary rounded flex items-center justify-center shadow-lg">
<span class="text-white material-symbols-outlined text-lg">bolt</span>
</div>
<span class="font-bold text-2xl tracking-tight text-slate-900 dark:text-white">${siteName}</span>
</div>
<p class="text-slate-600 dark:text-zinc-400">全球边缘加速网络</p>
</div>

<div class="login-card border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden">
<div class="flex border-b border-slate-200 dark:border-zinc-800">
<button onclick="switchTab('login')" id="loginTab" class="flex-1 px-4 py-3 text-sm font-medium transition-colors bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100">登录</button>
<button onclick="switchTab('register')" id="registerTab" class="flex-1 px-4 py-3 text-sm font-medium transition-colors text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-slate-100">注册</button>
</div>

<div id="loginForm" class="p-6 space-y-4">
<div class="space-y-2">
<label class="text-sm font-medium text-slate-700 dark:text-zinc-300">用户名</label>
<input id="loginUsername" type="text" class="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="请输入用户名"/>
</div>
<div class="space-y-2">
<label class="text-sm font-medium text-slate-700 dark:text-zinc-300">密码</label>
<input id="loginPassword" type="password" class="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="请输入密码"/>
</div>
<button onclick="handleLogin()" class="w-full bg-primary text-white py-2 rounded-md hover:opacity-90 transition-opacity font-medium">登录</button>
<div id="loginError" class="hidden text-sm text-red-600"></div>
</div>

<div id="registerForm" class="p-6 space-y-4 hidden">
${!enableRegister ? '<div class="text-center text-slate-500 py-4">注册功能暂未开放</div>' : `
<div class="space-y-2">
<label class="text-sm font-medium text-slate-700 dark:text-zinc-300">用户名</label>
<input id="registerUsername" type="text" class="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="3-20个字符"/>
</div>
<div class="space-y-2">
<label class="text-sm font-medium text-slate-700 dark:text-zinc-300">密码</label>
<input id="registerPassword" type="password" class="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="至少6个字符"/>
</div>
${requireInviteCode ? `<div class="space-y-2">
<label class="text-sm font-medium text-slate-700 dark:text-zinc-300">邀请码</label>
<input id="registerInviteCode" type="text" class="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="请输入邀请码"/>
</div>` : ''}
${enableTurnstile && turnstileSiteKey ? `<div id="turnstile-container" class="cf-turnstile-wrapper">
<div class="cf-turnstile" data-sitekey="${turnstileSiteKey}" data-callback="onTurnstileSuccess" data-theme="auto" data-size="normal"></div>
</div>` : ''}
<button id="registerButton" onclick="handleRegister()" class="w-full bg-primary text-white py-2 rounded-md hover:opacity-90 transition-opacity font-medium" ${enableTurnstile && turnstileSiteKey ? 'disabled' : ''}>注册</button>
<div id="registerError" class="hidden text-sm text-red-600"></div>
`}
</div>
</div>
</div>

<div class="fixed bottom-6 right-6 z-10">
<button onclick="toggleDarkMode()" class="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
<span class="material-symbols-outlined dark:hidden">dark_mode</span>
<span class="material-symbols-outlined hidden dark:block">light_mode</span>
</button>
</div>

<script>
// 初始化深色模式
(function() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.documentElement.classList.add('dark');
  }
})();

// 切换深色模式函数
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('darkMode', isDark);
  if (typeof updateNetworkTheme === 'function') {
    updateNetworkTheme();
  }
}

// 全球边缘节点网络背景动画
(function() {
  const container = document.getElementById('network-bg');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);
  
  let width, height;
  let nodes = [];
  let animationId;
  
  // 初始化画布尺寸
  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  
  // 节点类
  class Node {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.radius = Math.random() * 2 + 1;
      this.connections = [];
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
    }
    
    draw() {
      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // 初始化节点
  function initNodes() {
    nodes = [];
    const nodeCount = Math.floor((width * height) / 15000);
    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new Node());
    }
  }
  
  // 绘制连接线
  function drawConnections() {
    const isDark = document.documentElement.classList.contains('dark');
    const maxDistance = 150;
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDistance) {
          const opacity = (1 - distance / maxDistance) * 0.3;
          const lineWidth = distance < 80 ? 1.5 : 1;
          
          ctx.strokeStyle = isDark 
            ? \`rgba(255, 255, 255, \${opacity})\`
            : \`rgba(0, 0, 0, \${opacity * 0.6})\`;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
  }
  
  // 绘制世界地图轮廓（简化版）
  function drawWorldMap() {
    const isDark = document.documentElement.classList.contains('dark');
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    
    // 简化的大陆轮廓
    const continents = [
      // 北美洲
      [[0.15, 0.2], [0.2, 0.15], [0.25, 0.2], [0.22, 0.35], [0.15, 0.4]],
      // 南美洲
      [[0.2, 0.45], [0.25, 0.5], [0.23, 0.65], [0.18, 0.6]],
      // 欧洲
      [[0.45, 0.15], [0.55, 0.18], [0.52, 0.3], [0.48, 0.28]],
      // 非洲
      [[0.48, 0.32], [0.55, 0.38], [0.52, 0.55], [0.45, 0.5]],
      // 亚洲
      [[0.58, 0.15], [0.75, 0.2], [0.8, 0.35], [0.7, 0.4], [0.6, 0.3]],
      // 澳洲
      [[0.75, 0.6], [0.82, 0.62], [0.8, 0.7], [0.73, 0.68]]
    ];
    
    continents.forEach(points => {
      ctx.beginPath();
      points.forEach((point, i) => {
        const x = point[0] * width;
        const y = point[1] * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    });
  }
  
  // 动画循环
  function animate() {
    ctx.clearRect(0, 0, width, height);
    
    drawWorldMap();
    drawConnections();
    
    nodes.forEach(node => {
      node.update();
      node.draw();
    });
    
    animationId = requestAnimationFrame(animate);
  }
  
  // 更新主题
  window.updateNetworkTheme = function() {
    // 主题切换时重绘一帧
  };
  
  // 初始化
  resizeCanvas();
  initNodes();
  animate();
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    resizeCanvas();
    initNodes();
  });
})();

function switchTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('loginTab').classList.toggle('bg-white', tab === 'login');
  document.getElementById('loginTab').classList.toggle('dark:bg-zinc-950', tab === 'login');
  document.getElementById('loginTab').classList.toggle('text-slate-900', tab === 'login');
  document.getElementById('loginTab').classList.toggle('dark:text-slate-100', tab === 'login');
  document.getElementById('loginTab').classList.toggle('text-slate-500', tab !== 'login');
  document.getElementById('loginTab').classList.toggle('dark:text-zinc-500', tab !== 'login');
  
  document.getElementById('registerTab').classList.toggle('bg-white', tab === 'register');
  document.getElementById('registerTab').classList.toggle('dark:bg-zinc-950', tab === 'register');
  document.getElementById('registerTab').classList.toggle('text-slate-900', tab === 'register');
  document.getElementById('registerTab').classList.toggle('dark:text-slate-100', tab === 'register');
  document.getElementById('registerTab').classList.toggle('text-slate-500', tab !== 'register');
  document.getElementById('registerTab').classList.toggle('dark:text-zinc-500', tab !== 'register');
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  
  if(!username || !password) {
    errorEl.textContent = '请填写完整信息';
    errorEl.classList.remove('hidden');
    return;
  }
  
  try {
    const res = await fetch('/api/user/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    });
    const data = await res.json();
    
    if(res.ok && data.success) {
      window.location.href = '/user';
    } else {
      errorEl.textContent = data.error || '登录失败';
      errorEl.classList.remove('hidden');
    }
  } catch(e) {
    errorEl.textContent = '网络错误';
    errorEl.classList.remove('hidden');
  }
}

// Turnstile 验证成功回调
let turnstileToken = null;

function onTurnstileSuccess(token) {
  turnstileToken = token;
  const registerButton = document.getElementById('registerButton');
  if (registerButton) {
    registerButton.disabled = false;
  }
}

async function handleRegister() {
  const username = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;
  const invite_code = document.getElementById('registerInviteCode')?.value || '';
  const errorEl = document.getElementById('registerError');
  
  errorEl.classList.add('hidden');
  
  if(!username || !password) {
    errorEl.textContent = '请填写完整信息';
    errorEl.classList.remove('hidden');
    return;
  }
  
  // 检查是否启用了 Turnstile (通过检查容器是否存在)
  const turnstileContainer = document.getElementById('turnstile-container');
  if (turnstileContainer && !turnstileToken) {
    errorEl.textContent = '请完成人机验证';
    errorEl.classList.remove('hidden');
    return;
  }
  
  try {
    const res = await fetch('/api/user/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password, email: '', invite_code, turnstileToken})
    });
    const data = await res.json();
    
    if(res.ok && data.success) {
      // 显示成功消息并切换到登录
      const successDiv = document.createElement('div');
      successDiv.className = 'mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-md text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2';
      successDiv.innerHTML = '<span class="material-symbols-outlined text-[16px]">check_circle</span><span>注册成功！正在切换到登录...</span>';
      
      const registerForm = document.getElementById('registerForm');
      registerForm.insertBefore(successDiv, registerForm.firstChild);
      
      setTimeout(() => {
        successDiv.remove();
        switchTab('login');
        document.getElementById('loginUsername').value = username;
      }, 1500);
    } else {
      errorEl.textContent = data.error || '注册失败';
      errorEl.classList.remove('hidden');
    }
  } catch(e) {
    errorEl.textContent = '网络错误';
    errorEl.classList.remove('hidden');
  }
}
</script>
</body>
</html>`;
}

// 渲染用户面板
async function renderUserPanel(user) {
    const settings = db.getSettings() || {};
    const siteName = settings.siteName || 'CloudDash';
    const uuidUser = db.getUserByUUID(user.uuid);
    
    // 处理订阅URL：如果有多个用逗号分隔的URL，随机选择一个
    let subscribeUrl = settings.subUrl || `http://localhost:${process.env.PORT || 3000}`;
    if (subscribeUrl.includes(',')) {
        const urls = subscribeUrl.split(',').map(u => u.trim()).filter(u => u);
        subscribeUrl = urls[Math.floor(Math.random() * urls.length)];
    }
    // 确保URL有协议前缀
    if (subscribeUrl && !subscribeUrl.startsWith('http://') && !subscribeUrl.startsWith('https://')) {
        subscribeUrl = 'https://' + subscribeUrl;
    }
    
    // 判断用户状态：检查enabled和expiry
    const isEnabled = uuidUser && uuidUser.enabled === 1;
    const isExpired = uuidUser && uuidUser.expiry && uuidUser.expiry < Date.now();
    const statusText = !isEnabled ? '已禁用' : (isExpired ? '已过期' : '正常');
    const statusColor = !isEnabled ? 'red' : (isExpired ? 'amber' : 'emerald');
    
    const regTime = formatBeijingDate(user.createdAt);
    const expTime = formatBeijingDateTime(uuidUser?.expiry || 0);
    
    // 检查今天是否已签到
    const now = new Date();
    const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayStart = new Date(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth(), beijingNow.getUTCDate());
    todayStart.setTime(todayStart.getTime() - 8 * 60 * 60 * 1000);
    const hasCheckedIn = user.last_checkin && user.last_checkin >= todayStart.getTime();
    
    // 快捷链接配置
    const quickLinks = [];
    if (settings.customLink1Name && settings.customLink1Url) {
        quickLinks.push({ name: settings.customLink1Name, url: settings.customLink1Url });
    }
    if (settings.customLink2Name && settings.customLink2Url) {
        quickLinks.push({ name: settings.customLink2Name, url: settings.customLink2Url });
    }
    
    // 订阅链接 - subUrl 已经是完整的 Worker 地址，直接在路径中包含 UUID
    const subUrl = subscribeUrl || 'https://your-worker.workers.dev';
    const baseUrl = `${subUrl}/${user.uuid}`;
    const clashUrl = `${baseUrl}?type=clash`;
    const singboxUrl = `${baseUrl}?type=singbox`;
    const surgeUrl = `${baseUrl}?type=surge`;
    const shadowrocketUrl = `${baseUrl}`;
    const quantumultUrl = `${baseUrl}?type=quanx`;
    
    return `<!DOCTYPE html>
<html class="light" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>用户中心 - ${siteName}</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%23000'/><path d='M 60 15 L 30 50 h 15 L 40 85 L 70 50 H 55 Z' fill='%23fff'/></svg>">
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
<script>
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#09090b",
        "background-light": "#ffffff",
        "background-dark": "#09090b",
        border: { light: "#e4e4e7", dark: "#27272a" }
      },
      fontFamily: {
        display: ["Inter", "Noto Sans SC", "sans-serif"],
        sans: ["Inter", "Noto Sans SC", "sans-serif"],
      },
      borderRadius: { DEFAULT: "0.5rem", lg: "0.75rem" }
    }
  }
};
</script>
<style>
body { font-family: 'Inter', 'Noto Sans SC', sans-serif; -webkit-font-smoothing: antialiased; }
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 10px; }
/* Toast 动画 */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
/* 侧边栏移动端样式 */
#sidebar-overlay {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
#sidebar-overlay.active {
  opacity: 1;
  pointer-events: auto;
}
aside {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50;
  transition: transform 0.3s ease;
}
main {
  min-height: 100vh;
}
@media (max-width: 768px) {
  aside {
    transform: translateX(-100%);
  }
  aside.mobile-open {
    transform: translateX(0);
  }
  main {
    margin-left: 0;
    width: 100%;
  }
}
@media (min-width: 769px) {
  aside {
    transform: translateX(0);
  }
  main {
    margin-left: 256px;
  }
}
</style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
<!-- 移动端遮罩层 -->
<div id="sidebar-overlay" class="fixed inset-0 bg-black/50 z-40" onclick="toggleSidebar()"></div>

<!-- 侧边栏 -->
<aside id="sidebar" class="w-64 border-r border-slate-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-black h-screen">
<div class="p-6 flex-shrink-0">
<div class="flex items-center gap-2 mb-8">
<div class="w-8 h-8 bg-primary rounded flex items-center justify-center">
<span class="text-white material-symbols-outlined text-sm">bolt</span>
</div>
<span class="font-bold text-lg tracking-tight">${siteName}</span>
</div>
<nav class="space-y-1">
<a onclick="switchPage('account')" class="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors" id="nav-account">
<span class="material-symbols-outlined text-[20px]">account_circle</span>
账号信息
</a>
<a onclick="switchPage('node-status')" class="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors" id="nav-node-status">
<span class="material-symbols-outlined text-[20px]">cloud</span>
节点状态
</a>
<a onclick="switchPage('orders')" class="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors" id="nav-orders">
<span class="material-symbols-outlined text-[20px]">shopping_bag</span>
我的订单
</a>
<a onclick="switchPage('plans')" class="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors" id="nav-plans">
<span class="material-symbols-outlined text-[20px]">package_2</span>
套餐购买
</a>
</nav>
</div>
<div class="mt-auto p-6 border-t border-slate-200 dark:border-zinc-800 flex-shrink-0">
<button onclick="handleLogout()" class="flex items-center gap-3 px-3 py-2 w-full rounded-md text-slate-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors text-sm font-medium">
<span class="material-symbols-outlined text-[20px]">logout</span>
退出登录
</button>
</div>
</aside>

<!-- 主内容区域 -->
<main class="overflow-y-auto custom-scrollbar">
<header class="h-16 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-10">
<div class="flex items-center gap-2">
<button onclick="toggleSidebar()" class="md:hidden p-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors -ml-2">
<span class="material-symbols-outlined">menu</span>
</button>
<span class="material-symbols-outlined text-slate-400 hidden sm:block">dashboard</span>
<h1 class="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500" id="pageTitle">Dashboard / Account</h1>
</div>
<div class="flex items-center gap-2 md:gap-3">
${quickLinks.map(link => '<a href="' + link.url + '" target="_blank" rel="noopener noreferrer" class="flex text-[10px] md:text-sm border border-slate-200 dark:border-zinc-800 px-2 md:px-3 py-1 md:py-1.5 rounded hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors items-center gap-1 md:gap-2">' +
'<span class="material-symbols-outlined text-[16px] md:text-[18px]">open_in_new</span>' +
link.name +
'</a>').join('')}
<button onclick="showAnnouncements()" class="text-sm bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 transition-opacity flex items-center gap-2">
<span class="material-symbols-outlined text-[18px] hidden sm:block">campaign</span>
<span class="hidden sm:inline">查看</span>公告
</button>
</div>
</header>

<div class="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
<!-- 账号信息页面 -->
<div id="page-account">
<section>
<div class="flex items-center gap-2 mb-4">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">info</span>
<h2 class="text-base md:text-lg font-semibold tracking-tight">基本信息</h2>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
<div class="p-4 md:p-5 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950">
<p class="text-xs text-slate-500 dark:text-zinc-500 uppercase font-medium mb-1">用户名</p>
<p class="text-lg md:text-xl font-bold break-all">${user.username}</p>
</div>
<div class="p-4 md:p-5 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 flex flex-col justify-between">
<p class="text-xs text-slate-500 dark:text-zinc-500 uppercase font-medium mb-1">账号状态</p>
<div>
<span class="inline-flex items-center px-2 py-0.5 rounded border border-${statusColor}-200 dark:border-${statusColor}-900/50 bg-${statusColor}-50 dark:bg-${statusColor}-950/20 text-${statusColor}-700 dark:text-${statusColor}-400 text-xs font-medium">
<span class="w-1 h-1 rounded-full bg-${statusColor}-500 mr-1.5"></span>
${statusText}
</span>
</div>
</div>
<div class="p-4 md:p-5 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950">
<p class="text-xs text-slate-500 dark:text-zinc-500 uppercase font-medium mb-1">注册时间</p>
<p class="text-sm md:text-base font-medium">${regTime}</p>
</div>
<div class="p-4 md:p-5 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950">
<p class="text-xs text-slate-500 dark:text-zinc-500 uppercase font-medium mb-1">订阅到期时间</p>
<p class="text-sm md:text-base font-medium break-all">${expTime}</p>
</div>
</div>
</section>

<section>
<div class="flex items-center gap-2 mb-4">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">link</span>
<h2 class="text-base md:text-lg font-semibold tracking-tight">订阅链接</h2>
</div>
<div class="p-4 md:p-6 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950">
<div class="flex flex-wrap gap-2 md:gap-3">
<button onclick="copyLink('original', '通用订阅')" class="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 border border-slate-200 dark:border-zinc-800 rounded-md text-xs md:text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
<span class="material-symbols-outlined text-[16px] md:text-[18px]">language</span>
<span class="whitespace-nowrap">通用订阅</span>
</button>
<button onclick="copyLink('clash', 'Clash')" class="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 border border-slate-200 dark:border-zinc-800 rounded-md text-xs md:text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
<span class="material-symbols-outlined text-[16px] md:text-[18px]">bolt</span>
<span class="whitespace-nowrap">Clash</span>
</button>
<button onclick="copyLink('sing-box', 'SingBox')" class="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 border border-slate-200 dark:border-zinc-800 rounded-md text-xs md:text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
<span class="material-symbols-outlined text-[16px] md:text-[18px]">inventory_2</span>
<span class="whitespace-nowrap">SingBox</span>
</button>
<button onclick="copyLink('surge', 'Surge')" class="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 border border-slate-200 dark:border-zinc-800 rounded-md text-xs md:text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
<span class="material-symbols-outlined text-[16px] md:text-[18px]">waves</span>
<span class="whitespace-nowrap">Surge</span>
</button>
<button onclick="copyLink('shadowrocket', 'Shadowrocket')" class="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 border border-slate-200 dark:border-zinc-800 rounded-md text-xs md:text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
<span class="material-symbols-outlined text-[16px] md:text-[18px]">rocket_launch</span>
<span class="whitespace-nowrap">Shadowrocket</span>
</button>
<button onclick="copyLink('quantumult', 'Quantumult X')" class="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 border border-slate-200 dark:border-zinc-800 rounded-md text-xs md:text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
<span class="material-symbols-outlined text-[16px] md:text-[18px]">psychology</span>
<span class="whitespace-nowrap">Quantumult X</span>
</button>
</div>
</div>
</section>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
<!-- 签到中心卡片 -->
<div class="p-4 md:p-6 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 flex flex-col space-y-4 md:space-y-6">
<div>
<div class="flex items-center justify-between mb-2">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">event_available</span>
<h3 class="text-sm md:text-base font-semibold">签到中心</h3>
</div>
<span class="text-xs font-medium bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">已连续签到 ${user.checkin_streak || 0} 天</span>
</div>
<p class="text-xs md:text-sm text-slate-500 dark:text-zinc-500">每日签到可获得1天时长，连续签到奖励更多。</p>
</div>

<!-- 一周签到日历 -->
<div class="grid grid-cols-7 gap-1.5 md:gap-2">
${generateWeekCalendar(user.last_checkin, user.checkin_streak || 0)}
</div>

<!-- 里程碑提示 -->
<div class="p-2.5 md:p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-md">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-[14px] md:text-[16px] text-slate-600 dark:text-zinc-400">info</span>
<p class="text-[10px] md:text-xs text-slate-600 dark:text-zinc-400">奖励里程碑：每连续签到 7 天额外奖励 3 天时长（可持续累计）</p>
</div>
</div>

<!-- 签到按钮和统计 -->
<div class="space-y-2 md:space-y-3">
<button onclick="handleCheckin()" ${hasCheckedIn ? 'disabled' : ''} class="w-full bg-primary text-white py-2 md:py-2.5 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">how_to_reg</span>
${hasCheckedIn ? '今日已签到' : '立即签到'}
</button>
<div class="flex justify-center items-center gap-2 md:gap-3 text-[10px] md:text-[11px] text-slate-400 uppercase tracking-widest font-medium">
<span>累计签到: ${user.total_checkin_days || 0} 天</span>
<span class="w-1 h-1 rounded-full bg-slate-300"></span>
<span>累计奖励: ${(user.total_checkin_days || 0) + Math.floor((user.total_checkin_days || 0) / 7) * 3} 天</span>
</div>
</div>
</div>

<div class="p-4 md:p-6 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 flex flex-col justify-between">
<div>
<div class="flex items-center gap-2 mb-2">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">sync</span>
<h3 class="text-sm md:text-base font-semibold">重置订阅地址</h3>
</div>
<p class="text-xs md:text-sm text-slate-500 dark:text-zinc-500 mb-4 md:mb-6">如果您的链接泄露或无法连接，请重置。重置后旧链接将立即失效。</p>
</div>
<button onclick="handleResetUUID()" class="w-full border border-slate-200 dark:border-zinc-800 py-2 md:py-2.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-2 font-medium text-sm md:text-base">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">refresh</span>
重置订阅地址
</button>
</div>
</div>

<section class="max-w-2xl">
<div class="flex items-center gap-2 mb-4">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">lock</span>
<h2 class="text-base md:text-lg font-semibold tracking-tight">修改密码</h2>
</div>
<div class="p-4 md:p-6 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 space-y-4 md:space-y-6">
<div class="space-y-3 md:space-y-4">
<div class="space-y-2">
<label class="text-xs md:text-sm font-medium text-slate-700 dark:text-zinc-300">旧密码</label>
<input id="oldPassword" type="password" class="w-full px-3 py-2 text-sm md:text-base bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="请输入旧密码"/>
</div>
<div class="space-y-2">
<label class="text-xs md:text-sm font-medium text-slate-700 dark:text-zinc-300">新密码</label>
<input id="newPassword" type="password" class="w-full px-3 py-2 text-sm md:text-base bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="请输入新密码"/>
</div>
<div class="space-y-2">
<label class="text-xs md:text-sm font-medium text-slate-700 dark:text-zinc-300">确认新密码</label>
<input id="confirmPassword" type="password" class="w-full px-3 py-2 text-sm md:text-base bg-transparent border border-slate-200 dark:border-zinc-800 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="请再次输入新密码"/>
</div>
</div>
<button onclick="handleChangePassword()" class="bg-primary text-white px-4 md:px-6 py-2 md:py-2.5 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 font-medium text-sm md:text-base">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">save</span>
保存修改
</button>
</div>
</section>
</div>

<!-- 节点状态页面 -->
<div id="page-node-status" class="hidden">
<section>
<div class="flex items-center gap-2 mb-4">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">cloud</span>
<h2 class="text-base md:text-lg font-semibold tracking-tight">节点运行状态</h2>
</div>
<div class="border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 overflow-hidden">
<div class="px-3 md:px-4 py-2 md:py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 flex justify-between items-center">
<span class="text-[10px] md:text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">实时节点监测</span>
<span id="node-status-time-user" class="text-[10px] md:text-xs text-slate-400 dark:text-zinc-500">最后检测: --:--:--</span>
</div>
<div class="overflow-x-auto">
<table class="w-full text-left">
<thead class="bg-slate-50/30 dark:bg-zinc-900">
<tr>
<th class="px-2 md:px-4 py-2 font-medium text-slate-500 dark:text-zinc-400 w-8 md:w-12 text-center text-[10px] md:text-sm">序号</th>
<th class="px-2 md:px-4 py-2 font-medium text-slate-500 dark:text-zinc-400 text-[10px] md:text-sm">名称</th>
<th class="px-2 md:px-4 py-2 font-medium text-slate-500 dark:text-zinc-400 text-[10px] md:text-sm">节点</th>
<th class="px-2 md:px-4 py-2 font-medium text-slate-500 dark:text-zinc-400 text-right text-[10px] md:text-sm">状态</th>
</tr>
</thead>
<tbody id="node-status-list-user" class="divide-y divide-slate-100 dark:divide-zinc-800">
<tr>
<td colspan="4" class="px-4 py-8 text-center text-slate-400 dark:text-zinc-600">
<span class="material-symbols-outlined text-4xl mb-2 block">cloud_off</span>
<p class="text-sm">正在加载节点状态...</p>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</section>
</div>

<!-- 我的订单页面 -->
<div id="page-orders" class="hidden">
<section>
<div class="flex items-center gap-2 mb-4">
<span class="material-symbols-outlined text-[18px] md:text-[20px]">shopping_bag</span>
<h2 class="text-base md:text-lg font-semibold tracking-tight">我的订单</h2>
</div>
<div id="ordersList" class="space-y-3 md:space-y-4">
<div class="text-center text-slate-500 py-8">加载中...</div>
</div>
</section>
</div>

<!-- 套餐购买页面 -->
<div id="page-plans" class="hidden">
<div class="mb-8">
<div class="flex items-center gap-2 mb-2">
<span class="material-symbols-outlined text-slate-900 dark:text-white">inventory_2</span>
<h1 class="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">套餐购买</h1>
</div>
<p class="text-sm md:text-base text-slate-500 dark:text-slate-400">选择适合您的加速方案，享受高速网络体验</p>
</div>
<div id="plansList" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
<div class="text-center text-slate-500 py-8 col-span-full">加载中...</div>
</div>
</div>

<footer class="pt-12 pb-8 text-center border-t border-slate-100 dark:border-zinc-900">
<p class="text-xs text-slate-400 dark:text-zinc-600">© 2026 ${siteName}. All rights reserved.</p>
</footer>
</div>
</main>

<div class="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
<button onclick="toggleDarkMode()" class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
<span class="material-symbols-outlined text-[20px] dark:hidden">dark_mode</span>
<span class="material-symbols-outlined text-[20px] hidden dark:block">light_mode</span>
</button>
</div>

<!-- Shadcn Toast Container -->
<div id="toast-container" class="fixed bottom-20 right-4 md:bottom-6 md:right-20 z-[100] flex flex-col gap-2 pointer-events-none"></div>

<div id="modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
<div class="bg-white dark:bg-zinc-950 border border-slate-900 dark:border-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
<div class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-zinc-800">
<h3 class="text-lg font-bold text-slate-900 dark:text-white" id="modalTitle"></h3>
<button onclick="closeModal()" class="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
<span class="material-symbols-outlined text-[20px]">close</span>
</button>
</div>
<div class="p-6 overflow-y-auto flex-1" id="modalContent"></div>
</div>
</div>

<script>
// 初始化深色模式
(function() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.documentElement.classList.add('dark');
  }
})();

// 切换深色模式函数
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('darkMode', isDark);
}

let currentPage = 'account';
const navItems = ['account', 'node-status', 'orders', 'plans'];

// 侧边栏切换（移动端）
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('active');
}

function switchPage(page) {
  currentPage = page;
  window.location.hash = page;
  
  // 移动端切换页面后自动关闭侧边栏
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar.classList.contains('mobile-open')) {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  }
  
  navItems.forEach(p => {
    const pageEl = document.getElementById('page-' + p);
    const navEl = document.getElementById('nav-' + p);
    if(p === page) {
      pageEl.classList.remove('hidden');
      navEl.classList.add('bg-slate-100', 'dark:bg-zinc-800', 'text-sm', 'font-medium');
      navEl.classList.remove('text-slate-500', 'dark:text-zinc-400', 'hover:bg-slate-50', 'dark:hover:bg-zinc-900');
    } else {
      pageEl.classList.add('hidden');
      navEl.classList.remove('bg-slate-100', 'dark:bg-zinc-800');
      navEl.classList.add('text-slate-500', 'dark:text-zinc-400', 'hover:bg-slate-50', 'dark:hover:bg-zinc-900');
    }
  });
  
  const titles = {
    account: 'Dashboard / Account',
    'node-status': 'Dashboard / Node Status',
    orders: 'Dashboard / Orders',
    plans: 'Dashboard / Plans'
  };
  document.getElementById('pageTitle').textContent = titles[page];
  
  if(page === 'node-status') loadUserNodeStatus();
  if(page === 'orders') loadOrders();
  if(page === 'plans') loadPlans();
}

// 加载用户端节点状态
async function loadUserNodeStatus() {
  try {
    const response = await fetch('/api/best-domains');
    const data = await response.json();
    
    if (!data.success || !data.domains || data.domains.length === 0) {
      renderUserNodeStatus([]);
      return;
    }
    
    const currentBestDomains = data.domains;
    const nodes = [];
    
    for (let i = 0; i < currentBestDomains.length; i++) {
      const domain = currentBestDomains[i];
      const parsed = parseDomainEntry(domain);
      if (parsed) {
        let nodeAddress;
        if (parsed.isDomain) {
          nodeAddress = parsed.address + ':' + parsed.port;
        } else if (parsed.address.includes(':')) {
          nodeAddress = '[' + parsed.address + ']:' + parsed.port;
        } else {
          nodeAddress = parsed.address + ':' + parsed.port;
        }
        
        // 构建完整的节点名称（包含地区信息）
        let nodeName = parsed.label;
        if (parsed.region) {
          nodeName = parsed.label + ' ' + parsed.region;
        }
        
        nodes.push({
          id: i + 1,
          name: nodeName,
          node: nodeAddress,
          status: '在线'
        });
      }
    }
    
    renderUserNodeStatus(nodes);
    
    // 更新检测时间
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    document.getElementById('node-status-time-user').textContent = '最后检测: ' + timeStr;
  } catch (error) {
    console.error('加载节点状态失败:', error);
    renderUserNodeStatus([]);
  }
}

// 解析域名条目
function parseDomainEntry(entry) {
  try {
    let addressPart, infoPart;
    if (entry.includes('#')) {
      const parts = entry.split('#');
      addressPart = parts[0].trim();
      infoPart = parts[1].trim();
    } else {
      addressPart = entry.trim();
      infoPart = '';
    }
    
    let address, port, isDomain = false;
    
    if (addressPart.startsWith('[')) {
      // IPv6: [2606:4700:7::a29f:8601]:443
      const ipv6Match = addressPart.match(/^\\[([^\\]]+)\\]:([0-9]+)$/);
      if (!ipv6Match) return null;
      address = ipv6Match[1];
      port = ipv6Match[2];
      isDomain = false;
    } else if (addressPart.match(/^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}/)) {
      // IPv4: 104.18.34.78:443 或 104.18.34.78
      const ipv4Match = addressPart.match(/^([0-9.]+):?([0-9]+)?$/);
      if (ipv4Match) {
        address = ipv4Match[1];
        port = ipv4Match[2] || '443'; // 端口，默认443
        isDomain = false;
      } else {
        return null;
      }
    } else {
      // 域名: cf.twitter.now.cc 或 cf.twitter.now.cc:443
      isDomain = true;
      if (addressPart.includes(':')) {
        const domainMatch = addressPart.match(/^([^:]+):([0-9]+)$/);
        if (domainMatch) {
          address = domainMatch[1];
          port = domainMatch[2];
        } else {
          address = addressPart;
          port = '443';
        }
      } else {
        address = addressPart;
        port = '443';
      }
    }
    
    // 解析标签和地区
    let label, region;
    if (infoPart) {
      // 有#分隔符，说明有自定义别名或标签
      // 优先使用用户设置的别名
      const infoMatch = infoPart.match(/^(.+?)\\s+([A-Z]{2,4})$/);
      if (infoMatch) {
        label = infoMatch[1];
        region = infoMatch[2];
      } else {
        // 整个作为标签（用户自定义别名）
        label = infoPart;
        region = '';
      }
    } else if (isDomain) {
      // 域名节点且无别名：名称就是域名本身
      label = address;
      region = '';
    } else {
      // IP节点且无别名：使用IP地址
      label = address;
      region = '';
    }
    
    return { address, port, label, region, isDomain };
  } catch (e) {
    console.error('解析域名条目失败:', entry, e);
    return null;
  }
}

// 渲染用户端节点状态列表
function renderUserNodeStatus(nodes) {
  const tbody = document.getElementById('node-status-list-user');
  
  if (nodes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-slate-400 dark:text-zinc-600"><span class="material-symbols-outlined text-4xl mb-2 block">cloud_off</span><p class="text-sm">暂无节点状态数据</p></td></tr>';
    return;
  }
  
  tbody.innerHTML = nodes.map(node => {
    const statusClass = node.status === '在线' 
      ? 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
      : 'border-red-200 dark:border-red-900 text-red-600 dark:text-red-400';
    
    return '<tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">' +
      '<td class="px-2 md:px-4 py-2 md:py-3 text-slate-500 dark:text-zinc-500 text-center text-xs md:text-sm">' + node.id + '</td>' +
      '<td class="px-2 md:px-4 py-2 md:py-3 font-medium text-slate-900 dark:text-zinc-100 text-xs md:text-sm">' + node.name + '</td>' +
      '<td class="px-2 md:px-4 py-2 md:py-3 font-mono text-[10px] md:text-xs text-slate-600 dark:text-zinc-400">' + node.node + '</td>' +
      '<td class="px-2 md:px-4 py-2 md:py-3 text-right">' +
        '<span class="inline-flex items-center rounded-full border ' + statusClass + ' px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium">' + node.status + '</span>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  // 解析消息中的emoji图标
  let icon = '';
  let cleanMessage = message;
  
  if (message.startsWith('✅')) {
    type = 'success';
    cleanMessage = message.replace('✅', '').trim();
  } else if (message.startsWith('❌')) {
    type = 'error';
    cleanMessage = message.replace('❌', '').trim();
  } else if (message.startsWith('⏳')) {
    type = 'loading';
    cleanMessage = message.replace('⏳', '').trim();
  } else if (message.startsWith('ℹ️')) {
    type = 'info';
    cleanMessage = message.replace('ℹ️', '').trim();
  }
  
  // 根据类型选择图标
  const icons = {
    success: 'check_circle',
    error: 'cancel',
    warning: 'warning',
    info: 'info',
    loading: 'progress_activity'
  };
  
  icon = icons[type] || 'info';
  
  // 创建toast元素
  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto w-full max-w-sm bg-white dark:bg-zinc-950 border border-slate-900 dark:border-white rounded-lg shadow-sm backdrop-blur-sm transition-all duration-300 transform translate-x-0 opacity-100';
  toast.style.animation = 'slideInRight 0.3s ease-out';
  
  const iconColor = type === 'success' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400';
  
  toast.innerHTML = '<div class="flex items-start gap-3 p-4">' +
    '<span class="material-symbols-outlined text-[20px] flex-shrink-0 ' + iconColor + '">' + icon + '</span>' +
    '<div class="flex-1 min-w-0">' +
    '<p class="text-sm font-semibold text-slate-900 dark:text-white leading-tight">' + cleanMessage + '</p>' +
    '</div>' +
    '<button onclick="this.closest(&quot;div&quot;).parentElement.remove()" class="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">' +
    '<span class="material-symbols-outlined text-[18px]">close</span>' +
    '</button>' +
    '</div>';
  
  container.appendChild(toast);
  
  // 为loading类型的toast添加ID方便后续移除
  if (type === 'loading') {
    toast.setAttribute('data-loading', 'true');
  }
  
  // 自动移除（loading类型不自动移除）
  if (type !== 'loading') {
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  return toast;
}

// 移除所有loading toast
function removeLoadingToasts() {
  const loadingToasts = document.querySelectorAll('[data-loading="true"]');
  loadingToasts.forEach(toast => {
    toast.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  });
}

function openModal(title, content) {
  const modalTitle = document.getElementById('modalTitle');
  const modalHeader = modalTitle.closest('.flex.items-center.justify-between');
  
  if (title) {
    modalTitle.textContent = title;
    modalHeader.classList.remove('hidden');
  } else {
    modalHeader.classList.add('hidden');
  }
  
  document.getElementById('modalContent').innerHTML = content;
  const modalContent = document.getElementById('modalContent');
  
  // 如果没有标题，移除内容区的 padding
  if (!title) {
    modalContent.classList.remove('p-6');
    modalContent.classList.add('p-0');
  } else {
    modalContent.classList.remove('p-0');
    modalContent.classList.add('p-6');
  }
  
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  
  // 重置样式
  const modalTitle = document.getElementById('modalTitle');
  const modalHeader = modalTitle.closest('.flex.items-center.justify-between');
  const modalContent = document.getElementById('modalContent');
  
  modalHeader.classList.remove('hidden');
  modalContent.classList.remove('p-0');
  modalContent.classList.add('p-6');
}

async function copyLink(client, type) {
  try {
    // 获取用户UUID和订阅地址
    const uuid = '${user.uuid}';
    const subUrl = '${subUrl}';
    const originalUrl = subUrl + '/' + uuid;
    
    // 订阅转换配置
    const apiBaseUrl = 'https://url.v1.mk/sub';
    let finalUrl;
    
    // 根据客户端类型生成订阅链接
    if (client === 'original') {
      // 通用订阅：直接使用原始 URL
      finalUrl = originalUrl;
    } else {
      // 其他客户端：使用订阅转换
      const targetMap = {
        'clash': 'clash',
        'surge': 'surge',
        'shadowrocket': 'shadowrocket',
        'quantumult': 'quanx',
        'sing-box': 'singbox',
        'v2ray': 'v2ray'
      };
      
      finalUrl = apiBaseUrl + '?target=' + targetMap[client] + '&url=' + encodeURIComponent(originalUrl);
    }
    
    await navigator.clipboard.writeText(finalUrl);
    showToast('✅ ' + type + ' 链接已复制');
  } catch(e) {
    showToast('❌ 复制失败');
  }
}

async function handleCheckin() {
  try {
    const res = await fetch('/api/user/checkin', { method: 'POST' });
    const data = await res.json();
    if(res.ok && data.success) {
      // 显示签到成功消息，包含奖励信息
      if (data.milestone_reward > 0) {
        showToast('🎉 ' + data.message);
      } else {
        showToast('✅ ' + data.message);
      }
      setTimeout(() => location.reload(), 2000);
    } else {
      // 如果是已签到，显示信息提示；其他情况显示错误
      const msg = data.error || '签到失败';
      if(msg.includes('已签到')) {
        showToast('ℹ️ ' + msg);
      } else {
        showToast('❌ ' + msg);
      }
    }
  } catch(e) {
    showToast('❌ 网络错误');
  }
}

function showConfirm(title, message, onConfirm) {
  const content = \`
    <div class="space-y-6">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center">
          <span class="material-symbols-outlined text-slate-900 dark:text-white">help</span>
        </div>
        <p class="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed pt-2">\${message}</p>
      </div>
      <div class="flex gap-3 justify-end">
        <button onclick="closeModal()" class="px-4 py-2 border border-slate-900 dark:border-white rounded-md hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors text-sm font-semibold text-slate-900 dark:text-white">取消</button>
        <button onclick="confirmAction()" class="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-sm font-semibold">确定</button>
      </div>
    </div>
  \`;
  openModal(title, content);
  window.confirmAction = () => {
    closeModal();
    onConfirm();
  };
}

async function handleResetUUID() {
  showConfirm('重置订阅地址', '确定要重置订阅地址吗？重置后旧链接将立即失效！', async () => {
    try {
      const res = await fetch('/api/user/reset-uuid', { method: 'POST' });
      const data = await res.json();
      if(res.ok && data.success) {
        showToast('✅ ' + data.message);
        setTimeout(() => location.reload(), 1500);
      } else {
        showToast('❌ ' + (data.error || '重置失败'));
      }
    } catch(e) {
      showToast('❌ 网络错误');
    }
  });
}

async function handleChangePassword() {
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if(!oldPassword || !newPassword || !confirmPassword) {
    showToast('❌ 请填写完整信息');
    return;
  }
  
  if(newPassword !== confirmPassword) {
    showToast('❌ 两次密码输入不一致');
    return;
  }
  
  if(newPassword.length < 6) {
    showToast('❌ 新密码长度至少6位');
    return;
  }
  
  try {
    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({oldPassword, newPassword})
    });
    const data = await res.json();
    
    if(res.ok && data.success) {
      showToast('✅ ' + data.message);
      setTimeout(() => window.location.href = '/user/auth', 1500);
    } else {
      showToast('❌ ' + (data.error || '修改失败'));
    }
  } catch(e) {
    showToast('❌ 网络错误');
  }
}

async function handleLogout() {
  showConfirm('退出登录', '确定要退出登录吗？', async () => {
    try {
      await fetch('/api/user/logout', { method: 'POST' });
      window.location.href = '/user/auth';
    } catch(e) {
      showToast('❌ 退出失败');
    }
  });
}

async function loadOrders() {
  try {
    const res = await fetch('/api/user/orders');
    const data = await res.json();
    
    if(res.ok && data.success) {
      const orders = data.orders || [];
      const container = document.getElementById('ordersList');
      
      if(orders.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 py-8">暂无订单</div>';
        return;
      }
      
      const statusMap = {
        pending: { text: '待审核', color: 'amber' },
        payment: { text: '待支付', color: 'blue' },
        approved: { text: '已完成', color: 'emerald' },
        rejected: { text: '已拒绝', color: 'red' },
        expired: { text: '已过期', color: 'slate' }
      };
      
      container.innerHTML = orders.map(order => {
        // 计算订单是否超时（待审核订单15分钟过期，待支付订单10分钟过期）
        let isOrderExpired = false;
        let expiryText = '';
        if (order.status === 'pending' || order.status === 'payment') {
          const expiryMinutes = order.status === 'pending' ? 15 : 10;
          const expiryTime = order.created_at + (expiryMinutes * 60 * 1000);
          const now = Date.now();
          if (now < expiryTime) {
            const remainingMinutes = Math.ceil((expiryTime - now) / 60000);
            expiryText = \`<p class="text-xs text-amber-600 dark:text-amber-500 mt-1">\${remainingMinutes}分钟后订单过期</p>\`;
          } else {
            isOrderExpired = true;
          }
        }
        
        // 如果订单超时，显示已过期状态；否则显示原始状态
        const status = isOrderExpired ? statusMap['expired'] : (statusMap[order.status] || { text: order.status, color: 'slate' });
        
        // 格式化创建时间为 "2026/1/13 15:30"
        const createDate = new Date(order.created_at);
        const createTime = \`\${createDate.getFullYear()}/\${createDate.getMonth()+1}/\${createDate.getDate()} \${String(createDate.getHours()).padStart(2,'0')}:\${String(createDate.getMinutes()).padStart(2,'0')}\`;
        
        // 计算到期时间（如果有到期时间）
        let expireTimeStr = '';
        if (order.status === 'approved' && order.processed_at) {
          const expireDate = new Date(order.processed_at + order.duration_days * 24 * 60 * 60 * 1000);
          expireTimeStr = \`\${expireDate.getFullYear()}/\${expireDate.getMonth()+1}/\${expireDate.getDate()} \${String(expireDate.getHours()).padStart(2,'0')}:\${String(expireDate.getMinutes()).padStart(2,'0')}\`;
        }
        
        return \`
<div class="p-5 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950">
<div class="flex justify-between items-start mb-3">
<div>
<p class="font-semibold">\${order.plan_name}</p>
<p class="text-sm text-slate-500 mt-1">订单号: \${order.id}</p>
\${expiryText}
</div>
<span class="inline-flex items-center px-2 py-0.5 rounded border border-\${status.color}-200 dark:border-\${status.color}-900/50 bg-\${status.color}-50 dark:bg-\${status.color}-950/20 text-\${status.color}-700 dark:text-\${status.color}-400 text-xs font-medium">
\${status.text}
</span>
</div>
<div class="grid \${expireTimeStr ? 'grid-cols-2' : 'grid-cols-3'} gap-2 text-sm">
<div><span class="text-slate-500">金额:</span> <span class="font-medium">¥\${order.amount || 0}</span></div>
<div><span class="text-slate-500">时长:</span> <span class="font-medium">\${order.duration_days}天</span></div>
<div><span class="text-slate-500">创建:</span> <span class="font-medium">\${createTime}</span></div>
\${expireTimeStr ? \`<div><span class="text-slate-500">到期:</span> <span class="font-medium">\${expireTimeStr}</span></div>\` : ''}
</div>
\${!isOrderExpired && (order.status === 'pending' || order.status === 'payment') ? \`
<div class="mt-3 flex gap-2">
\${order.status === 'payment' && order.amount > 0 ? \`<button onclick="handlePay(\${order.id})" class="flex-1 bg-primary text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-sm font-medium">立即支付</button>\` : ''}
<button onclick="handleCancelOrder(\${order.id})" class="flex-1 border border-slate-200 dark:border-zinc-800 px-4 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors text-sm font-medium">取消订单</button>
</div>
\` : ''}
</div>
        \`;
      }).join('');
    }
  } catch(e) {
    showToast('❌ 加载订单失败');
  }
}

async function loadPlans() {
  try {
    const res = await fetch('/api/plans');
    const data = await res.json();
    
    if(res.ok && data.success) {
      const plans = data.plans || [];
      const container = document.getElementById('plansList');
      
      if(plans.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-slate-500 py-8">暂无套餐</div>';
        return;
      }
      
      container.innerHTML = plans.map(plan => {
        const isFree = parseFloat(plan.price) === 0;
        const buttonText = isFree ? '立即体验' : '立即购买';
        const description = plan.description || '无限流量，不限设备数量，解锁主流 AI 服务';
        // 支持换行符、逗号、顿号分割，并去除每项前面的 ✔ ✓ √ 等符号
        const features = description.split(/[\\n,，、]/).map(f => f.replace(/^[✔✓√\\s]+/, '').trim()).filter(f => f).slice(0, 5); // 最多显示5个特性
        
        return \`
<div class="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl overflow-hidden transition-all duration-300 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-lg flex flex-col">
  <div class="p-4 md:p-5 flex flex-col">
    <h3 class="text-base md:text-lg font-bold mb-2 text-slate-900 dark:text-white">\${plan.name}</h3>
    <div class="flex items-baseline gap-1 mb-3">
      <span class="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">¥\${plan.price}</span>
      <span class="text-slate-400 dark:text-slate-500 font-medium text-xs">/ \${plan.duration_days}天</span>
    </div>
    <ul class="space-y-1.5 mb-4">
      \${features.map(feature => 
      '<li class="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">' +
        '<span class="material-symbols-outlined text-[14px] text-slate-900 dark:text-white mt-0.5 flex-shrink-0">check</span>' +
        '<span class="flex-1">' + feature.trim() + '</span>' +
      '</li>'
      ).join('')}
    </ul>
    <button onclick="handleBuyPlan(\${plan.id})" class="w-full bg-primary text-white py-2 rounded-md text-sm font-semibold hover:bg-slate-800 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mt-auto">
      \${buttonText}
    </button>
  </div>
</div>
        \`;
      }).join('');
    }
  } catch(e) {
    showToast('❌ 加载套餐失败');
  }
}

async function handleBuyPlan(planId) {
  try {
    showToast('⏳ 正在创建订单...');
    
    const res = await fetch('/api/user/orders/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({plan_id: planId})
    });
    const data = await res.json();
    
    // 移除loading提示
    removeLoadingToasts();
    
    if(res.ok && data.success) {
      if(data.needPayment) {
        // 付费套餐：直接打开支付方式选择
        showToast('✅ 订单创建成功');
        await handlePay(data.orderId);
      } else if(data.needApproval) {
        // 免费套餐需要审核
        showToast('✅ ' + data.message);
        setTimeout(() => switchPage('orders'), 1500);
      } else if(data.autoApproved) {
        // 免费套餐自动通过
        showToast('✅ ' + data.message);
        setTimeout(() => location.reload(), 1500);
      } else {
        showToast('✅ ' + data.message);
      }
    } else {
      showToast('❌ ' + (data.error || '购买失败'));
    }
  } catch(e) {
    removeLoadingToasts();
    showToast('❌ 网络错误');
  }
}

async function handleCancelOrder(orderId) {
  showConfirm('取消订单', '确定要取消此订单吗？', async () => {
    try {
      const res = await fetch('/api/user/orders/cancel', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({order_id: orderId})
      });
      const data = await res.json();
      
      if(res.ok && data.success) {
        showToast('✅ ' + data.message);
        loadOrders();
      } else {
        showToast('❌ ' + (data.error || '取消失败'));
      }
    } catch(e) {
      showToast('❌ 网络错误');
    }
  });
}

async function handlePay(orderId) {
  try {
    // 获取订单信息
    const ordersRes = await fetch('/api/user/orders');
    const ordersData = await ordersRes.json();
    const order = ordersData.orders?.find(o => o.id === orderId);
    
    if (!order) {
      showToast('❌ 订单不存在');
      return;
    }
    
    // 获取支付通道
    const channelsRes = await fetch('/api/payment/channels');
    const channelsData = await channelsRes.json();
    const channels = channelsData.channels || [];
    
    if (channels.length === 0) {
      showToast('❌ 暂无可用支付渠道');
      return;
    }
    
    // 构建支付方式选项
    const paymentOptions = \`
      <style>
        input[type="radio"]:checked + label .radio-dot {
          background-color: #09090b;
          border-color: #09090b;
        }
        .dark input[type="radio"]:checked + label .radio-dot {
          background-color: #fafafa;
          border-color: #fafafa;
        }
      </style>
      <div class="px-6 pt-6 pb-4">
        <h2 class="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">选择支付方式</h2>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">请选择您偏好的支付渠道以完成订阅</p>
      </div>
      <div class="px-6 py-4">
        <div class="space-y-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div class="flex justify-between items-center">
            <span class="text-sm text-zinc-500 dark:text-zinc-400">订阅套餐</span>
            <span class="text-sm font-medium text-zinc-900 dark:text-zinc-50">\${order.plan_name}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-zinc-500 dark:text-zinc-400">应付金额</span>
            <span class="text-sm font-bold text-zinc-900 dark:text-zinc-50">¥ \${order.amount}</span>
          </div>
        </div>
        <div class="mt-6">
          <label class="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 block">支付渠道</label>
          <div class="space-y-2" id="paymentMethodsList">
            \${channels.map((channel, index) => 
              '<div class="relative">' +
                '<input ' + (index === 0 ? 'checked' : '') + ' class="peer hidden" id="channel_' + channel.id + '" name="payment_method" type="radio" value="' + channel.id + '" data-code="' + channel.code + '"/>' +
                '<label class="flex items-center justify-between px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all peer-checked:border-zinc-900 dark:peer-checked:border-zinc-100 peer-checked:ring-1 peer-checked:ring-zinc-900 dark:peer-checked:ring-zinc-100" for="channel_' + channel.id + '">' +
                  '<div class="flex items-center gap-3">' +
                    '<div class="radio-dot w-2 h-2 rounded-full border border-zinc-300 dark:border-zinc-700 transition-all"></div>' +
                    '<span class="text-sm font-medium text-zinc-900 dark:text-zinc-50">' + channel.name + '</span>' +
                  '</div>' +
                '</label>' +
              '</div>'
            ).join('')}
          </div>
        </div>
      </div>
      <div class="px-6 py-6 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-3">
        <button onclick="confirmPayment(\${orderId})" class="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 font-medium rounded-md hover:opacity-90 active:scale-[0.98] transition-all">
          确认支付
        </button>
        <button onclick="closeModal()" class="w-full py-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          取消
        </button>
      </div>
    \`;
    
    openModal('', paymentOptions);
  } catch (e) {
    showToast('❌ 加载支付方式失败');
  }
}

async function confirmPayment(orderId) {
  const selectedChannel = document.querySelector('input[name="payment_method"]:checked');
  if (!selectedChannel) {
    showToast('❌ 请选择支付方式');
    return;
  }
  
  const channelId = parseInt(selectedChannel.value);
  const tradeType = selectedChannel.getAttribute('data-code') || 'usdt.trc20';
  closeModal();
  
  try {
    showToast('⏳ 正在创建支付订单...');
    
    const res = await fetch('/api/user/orders/pay', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        order_id: orderId,
        channel_id: channelId,
        trade_type: tradeType
      })
    });
    
    const data = await res.json();
    
    // 移除loading提示
    removeLoadingToasts();
    
    if(res.ok && data.success) {
      if(data.data && data.data.payment_url) {
        window.open(data.data.payment_url, '_blank');
        showToast('✅ 已打开支付页面，请完成支付');
      } else {
        showToast('✅ 支付订单创建成功');
      }
      loadOrders();
    } else {
      showToast('❌ ' + (data.error || '支付失败'));
    }
  } catch(e) {
    removeLoadingToasts();
    console.error('支付错误:', e);
    showToast('❌ 网络错误');
  }
}

async function selectPayment(orderId, paymentType) {
  closeModal();
  try {
    const res = await fetch('/api/user/orders/pay', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({order_id: orderId, payment_type: paymentType})
    });
    const data = await res.json();
    
    if(res.ok && data.success) {
      if(data.payment_url) {
        window.open(data.payment_url, '_blank');
        showToast('✅ 已打开支付页面');
      } else {
        showToast('✅ ' + data.message);
      }
      loadOrders();
    } else {
      showToast('❌ ' + (data.error || '支付失败'));
    }
  } catch(e) {
    showToast('❌ 网络错误');
  }
}

async function showAnnouncements() {
  try {
    const res = await fetch('/api/announcement');
    const data = await res.json();
    
    if(res.ok && data.success) {
      const announcements = data.announcements || [];
      if(announcements.length === 0) {
        openModal('系统公告', '<p class="text-slate-500 text-center py-4">暂无公告</p>');
        return;
      }
      
      const content = announcements.map(ann => 
'<div class="mb-6 last:mb-0">' +
'<h4 class="font-semibold mb-2">' + ann.title + '</h4>' +
'<p class="text-sm text-slate-600 dark:text-zinc-400 whitespace-pre-wrap">' + ann.content + '</p>' +
'<p class="text-xs text-slate-400 mt-2">' + new Date(ann.created_at).toLocaleString() + '</p>' +
'</div>'
      ).join('<hr class="my-4 border-slate-200 dark:border-zinc-800"/>');
      
      openModal('系统公告', content);
    }
  } catch(e) {
    showToast('❌ 加载公告失败');
  }
}

// 初始化
const initialPage = window.location.hash.slice(1) || 'account';
if(navItems.includes(initialPage)) {
  switchPage(initialPage);
} else {
  switchPage('account');
}

// 页面加载后自动显示公告（仅显示一次，使用 sessionStorage）
(function() {
  const hasShownAnnouncement = sessionStorage.getItem('announcementShown');
  if (!hasShownAnnouncement) {
    // 延迟500ms后显示公告，确保页面已完全加载
    setTimeout(() => {
      showAnnouncements();
      sessionStorage.setItem('announcementShown', 'true');
    }, 500);
  }
})();
</script>
</body>
</html>`;
}

module.exports = {
    renderAuthPage,
    renderUserPanel
};
