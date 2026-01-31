import { connect } from 'cloudflare:sockets';

// =============================================================================
// 配置区域 - 请根据实际情况修改
// =============================================================================

// V2board API 默认配置（如果环境变量未设置则使用）
const DEFAULT_RUNTIME_CONFIG = {
    apiHost: 'https://linyuch.eu.org',            // V2board 后端地址
    apiKey: 'twitteitwitteitwittei',              // API Key (Token)
    nodeId: 1,                                   // 节点 ID
    nodeType: 'vless'                            // 节点类型: vless, vmess, trojan, shadowsocks
};

// 本地兜底配置 (当无法连接管理端时使用)
const FALLBACK_CONFIG = {
    proxyIPs: ['bestproxy.030101.xyz:443'],
    bestDomains: ['bestcf.030101.xyz:443', 'japan.com:443', 'www.visa.com.sg:443']
};

// 内置反代IP配置（如果V2board面板无法配置，使用这些）
const BUILTIN_PROXY_IPS = [
    'ProxyIP.HK.CMLiussss.net:443',
    'ProxyIP.JP.CMLiussss.net:443',
    'ProxyIP.SG.CMLiussss.net:443',
    'ProxyIP.US.CMLiussss.net:443',
    'bestproxy.030101.xyz:443'
];

// 内置优选域名配置
const BUILTIN_BEST_DOMAINS = [
    'cf.twitter.now.cc:443',
    'telecom.twitter.now.cc:443',
    'unicom.twitter.now.cc:443',
    'bestcf.030101.xyz:443',
    'japan.com:443',
    'www.visa.com.sg:443'
];

// 缓存配置
const CACHE_TTL = 60000; // 缓存时间 60 秒

// =============================================================================
// 全局状态
// =============================================================================
let cachedData = {
    users: {},           // { uuid: userId }
    nodeInfo: null,
    lastUpdate: 0,
    trafficBuffer: [],   // 流量上报缓冲区
    onlineUsers: new Set() // 在线用户集合
};

// 运行时配置（在 fetch 中初始化）
let RUNTIME_CONFIG = {
    apiHost: DEFAULT_RUNTIME_CONFIG.apiHost,
    apiKey: DEFAULT_RUNTIME_CONFIG.apiKey,
    nodeId: DEFAULT_RUNTIME_CONFIG.nodeId,
    nodeType: DEFAULT_RUNTIME_CONFIG.nodeType
};

// =============================================================================
// 地理位置智能匹配
// =============================================================================
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

function smartSortProxies(proxyList, targetAddress) {
    if (!proxyList || proxyList.length === 0) return [];
    
    const targetGeo = extractGeoLocation(targetAddress);
    if (!targetGeo) return [...proxyList];
    
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
    
    return [...matched, ...unmatched];
}

// =============================================================================
// 主入口
// =============================================================================
export default {
    async fetch(req, env, ctx) {
        // 从环境变量读取配置，如果未设置则使用默认值
        RUNTIME_CONFIG = {
            apiHost: env.V2B_API_HOST || DEFAULT_RUNTIME_CONFIG.apiHost,
            apiKey: env.V2B_API_KEY || DEFAULT_RUNTIME_CONFIG.apiKey,
            nodeId: parseInt(env.V2B_NODE_ID || DEFAULT_RUNTIME_CONFIG.nodeId),
            nodeType: env.V2B_NODE_TYPE || DEFAULT_RUNTIME_CONFIG.nodeType
        };
        
        const url = new URL(req.url);
        
        // WebSocket 升级请求 - VLESS 流量处理
        if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
            return await handleWebSocket(req, ctx);
        }
        
        // HTTP 请求
        if (req.method === 'GET') {
            // 根路径 - 健康检查
            if (url.pathname === '/') {
                return new Response('<h1>✅ V2bX Node Worker Running</h1><p>Connecting to V2board backend</p>', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            }
            
            // 手动触发在线用户上报
            if (url.pathname === '/report-online') {
                ctx.waitUntil(reportOnlineUsers());
                return new Response('Online users report triggered', { status: 200 });
            }
            
            // UUID 订阅路径
            await syncV2boardConfig();
            const users = cachedData.users;
            
            // 检查路径中是否包含有效 UUID
            for (const uuid of Object.keys(users)) {
                if (url.pathname.toLowerCase().includes(uuid.toLowerCase())) {
                    return await handleSubscription(req, uuid);
                }
            }
        }
        
        return new Response('Not Found - No matching UUID in path', { status: 404 });
    }
};

// =============================================================================
// V2board 配置同步
// =============================================================================
async function syncV2boardConfig(forceRefresh = false) {
    const now = Date.now();
    
    // 缓存检查
    if (!forceRefresh && (now - cachedData.lastUpdate) < CACHE_TTL) {
        return;
    }
    
    if (forceRefresh && (now - cachedData.lastUpdate) < 5000) {
        return;
    }
    
    try {
        // 1. 获取节点信息
        const nodeInfoUrl = `${RUNTIME_CONFIG.apiHost}/api/v1/server/UniProxy/config?node_type=${RUNTIME_CONFIG.nodeType}&node_id=${RUNTIME_CONFIG.nodeId}&token=${RUNTIME_CONFIG.apiKey}`;
        
        const nodeInfoResp = await fetch(nodeInfoUrl, {
            headers: {
                'User-Agent': 'V2bX-CF-Worker/1.0'
            },
            cf: { cacheTtl: 0 }
        });
        
        if (!nodeInfoResp.ok) {
            throw new Error(`Get node info failed: HTTP ${nodeInfoResp.status}`);
        }
        
        const nodeInfo = await nodeInfoResp.json();
        
        // 2. 获取用户列表
        const userListUrl = `${RUNTIME_CONFIG.apiHost}/api/v1/server/UniProxy/user?node_type=${RUNTIME_CONFIG.nodeType}&node_id=${RUNTIME_CONFIG.nodeId}&token=${RUNTIME_CONFIG.apiKey}`;
        
        const userListResp = await fetch(userListUrl, {
            headers: {
                'User-Agent': 'V2bX-CF-Worker/1.0'
            },
            cf: { cacheTtl: 0 }
        });
        
        if (!userListResp.ok) {
            throw new Error(`Get user list failed: HTTP ${userListResp.status}`);
        }
        
        const userData = await userListResp.json();
        
        // 解析用户列表
        const users = {};
        if (userData.users && Array.isArray(userData.users)) {
            userData.users.forEach(user => {
                // user 结构: { id: int, uuid: string, speed_limit: int, device_limit: int }
                users[user.uuid] = user.id;
            });
        }
        
        // 更新缓存
        cachedData.users = users;
        cachedData.nodeInfo = nodeInfo;
        cachedData.lastUpdate = now;
        
        console.log(`Synced ${Object.keys(users).length} users from V2board`);
        
    } catch (error) {
        console.error('Failed to sync V2board config:', error.message);
        // 保持使用上次成功的配置
    }
}

// =============================================================================
// 订阅处理 - 生成 VLESS 订阅链接
// =============================================================================
async function handleSubscription(req, uuid) {
    const url = new URL(req.url);
    const workerDomain = url.hostname;
    
    const nodeInfo = cachedData.nodeInfo;
    if (!nodeInfo) {
        return new Response('Node not configured', { status: 503 });
    }
    
    const links = generateVlessLinks(workerDomain, uuid, nodeInfo);
    const base64Content = btoa(links.join('\n'));
    
    return new Response(base64Content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Profile-Update-Interval': '6',
            'Subscription-Userinfo': `upload=0; download=0; total=10737418240; expire=0`
        }
    });
}

// =============================================================================
// 生成 VLESS 订阅链接
// =============================================================================
function generateVlessLinks(workerDomain, uuid, nodeInfo) {
    const links = [];
    
    // 从节点信息中提取配置
    const protocol = RUNTIME_CONFIG.nodeType; // vless, vmess, trojan
    const port = nodeInfo.server_port || 443;
    const network = nodeInfo.network || 'ws';
    const serverName = nodeInfo.server_name || nodeInfo.host || workerDomain;
    
    // 使用内置优选域名生成多个节点
    const domains = BUILTIN_BEST_DOMAINS.length > 0 ? BUILTIN_BEST_DOMAINS : [workerDomain];
    
    // 解析网络配置
    let path = '/?ed=2048';
    if (nodeInfo.network_settings) {
        try {
            const networkSettings = typeof nodeInfo.network_settings === 'string' 
                ? JSON.parse(nodeInfo.network_settings) 
                : nodeInfo.network_settings;
            
            if (networkSettings.path) {
                path = networkSettings.path;
            }
        } catch (e) {
            console.error('Parse network_settings failed:', e);
        }
    }
    
    // TLS 配置
    const tls = nodeInfo.tls === 1 ? 'tls' : 'none';
    const security = tls === 'tls' ? 'tls' : 'none';
    
    // 构建 VLESS 参数
    const params = new URLSearchParams({
        encryption: 'none',
        security: security,
        type: network,
        host: workerDomain,
        path: encodeURIComponent(path),
        sni: serverName,
        fp: 'chrome'
    });
    
    // Reality 支持
    if (nodeInfo.tls === 2 && nodeInfo.tls_settings) {
        params.set('security', 'reality');
        params.set('pbk', nodeInfo.tls_settings.public_key || '');
        params.set('sid', nodeInfo.tls_settings.short_id || '');
        params.set('spx', '');
    }
    
    // Flow (VLESS only)
    if (protocol === 'vless' && nodeInfo.flow) {
        params.set('flow', nodeInfo.flow);
    }
    
    // 为每个优选域名生成节点
    domains.forEach((domainEntry, index) => {
        // 解析域名配置：domain:port#别名 或 domain#别名 或 domain:port 或 domain
        const parts = domainEntry.split('#');
        let addressPart = parts[0].trim();
        const customAlias = parts[1] ? parts[1].trim() : null;
        
        // 处理地址和端口
        let host, hostPort;
        if (addressPart.includes(':')) {
            const addrParts = addressPart.split(':');
            host = addrParts[0];
            hostPort = parseInt(addrParts[1]);
        } else {
            host = addressPart;
            hostPort = 443;
        }
        
        // 生成节点名称
        let nodeName;
        if (customAlias) {
            nodeName = `${customAlias}-Node${RUNTIME_CONFIG.nodeId}`;
        } else {
            nodeName = `${host}-Node${RUNTIME_CONFIG.nodeId}`;
        }
        
        // 生成链接
        let vlessLink;
        if (protocol === 'vless') {
            vlessLink = `vless://${uuid}@${host}:${hostPort}?${params.toString()}#${encodeURIComponent(nodeName)}`;
        } else if (protocol === 'vmess') {
            // VMess 使用 JSON 格式
            const vmessConfig = {
                v: '2',
                ps: nodeName,
                add: host,
                port: hostPort.toString(),
                id: uuid,
                aid: '0',
                net: network,
                type: 'none',
                host: workerDomain,
                path: path,
                tls: tls,
                sni: serverName,
                alpn: ''
            };
            vlessLink = 'vmess://' + btoa(JSON.stringify(vmessConfig));
        } else if (protocol === 'trojan') {
            vlessLink = `trojan://${uuid}@${host}:${hostPort}?${params.toString()}#${encodeURIComponent(nodeName)}`;
        }
        
        links.push(vlessLink);
    });
    
    return links;
}

// =============================================================================
// WebSocket 处理 - VLESS 流量转发 (已修复冷启动延迟 -1 问题)
// =============================================================================
async function handleWebSocket(req, ctx) {
    // 【关键修改】: 先建立 WebSocket 连接，防止客户端握手超时
    // 这行代码会立即发送 HTTP 101 Switching Protocols
    const [client, webSocket] = Object.values(new WebSocketPair());
    webSocket.accept(); 

    // 【关键修改】: 握手成功后，再进行配置同步
    // 此时客户端已经连接成功，等待数据即可，不会判定为超时
    await syncV2boardConfig();
    
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
    
    // 获取代理配置 - 优先级：V2board配置 > 内置配置 > 兜底配置
    const nodeInfo = cachedData.nodeInfo;
    let proxyIPs = FALLBACK_CONFIG.proxyIPs;
    
    // 从节点信息中获取代理配置
    if (nodeInfo && nodeInfo.routes) {
        const proxyRoutes = nodeInfo.routes.filter(r => r.action === 'proxy');
        if (proxyRoutes.length > 0) {
            proxyIPs = proxyRoutes.map(r => r.action_value);
        } else if (BUILTIN_PROXY_IPS.length > 0) {
            // V2board没有配置，使用内置配置
            proxyIPs = BUILTIN_PROXY_IPS;
        }
    } else if (BUILTIN_PROXY_IPS.length > 0) {
        // 没有节点信息，使用内置配置
        proxyIPs = BUILTIN_PROXY_IPS;
    }
    
    let remoteSocket = null;
    let udpWriter = null;
    let isDNSQuery = false;
    let currentUser = null;
    let trafficStats = { upload: 0, download: 0 };
    
    // 处理 WebSocket 消息流
    new ReadableStream({
        start(controller) {
            webSocket.addEventListener('message', event => {
                controller.enqueue(event.data);
            });
            
            webSocket.addEventListener('close', () => {
                // 上报流量
                if (currentUser) {
                    reportTraffic(currentUser.id, trafficStats.upload, trafficStats.download, ctx);
                    // 从在线用户中移除
                    cachedData.onlineUsers.delete(currentUser.id);
                }
                
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
                } catch (e) {}
            }
        }
    }).pipeTo(new WritableStream({
        async write(chunk) {
            // DNS 查询处理
            if (isDNSQuery && udpWriter) {
                try {
                    await udpWriter.write(chunk);
                } catch (e) {}
                return;
            }
            
            // 已建立连接，直接转发
            if (remoteSocket) {
                try {
                    const writer = remoteSocket.writable.getWriter();
                    await writer.write(chunk);
                    writer.releaseLock();
                    
                    // 统计上传流量
                    trafficStats.upload += chunk.byteLength;
                } catch (e) {}
                return;
            }
            
            // 解析 VLESS 协议头
            if (chunk.byteLength < 24) {
                return;
            }
            
            const dataView = new DataView(chunk);
            
            // 验证 UUID (偏移 1-16)
            const uuidBytes = new Uint8Array(chunk.slice(1, 17));
            const uuidString = bytesToUUID(uuidBytes);
            
            // 检查 UUID 是否有效
            if (!cachedData.users[uuidString]) {
                await syncV2boardConfig(true);
                
                if (!cachedData.users[uuidString]) {
                    console.log('Unauthorized UUID:', uuidString);
                    // 如果 UUID 无效，稍微延迟一下再关闭，防止被探测
                    return;
                }
            }
            
            // 记录当前用户
            currentUser = {
                uuid: uuidString,
                id: cachedData.users[uuidString]
            };
            
            // 添加到在线用户集合
            cachedData.onlineUsers.add(currentUser.id);
            
            // 解析协议头
            const version = dataView.getUint8(0);
            const optionLength = dataView.getUint8(17);
            const command = dataView.getUint8(18 + optionLength);
            
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
                return;
            }
            
            // 响应头
            const responseHeader = new Uint8Array([version, 0]);
            const payload = chunk.slice(position);
            
            // UDP 模式 - DNS 查询
            if (command === 2) {
                if (targetPort !== 53) {
                    return;
                }
                
                isDNSQuery = true;
                let headerSent = false;
                
                const { readable, writable } = new TransformStream({
                    transform(dnsQuery, controller) {
                        let offset = 0;
                        while (offset < dnsQuery.byteLength) {
                            const length = new DataView(dnsQuery.slice(offset, offset + 2)).getUint16(0);
                            const query = dnsQuery.slice(offset + 2, offset + 2 + length);
                            controller.enqueue(query);
                            offset += 2 + length;
                        }
                    }
                });
                
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
                                
                                trafficStats.download += responsePacket.byteLength;
                            }
                        } catch (e) {
                            console.error('DNS query failed:', e);
                        }
                    }
                })).catch(() => {});
                
                udpWriter = writable.getWriter();
                
                try {
                    await udpWriter.write(payload);
                    trafficStats.upload += payload.byteLength;
                } catch (e) {}
                
                return;
            }
            
            // TCP 模式 - 智能代理连接
            let socket = null;
            
            // 策略1：优先直连
            try {
                socket = connect({
                    hostname: targetAddress,
                    port: targetPort
                });
                await socket.opened;
            } catch (directError) {
                // 策略2：智能排序的代理列表
                if (proxyIPs.length > 0) {
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
                            break;
                        } catch (proxyError) {
                            lastError = proxyError;
                            continue;
                        }
                    }
                    
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
                
                trafficStats.upload += payload.byteLength;
            } catch (e) {}
            
            // 转发远程响应到 WebSocket
            let responseSent = false;
            socket.readable.pipeTo(new WritableStream({
                write(responseChunk) {
                    if (webSocket.readyState === 1) {
                        if (!responseSent) {
                            const firstPacket = new Uint8Array([...responseHeader, ...new Uint8Array(responseChunk)]);
                            webSocket.send(firstPacket);
                            responseSent = true;
                            trafficStats.download += firstPacket.byteLength;
                        } else {
                            webSocket.send(responseChunk);
                            trafficStats.download += responseChunk.byteLength;
                        }
                    }
                },
                close() {
                    // 上报流量
                    if (currentUser) {
                        reportTraffic(currentUser.id, trafficStats.upload, trafficStats.download, ctx);
                        // 从在线用户中移除
                        cachedData.onlineUsers.delete(currentUser.id);
                    }
                    
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
// 流量上报到 V2board
// =============================================================================
function reportTraffic(userId, upload, download, ctx) {
    // 缓冲流量数据
    cachedData.trafficBuffer.push({
        uid: userId,
        upload: upload,
        download: download,
        timestamp: Date.now()
    });
    
    // 当缓冲区达到一定数量时，批量上报
    if (cachedData.trafficBuffer.length >= 5) {
        ctx.waitUntil(Promise.all([
            flushTrafficBuffer(),
            reportOnlineUsers()
        ]));
    }
}

async function flushTrafficBuffer() {
    if (cachedData.trafficBuffer.length === 0) {
        return;
    }
    
    // 聚合流量数据
    const trafficMap = {};
    cachedData.trafficBuffer.forEach(item => {
        if (!trafficMap[item.uid]) {
            trafficMap[item.uid] = [0, 0]; // [upload, download]
        }
        trafficMap[item.uid][0] += item.upload;
        trafficMap[item.uid][1] += item.download;
    });
    
    // 清空缓冲区
    cachedData.trafficBuffer = [];
    
    try {
        const reportUrl = `${RUNTIME_CONFIG.apiHost}/api/v1/server/UniProxy/push?node_type=${RUNTIME_CONFIG.nodeType}&node_id=${RUNTIME_CONFIG.nodeId}&token=${RUNTIME_CONFIG.apiKey}`;
        
        const response = await fetch(reportUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'V2bX-CF-Worker/1.0'
            },
            body: JSON.stringify(trafficMap)
        });
        
        if (!response.ok) {
            console.error('Report traffic failed:', response.status);
        } else {
            console.log(`Reported traffic for ${Object.keys(trafficMap).length} users`);
        }
    } catch (error) {
        console.error('Report traffic error:', error.message);
    }
}

// =============================================================================
// 在线用户上报到 V2board
// =============================================================================
async function reportOnlineUsers() {
    if (cachedData.onlineUsers.size === 0) {
        return;
    }
    
    try {
        // 构造在线用户数据: { user_id: ["ip1", "ip2"] }
        const onlineData = {};
        cachedData.onlineUsers.forEach(userId => {
            // 由于 Worker 环境限制，无法获取真实 IP，使用占位符
            onlineData[userId] = ["CF-Worker"];
        });
        
        const reportUrl = `${RUNTIME_CONFIG.apiHost}/api/v1/server/UniProxy/alive?node_type=${RUNTIME_CONFIG.nodeType}&node_id=${RUNTIME_CONFIG.nodeId}&token=${RUNTIME_CONFIG.apiKey}`;
        
        const response = await fetch(reportUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'V2bX-CF-Worker/1.0'
            },
            body: JSON.stringify(onlineData)
        });
        
        if (!response.ok) {
            console.error('Report online users failed:', response.status);
        } else {
            console.log(`Reported ${cachedData.onlineUsers.size} online users`);
        }
    } catch (error) {
        console.error('Report online users error:', error.message);
    }
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