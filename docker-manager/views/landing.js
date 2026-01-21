/**
 * CFly 品牌介绍页 - Shadcn UI 风格
 */

function renderLandingPage() {
    return `<!DOCTYPE html>
<html lang="zh-CN" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CFly - 重塑您的网络边界</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        primary: "#000000",
                        "background-light": "#ffffff",
                        "background-dark": "#09090b",
                    },
                    fontFamily: {
                        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
                        display: ["Inter", "sans-serif"],
                    },
                    borderRadius: {
                        DEFAULT: "0.5rem",
                        'xl': '0.75rem',
                        '2xl': '1rem',
                    },
                },
            },
        };
    </script>
    <style type="text/tailwindcss">
        .network-bg {
            background-image: radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0);
            background-size: 40px 40px;
        }
        .dark .network-bg {
            background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0);
        }
        .glass-card {
            backdrop-filter: blur(8px);
            background-color: rgba(255, 255, 255, 0.7);
        }
        .dark .glass-card {
            background-color: rgba(9, 9, 11, 0.7);
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
    
    <!-- 导航栏 -->
    <nav class="fixed top-0 w-full z-50 border-b border-slate-200/60 dark:border-slate-800/60 glass-card">
        <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <div class="bg-primary p-1.5 rounded-lg">
                    <span class="material-symbols-outlined text-white text-xl">bolt</span>
                </div>
                <span class="font-bold text-xl tracking-tight">CFly</span>
            </div>
            <div class="hidden md:flex items-center space-x-8 text-sm font-medium">
                <a href="#features" class="hover:text-primary transition-colors">优势</a>
                <a href="#incentives" class="hover:text-primary transition-colors">激励</a>
                <a href="#core-tech" class="hover:text-primary transition-colors">核心技术</a>
                <a href="/login" class="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">登录</a>
                <button id="theme-toggle" class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span class="material-symbols-outlined text-lg dark:hidden">dark_mode</span>
                    <span class="material-symbols-outlined text-lg hidden dark:block">light_mode</span>
                </button>
            </div>
        </div>
    </nav>

    <!-- Hero 区域 -->
    <main class="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
        <div class="absolute inset-0 network-bg opacity-40"></div>
        <div class="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-40">
            <svg class="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 200 L300 100 L500 250 L800 150 L900 400" fill="none" stroke="currentColor" stroke-width="0.5"></path>
                <path d="M50 500 L250 450 L400 600 L700 550 L950 700" fill="none" stroke="currentColor" stroke-width="0.5"></path>
                <circle cx="300" cy="100" r="3" fill="currentColor"></circle>
                <circle cx="500" cy="250" r="3" fill="currentColor"></circle>
                <circle cx="800" cy="150" r="3" fill="currentColor"></circle>
                <circle cx="400" cy="600" r="3" fill="currentColor"></circle>
            </svg>
        </div>
        <div class="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium mb-8">
                <span class="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span class="text-slate-600 dark:text-slate-400">注册即送 <span class="text-primary dark:text-white font-bold">7</span> 天免费试用</span>
            </div>
            <h1 class="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-slate-950 to-slate-600 dark:from-white dark:to-slate-400">
                重塑您的网络边界
            </h1>
            <p class="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                CFly 为追求极致速度与安全的用户而生。每日签到赠送 <span class="text-primary dark:text-white font-bold">1</span> 天时长，实现长久免费使用。
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="/register" class="inline-block w-full sm:w-auto px-8 py-4 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-xl shadow-slate-200 dark:shadow-none text-center">
                    立即注册领取
                </a>
                <a href="#features" class="inline-block w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-center">
                    了解更多
                </a>
            </div>
        </div>
        <div class="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-40">
            <span class="text-[10px] uppercase tracking-widest mb-2 font-semibold">向下探索</span>
            <span class="material-symbols-outlined">expand_more</span>
        </div>
    </main>

    <!-- 优势特性 -->
    <section id="features" class="py-24 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/50">
        <div class="max-w-7xl mx-auto px-6">
            <div class="mb-16 text-center">
                <h2 class="text-3xl font-bold mb-4">为什么选择 CFly?</h2>
                <p class="text-slate-500 dark:text-slate-400">卓越的技术架构，支撑您的每一次流畅体验。</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-all group">
                    <div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                        <span class="material-symbols-outlined group-hover:text-white">speed</span>
                    </div>
                    <h3 class="text-xl font-bold mb-3">极致加速</h3>
                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                        利用最新的边缘计算技术，将延迟降至最低。无论身处何地，都能享受如丝般顺滑的网页加载与流媒体播放。
                    </p>
                </div>
                <div class="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-all group">
                    <div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                        <span class="material-symbols-outlined group-hover:text-white">security</span>
                    </div>
                    <h3 class="text-xl font-bold mb-3">多层加密</h3>
                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                        采用业界领先的高强度加密算法，保护您的数据隐私，防止任何形式的监听与干扰。
                    </p>
                </div>
                <div class="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-all group">
                    <div class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                        <span class="material-symbols-outlined group-hover:text-white">public</span>
                    </div>
                    <h3 class="text-xl font-bold mb-3">全球解锁</h3>
                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                        提供解锁主流 AI 服务（如 ChatGPT）及全球流媒体平台的能力，打破地域限制，拥抱互联网自由。
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- 核心技术 -->
    <section id="core-tech" class="py-24 bg-white dark:bg-background-dark overflow-hidden">
        <div class="max-w-7xl mx-auto px-6">
            <div class="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                <div class="max-w-2xl">
                    <h2 class="text-4xl md:text-5xl font-bold tracking-tight mb-6">核心特性</h2>
                    <p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                        我们深耕底层网络协议，通过技术创新解决传统连接方案的痛点。
                        每一项特性的打磨，都是为了给您提供更专业的服务保障。
                    </p>
                </div>
                <div class="hidden md:block">
                    <div class="h-px w-24 bg-primary mb-2"></div>
                    <span class="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">Technical Excellence</span>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none">
                <div class="bg-white dark:bg-slate-900 p-10 md:p-14 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all duration-500 group">
                    <div class="flex flex-col h-full">
                        <div class="mb-8">
                            <span class="material-symbols-outlined text-4xl font-light text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform duration-500">devices_other</span>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">不限设备数量</h3>
                        <p class="text-slate-500 dark:text-slate-400 leading-relaxed">
                            一个账户，全家畅享。我们不对连接设备数量做任何人为限制，无论是您的手机、电脑、平板还是智能家居，均可同时享受极速加速服务。
                        </p>
                        <div class="mt-auto pt-8 flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">
                            01 / Unlimited Connectivity
                        </div>
                    </div>
                </div>
                <div class="bg-white dark:bg-slate-900 p-10 md:p-14 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all duration-500 group">
                    <div class="flex flex-col h-full">
                        <div class="mb-8">
                            <span class="material-symbols-outlined text-4xl font-light text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform duration-500">smart_toy</span>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">解锁主流 AI 服务</h3>
                        <p class="text-slate-500 dark:text-slate-400 leading-relaxed">
                            深度适配 OpenAI, Anthropic, Google Gemini 等主流人工智能平台。通过原生住宅级 IP 模拟，确保您的 AI 工具始终保持稳定可访问状态。
                        </p>
                        <div class="mt-auto pt-8 flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">
                            02 / AI Service Ready
                        </div>
                    </div>
                </div>
                <div class="bg-white dark:bg-slate-900 p-10 md:p-14 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all duration-500 group">
                    <div class="flex flex-col h-full">
                        <div class="mb-8">
                            <span class="material-symbols-outlined text-4xl font-light text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform duration-500">router</span>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">三网定时优选 IP</h3>
                        <p class="text-slate-500 dark:text-slate-400 leading-relaxed">
                            全自动化智能路由系统。根据中国电信、联通、移动的实时负载与路由状态，每小时自动调度最优节点，确保全天候毫秒级响应。
                        </p>
                        <div class="mt-auto pt-8 flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">
                            03 / Intelligent Routing
                        </div>
                    </div>
                </div>
                <div class="bg-white dark:bg-slate-900 p-10 md:p-14 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all duration-500 group">
                    <div class="flex flex-col h-full">
                        <div class="mb-8">
                            <span class="material-symbols-outlined text-4xl font-light text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform duration-500">language</span>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">全球落地 40+ 国家地区</h3>
                        <p class="text-slate-500 dark:text-slate-400 leading-relaxed">
                            节点足迹遍布各大洲主要枢纽，从北美到欧洲，从东南亚到中东。多地域选择让您可以随时切换虚拟位置，畅游全球互联网。
                        </p>
                        <div class="mt-auto pt-8 flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">
                            04 / Global Presence
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 激励机制 -->
    <section id="incentives" class="py-24 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/50">
        <div class="max-w-7xl mx-auto px-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="p-8 md:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-start justify-between">
                    <div>
                        <div class="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider mb-6">Welcome Gift</div>
                        <h2 class="text-3xl font-bold mb-4">注册即送 <span class="text-5xl inline-block mx-1 font-black underline underline-offset-8 decoration-2">7</span> 天试用</h2>
                        <p class="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                            无需任何预付，新用户完成注册即可自动激活 7 天全功能订阅包，体验最高速的边缘加速网络。
                        </p>
                    </div>
                    <a href="/register" class="px-6 py-3 border border-slate-900 dark:border-white rounded-lg text-sm font-bold hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">立即领取</a>
                </div>
                <div class="p-8 md:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-start justify-between">
                    <div>
                        <div class="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider mb-6">Daily Reward</div>
                        <h2 class="text-3xl font-bold mb-4">每日签到赠送 <span class="text-5xl inline-block mx-1 font-black underline underline-offset-8 decoration-2">1</span> 天时长</h2>
                        <p class="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                            简单签到，轻松累积。通过每日互动领取额外 1 天订阅时长，实现长久免费使用，真正做到连接自由。
                        </p>
                    </div>
                    <a href="/login" class="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:opacity-90 transition-all">前往签到</a>
                </div>
            </div>
        </div>
    </section>

    <!-- 页脚 -->
    <footer class="py-12 border-t border-slate-200 dark:border-slate-900 text-center text-slate-500 text-sm bg-slate-50/50 dark:bg-slate-950/50">
        <div class="max-w-7xl mx-auto px-6">
            <div class="flex items-center justify-center space-x-2 mb-6">
                <div class="bg-primary p-1 rounded">
                    <span class="material-symbols-outlined text-white text-xs">bolt</span>
                </div>
                <span class="font-bold text-slate-900 dark:text-white tracking-tight">CFly</span>
            </div>
            <p>© 2026 CFly. All rights reserved. 专为极致体验而生。</p>
            <div class="flex justify-center space-x-6 mt-6">
                <a href="#" class="hover:text-primary transition-colors">隐私政策</a>
                <a href="#" class="hover:text-primary transition-colors">服务条款</a>
                <a href="#" class="hover:text-primary transition-colors">状态</a>
            </div>
        </div>
    </footer>

    <!-- 主题切换脚本 -->
    <script>
        const themeToggleBtn = document.getElementById('theme-toggle');
        const html = document.documentElement;
        
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
        
        themeToggleBtn.addEventListener('click', () => {
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                localStorage.theme = 'light';
            } else {
                html.classList.add('dark');
                localStorage.theme = 'dark';
            }
        });
    </script>

</body>
</html>`;
}

module.exports = { renderLandingPage };
