import { connect } from 'cloudflare:sockets';

// =============================================================================
// 配置区域 - 请根据实际情况修改
// =============================================================================
// 管理端 API 地址 (不要添加尾随斜杠)
const REMOTE_API_URL = 'https://uuid.hailizi.workers.dev/api/users';

// API 认证令牌 (可选，如果管理端需要认证)
const API_TOKEN = '';

// 本地兜底配置 (当无法连接管理端时使用)
const FALLBACK_CONFIG = {
    proxyIPs: ['bestproxy.030101.xyz:443'],
    bestDomains: ['bestcf.030101.xyz:443', 'japan.com:443', 'www.visa.com.sg:443']
};

// 缓存配置
const CACHE_TTL = 60000; // 缓存时间 60 秒

// =============================================================================
// 全局状态
// =============================================================================
let cachedData = {
    users: {},
    settings: FALLBACK_CONFIG,
    lastUpdate: 0
};

// =============================================================================
// 地理位置智能匹配
// =============================================================================
// 地区关键词映射表（支持中英文、国家/地区代码）
const GEO_KEYWORDS = {
    'HK': ['hk', 'hongkong', 'hong kong', '香港', 'hkg'],
    'TW': ['tw', 'taiwan', '台湾', 'taipei', '台北'],
    'JP': ['jp', 'japan', '日本', 'tokyo', '东京'],
    'SG': ['sg', 'singapore', '新加坡', 'singapo'],
    'US': ['us', 'usa', 'america', '美国', 'united states'],
    'KR': ['kr', 'korea', '韩国', 'seoul', '首尔'],
    'UK': ['uk', 'london', '英国', 'britain'],
    'DE': ['de', 'germany', '德国', 'frankfurt', '法兰克福'],
    'FR': ['fr', 'france', '法国', 'paris', '巴黎'],
    'CA': ['ca', 'canada', '加拿大', 'toronto'],
    'AU': ['au', 'australia', '澳大利亚', 'sydney'],
    'CN': ['cn', 'china', '中国', 'beijing', 'shanghai'],
    'IN': ['in', 'india', '印度', 'mumbai'],
    'RU': ['ru', 'russia', '俄罗斯', 'moscow'],
    'BR': ['br', 'brazil', '巴西', 'sao paulo'],
    'NL': ['nl', 'netherlands', '荷兰', 'amsterdam'],
};

/**
 * 从字符串中提取地理位置标识
 * @param {string} str - 待检测的字符串（域名或IP描述）
 * @return {string|null} - 地区代码（如 'HK', 'JP'）或 null
 */
function extractGeoLocation(str) {
    if (!str) return null;
    const lowerStr = str.toLowerCase();
    
    for (const [region, keywords] of Object.entries(GEO_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerStr.includes(keyword)) {
                return region;
            }
        }
    }
    return null;
}

/**
 * 智能排序代理列表，优先使用地理位置匹配的代理
 * @param {Array<string>} proxyList - 原始代理列表
 * @param {string} targetAddress - 目标地址
 * @return {Array<string>} - 排序后的代理列表
 */
function smartSortProxies(proxyList, targetAddress) {
    if (!proxyList || proxyList.length === 0) return [];
    
    const targetGeo = extractGeoLocation(targetAddress);
    
    // 如果目标地址没有地理位置信息，保持原顺序
    if (!targetGeo) return [...proxyList];
    
    // 分类代理：匹配的、不匹配的
    const matched = [];
    const unmatched = [];
    
    proxyList.forEach(proxy => {
        const proxyGeo = extractGeoLocation(proxy);
        if (proxyGeo === targetGeo) {
            matched.push(proxy);
        } else {
            unmatched.push(proxy);
        }
    });
    
    // 匹配的代理优先，然后是其他代理
    return [...matched, ...unmatched];
}

// =============================================================================
// 主入口
// =============================================================================
export default {
    async fetch(req) {
        const url = new URL(req.url);
        
        // WebSocket 升级请求 - VLESS 流量处理
        if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
            return await handleWebSocket(req);
        }
        
        // HTTP 请求
        if (req.method === 'GET') {
            // 根路径 - 官网入口
            if (url.pathname === '/') {
                await syncRemoteConfig();
                let websiteUrl = cachedData.websiteUrl || 'https://example.com';
                
                // 确保 URL 包含协议
                if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
                    websiteUrl = 'https://' + websiteUrl;
                }
                
                const displayUrl = websiteUrl.replace(/^https?:\/\//, '');
                
                const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CFly 官网入口</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.box{background:#fff;border-radius:15px;padding:40px 30px;text-align:center;max-width:400px;box-shadow:0 10px 40px rgba(0,0,0,.3)}
.logo{font-size:40px;margin-bottom:15px}
h1{color:#333;font-size:24px;margin-bottom:10px}
.sub{color:#666;font-size:14px;margin-bottom:25px}
.btn{display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-decoration:none;padding:12px 40px;border-radius:25px;font-size:16px;transition:.3s}
.btn:hover{transform:translateY(-2px);box-shadow:0 5px 20px rgba(102,126,234,.5)}
.url{color:#999;font-size:12px;margin-top:20px;word-break:break-all}
.status{background:#10b981;color:#fff;padding:5px 12px;border-radius:15px;font-size:12px;margin-bottom:15px;display:inline-block}
</style>
</head>
<body>
<div class="box">
<div class="status">✅ 运行中</div>
<div class="logo">🚀</div>
<h1>CFly 官网入口</h1>
<p class="sub">点击下方按钮访问官网</p>
<a href="${websiteUrl}" class="btn" target="_blank" rel="noopener noreferrer">进入官网 ↗</a>
<div class="url">${displayUrl}</div>
</div>
</body>
</html>`;
                
                return new Response(html, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            }
            
            // 调试接口 - 查看当前配置
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
            
            // UUID 订阅路径
            await syncRemoteConfig();
            const users = cachedData.users;
            
            // 检查路径中是否包含有效 UUID
            for (const [uuid, userInfo] of Object.entries(users)) {
                if (url.pathname.toLowerCase().includes(uuid.toLowerCase())) {
                    return await handleSubscription(req, uuid, userInfo);
                }
            }
        }
        
        return new Response('Not Found - No matching UUID in path. Please check: 1) API URL is configured correctly, 2) User exists in manager, 3) UUID in URL is correct', { status: 404 });
    }
};

// =============================================================================
// 配置同步 - 从管理端获取最新配置
// =============================================================================
async function syncRemoteConfig(forceRefresh = false) {
    const now = Date.now();
    
    // 如果缓存未过期且非强制刷新，直接返回
    if (!forceRefresh && (now - cachedData.lastUpdate) < CACHE_TTL) {
        return;
    }
    
    // 防止频繁刷新（强制刷新时至少间隔 5 秒）
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
            cf: { cacheTtl: 0 } // 禁用 Cloudflare 缓存
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新用户列表（支持新格式：包含 expiry）
        if (data.users && typeof data.users === 'object') {
            cachedData.users = data.users;
        }
        
        // 获取官网地址（优先使用专门的 websiteUrl，否则使用 subUrl）
        if (data.settings && data.settings.websiteUrl) {
            cachedData.websiteUrl = data.settings.websiteUrl;
        } else if (data.settings && data.settings.subUrl) {
            cachedData.websiteUrl = data.settings.subUrl;
        }
        
        // 更新设置
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
        // 保持使用上次成功的配置或兜底配置
    }
}

// =============================================================================
// 订阅处理 - 生成 VLESS 订阅链接
// =============================================================================
async function handleSubscription(req, uuid, userInfo) {
    const url = new URL(req.url);
    const workerDomain = url.hostname;
    
    // 获取用户到期时间
    const expiry = typeof userInfo === 'object' ? userInfo.expiry : null;
    const userName = typeof userInfo === 'object' ? userInfo.name : userInfo;
    
    // 获取官网地址
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

// =============================================================================
// 生成 VLESS 订阅链接
// =============================================================================
function generateVlessLinks(workerDomain, uuid, userName, expiry, websiteUrl) {
    const links = [];
    const wsPath = encodeURIComponent('/?ed=2048');
    const protocol = 'vless';
    const domains = cachedData.settings.bestDomains || FALLBACK_CONFIG.bestDomains;
    
    // 格式化到期时间
    function formatExpiry(timestamp) {
        if (!timestamp) return '未激活';
        const d = new Date(timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // 获取第一个节点的地址用于创建信息节点
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
    
    // 添加官网信息节点（排第一）
    const websiteDisplay = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '') : '未设置官网';
    const websiteLink = `${protocol}://${uuid}@${firstAddress}?${commonParams.toString()}#${encodeURIComponent('官网' + websiteDisplay)}`;
    links.push(websiteLink);
    
    // 添加套餐到期时间节点（排第二）
    const expiryDisplay = formatExpiry(expiry);
    const expiryLink = `${protocol}://${uuid}@${firstAddress}?${commonParams.toString()}#${encodeURIComponent('套餐到期：' + expiryDisplay)}`;
    links.push(expiryLink);
    
    // 排序: 只将 IPv6 IP 地址排到后面，手动添加的域名保持原位
    const sortedDomains = [...domains].sort((a, b) => {
        // 检测是否是 IPv6 IP 地址 (包含方括号 [ 的是 IPv6 IP)
        const isV6IpA = a.includes('[');
        const isV6IpB = b.includes('[');
        
        // 只对 IPv6 IP 地址进行排序，域名保持原位
        if (isV6IpA && !isV6IpB) return 1;  // a是IPv6 IP, b不是, a排后面
        if (!isV6IpA && isV6IpB) return -1; // a不是IPv6 IP, b是, a排前面
        return 0; // 其他情况保持原顺序
    });
    
    sortedDomains.forEach((item, index) => {
        // 支持格式:
        // 1. domain:port#节点名
        // 2. domain#节点名 (默认端口 443)
        // 3. 1.1.1.1:443#节点名
        // 4. 1.1.1.1#节点名 (默认端口 443)
        // 5. [2606:4700::]:443#节点名 (IPv6)
        // 6. 2606:4700::#节点名 (IPv6 无端口，自动添加)
        // 7. domain:port (使用域名/IP 作为节点名)
        // 8. domain (使用域名作为节点名，默认端口 443)
        
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
        
        // 生成 VLESS 链接
        const vlessLink = `${protocol}://${uuid}@${address}?${params.toString()}#${encodeURIComponent(nodeName)}`;
        links.push(vlessLink);
    });
    
    return links;
}

// =============================================================================
// WebSocket 处理 - VLESS 流量转发
// =============================================================================
async function handleWebSocket(req) {
    // 在处理 WebSocket 前同步配置
    await syncRemoteConfig();
    
    // 创建 WebSocket 对
    const [client, webSocket] = Object.values(new WebSocketPair());
    webSocket.accept();
    
    const url = new URL(req.url);
    
    // 处理 URL 编码的查询参数
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
    
    // 确定代理 IP 列表
    let proxyIPs = cachedData.settings.proxyIPs || FALLBACK_CONFIG.proxyIPs;
    if (proxyParam) {
        proxyIPs = [proxyParam];
    }
    
    let remoteSocket = null;
    let udpWriter = null;
    let isDNSQuery = false;
    
    // 处理 WebSocket 消息流
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
            
            // TCP 模式 - 建立连接（智能地理位置匹配 + 重试机制）
            let socket = null;
            
            // 策略1：优先直连
            try {
                socket = connect({
                    hostname: targetAddress,
                    port: targetPort
                });
                await socket.opened;
            } catch (directError) {
                // 策略2：直连失败，使用智能排序的代理列表
                if (proxyIPs.length > 0) {
                    // 🌍 智能排序：根据目标地址地理位置优先选择同地区代理
                    const sortedProxies = smartSortProxies(proxyIPs, targetAddress);
                    let lastError = null;
                    
                    for (let i = 0; i < sortedProxies.length; i++) {
                        const proxyEntry = sortedProxies[i];
                        const proxyParts = proxyEntry.split(':');
                        const proxyHost = proxyParts[0];
                        const proxyPort = proxyParts[1] ? parseInt(proxyParts[1]) : targetPort;
                        
                        try {
                            socket = connect({
                                hostname: proxyHost,
                                port: proxyPort
                            });
                            await socket.opened;
                            // 连接成功，跳出循环
                            break;
                        } catch (proxyError) {
                            lastError = proxyError;
                            // 继续尝试下一个代理
                            continue;
                        }
                    }
                    
                    // 所有代理都失败
                    if (!socket) {
                        console.error('All proxy attempts failed:', lastError);
                        return;
                    }
                } else {
                    console.error('Direct connection failed and no proxy available');
                    return;
                }
            }
            
            if (!socket) {
                return;
            }
            
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

// =============================================================================
// 工具函数 - 字节数组转 UUID 字符串
// =============================================================================
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
