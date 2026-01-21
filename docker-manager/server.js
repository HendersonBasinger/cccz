/**
 * VLES 用户管理系统 - Docker 服务器版
 * 主服务器入口
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const db = require('./database');

// 加载路由
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const { renderAdminPanel, renderAdminLoginPage } = require('./views/admin');
const { renderUserPanel, renderAuthPage } = require('./views/user');
const { renderLandingPage } = require('./views/landing');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PATH = process.env.ADMIN_PATH || '/admin';

// 初始化数据库
db.initDatabase();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS 支持和安全头
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Content Security Policy - 允许必要的外部资源
    res.header('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://challenges.cloudflare.com",
        "frame-src https://challenges.cloudflare.com",
        "worker-src blob:"
    ].join('; '));
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// API 路由 - 供节点端拉取（需要密钥验证）
app.get('/api/users', apiRoutes.verifyApiToken, apiRoutes.getUsers);
app.get('/api/proxyips/active', apiRoutes.verifyApiToken, apiRoutes.getActiveProxyIPs);

// 公告 API
app.get('/api/announcement', apiRoutes.getAnnouncement);

// 用户认证 API
app.post('/api/user/register', userRoutes.register);
app.post('/api/user/login', userRoutes.login);
app.post('/api/user/logout', userRoutes.logout);
app.post('/api/user/info', userRoutes.getInfo);
app.post('/api/user/change-password', userRoutes.changePassword);
app.post('/api/user/checkin', userRoutes.checkin);
app.post('/api/user/reset-uuid', userRoutes.resetUUID);
app.post('/api/user/orders/cancel', userRoutes.cancelOrder);

// 用户套餐和订单 API
app.get('/api/plans', apiRoutes.getPlans);
app.get('/api/user/orders', userRoutes.getOrders);
app.post('/api/user/orders/create', userRoutes.createOrder);
app.post('/api/user/orders/pay', userRoutes.payOrder);

// 支付通道 API
app.get('/api/payment/channels', apiRoutes.getPaymentChannels);
app.post('/api/payment/notify', apiRoutes.paymentNotify);

// 管理员 API
app.post('/api/admin/login', adminRoutes.login);
app.post('/api/admin/logout', adminRoutes.logout);
app.post('/api/admin/changePassword', adminRoutes.changePassword);
app.get('/api/admin/check', adminRoutes.checkAuth);

// 管理员 - 用户管理
app.post('/api/admin/add', adminRoutes.addUser);
app.post('/api/admin/update', adminRoutes.updateUser);
app.post('/api/admin/reset-uuid', adminRoutes.resetUserUUID);
app.post('/api/admin/delete', adminRoutes.deleteUsers);
app.post('/api/admin/status', adminRoutes.updateStatus);
app.get('/api/admin/getUserAccount', adminRoutes.getUserAccount);
app.get('/api/admin/users', adminRoutes.getAllUsers);
app.get('/api/admin/user/:uuid', adminRoutes.getUserDetail);

// 管理员 - 配置管理
app.post('/api/admin/saveSettings', adminRoutes.saveSettings);
app.get('/api/admin/getSystemSettings', adminRoutes.getSystemSettings);
app.post('/api/admin/updateSystemSettings', adminRoutes.updateSystemSettings);
app.post('/api/admin/fetchBestIPs', adminRoutes.fetchBestIPs);

// 管理员 - 套餐管理
app.get('/api/admin/plans', adminRoutes.getPlans);
app.post('/api/admin/plans/create', adminRoutes.createPlan);
app.post('/api/admin/plans/update', adminRoutes.updatePlan);
app.post('/api/admin/plans/toggle', adminRoutes.togglePlan);
app.post('/api/admin/plans/delete', adminRoutes.deletePlan);
app.post('/api/admin/plans/reorder', adminRoutes.reorderPlans);

// 管理员 - 订单管理
app.get('/api/admin/orders', adminRoutes.getOrders);
app.post('/api/admin/orders/approve', adminRoutes.approveOrder);
app.post('/api/admin/orders/reject', adminRoutes.rejectOrder);

// 管理员 - 公告管理
app.get('/api/admin/announcements', adminRoutes.getAnnouncements);
app.get('/api/admin/announcements/:id', adminRoutes.getAnnouncementById);
app.post('/api/admin/announcements/create', adminRoutes.createAnnouncement);
app.post('/api/admin/announcements/update', adminRoutes.updateAnnouncement);
app.post('/api/admin/announcements/delete', adminRoutes.deleteAnnouncement);

// 管理员 - 邀请码管理
app.get('/api/admin/invites', adminRoutes.getInvites);
app.post('/api/admin/invites/create', adminRoutes.createInvite);
app.post('/api/admin/invites/update', adminRoutes.updateInvite);
app.post('/api/admin/invites/toggle', adminRoutes.toggleInvite);
app.post('/api/admin/invites/delete', adminRoutes.deleteInvite);

// 管理员 - 支付通道管理
app.get('/api/admin/payment/channels', adminRoutes.getPaymentChannels);
app.post('/api/admin/payment/channels/save', adminRoutes.savePaymentChannel);
app.post('/api/admin/payment/channels/update', adminRoutes.updatePaymentChannel);
app.post('/api/admin/payment/channels/toggle', adminRoutes.togglePaymentChannel);
app.post('/api/admin/payment/channels/delete', adminRoutes.deletePaymentChannel);

// 管理员 - 数据导入导出
app.get('/api/admin/export', adminRoutes.exportData);
app.post('/api/admin/import', adminRoutes.importData);
// 优选域名管理
app.get('/api/admin/best-domains', adminRoutes.getBestDomains);
app.post('/api/admin/best-domains', adminRoutes.saveBestDomains);
app.post('/api/admin/fetch-best-ips', adminRoutes.fetchBestIPs);

// ProxyIP 智能管理
app.get('/api/admin/proxyips/meta', adminRoutes.getAllProxyIPsWithMeta);
app.post('/api/admin/proxyips/add', adminRoutes.addProxyIPs);
app.post('/api/admin/proxyips/check', adminRoutes.checkProxyIPs);
app.post('/api/admin/proxyips/delete', adminRoutes.deleteProxyIP);
app.post('/api/admin/proxyips/clean', adminRoutes.cleanInactiveProxyIPs);
app.post('/api/admin/proxyips/reorder', adminRoutes.updateProxyIPOrder);

// 用户端 - 获取最佳域名（用于节点状态显示）
app.get('/api/best-domains', userRoutes.getBestDomains);

// 高级管理功能
app.post('/api/admin/change-password', adminRoutes.changeAdminPassword);
app.get('/api/admin/export-all', adminRoutes.exportAllData);
app.post('/api/admin/import-all', adminRoutes.importAllData);
app.get('/api/admin/logs', adminRoutes.getSystemLogs);
app.post('/api/admin/logs/clear', adminRoutes.clearSystemLogs);
app.get('/api/admin/statistics', adminRoutes.getStatistics);

// 管理员面板页面
app.get(`${ADMIN_PATH}*`, async (req, res) => {
    const isLogged = await checkAdminSession(req);
    if (!isLogged) {
        res.status(200).send(renderAdminLoginPage(ADMIN_PATH));
    } else {
        res.status(200).send(await renderAdminPanel(ADMIN_PATH));
    }
});

// 品牌介绍页（首页）
app.get('/', (req, res) => {
    res.send(renderLandingPage());
});

// 登录页面
app.get('/login', async (req, res) => {
    const isLogged = await checkUserSession(req);
    if (isLogged) {
        const userInfo = await getUserInfo(req);
        res.send(await renderUserPanel(userInfo));
    } else {
        res.send(await renderAuthPage());
    }
});

// 注册页面
app.get('/register', async (req, res) => {
    const isLogged = await checkUserSession(req);
    if (isLogged) {
        const userInfo = await getUserInfo(req);
        res.send(await renderUserPanel(userInfo));
    } else {
        res.send(await renderAuthPage());
    }
});

// 用户前端页面（其他路径）
app.get('*', async (req, res) => {
    const isLogged = await checkUserSession(req);
    if (!isLogged) {
        res.send(await renderAuthPage());
    } else {
        const userInfo = await getUserInfo(req);
        res.send(await renderUserPanel(userInfo));
    }
});

// 检查管理员会话
async function checkAdminSession(req) {
    const sessionId = req.cookies?.admin_session;
    if (!sessionId) return false;
    
    const session = db.validateSession(sessionId);
    if (!session) return false;
    
    const user = db.getUserById(session.user_id);
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    return user && user.username === adminUsername;
}

// 检查用户会话
async function checkUserSession(req) {
    const sessionId = req.cookies?.user_session;
    if (!sessionId) return false;
    
    const session = db.validateSession(sessionId);
    return !!session;
}

// 获取用户信息
async function getUserInfo(req) {
    const sessionId = req.cookies?.user_session;
    if (!sessionId) return null;
    
    const session = db.validateSession(sessionId);
    if (!session) return null;
    
    const user = db.getUserById(session.user_id);
    if (!user) return null;
    
    const uuidUser = db.getUserByUUID(user.uuid);
    
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        uuid: user.uuid,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        expiry: uuidUser ? uuidUser.expiry : null,
        enabled: uuidUser ? uuidUser.enabled === 1 : false,
        name: uuidUser ? uuidUser.name : user.username,
        last_checkin: user.last_checkin || 0,
        checkin_streak: user.checkin_streak || 0,
        total_checkin_days: user.total_checkin_days || 0
    };
}

// 定时任务：每15分钟自动更新优选IP和清理非活跃用户
cron.schedule('*/15 * * * *', async () => {
    console.log('[定时任务] 开始执行...');
    
    // 保存执行时间
    const settings = db.getSettings() || {};
    settings.lastCronSyncTime = Date.now();
    db.saveSettings(settings);
    
    try {
        // 自动更新优选IP
        await updateBestIPs();
        
        // 清理非活跃用户
        const settings = db.getSettings() || {};
        if (settings.enableAutoCleanup) {
            const cleanupDays = settings.autoCleanupDays || 7;
            const count = db.cleanupInactiveUsers(cleanupDays);
            if (count > 0) {
                console.log(`[定时任务] 已清理 ${count} 个非活跃用户`);
            }
        }
        
        // 清理过期会话
        db.cleanExpiredSessions();
        
        // 自动检测 ProxyIP（每次检测所有 IP）
        try {
            const checker = require('./proxyip-checker');
            const allProxies = db.getAllProxyIPsWithMeta();
            
            console.log(`[定时检查ProxyIP] 总计 ${allProxies.length} 个，开始全部检测`);
            
            if (allProxies.length > 0) {
                // 分批检测，每批 10 个，避免并发过高
                const batchSize = 10;
                console.log(`[定时检查ProxyIP] 将分 ${Math.ceil(allProxies.length / batchSize)} 批检测`);
                
                // 异步检测，不阻塞主流程
                setImmediate(async () => {
                    try {
                        let activeCount = 0;
                        let failedCount = 0;
                        
                        // 创建 address:port -> id 的映射
                        const addressToId = {};
                        allProxies.forEach(p => {
                            const key = `${p.address}:${p.port}`;
                            addressToId[key] = p.id;
                        });
                        
                        // 分批处理
                        for (let i = 0; i < allProxies.length; i += batchSize) {
                            const batch = allProxies.slice(i, i + batchSize);
                            const results = await checker.batchCheckProxyIPs(batch.map(p => ({ address: p.address, port: p.port })));
                            
                            results.forEach(result => {
                                const key = `${result.address}:${result.port || 443}`;
                                const proxyId = addressToId[key];
                                
                                if (!proxyId) {
                                    console.error(`[定时检查ProxyIP] 找不到 ${key} 的 ID`);
                                    return;
                                }
                                
                                if (result.success) {
                                    db.updateProxyIPStatus(proxyId, {
                                        status: result.status,
                                        responseTime: result.responseTime,
                                        region: result.region,
                                        country: result.country,
                                        isp: result.isp,
                                        city: result.city,
                                        latitude: result.latitude,
                                        longitude: result.longitude
                                    });
                                    if (result.status === 'active') activeCount++;
                                } else {
                                    db.updateProxyIPStatus(proxyId, {
                                        status: 'failed'
                                    });
                                    failedCount++;
                                }
                            });
                            
                            // 批次间短暂延迟，避免过载
                            if (i + batchSize < allProxies.length) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                        
                        console.log(`[定时检查ProxyIP] 检测完成: 活跃 ${activeCount} 个, 失败 ${failedCount} 个`);
                        
                        // 清理失败次数 >= 2 的 IP
                        const cleanedCount = db.cleanInactiveProxyIPs(2);
                        if (cleanedCount > 0) {
                            console.log(`[定时检查ProxyIP] 已清理 ${cleanedCount} 个失效 ProxyIP（失败≥2次）`);
                        }
                        
                    } catch (error) {
                        console.error('[定时检查ProxyIP] 检测失败:', error.message);
                    }
                });
            } else {
                console.log(`[定时检查ProxyIP] 无 ProxyIP 需要检测`);
            }
        } catch (error) {
            console.error('[定时检查ProxyIP] 模块加载失败:', error.message);
        }
        
    } catch (error) {
        console.error('[定时任务] 执行失败:', error.message);
    }
});

// 自动更新优选IP
async function updateBestIPs() {
    try {
        const settings = db.getSettings() || { proxyIPs: [], bestDomains: [], subUrl: "" };
        
        const ipv4Data = await fetchBestIPsFromWeb('v4');
        const ipv6Data = await fetchBestIPsFromWeb('v6');
        
        if (ipv4Data.length === 0 && ipv6Data.length === 0) {
            console.log('[定时任务] 未获取到优选IP数据，保留现有数据');
            return;
        }
        
        // 分类现有域名
        const manualDomains = [];
        const oldAutoDomains = {};
        
        (settings.bestDomains || []).forEach(domain => {
            const autoMatch = domain.match(/^(\[?[0-9a-fA-F:.]+\]?):443#(v4|v6)(移动|联通|电信|铁通|广电)\s+[A-Z]{3}$/);
            if (!autoMatch) {
                manualDomains.push(domain);
            } else {
                const [, , ver, line] = autoMatch;
                const key = `${line}_${ver}`;
                if (!oldAutoDomains[key]) oldAutoDomains[key] = [];
                oldAutoDomains[key].push(domain);
            }
        });
        
        // 合并新旧IP
        const newAutoDomains = [];
        const allNewData = [...ipv4Data, ...ipv6Data];
        
        const newDataByLine = {};
        allNewData.forEach(item => {
            if (!newDataByLine[item.lineKey]) {
                newDataByLine[item.lineKey] = [];
            }
            newDataByLine[item.lineKey].push(item.entry);
        });
        
        // ⚠️ 关键修复：必须包含所有旧线路，防止数据丢失
        const allLineKeys = new Set([...Object.keys(oldAutoDomains), ...Object.keys(newDataByLine)]);
        
        allLineKeys.forEach(lineKey => {
            const newIPs = newDataByLine[lineKey] || [];
            const oldIPs = oldAutoDomains[lineKey] || [];
            
            if (newIPs.length > 0) {
                // 有新IP：新IP优先，不足5个用旧IP补齐
                const merged = [...newIPs.slice(0, 5)];
                if (merged.length < 5) {
                    const need = 5 - merged.length;
                    oldIPs.slice(0, need).forEach(oldIP => {
                        if (!merged.includes(oldIP)) {
                            merged.push(oldIP);
                        }
                    });
                }
                newAutoDomains.push(...merged.slice(0, 5));
            } else {
                // 没有新IP：完全保留旧IP（最多5个），防止数据丢失
                newAutoDomains.push(...oldIPs.slice(0, 5));
            }
        });
        
        // ⚠️ 关键修复：手动域名必须始终保留
        settings.bestDomains = [...manualDomains, ...newAutoDomains];
        db.saveSettings(settings);
        
        console.log(`[定时获取优选IP] 更新完成: 手动 ${manualDomains.length} 条, 自动 ${newAutoDomains.length} 条`);
        
    } catch (error) {
        console.error('[定时获取优选IP] 更新失败:', error.message);
        // ⚠️ 关键修复：发生错误时不修改数据，避免清空
    }
}

// 从网站抓取优选IP
async function fetchBestIPsFromWeb(ipType) {
    const url = ipType === 'v6' 
        ? 'https://www.wetest.vip/page/cloudflare/address_v6.html'
        : 'https://www.wetest.vip/page/cloudflare/address_v4.html';
    
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        
        const html = await response.text();
        const allResults = [];
        const trRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
        const matches = html.match(trRegex);
        
        if (!matches) return [];
        
        for (const tr of matches) {
            const lineTypeMatch = tr.match(/<td[^>]*data-label=["']线路名称["'][^>]*>([^<]+)<\/td/);
            const ipMatch = tr.match(/<td[^>]*data-label=["']优选地址["'][^>]*>([0-9a-fA-F:.]+)<\/td/);
            const dcMatch = tr.match(/<td[^>]*data-label=["']数据中心["'][^>]*>([^<]+)<\/td/);
            
            if (lineTypeMatch && ipMatch && dcMatch) {
                const lineType = lineTypeMatch[1].trim();
                const ip = ipMatch[1].trim();
                const dc = dcMatch[1].trim();
                const versionTag = ipType === 'v6' ? 'v6' : 'v4';
                
                const formattedAddr = ipType === 'v6' ? `[${ip}]:443` : `${ip}:443`;
                
                allResults.push({
                    lineType,
                    ip,
                    dc,
                    entry: `${formattedAddr}#${versionTag}${lineType} ${dc}`,
                    lineKey: `${lineType}_${ipType}`
                });
            }
        }
        
        // 按线路分组，每条线路最多5个
        const lineGroups = {};
        allResults.forEach(item => {
            const key = item.lineKey;
            if (!lineGroups[key]) lineGroups[key] = [];
            if (lineGroups[key].length < 5) {
                lineGroups[key].push(item);
            }
        });
        
        const results = [];
        Object.values(lineGroups).forEach(group => results.push(...group));
        
        return results;
    } catch (error) {
        console.error(`抓取 ${ipType} 失败:`, error.message);
        return [];
    }
}

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║       VLES 用户管理系统 - Docker 服务器版            ║
╠══════════════════════════════════════════════════════╣
║  服务端口: ${PORT}                                      ║
║  管理路径: ${ADMIN_PATH}                                    ║
║  数据库路径: ${process.env.DATABASE_PATH || './data/vles.db'}
╚══════════════════════════════════════════════════════╝

✅ 服务已启动: http://localhost:${PORT}
✅ 管理面板: http://localhost:${PORT}${ADMIN_PATH}
✅ 节点API: http://localhost:${PORT}/api/users
    `);
});
