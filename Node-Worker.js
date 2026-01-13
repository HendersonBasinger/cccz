import { connect } from 'cloudflare:sockets';

const REMOTE_API_URL = 'https://ccfly.me/api/users';
const API_TOKEN = '';
const FALLBACK_CONFIG = {
    proxyIPs: ['ProxyIP.SG.CMLiussss.net'],
    bestDomains: []
};
const REGION_PROXY_IPS = {
    EU: 'ProxyIP.US.CMLiussss.net',
    AS: 'ProxyIP.SG.CMLiussss.net', 
    JP: 'ProxyIP.JP.CMLiussss.net',
    US: 'ProxyIP.US.CMLiussss.net',
    HK: 'ProxyIP.HK.CMLiussss.net',
    KR: 'ProxyIP.KR.CMLiussss.net'
};
const COLO_REGIONS = {
    JP: new Set(['FUK', 'ICN', 'KIX', 'NRT', 'OKA']),
    EU: new Set(['AMS', 'CDG', 'FRA', 'LHR', 'DUB', 'MAD', 'MXP', 'ZRH', 'VIE', 'WAW', 'PRG', 'BRU', 'CPH', 'HEL', 'OSL', 'ARN', 'IST', 'ATH']),
    AS: new Set(['HKG', 'SIN', 'BKK', 'KUL', 'SGN', 'MNL', 'CGK', 'DEL', 'BOM', 'SYD', 'MEL', 'TPE', 'SEL'])
};
const coloToProxyMap = new Map();
for (const [region, colos] of Object.entries(COLO_REGIONS)) {
    for (const colo of colos) coloToProxyMap.set(colo, REGION_PROXY_IPS[region]);
}

function getProxyIPByColo(colo) {
    return coloToProxyMap.get(colo) || REGION_PROXY_IPS.US;
}

function smartSelectProxyIP(proxyList, colo) {
    if (!proxyList?.length) return null;
    const coloToRegion = {};
    for (const [region, colos] of Object.entries(COLO_REGIONS)) {
        for (const c of colos) coloToRegion[c] = region;
    }
    const currentRegion = coloToRegion[colo];
    const regionKw = { JP: ['jp'], AS: ['sg', 'hk', 'kr', 'tw'], EU: ['de', 'eu', 'uk'], US: ['us'] };
    if (currentRegion) {
        for (const proxy of proxyList) {
            const lp = proxy.toLowerCase();
            for (const kw of (regionKw[currentRegion] || [])) if (lp.includes(kw)) return proxy;
        }
    }
    return proxyList[0];
}

const CACHE_TTL = 60000;

let cachedData = {
    users: {},
    settings: FALLBACK_CONFIG,
    websiteUrl: '',
    lastUpdate: 0
};

const GEO_KEYWORDS = {
    'HK': ['hk', '香港'], 'TW': ['tw', '台湾'], 'JP': ['jp', '日本'],
    'SG': ['sg', '新加坡'], 'US': ['us', '美国'], 'KR': ['kr', '韩国'],
    'DE': ['de', '德国'], 'UK': ['uk', '英国']
};

function extractGeoLocation(str) {
    if (!str) return null;
    const s = str.toLowerCase();
    for (const [region, kws] of Object.entries(GEO_KEYWORDS)) {
        for (const kw of kws) if (s.includes(kw)) return region;
    }
    return null;
}

function smartSortProxies(proxyList, targetAddress) {
    if (!proxyList?.length) return [];
    const targetGeo = extractGeoLocation(targetAddress);
    if (!targetGeo) return [...proxyList];
    const matched = [], unmatched = [];
    proxyList.forEach(p => (extractGeoLocation(p) === targetGeo ? matched : unmatched).push(p));
    return [...matched, ...unmatched];
}

export default {
    async fetch(req) {
        const url = new URL(req.url);
        
        if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
            return await handleWebSocket(req);
        }
        
        if (req.method === 'GET') {
            if (url.pathname === '/') {
                try {
                    await syncRemoteConfig();
                } catch (e) {
                    console.error('Sync config failed on homepage:', e);
                }
                
                let websiteUrl = cachedData.websiteUrl 
                    || (cachedData.settings && cachedData.settings.subUrl) 
                    || 'https://example.com';
                
                websiteUrl = String(websiteUrl || 'https://example.com');
                if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
                    websiteUrl = 'https://' + websiteUrl;
                }
                
                const displayUrl = websiteUrl.replace(/^https?:\/\//, '');
                const html = `<!DOCTYPE html><html class="light" lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CFly 官网入口</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0" rel="stylesheet"><script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script><script>tailwind.config={darkMode:"class",theme:{extend:{colors:{primary:"#09090b","background-light":"#fff","background-dark":"#09090b"},fontFamily:{display:["Inter","system-ui","sans-serif"]},borderRadius:{DEFAULT:"0.5rem"}}}}</script><style>body{font-family:'Inter',sans-serif}.edge-network-bg{background-image:radial-gradient(circle at 2px 2px,rgba(0,0,0,0.05) 1px,transparent 0);background-size:40px 40px}.dark .edge-network-bg{background-image:radial-gradient(circle at 2px 2px,rgba(255,255,255,0.05) 1px,transparent 0)}.connecting-lines{position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:0.4}.line{position:absolute;background:linear-gradient(90deg,transparent,currentColor,transparent);height:1px;width:100%;opacity:0.1}.node{position:absolute;width:4px;height:4px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor;opacity:0.3}</style></head><body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center relative overflow-hidden"><div class="absolute inset-0 edge-network-bg z-0"></div><div class="connecting-lines z-0 text-slate-400 dark:text-slate-600"><div class="line top-[20%] left-0 rotate-[15deg]"></div><div class="line top-[50%] left-0 rotate-[-10deg]"></div><div class="line top-[80%] left-0 rotate-[5deg]"></div><div class="node top-[22%] left-[15%]"></div><div class="node top-[48%] left-[45%]"></div><div class="node top-[75%] left-[85%]"></div><div class="node top-[10%] left-[70%]"></div></div><main class="relative z-10 w-full max-w-[380px] px-6"><div class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col items-center text-center"><div class="mb-8"><span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>运行中</span></div><div class="mb-6 text-zinc-900 dark:text-zinc-100"><svg class="w-12 h-12" fill="none" height="48" viewBox="0 0 24 24" width="48" xmlns="http://www.w3.org/2000/svg"><path d="M22 2L11 13" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg></div><h1 class="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mb-2">CFly 官网入口</h1><p class="text-sm text-zinc-500 dark:text-zinc-400 mb-10">点击下方按钮访问官网</p><a class="w-full group bg-primary dark:bg-zinc-50 text-white dark:text-zinc-950 h-11 flex items-center justify-center gap-2 font-medium transition-all hover:opacity-90 active:scale-[0.98]" href="${websiteUrl}" target="_blank" rel="noopener noreferrer">进入官网<span class="material-symbols-outlined text-[18px]">north_east</span></a><div class="mt-10"><span class="text-[11px] font-mono tracking-wider text-zinc-400 dark:text-zinc-600 uppercase">${displayUrl}</span></div></div><button class="fixed bottom-6 right-6 p-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors" onclick="document.documentElement.classList.toggle('dark')"><span class="material-symbols-outlined block dark:hidden">dark_mode</span><span class="material-symbols-outlined hidden dark:block">light_mode</span></button></main></body></html>`;
                
                return new Response(html, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            }
            
            if (url.pathname === '/debug') {
                await syncRemoteConfig();
                return new Response(JSON.stringify({
                    users: cachedData.users,
                    settings: cachedData.settings,
                    lastUpdate: new Date(cachedData.lastUpdate).toISOString(),
                    apiUrl: REMOTE_API_URL
                }, null, 2), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            await syncRemoteConfig();
            const users = cachedData.users;
            for (const [uuid, userInfo] of Object.entries(users)) {
                if (url.pathname.toLowerCase().includes(uuid.toLowerCase())) {
                    return await handleSubscription(req, uuid, userInfo);
                }
            }
        }
        
        return new Response('Not Found - No matching UUID in path. Please check: 1) API URL is configured correctly, 2) User exists in manager, 3) UUID in URL is correct', { status: 404 });
    }
};

async function syncRemoteConfig(forceRefresh = false) {
    const now = Date.now();
    
    if (!forceRefresh && (now - cachedData.lastUpdate) < CACHE_TTL) {
        return;
    }
    
    if (forceRefresh && (now - cachedData.lastUpdate) < 5000) {
        return;
    }
    
    try {
        const headers = { 'User-Agent': 'CF-Node-Worker/1.0' };
        if (API_TOKEN) {
            headers['Authorization'] = `Bearer ${API_TOKEN}`;
        }
        
        const response = await fetch(REMOTE_API_URL, { 
            headers,
            cf: { cacheTtl: 0 }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.users && typeof data.users === 'object') {
            cachedData.users = data.users;
        }
        
        if (data.settings) {
            if (data.settings.websiteUrl) {
                cachedData.websiteUrl = data.settings.websiteUrl;
            } else if (data.settings.subUrl) {
                cachedData.websiteUrl = data.settings.subUrl;
            }
        }
        
        // 更新设置（确保 settings 不为 null）
        if (data.settings && typeof data.settings === 'object') {
            const settings = {};
            
            // 处理 proxyIPs (支持数组和单个字符串)
            if (Array.isArray(data.settings.proxyIPs) && data.settings.proxyIPs.length > 0) {
                settings.proxyIPs = data.settings.proxyIPs;
            } else if (data.settings.proxyIP) {
                settings.proxyIPs = [data.settings.proxyIP];
            } else {
                settings.proxyIPs = FALLBACK_CONFIG.proxyIPs;
            }
            
            // 处理 bestDomains
            if (Array.isArray(data.settings.bestDomains) && data.settings.bestDomains.length > 0) {
                settings.bestDomains = data.settings.bestDomains;
            } else {
                settings.bestDomains = FALLBACK_CONFIG.bestDomains;
            }
            
            cachedData.settings = settings;
        }
        
        cachedData.lastUpdate = now;
        
    } catch (error) {
        console.error('Failed to sync config:', error.message);
    }
}

async function handleSubscription(req, uuid, userInfo) {
    const url = new URL(req.url);
    const workerDomain = url.hostname;
    
    const expiry = typeof userInfo === 'object' ? userInfo.expiry : null;
    const userName = typeof userInfo === 'object' ? userInfo.name : userInfo;
    
    const websiteUrl = cachedData.websiteUrl || '';
    
    const links = generateVlessLinks(workerDomain, uuid, userName, expiry, websiteUrl);
    const base64Content = btoa(links.join('\n'));
    
    return new Response(base64Content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache'
        }
    });
}


function generateVlessLinks(workerDomain, uuid, userName, expiry, websiteUrl) {
    const links = [];
    const wsPath = encodeURIComponent('/?ed=2048');
    const protocol = 'vless';
    const domains = cachedData.settings.bestDomains || FALLBACK_CONFIG.bestDomains;
    
    function formatExpiry(timestamp) {
        if (!timestamp) return '未激活';
        const d = new Date(timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    let firstAddress = 'telecom.1412.tech:443';
    if (domains.length > 0) {
        const firstItem = domains[0];
        const parts = firstItem.split('#');
        let addressPart = parts[0].trim();
        
        // 处理地址和端口
        if (addressPart.startsWith('[')) {
            firstAddress = addressPart;
        } else if (addressPart.includes('[') && addressPart.includes(']')) {
            firstAddress = addressPart;
        } else {
            const colonCount = (addressPart.match(/:/g) || []).length;
            if (colonCount > 1) {
                const ipv6PortMatch = addressPart.match(/^(.+):(\d+)$/);
                if (ipv6PortMatch && !isNaN(ipv6PortMatch[2])) {
                    firstAddress = `[${ipv6PortMatch[1]}]:${ipv6PortMatch[2]}`;
                } else {
                    firstAddress = `[${addressPart}]:443`;
                }
            } else if (addressPart.includes(':')) {
                firstAddress = addressPart;
            } else {
                firstAddress = `${addressPart}:443`;
            }
        }
    }
    
    // 构建公共参数
    const commonParams = new URLSearchParams({
        encryption: 'none',
        security: 'tls',
        sni: workerDomain,
        fp: 'chrome',
        type: 'ws',
        host: workerDomain,
        path: wsPath
    });
    
    const websiteDisplay = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '') : '未设置官网';
    const websiteLink = `${protocol}://${uuid}@${firstAddress}?${commonParams.toString()}#${encodeURIComponent('官网' + websiteDisplay)}`;
    links.push(websiteLink);
    
    const expiryDisplay = formatExpiry(expiry);
    const expiryLink = `${protocol}://${uuid}@${firstAddress}?${commonParams.toString()}#${encodeURIComponent('套餐到期：' + expiryDisplay)}`;
    links.push(expiryLink);
    
    const sortedDomains = [...domains].sort((a, b) => {
        const isV6IpA = a.includes('[');
        const isV6IpB = b.includes('[');
        if (isV6IpA && !isV6IpB) return 1;  // a是IPv6 IP, b不是, a排后面
        if (!isV6IpA && isV6IpB) return -1; // a不是IPv6 IP, b是, a排前面
        return 0; // 其他情况保持原顺序
    });
    
    sortedDomains.forEach((item, index) => {
        const parts = item.split('#');
        let addressPart = parts[0].trim();
        const customAlias = parts[1] ? parts[1].trim() : null;
        
        // 处理地址和端口（支持 IPv6）
        let address;
        
        // 检测 IPv6 地址（已经带方括号的格式：[2606:4700::]:443）
        if (addressPart.startsWith('[')) {
            // IPv6 地址已经是正确格式，直接使用
            address = addressPart;
        } else if (addressPart.includes('[') && addressPart.includes(']')) {
            // IPv6 格式已经包含方括号
            address = addressPart;
        } else {
            // 检测是否是裸 IPv6 地址（包含多个冒号但没有方括号）
            const colonCount = (addressPart.match(/:/g) || []).length;
            
            if (colonCount > 1) {
                // 裸 IPv6 地址
                const ipv6PortMatch = addressPart.match(/^(.+):(\d+)$/);
                if (ipv6PortMatch && !isNaN(ipv6PortMatch[2])) {
                    // 有端口: 2606:4700::1:443
                    const ipv6Addr = ipv6PortMatch[1];
                    const port = ipv6PortMatch[2];
                    address = `[${ipv6Addr}]:${port}`;
                } else {
                    // 无端口，添加默认端口
                    address = `[${addressPart}]:443`;
                }
            } else if (addressPart.includes(':')) {
                // IPv4 或域名，已包含端口
                address = addressPart;
            } else {
                // IPv4 或域名，没有端口，添加默认端口 443
                address = `${addressPart}:443`;
            }
        }
        
        // 生成节点名称(直接使用域名/IP或自定义别名,不添加用户名前缀)
        let nodeName;
        if (customAlias) {
            // 使用自定义别名
            nodeName = customAlias;
        } else {
            // 使用地址(去掉端口)作为节点名
            nodeName = addressPart.replace(/:\d+$/, '');
        }
        
        // 构建 VLESS 参数
        const params = new URLSearchParams({
            encryption: 'none',
            security: 'tls',
            sni: workerDomain,
            fp: 'chrome',
            type: 'ws',
            host: workerDomain,
            path: wsPath
        });
        
        const vlessLink = `${protocol}://${uuid}@${address}?${params.toString()}#${encodeURIComponent(nodeName)}`;
        links.push(vlessLink);
    });
    
    return links;
}

async function handleWebSocket(req) {
    await syncRemoteConfig();
    
    const [client, webSocket] = Object.values(new WebSocketPair());
    webSocket.accept();
    
    const url = new URL(req.url);
    
    if (url.pathname.includes('%3F')) {
        const decoded = decodeURIComponent(url.pathname);
        const queryIndex = decoded.indexOf('?');
        if (queryIndex !== -1) {
            url.search = decoded.substring(queryIndex);
            url.pathname = decoded.substring(0, queryIndex);
        }
    }
    
    // 获取代理模式参数
    const mode = url.searchParams.get('mode') || 'auto';
    const proxyParam = url.searchParams.get('proxyip');
    
    // 获取 CF 机房代码，用于智能选择 ProxyIP
    const colo = req.cf?.colo || '';
    
    // 获取管理后台配置的 ProxyIP 列表
    const configuredProxyIPs = cachedData.settings.proxyIPs || FALLBACK_CONFIG.proxyIPs;
    
    // 确定代理 IP：优先 URL 参数 > 从配置列表中智能选择 > 硬编码兜底
    let proxyIP = proxyParam;
    if (!proxyIP && configuredProxyIPs.length > 0) {
        // 从配置的列表中智能选择（根据地理位置匹配）
        proxyIP = smartSelectProxyIP(configuredProxyIPs, colo);
    }
    if (!proxyIP) {
        proxyIP = getProxyIPByColo(colo);
    }
    
    let remoteSocket = null;
    let udpWriter = null;
    let isDNSQuery = false;
    
    new ReadableStream({
        start(controller) {
            webSocket.addEventListener('message', event => {
                controller.enqueue(event.data);
            });
            
            webSocket.addEventListener('close', () => {
                if (remoteSocket) {
                    try { remoteSocket.close(); } catch (e) {}
                }
                controller.close();
            });
            
            webSocket.addEventListener('error', () => {
                if (remoteSocket) {
                    try { remoteSocket.close(); } catch (e) {}
                }
                try { controller.error(new Error('WebSocket error')); } catch (e) {}
            });
            
            // 处理早期数据 (Early Data)
            const earlyData = req.headers.get('sec-websocket-protocol');
            if (earlyData) {
                try {
                    const binaryData = Uint8Array.from(
                        atob(earlyData.replace(/-/g, '+').replace(/_/g, '/')),
                        c => c.charCodeAt(0)
                    );
                    controller.enqueue(binaryData.buffer);
                } catch (e) {
                    // 忽略解码错误
                }
            }
        }
    }).pipeTo(new WritableStream({
        async write(chunk) {
            // 如果是 DNS 查询，特殊处理
            if (isDNSQuery && udpWriter) {
                try {
                    await udpWriter.write(chunk);
                } catch (e) {}
                return;
            }
            
            // 如果已经建立连接，直接转发数据
            if (remoteSocket) {
                try {
                    const writer = remoteSocket.writable.getWriter();
                    await writer.write(chunk);
                    writer.releaseLock();
                } catch (e) {}
                return;
            }
            
            // 解析 VLESS 协议头
            if (chunk.byteLength < 24) {
                return; // 数据包太小，忽略
            }
            
            const dataView = new DataView(chunk);
            
            // 验证 UUID (偏移 1-16)
            const uuidBytes = new Uint8Array(chunk.slice(1, 17));
            const uuidString = bytesToUUID(uuidBytes);
            
            // 检查 UUID 是否在允许列表中
            if (!cachedData.users[uuidString]) {
                // UUID 不在缓存中，尝试强制刷新配置
                await syncRemoteConfig(true);
                
                // 再次检查
                if (!cachedData.users[uuidString]) {
                    console.log('Unauthorized UUID:', uuidString);
                    return; // 未授权的 UUID，丢弃连接
                }
            }
            
            // 解析协议头
            const version = dataView.getUint8(0); // 应该是 0
            const optionLength = dataView.getUint8(17);
            const command = dataView.getUint8(18 + optionLength);
            
            // 仅支持 TCP (1) 和 UDP (2)
            if (command !== 1 && command !== 2) {
                return;
            }
            
            // 解析目标地址
            let position = 19 + optionLength;
            const targetPort = dataView.getUint16(position);
            const addressType = dataView.getUint8(position + 2);
            position += 3;
            
            let targetAddress = '';
            
            if (addressType === 1) {
                // IPv4
                targetAddress = `${dataView.getUint8(position)}.${dataView.getUint8(position + 1)}.${dataView.getUint8(position + 2)}.${dataView.getUint8(position + 3)}`;
                position += 4;
            } else if (addressType === 2) {
                // 域名
                const domainLength = dataView.getUint8(position);
                position += 1;
                targetAddress = new TextDecoder().decode(chunk.slice(position, position + domainLength));
                position += domainLength;
            } else if (addressType === 3) {
                // IPv6
                const ipv6Parts = [];
                for (let i = 0; i < 8; i++) {
                    ipv6Parts.push(dataView.getUint16(position + i * 2).toString(16));
                }
                targetAddress = ipv6Parts.join(':');
                position += 16;
            } else {
                return; // 不支持的地址类型
            }
            
            // 响应头
            const responseHeader = new Uint8Array([version, 0]);
            
            // 实际负载数据
            const payload = chunk.slice(position);
            
            // UDP 模式 - 仅支持 DNS 查询
            if (command === 2) {
                if (targetPort !== 53) {
                    return; // 仅支持 DNS (端口 53)
                }
                
                isDNSQuery = true;
                let headerSent = false;
                
                // DNS over HTTPS 处理
                const { readable, writable } = new TransformStream({
                    transform(dnsQuery, controller) {
                        // 解析 DNS 查询包（每个包前有 2 字节长度）
                        let offset = 0;
                        while (offset < dnsQuery.byteLength) {
                            const length = new DataView(dnsQuery.slice(offset, offset + 2)).getUint16(0);
                            const query = dnsQuery.slice(offset + 2, offset + 2 + length);
                            controller.enqueue(query);
                            offset += 2 + length;
                        }
                    }
                });
                
                // 发送 DNS 查询到 Cloudflare DoH
                readable.pipeTo(new WritableStream({
                    async write(dnsQuery) {
                        try {
                            const response = await fetch('https://1.1.1.1/dns-query', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/dns-message' },
                                body: dnsQuery
                            });
                            
                            if (response.ok && webSocket.readyState === 1) {
                                const dnsResponse = new Uint8Array(await response.arrayBuffer());
                                const responsePacket = new Uint8Array([
                                    ...(headerSent ? [] : responseHeader),
                                    dnsResponse.length >> 8,
                                    dnsResponse.length & 0xff,
                                    ...dnsResponse
                                ]);
                                webSocket.send(responsePacket);
                                headerSent = true;
                            }
                        } catch (e) {
                            console.error('DNS query failed:', e);
                        }
                    }
                })).catch(() => {});
                
                udpWriter = writable.getWriter();
                
                // 写入第一个 DNS 查询
                try {
                    await udpWriter.write(payload);
                } catch (e) {}
                
                return;
            }
            
            // TCP 模式 - 建立连接
            // 策略：直连优先，失败则用 ProxyIP（兼顾速度和 1034 问题）
            let socket = null;
            
            // 1. 先尝试直连（大部分非 CF 网站直连更快）
            try {
                socket = connect({ hostname: targetAddress, port: targetPort });
                await socket.opened;
            } catch (e) {
                // 2. 直连失败，使用 ProxyIP（解决 CF→CF 的 1034 错误）
                socket = null;
                if (proxyIP && mode !== 'direct') {
                    const [proxyHost, proxyPort] = proxyIP.includes(':') 
                        ? [proxyIP.split(':')[0], parseInt(proxyIP.split(':')[1])] 
                        : [proxyIP, 443];
                    try {
                        socket = connect({ hostname: proxyHost, port: proxyPort });
                        await socket.opened;
                    } catch (e) { socket = null; }
                }
            }
            
            if (!socket) return;
            
            remoteSocket = socket;
            
            // 发送初始负载
            try {
                const writer = socket.writable.getWriter();
                await writer.write(payload);
                writer.releaseLock();
            } catch (e) {}
            
            // 转发远程响应到 WebSocket
            let responseSent = false;
            socket.readable.pipeTo(new WritableStream({
                write(responseChunk) {
                    if (webSocket.readyState === 1) {
                        if (!responseSent) {
                            // 第一次响应需要加上头
                            webSocket.send(new Uint8Array([...responseHeader, ...new Uint8Array(responseChunk)]));
                            responseSent = true;
                        } else {
                            // 后续直接转发
                            webSocket.send(responseChunk);
                        }
                    }
                },
                close() {
                    if (webSocket.readyState === 1) {
                        webSocket.close();
                    }
                },
                abort() {
                    if (webSocket.readyState === 1) {
                        webSocket.close();
                    }
                }
            })).catch(() => {});
        }
    })).catch(() => {});
    
    return new Response(null, {
        status: 101,
        webSocket: client
    });
}

function bytesToUUID(bytes) {
    const hex = [];
    for (let i = 0; i < 256; i++) {
        hex.push((i + 0x100).toString(16).substr(1));
    }
    
    const parts = [
        hex[bytes[0]] + hex[bytes[1]] + hex[bytes[2]] + hex[bytes[3]],
        hex[bytes[4]] + hex[bytes[5]],
        hex[bytes[6]] + hex[bytes[7]],
        hex[bytes[8]] + hex[bytes[9]],
        hex[bytes[10]] + hex[bytes[11]] + hex[bytes[12]] + hex[bytes[13]] + hex[bytes[14]] + hex[bytes[15]]
    ];
    
    return parts.join('-').toLowerCase();
}
