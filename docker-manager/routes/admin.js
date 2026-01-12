/**
 * 管理员路由 - 管理后台API
 */

const db = require('../database');
const { fetchBestIPsFromWeb } = require('../server');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_PATH = process.env.ADMIN_PATH || '/admin';

// 验证管理员会话
function validateAdminSession(req) {
    const sessionId = req.cookies?.admin_session;
    if (!sessionId) return false;
    
    const session = db.validateSession(sessionId);
    if (!session) return false;
    
    const user = db.getUserById(session.user_id);
    return user && user.username === ADMIN_USERNAME;
}

// 检查权限中间件
function requireAuth(req, res, next) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    next();
}

// 管理员登录
async function login(req, res) {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        
        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 检查或创建管理员账号
        let adminUser = db.getUserByUsername(ADMIN_USERNAME);
        if (!adminUser) {
            console.log('[管理员] 管理员账号不存在，正在创建...');
            const passwordHash = db.hashPassword(ADMIN_PASSWORD);
            const adminUUID = db.generateUUID();
            
            // 创建管理员用户
            const expiry = Date.now() + (100 * 365 * 24 * 60 * 60 * 1000); // 100年
            db.addUser(adminUUID, '管理员', expiry);
            db.createUserAccount(ADMIN_USERNAME, passwordHash, '', adminUUID);
            adminUser = db.getUserByUsername(ADMIN_USERNAME);
            console.log('[管理员] 管理员账号创建成功:', adminUUID);
        }
        
        // 创建会话
        const sessionId = db.createSession(adminUser.id);
        if (!sessionId) {
            return res.status(500).json({ error: '登录失败，请稍后重试' });
        }
        
        db.updateLastLogin(adminUser.id);
        
        res.cookie('admin_session', sessionId, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'strict'
        });
        
        res.json({ 
            success: true, 
            message: '登录成功',
            redirect: ADMIN_PATH
        });
        
    } catch (e) {
        console.error('管理员登录错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 管理员登出
async function logout(req, res) {
    try {
        const sessionId = req.cookies?.admin_session;
        if (sessionId) {
            db.deleteSession(sessionId);
        }
        
        res.clearCookie('admin_session');
        res.json({ 
            success: true, 
            message: '已退出登录',
            redirect: ADMIN_PATH
        });
        
    } catch (e) {
        console.error('管理员登出错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 修改密码
async function changePassword(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未登录' });
    }
    
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: '请填写所有字段' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: '新密码长度至少6位' });
        }
        
        if (oldPassword !== ADMIN_PASSWORD) {
            return res.status(400).json({ error: '旧密码错误' });
        }
        
        // 注意：Docker 版本密码存储在环境变量中，这里只是演示
        // 实际应用中应该将密码存储在数据库中
        res.json({ 
            success: true, 
            message: '密码修改成功（注意：Docker版本需要修改环境变量）'
        });
        
    } catch (e) {
        console.error('修改密码错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 检查认证状态
function checkAuth(req, res) {
    const isLogged = validateAdminSession(req);
    res.json({ authenticated: isLogged });
}

// 添加用户
function addUser(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        let { name, expiryDate, uuids, frontUsername, frontPassword } = req.body;
        
        if (!name || name.trim() === '') name = '未命名';
        
        let expiry = null;
        if (expiryDate) {
            const [year, month, day] = expiryDate.split('-').map(Number);
            const beijingEndOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 8, 59, 59, 999));
            expiry = beijingEndOfDay.getTime();
        }
        
        let targetUUIDs = [];
        if (uuids && uuids.trim().length > 0) {
            const rawList = uuids.split(/[,，\n\s]+/);
            targetUUIDs = [...new Set(rawList.map(u => u.trim().toLowerCase()).filter(u => u.length > 0))];
        } else {
            targetUUIDs.push(db.generateUUID());
        }
        
        // 批量添加用户
        for (const uuid of targetUUIDs) {
            db.addUser(uuid, name, expiry);
        }
        
        // 如果只有一个 UUID，创建前端账号
        if (targetUUIDs.length === 1) {
            const uuid = targetUUIDs[0];
            
            if (!frontUsername || frontUsername.trim() === '') {
                frontUsername = generateRandomUsername();
            }
            
            if (!frontPassword || frontPassword.trim() === '') {
                frontPassword = frontUsername;
            }
            
            if (!db.getUserByUsername(frontUsername)) {
                const passwordHash = db.hashPassword(frontPassword);
                db.createUserAccount(frontUsername, passwordHash, '', uuid);
            }
        }
        
        res.json({ success: true });
        
    } catch (e) {
        console.error('添加用户错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 生成随机用户名
function generateRandomUsername() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 更新用户
// 重置用户UUID
function resetUserUUID(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { uuid } = req.body;
        
        if (!uuid) {
            return res.status(400).json({ error: 'UUID required' });
        }
        
        // 生成新UUID
        const newUUID = db.generateUUID();
        
        // 更新用户UUID
        db.updateUserUUID(uuid, newUUID);
        
        res.json({ success: true, newUUID: newUUID });
        
    } catch (e) {
        console.error('重置UUID错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

function updateUser(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { uuid, name, expiry, expiryDate, newPassword, frontUsername, frontPassword } = req.body;
        
        if (!uuid) {
            return res.status(400).json({ error: 'UUID required' });
        }
        
        let finalExpiry = null;
        if (expiry !== undefined && expiry !== null) {
            // 前端发送时间戳
            finalExpiry = expiry;
        } else if (expiryDate) {
            // 兼容旧版日期字符串格式
            const [year, month, day] = expiryDate.split('-').map(Number);
            const beijingEndOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 8, 59, 59, 999));
            finalExpiry = beijingEndOfDay.getTime();
        }
        
        db.updateUser(uuid, name, finalExpiry);
        
        // 更新密码
        if (newPassword && newPassword.trim() !== '') {
            const passwordHash = db.hashPassword(newPassword.trim());
            db.updateUserPasswordByUUID(uuid, passwordHash);
        }
        
        // 更新前端账号
        const frontAccount = db.getUserAccountByUUID(uuid);
        if (frontAccount) {
            // 账号存在，更新
            if (frontUsername && frontUsername.trim() !== '') {
                db.updateUserAccountUsername(frontAccount.id, frontUsername.trim());
            }
            if (frontPassword && frontPassword.trim() !== '') {
                const passwordHash = db.hashPassword(frontPassword.trim());
                db.updateUserAccountPassword(frontAccount.id, passwordHash);
            }
        } else if (frontUsername && frontUsername.trim() !== '') {
            // 账号不存在，创建新账号
            const password = frontPassword && frontPassword.trim() !== '' ? frontPassword.trim() : frontUsername.trim();
            const passwordHash = db.hashPassword(password);
            db.createUserAccount(frontUsername.trim(), passwordHash, '', uuid);
        }
        
        res.json({ success: true });
        
    } catch (e) {
        console.error('更新用户错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 删除用户
function deleteUsers(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { uuids } = req.body;
        
        if (uuids) {
            const uuidList = uuids.split(',');
            
            // 检查是否包含管理员账号
            const adminUser = db.getUserByUsername(ADMIN_USERNAME);
            if (adminUser) {
                const adminAccount = db.getUserAccountByUserId(adminUser.id);
                if (adminAccount && uuidList.includes(adminAccount.uuid)) {
                    return res.status(403).json({ error: '不能删除管理员账号' });
                }
            }
            
            db.deleteUsers(uuidList);
        }
        
        res.json({ success: true });
        
    } catch (e) {
        console.error('删除用户错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取单个用户详情（包括前端账号）
function getUserDetail(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { uuid } = req.params;
        const user = db.getUserByUUID(uuid);
        
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        const frontAccount = db.getUserAccountByUUID(uuid);
        
        res.json({
            success: true,
            user,
            frontAccount: frontAccount ? {
                username: frontAccount.username,
                email: frontAccount.email
            } : null
        });
    } catch (e) {
        console.error('获取用户详情错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 更新用户状态
function updateStatus(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { uuids, enabled } = req.body;
        
        if (!uuids) {
            return res.status(400).json({ error: 'UUIDs required' });
        }
        
        const uuidList = uuids.split(',');
        db.updateUsersStatus(uuidList, enabled === 'true');
        
        res.json({ success: true });
        
    } catch (e) {
        console.error('更新状态错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取用户关联账号
function getUserAccount(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const uuid = req.query.uuid;
        if (!uuid) {
            return res.status(400).json({ error: 'UUID required' });
        }
        
        const account = db.getUserAccountByUUID(uuid);
        res.json({ success: true, account: account });
        
    } catch (e) {
        console.error('获取账号错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取所有用户列表
function getAllUsers(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const users = db.getAllUsers();
        res.json({ success: true, users });
    } catch (e) {
        console.error('获取用户列表错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取系统设置
function getSystemSettings(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const settings = db.getSettings() || {};
        res.json({ 
            success: true, 
            settings: {
                siteName: settings.siteName || 'CFly',
                enableRegister: settings.enableRegister !== false,
                autoApproveOrder: settings.autoApproveOrder === true,
                enableTrial: settings.enableTrial !== undefined ? settings.enableTrial : false,
                trialDays: settings.trialDays || 1,
                requireInviteCode: settings.requireInviteCode !== undefined ? settings.requireInviteCode : false,
                pendingOrderExpiry: settings.pendingOrderExpiry || 30,
                paymentOrderExpiry: settings.paymentOrderExpiry || 15,
                link1Name: settings.customLink1Name || '',
                link1Url: settings.customLink1Url || '',
                link2Name: settings.customLink2Name || '',
                link2Url: settings.customLink2Url || '',
                autoCleanupEnabled: settings.enableAutoCleanup !== undefined ? settings.enableAutoCleanup : false,
                autoCleanupDays: settings.autoCleanupDays || 7,
                subUrl: settings.subUrl || '',
                websiteUrl: settings.websiteUrl || '',
                baseUrl: settings.baseUrl || '',
                proxyIPs: settings.proxyIPs || [],
                bestDomains: settings.bestDomains || []
            }
        });
    } catch (e) {
        console.error('获取系统设置错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 保存配置
function saveSettings(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { proxyIP, bestDomains, subUrl, websiteUrl } = req.body;
        
        let proxyIPs = proxyIP ? proxyIP.split(/[\n,]+/).map(d => d.trim()).filter(d => d.length > 0) : [];
        let bestDomainsList = bestDomains ? bestDomains.split(/[\n,]+/).map(d => d.trim()).filter(d => d.length > 0) : [];
        
        // 限制每条线路最多5个IP
        bestDomainsList = validateAndLimitIPs(bestDomainsList);
        
        const currentSettings = db.getSettings() || {};
        const settings = { 
            ...currentSettings, 
            proxyIPs, 
            bestDomains: bestDomainsList, 
            subUrl, 
            websiteUrl 
        };
        
        db.saveSettings(settings);
        res.json({ success: true });
        
    } catch (e) {
        console.error('保存配置错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 验证并限制IP数量
function validateAndLimitIPs(bestDomains) {
    const manualDomains = [];
    const autoDomains = {};
    
    bestDomains.forEach(domain => {
        const autoMatch = domain.match(/^(\[?[0-9a-fA-F:.]+\]?):443#(v4|v6)(移动|联通|电信|铁通|广电)\s+[A-Z]{3}$/);
        
        if (!autoMatch) {
            manualDomains.push(domain);
        } else {
            const [, , ver, line] = autoMatch;
            const lineKey = `${line}_${ver}`;
            
            if (!autoDomains[lineKey]) {
                autoDomains[lineKey] = [];
            }
            autoDomains[lineKey].push(domain);
        }
    });
    
    const limitedAutoDomains = [];
    
    Object.keys(autoDomains).forEach(lineKey => {
        const ips = autoDomains[lineKey];
        limitedAutoDomains.push(...ips.slice(0, 5));
    });
    
    return [...manualDomains, ...limitedAutoDomains];
}

// 更新系统设置
function updateSystemSettings(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const currentSettings = db.getSettings() || {};
        const body = req.body;
        
        if (body.enableRegister !== undefined) {
            currentSettings.enableRegister = body.enableRegister === true || body.enableRegister === 'true';
        }
        if (body.autoApproveOrder !== undefined) {
            currentSettings.autoApproveOrder = body.autoApproveOrder === true || body.autoApproveOrder === 'true';
        }
        if (body.enableTrial !== undefined) {
            currentSettings.enableTrial = body.enableTrial === true || body.enableTrial === 'true';
        }
        if (body.trialDays !== undefined) {
            currentSettings.trialDays = parseInt(body.trialDays) || 1;
        }
        if (body.requireInviteCode !== undefined) {
            currentSettings.requireInviteCode = body.requireInviteCode === true || body.requireInviteCode === 'true';
        }
        if (body.pendingOrderExpiry !== undefined) {
            currentSettings.pendingOrderExpiry = parseInt(body.pendingOrderExpiry) || 30;
        }
        if (body.paymentOrderExpiry !== undefined) {
            currentSettings.paymentOrderExpiry = parseInt(body.paymentOrderExpiry) || 15;
        }
        if (body.link1Name !== undefined) {
            currentSettings.customLink1Name = body.link1Name || '';
        }
        if (body.link1Url !== undefined) {
            currentSettings.customLink1Url = body.link1Url || '';
        }
        if (body.link2Name !== undefined) {
            currentSettings.customLink2Name = body.link2Name || '';
        }
        if (body.link2Url !== undefined) {
            currentSettings.customLink2Url = body.link2Url || '';
        }
        if (body.siteName !== undefined) {
            currentSettings.siteName = body.siteName || 'CFly';
        }
        if (body.autoCleanupEnabled !== undefined) {
            currentSettings.enableAutoCleanup = body.autoCleanupEnabled === true || body.autoCleanupEnabled === 'true';
        }
        if (body.autoCleanupDays !== undefined) {
            currentSettings.autoCleanupDays = parseInt(body.autoCleanupDays) || 7;
        }
        if (body.baseUrl !== undefined) {
            currentSettings.baseUrl = body.baseUrl || '';
        }
        
        db.saveSettings(currentSettings);
        res.json({ success: true });
        
    } catch (e) {
        console.error('更新系统设置错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 抓取优选IP
async function fetchBestIPs(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const type = req.body.type || 'v4';
        const { fetchBestIPsFromWeb } = require('../server');
        const results = await fetchBestIPsFromWeb(type);
        
        if (results.length === 0) {
            return res.status(404).json({ error: '未找到数据' });
        }
        
        res.json({ success: true, count: results.length, data: results });
        
    } catch (e) {
        console.error('抓取优选IP错误:', e);
        res.status(500).json({ error: e.message });
    }
}

// --- 套餐管理 ---

function getPlans(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    const plans = db.getAllPlans(true);
    res.json({ success: true, plans: plans });
}

function createPlan(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { name, description, duration_days, price } = req.body;
        
        if (!name || !duration_days) {
            return res.status(400).json({ error: '套餐名称和时长不能为空' });
        }
        
        db.createPlan(name, description || '', parseInt(duration_days), parseFloat(price) || 0);
        res.json({ success: true });
        
    } catch (e) {
        console.error('创建套餐错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

function updatePlan(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id, name, description, duration_days, price } = req.body;
        
        if (!id || !name || !duration_days) {
            return res.status(400).json({ error: '参数不完整' });
        }
        
        db.updatePlan(parseInt(id), name, description || '', parseInt(duration_days), parseFloat(price) || 0);
        res.json({ success: true });
        
    } catch (e) {
        console.error('更新套餐错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

function togglePlan(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id } = req.body;
        db.togglePlan(parseInt(id));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

function deletePlan(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id } = req.body;
        db.deletePlan(parseInt(id));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

// --- 订单管理 ---

function getOrders(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    const status = req.query.status || 'all';
    let orders = db.getOrders(status);
    
    // 检查订单过期时间
    const settings = db.getSettings() || {};
    const now = Date.now();
    const pendingExpiry = settings.pendingOrderExpiry || 0; // 分钟
    const paymentExpiry = settings.paymentOrderExpiry || 15; // 分钟
    
    orders = orders.map(order => {
        if (order.status === 'pending' && pendingExpiry > 0) {
            const expiryTime = order.created_at + (pendingExpiry * 60 * 1000);
            if (now > expiryTime) {
                // 更新订单状态为已过期
                db.updateOrderStatus(order.id, 'expired');
                order.status = 'expired';
            }
        }
        return order;
    });
    
    res.json({ success: true, orders: orders });
}

function approveOrder(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id, order_id } = req.body;
        const orderId = id || order_id;
        const order = db.getOrderById(parseInt(orderId));
        
        if (!order) {
            return res.status(404).json({ error: '订单不存在' });
        }
        
        // 更新用户到期时间
        const user = db.getUserByUUID(order.uuid);
        const currentExpiry = user && user.expiry ? user.expiry : Date.now();
        const newExpiry = Math.max(currentExpiry, Date.now()) + (order.duration_days * 24 * 60 * 60 * 1000);
        
        db.updateUserExpiry(order.uuid, newExpiry);
        db.updateOrderStatus(parseInt(orderId), 'approved', Date.now());
        
        res.json({ success: true });
        
    } catch (e) {
        console.error('审核订单错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

function rejectOrder(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id, order_id } = req.body;
        const orderId = id || order_id;
        db.updateOrderStatus(parseInt(orderId), 'rejected');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

// --- 公告管理 ---

function getAnnouncements(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    const announcements = db.getAllAnnouncements();
    res.json({ success: true, announcements: announcements });
}

function getAnnouncementById(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    const announcement = db.getAnnouncementById(parseInt(req.params.id));
    res.json({ success: true, announcement: announcement });
}

function createAnnouncement(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: '标题和内容不能为空' });
        }
        
        db.createAnnouncement(title, content);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

function updateAnnouncement(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id, title, content, enabled } = req.body;
        db.updateAnnouncement(parseInt(id), title, content, enabled === 'true' || enabled === true);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

function deleteAnnouncement(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id } = req.body;
        db.deleteAnnouncement(parseInt(id));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

// --- 邀请码管理 ---

function getInvites(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    const invites = db.getAllInviteCodes();
    res.json({ success: true, invites: invites });
}

function createInvite(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        let { code, max_uses, trial_days, remark } = req.body;
        
        // 如果没有提供邀请码，自动生成一个
        if (!code) {
            code = Math.random().toString(36).substring(2, 10).toUpperCase();
        }
        
        db.createInviteCode(code, parseInt(max_uses) || 1, parseInt(trial_days) || 0, remark || '');
        res.json({ success: true, code: code });
    } catch (e) {
        console.error('创建邀请码错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

function updateInvite(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id, code, max_uses, trial_days, remark } = req.body;
        db.updateInviteCode(parseInt(id), code, parseInt(max_uses), parseInt(trial_days), remark);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

function toggleInvite(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id } = req.body;
        db.toggleInviteCode(parseInt(id));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

function deleteInvite(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id } = req.body;
        db.deleteInviteCode(parseInt(id));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

// --- 支付通道管理 ---

function getPaymentChannels(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    const channels = db.getAllPaymentChannels();
    res.json({ success: true, channels: channels });
}

function savePaymentChannel(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { name, code, api_url, api_token, callback_url } = req.body;
        
        if (!name || !code || !api_url || !api_token) {
            return res.status(400).json({ error: '所有字段都不能为空' });
        }
        
        db.createPaymentChannel(name, code, api_url, api_token, callback_url || null);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

function updatePaymentChannel(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id, name, code, api_url, api_token, callback_url } = req.body;
        db.updatePaymentChannel(parseInt(id), name, code, api_url, api_token, callback_url || null);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

function togglePaymentChannel(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id } = req.body;
        db.togglePaymentChannel(parseInt(id));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

function deletePaymentChannel(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const { id } = req.body;
        db.deletePaymentChannel(parseInt(id));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '服务器错误' });
    }
}

// --- 数据导入导出 ---

function exportData(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const data = db.exportAllData();
        
        res.json({
            exportTime: new Date().toISOString(),
            version: '1.0',
            data: data,
            summary: {
                totalUsers: data.users.length,
                totalUserAccounts: data.userAccounts.length,
                totalPlans: data.plans.length,
                totalOrders: data.orders.length,
                totalAnnouncements: data.announcements.length,
                totalInviteCodes: data.inviteCodes.length,
                totalPaymentChannels: data.paymentChannels.length
            }
        });
    } catch (e) {
        res.status(500).json({ error: '导出失败: ' + e.message });
    }
}

function importData(req, res) {
    if (!validateAdminSession(req)) {
        return res.status(401).json({ error: '未授权' });
    }
    
    try {
        const importBody = req.body;
        
        // 兼容两种备份格式：
        // 1. 新格式: { exportTime, version, data: {...} }
        // 2. 旧格式/简化格式: { users: [...], userAccounts: [...], ... }
        let data;
        if (importBody.data) {
            data = importBody.data;
        } else if (importBody.users || importBody.userAccounts || importBody.settings) {
            data = importBody;
        } else {
            return res.status(400).json({ error: '无效的备份文件格式' });
        }
        
        const database = db.getDb(); // 获取数据库实例
        
        let importedCounts = {
            users: 0,
            userAccounts: 0,
            settings: 0,
            plans: 0,
            orders: 0,
            announcements: 0,
            inviteCodes: 0,
            paymentChannels: 0
        };

        // 1. 导入 settings
        if (data.settings && data.settings.length > 0) {
            for (const setting of data.settings) {
                try {
                    database.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(setting.key, setting.value);
                    importedCounts.settings++;
                } catch (e) {
                    console.error('导入设置失败:', setting.key, e.message);
                }
            }
        }

        // 2. 导入 users
        if (data.users && data.users.length > 0) {
            for (const user of data.users) {
                try {
                    database.prepare(
                        "INSERT OR REPLACE INTO users (uuid, name, expiry, create_at, enabled) VALUES (?, ?, ?, ?, ?)"
                    ).run(user.uuid, user.name, user.expiry, user.create_at, user.enabled !== undefined ? user.enabled : 1);
                    importedCounts.users++;
                } catch (e) {
                    console.error('导入用户失败:', user.uuid, e.message);
                }
            }
        }

        // 3. 导入 user_accounts
        if (data.userAccounts && data.userAccounts.length > 0) {
            for (const account of data.userAccounts) {
                try {
                    const existing = database.prepare("SELECT id FROM user_accounts WHERE username = ? OR uuid = ?").get(account.username, account.uuid);
                    if (!existing) {
                        const tempPasswordHash = db.hashPassword(account.username);
                        database.prepare(
                            "INSERT INTO user_accounts (username, password_hash, email, uuid, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)"
                        ).run(account.username, tempPasswordHash, account.email || '', account.uuid, account.created_at, account.last_login);
                        importedCounts.userAccounts++;
                    }
                } catch (e) {
                    console.error('导入账号失败:', account.username, e.message);
                }
            }
        }

        // 4. 导入 plans (subscription_plans 表)
        if (data.plans && data.plans.length > 0) {
            for (const plan of data.plans) {
                try {
                    // 兼容 duration_days 和 duration 两种字段名
                    const durationDays = plan.duration_days || plan.duration || 30;
                    database.prepare(
                        "INSERT OR REPLACE INTO subscription_plans (id, name, description, duration_days, price, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
                    ).run(plan.id, plan.name, plan.description || '', durationDays, plan.price, plan.enabled !== undefined ? plan.enabled : 1, plan.created_at);
                    importedCounts.plans++;
                } catch (e) {
                    console.error('导入套餐失败:', plan.name, e.message);
                }
            }
        }

        // 5. 导入 orders
        if (data.orders && data.orders.length > 0) {
            for (const order of data.orders) {
                try {
                    // 检查 user_id 和 plan_id 是否存在，避免外键约束错误
                    const userExists = database.prepare("SELECT id FROM user_accounts WHERE id = ?").get(order.user_id);
                    const planExists = database.prepare("SELECT id FROM subscription_plans WHERE id = ?").get(order.plan_id);
                    
                    if (!userExists) {
                        console.error('导入订单跳过:', order.id, '用户不存在:', order.user_id);
                        continue;
                    }
                    if (!planExists) {
                        console.error('导入订单跳过:', order.id, '套餐不存在:', order.plan_id);
                        continue;
                    }
                    
                    // 使用实际的表字段: user_id, plan_id, amount, status, created_at, paid_at
                    database.prepare(
                        "INSERT OR REPLACE INTO orders (id, user_id, plan_id, amount, status, created_at, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
                    ).run(order.id, order.user_id, order.plan_id, order.amount || order.price || 0, order.status, order.created_at, order.paid_at);
                    importedCounts.orders++;
                } catch (e) {
                    console.error('导入订单失败:', order.id, e.message);
                }
            }
        }

        // 6. 导入 announcements
        if (data.announcements && data.announcements.length > 0) {
            for (const ann of data.announcements) {
                try {
                    database.prepare(
                        "INSERT OR REPLACE INTO announcements (id, title, content, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
                    ).run(ann.id, ann.title, ann.content, ann.enabled !== undefined ? ann.enabled : 1, ann.created_at, ann.updated_at || ann.created_at);
                    importedCounts.announcements++;
                } catch (e) {
                    console.error('导入公告失败:', ann.title, e.message);
                }
            }
        }

        // 7. 导入 invite_codes
        if (data.inviteCodes && data.inviteCodes.length > 0) {
            for (const invite of data.inviteCodes) {
                try {
                    database.prepare(
                        "INSERT OR REPLACE INTO invite_codes (id, code, trial_days, max_uses, used_count, enabled, created_at, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                    ).run(invite.id, invite.code, invite.trial_days || 0, invite.max_uses || 1, invite.used_count || 0, invite.enabled !== undefined ? invite.enabled : 1, invite.created_at, invite.remark || '');
                    importedCounts.inviteCodes++;
                } catch (e) {
                    console.error('导入邀请码失败:', invite.code, e.message);
                }
            }
        }

        // 8. 导入 payment_channels
        if (data.paymentChannels && data.paymentChannels.length > 0) {
            for (const channel of data.paymentChannels) {
                try {
                    database.prepare(
                        "INSERT OR REPLACE INTO payment_channels (id, name, code, api_url, api_token, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
                    ).run(channel.id, channel.name, channel.code, channel.api_url, channel.api_token, channel.enabled !== undefined ? channel.enabled : 1, channel.created_at);
                    importedCounts.paymentChannels++;
                } catch (e) {
                    console.error('导入支付通道失败:', channel.name, e.message);
                }
            }
        }

        res.json({ 
            success: true, 
            message: '数据导入完成',
            counts: importedCounts
        });
        
    } catch (e) {
        console.error('导入失败:', e);
        res.status(500).json({ error: '导入失败: ' + e.message });
    }
}

// 获取反代IP列表
function getProxyIPs(req, res) {
    try {
        const proxyIPs = db.getProxyIPs();
        res.json({ success: true, proxyIPs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// 保存反代IP列表
function saveProxyIPs(req, res) {
    try {
        const { proxyIPs } = req.body;
        if (!Array.isArray(proxyIPs)) {
            return res.status(400).json({ error: '无效的数据格式' });
        }
        db.saveProxyIPs(proxyIPs);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// 获取优选域名列表
function getBestDomains(req, res) {
    try {
        const bestDomains = db.getBestDomains();
        res.json({ success: true, bestDomains });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// 保存优选域名列表
function saveBestDomains(req, res) {
    try {
        const { bestDomains } = req.body;
        if (!Array.isArray(bestDomains)) {
            return res.status(400).json({ error: '无效的数据格式' });
        }
        db.saveBestDomains(bestDomains);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// ==================== 修改密码 ====================
async function changeAdminPassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: '请填写完整信息' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: '新密码至少6位' });
        }
        
        const settings = db.getSettings();
        const currentPassword = settings.adminPassword || 'admin123';
        
        // 验证旧密码
        const isValid = await db.hashPassword(oldPassword) === currentPassword;
        if (!isValid) {
            // 如果settings中的密码是明文，直接比较
            if (oldPassword !== currentPassword) {
                db.addLog('修改密码失败', '旧密码错误', 'error');
                return res.status(400).json({ error: '旧密码错误' });
            }
        }
        
        // 更新密码
        settings.adminPassword = await db.hashPassword(newPassword);
        db.saveSettings(settings);
        
        db.addLog('修改密码', '管理员密码已更新', 'success');
        res.json({ success: true, message: '密码修改成功' });
    } catch (e) {
        db.addLog('修改密码失败', e.message, 'error');
        res.status(500).json({ error: e.message });
    }
}

// ==================== 数据导出 ====================
function exportAllData(req, res) {
    try {
        const data = db.exportAllData();
        db.addLog('数据导出', '导出全部数据', 'info');
        res.json(data);
    } catch (e) {
        db.addLog('数据导出失败', e.message, 'error');
        res.status(500).json({ error: e.message });
    }
}

// ==================== 数据导入 ====================
function importAllData(req, res) {
    try {
        const data = req.body;
        
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: '无效的数据格式' });
        }
        
        // TODO: 实现数据导入逻辑
        // 这里需要谨慎处理，避免覆盖重要数据
        
        db.addLog('数据导入', '导入数据（暂未实现完整功能）', 'warning');
        res.json({ success: true, message: '数据导入功能开发中' });
    } catch (e) {
        db.addLog('数据导入失败', e.message, 'error');
        res.status(500).json({ error: e.message });
    }
}

// ==================== 系统日志 ====================
function getSystemLogs(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = db.getLogs(limit);
        res.json({ logs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

function clearSystemLogs(req, res) {
    try {
        db.clearLogs();
        db.addLog('清空日志', '系统日志已清空', 'info');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// ==================== 统计数据 ====================
function getStatistics(req, res) {
    try {
        const stats = db.getStats();
        
        // 获取配置节点数
        const settings = db.getSettings() || {};
        const configNodes = (settings.proxyIPs || []).length + (settings.bestDomains || []).length;
        
        // 转换为前端期望的格式
        res.json({
            totalUsers: stats.users?.total || 0,
            activeUsers: stats.users?.active || 0,
            expiredUsers: stats.users?.expired || 0,
            configNodes: configNodes,
            // 保留原始完整数据供其他使用
            ...stats
        });
    } catch (e) {
        console.error('获取统计数据错误:', e);
        res.status(500).json({ 
            error: e.message,
            totalUsers: 0,
            activeUsers: 0,
            expiredUsers: 0,
            configNodes: 0
        });
    }
}

module.exports = {
    login,
    logout,
    changePassword,
    checkAuth,
    addUser,
    updateUser,
    resetUserUUID,
    deleteUsers,
    updateStatus,
    getUserAccount,
    getAllUsers,
    getUserDetail,
    saveSettings,
    getSystemSettings,
    updateSystemSettings,
    fetchBestIPs,
    getPlans,
    createPlan,
    updatePlan,
    togglePlan,
    deletePlan,
    getOrders,
    approveOrder,
    rejectOrder,
    getAnnouncements,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getInvites,
    createInvite,
    updateInvite,
    toggleInvite,
    deleteInvite,
    getPaymentChannels,
    savePaymentChannel,
    updatePaymentChannel,
    togglePaymentChannel,
    deletePaymentChannel,
    exportData,
    importData,
    getProxyIPs,
    saveProxyIPs,
    getBestDomains,
    saveBestDomains,
    changeAdminPassword,
    exportAllData,
    importAllData,
    getSystemLogs,
    clearSystemLogs,
    getStatistics
};
