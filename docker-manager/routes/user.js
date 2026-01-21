/**
 * 用户路由 - 用户认证和操作
 */

const db = require('../database');
const crypto = require('crypto');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

// 验证 Cloudflare Turnstile Token
async function verifyTurnstileToken(token) {
    const settings = db.getSettings() || {};
    const secretKey = settings.turnstileSecretKey || process.env.TURNSTILE_SECRET_KEY;
    
    // 如果没有配置密钥,跳过验证
    if (!secretKey) {
        console.log('⚠️  未配置 Turnstile Secret Key，跳过人机验证');
        return true;
    }
    
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret: secretKey,
                response: token,
            }),
        });
        
        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('Turnstile 验证失败:', error);
        return false;
    }
}

// 验证用户会话
function validateUserSession(req) {
    const sessionId = req.cookies?.user_session;
    if (!sessionId) return null;
    
    const session = db.validateSession(sessionId);
    if (!session) return null;
    
    return db.getUserById(session.user_id);
}

// 用户注册
async function register(req, res) {
    const settings = db.getSettings() || {};
    
    if (!settings.enableRegister) {
        return res.status(403).json({ error: '注册功能未开放' });
    }
    
    try {
        const { username, password, email, invite_code, turnstileToken } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        
        // 验证 Turnstile Token (仅在启用且配置了 Site Key 时)
        const enableTurnstile = settings.enableTurnstile === true;
        const turnstileSiteKey = settings.turnstileSiteKey;
        if (enableTurnstile && turnstileSiteKey && turnstileSiteKey.trim()) {
            if (!turnstileToken) {
                return res.status(400).json({ error: '请完成人机验证' });
            }
            const isValidToken = await verifyTurnstileToken(turnstileToken);
            if (!isValidToken) {
                return res.status(400).json({ error: '人机验证失败，请重试' });
            }
        }
        
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: '用户名长度必须在 3-20 个字符之间' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: '密码长度不能少于 6 个字符' });
        }
        
        // 验证邀请码
        let inviteRecord = null;
        let inviteTrialDays = 0;
        
        if (settings.requireInviteCode) {
            if (!invite_code) {
                return res.status(400).json({ error: '请输入邀请码' });
            }
            
            inviteRecord = db.getInviteByCode(invite_code.trim());
            
            if (!inviteRecord) {
                return res.status(400).json({ error: '邀请码无效或已禁用' });
            }
            
            if (inviteRecord.used_count >= inviteRecord.max_uses) {
                return res.status(400).json({ error: '邀请码已达到使用次数上限' });
            }
            
            inviteTrialDays = inviteRecord.trial_days || 0;
        }
        
        // 检查用户名是否已存在
        if (db.getUserByUsername(username)) {
            return res.status(409).json({ error: '用户名已存在' });
        }
        
        // 生成 UUID 并创建用户
        const uuid = db.generateUUID();
        const passwordHash = db.hashPassword(password);
        
        // 计算到期时间
        let expiry = null;
        if (inviteTrialDays > 0) {
            expiry = Date.now() + (inviteTrialDays * 24 * 60 * 60 * 1000);
        } else if (settings.enableTrial) {
            const trialDays = settings.trialDays || 7;
            expiry = Date.now() + (trialDays * 24 * 60 * 60 * 1000);
        }
        
        // 创建用户
        db.addUser(uuid, username, expiry);
        
        // 创建用户账号
        const result = db.createUserAccount(username, passwordHash, email || '', uuid);
        if (!result) {
            return res.status(500).json({ error: '注册失败，请稍后重试' });
        }
        
        // 更新邀请码使用次数
        if (inviteRecord) {
            db.incrementInviteUsage(inviteRecord.id);
        }
        
        res.json({ success: true, message: '注册成功！请登录' });
        
    } catch (e) {
        console.error('注册错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 用户登录
async function login(req, res) {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        
        const user = db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        const passwordHash = db.hashPassword(password);
        if (passwordHash !== user.password_hash) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 创建会话
        const sessionId = db.createSession(user.id);
        if (!sessionId) {
            return res.status(500).json({ error: '登录失败，请稍后重试' });
        }
        
        db.updateLastLogin(user.id);
        
        res.cookie('user_session', sessionId, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'strict'
        });
        
        res.json({ success: true, message: '登录成功' });
        
    } catch (e) {
        console.error('登录错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 用户登出
async function logout(req, res) {
    try {
        const sessionId = req.cookies?.user_session;
        if (sessionId) {
            db.deleteSession(sessionId);
        }
        
        res.clearCookie('user_session');
        res.json({ success: true, message: '已退出登录' });
        
    } catch (e) {
        console.error('登出错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取用户信息
async function getInfo(req, res) {
    try {
        const user = validateUserSession(req);
        if (!user) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const uuidUser = db.getUserByUUID(user.uuid);
        const isExpired = uuidUser && uuidUser.expiry && uuidUser.expiry < Date.now();
        const isEnabled = uuidUser && uuidUser.enabled === 1;
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                uuid: user.uuid,
                createdAt: user.created_at,
                lastLogin: user.last_login,
                expiry: uuidUser ? uuidUser.expiry : null,
                enabled: isEnabled,
                expired: isExpired,
                status: isExpired ? '已过期' : (!isEnabled ? '已禁用' : '正常')
            }
        });
        
    } catch (e) {
        console.error('获取用户信息错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 修改密码
async function changePassword(req, res) {
    try {
        const user = validateUserSession(req);
        if (!user) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: '请填写所有字段' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: '新密码长度至少6位' });
        }
        
        const oldPasswordHash = db.hashPassword(oldPassword);
        if (oldPasswordHash !== user.password_hash) {
            return res.status(400).json({ error: '旧密码错误' });
        }
        
        const newPasswordHash = db.hashPassword(newPassword);
        db.updateUserPassword(user.id, newPasswordHash);
        db.deleteUserSessions(user.id);
        
        res.clearCookie('user_session');
        res.json({ success: true, message: '密码修改成功' });
        
    } catch (e) {
        console.error('修改密码错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取用户订单
async function getOrders(req, res) {
    try {
        const user = validateUserSession(req);
        if (!user) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const orders = db.getUserOrders(user.id);
        res.json({ success: true, orders: orders });
        
    } catch (e) {
        console.error('获取订单错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 创建订单
async function createOrder(req, res) {
    try {
        const user = validateUserSession(req);
        if (!user) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const { plan_id } = req.body;
        
        if (!plan_id) {
            return res.status(400).json({ error: '请选择套餐' });
        }
        
        const plan = db.getPlanById(parseInt(plan_id));
        if (!plan || plan.enabled !== 1) {
            return res.status(400).json({ error: '套餐不存在或已下架' });
        }
        
        // 不再限制订单创建，允许多个pending订单（订单有过期时间）
        
        // 创建订单
        const result = db.createOrder(user.id, plan.id, plan.price);
        
        const orderId = result.lastInsertRowid;
        const settings = db.getSettings() || {};
        
        // 免费套餐处理
        if (plan.price === 0) {
            if (settings.autoApproveOrder) {
                // 检查用户是否还有自动审核机会
                const autoApproveVersion = settings.autoApproveVersion || 0;
                const userAccount = db.getUserAccountByUUID(user.uuid);
                const userAutoApproveVersion = userAccount ? (userAccount.auto_approve_version || 0) : 0;
                
                // 如果用户的版本号小于系统版本号，说明还可以使用自动审核
                if (userAutoApproveVersion < autoApproveVersion) {
                    // 自动审核：直接通过
                    const uuidUser = db.getUserByUUID(user.uuid);
                    const currentExpiry = uuidUser && uuidUser.expiry ? uuidUser.expiry : Date.now();
                    const newExpiry = Math.max(currentExpiry, Date.now()) + (plan.duration_days * 24 * 60 * 60 * 1000);
                    
                    db.updateUserExpiry(user.uuid, newExpiry);
                    db.updateOrderStatus(orderId, 'approved', Date.now());
                    
                    // 更新用户的自动审核版本号
                    if (userAccount) {
                        db.updateUserAutoApproveVersion(userAccount.id, autoApproveVersion);
                    }
                    
                    return res.json({ 
                        success: true, 
                        message: '订单已自动审核通过',
                        autoApproved: true
                    });
                } else {
                    // 已经使用过自动审核，需要等待手动审核
                    return res.json({ 
                        success: true, 
                        message: '订单创建成功，请等待管理员审核（您已使用过本次自动审核机会）',
                        orderId: orderId,
                        needApproval: true
                    });
                }
            } else {
                // 需要审核
                return res.json({ 
                    success: true, 
                    message: '订单创建成功，请等待管理员审核',
                    orderId: orderId,
                    needApproval: true
                });
            }
        }
        
        // 付费套餐：返回订单ID，前端跳转到支付页面
        res.json({ 
            success: true, 
            message: '订单创建成功',
            orderId: orderId,
            needPayment: true,
            amount: plan.price
        });
        
    } catch (e) {
        console.error('创建订单错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 支付订单
async function payOrder(req, res) {
    try {
        const user = validateUserSession(req);
        if (!user) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const { order_id, channel_id, trade_type } = req.body;
        
        if (!order_id) {
            return res.status(400).json({ error: '订单ID不能为空' });
        }
        
        const orderId = parseInt(order_id);
        const channelId = channel_id ? parseInt(channel_id) : null;
        
        // 获取订单
        const orders = db.getUserOrders(user.id);
        const order = orders.find(o => o.id === orderId && o.status === 'pending');
        
        if (!order) {
            return res.status(404).json({ error: '订单不存在或已处理' });
        }
        
        // 获取支付通道
        let channel;
        if (channelId) {
            channel = db.getPaymentChannelById(channelId);
        } else {
            const channels = db.getEnabledPaymentChannels();
            if (channels.length > 0) {
                channel = db.getPaymentChannelById(channels[0].id);
            }
        }
        
        if (!channel || channel.enabled !== 1) {
            return res.status(400).json({ error: '支付通道未配置或已禁用' });
        }
        
        // 构建支付请求
        const settings = db.getSettings() || {};
        const baseUrl = settings.baseUrl || `${req.protocol}://${req.get('host')}`;
        const notifyUrl = `${baseUrl}/api/payment/notify`;
        const redirectUrl = `${baseUrl}/`;
        
        const payParams = {
            order_id: order.order_no,
            amount: order.amount,
            notify_url: notifyUrl,
            redirect_url: redirectUrl,
            trade_type: trade_type || 'usdt.trc20'
        };
        
        // 生成签名
        payParams.signature = generateBepusdtSignature(payParams, channel.api_token);
        
        // 调用支付网关
        const response = await fetch(`${channel.api_url}/api/v1/order/create-transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payParams)
        });
        
        const result = await response.json();
        
        if (result.status_code === 200) {
            res.json({
                success: true,
                data: {
                    trade_id: result.data.trade_id,
                    amount: result.data.amount,
                    actual_amount: result.data.actual_amount,
                    token: result.data.token,
                    payment_url: result.data.payment_url,
                    expiration_time: result.data.expiration_time
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.message || result.msg || '支付网关返回错误'
            });
        }
        
    } catch (e) {
        console.error('支付订单错误:', e);
        res.status(500).json({ error: e.message });
    }
}

// 生成 BEpusdt 签名
function generateBepusdtSignature(params, token) {
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys
        .filter(key => key !== 'signature' && params[key] !== undefined && params[key] !== '')
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    const toSign = signStr + token;
    return crypto.createHash('md5').update(toSign).digest('hex').toLowerCase();
}
// 重置用户UUID
async function resetUUID(req, res) {
    try {
        const user = validateUserSession(req);
        if (!user) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const oldUUID = user.uuid;
        
        // 生成新UUID
        const newUUID = db.generateUUID();
        
        // 更新用户UUID
        db.updateUserUUID(oldUUID, newUUID);
        
        // 会话通过user_id关联，UUID更新后会话仍有效，无需更新
        
        res.json({ 
            success: true, 
            newUUID: newUUID,
            message: '订阅地址已重置成功！'
        });
        
    } catch (e) {
        console.error('重置UUID错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}
// 用户签到
async function checkin(req, res) {
    try {
        const user = validateUserSession(req);
        if (!user) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const uuidUser = db.getUserByUUID(user.uuid);
        if (!uuidUser) {
            return res.status(400).json({ error: '用户数据不存在' });
        }
        
        // 检查是否已签到 (今天北京时间)
        const now = new Date();
        const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const todayStart = new Date(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth(), beijingNow.getUTCDate());
        todayStart.setTime(todayStart.getTime() - 8 * 60 * 60 * 1000); // 转回UTC
        
        if (user.last_checkin && user.last_checkin >= todayStart.getTime()) {
            return res.status(400).json({ error: '今天已签到' });
        }
        
        // 计算连续签到天数
        let checkinStreak = user.checkin_streak || 0;
        let totalCheckinDays = user.total_checkin_days || 0;
        
        // 检查是否连续签到（昨天是否签到）
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setTime(yesterdayStart.getTime() - 24 * 60 * 60 * 1000);
        
        if (user.last_checkin && user.last_checkin >= yesterdayStart.getTime()) {
            // 连续签到
            checkinStreak += 1;
        } else {
            // 断签，重置连续天数
            checkinStreak = 1;
        }
        
        totalCheckinDays += 1;
        
        // 基础奖励：1天
        let rewardDays = 1;
        let message = '签到成功！有效期 +1 天';
        let milestoneReward = 0;
        
        // 连续签到里程碑奖励
        if (checkinStreak === 7) {
            milestoneReward = 3;
            rewardDays += milestoneReward;
            message = `🎉 连续签到 7 天！额外奖励 ${milestoneReward} 天，总共 +${rewardDays} 天`;
        } else if (checkinStreak === 30) {
            milestoneReward = 10;
            rewardDays += milestoneReward;
            message = `🎊 连续签到 30 天！额外奖励 ${milestoneReward} 天，总共 +${rewardDays} 天`;
        } else if (checkinStreak === 60) {
            milestoneReward = 20;
            rewardDays += milestoneReward;
            message = `🏆 连续签到 60 天！额外奖励 ${milestoneReward} 天，总共 +${rewardDays} 天`;
        } else if (checkinStreak === 90) {
            milestoneReward = 30;
            rewardDays += milestoneReward;
            message = `👑 连续签到 90 天！额外奖励 ${milestoneReward} 天，总共 +${rewardDays} 天`;
        } else if (checkinStreak === 180) {
            milestoneReward = 60;
            rewardDays += milestoneReward;
            message = `💎 连续签到 180 天！额外奖励 ${milestoneReward} 天，总共 +${rewardDays} 天`;
        } else if (checkinStreak === 365) {
            milestoneReward = 120;
            rewardDays += milestoneReward;
            message = `🌟 连续签到 365 天！额外奖励 ${milestoneReward} 天，总共 +${rewardDays} 天`;
        } else if (checkinStreak % 7 === 0 && checkinStreak > 7) {
            // 每连续7天额外奖励3天（保持和第一周相同的奖励力度）
            milestoneReward = 3;
            rewardDays += milestoneReward;
            message = `✨ 连续签到 ${checkinStreak} 天！额外奖励 ${milestoneReward} 天，总共 +${rewardDays} 天`;
        }
        
        // 增加有效期
        const currentExpiry = uuidUser.expiry || Date.now();
        const newExpiry = Math.max(currentExpiry, Date.now()) + (rewardDays * 24 * 60 * 60 * 1000);
        
        db.updateUserExpiry(user.uuid, newExpiry);
        
        // 更新签到时间和统计
        db.updateLastCheckin(user.id, Date.now());
        db.updateCheckinStats(user.id, checkinStreak, totalCheckinDays);
        
        res.json({ 
            success: true, 
            message: message,
            new_expiry: newExpiry,
            checkin_streak: checkinStreak,
            total_checkin_days: totalCheckinDays,
            reward_days: rewardDays,
            milestone_reward: milestoneReward
        });
        
    } catch (e) {
        console.error('签到错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 取消订单
async function cancelOrder(req, res) {
    try {
        const user = validateUserSession(req);
        if (!user) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const { order_id } = req.body;
        
        if (!order_id) {
            return res.status(400).json({ error: '订单ID不能为空' });
        }
        
        // 获取订单
        const orders = db.getUserOrders(user.id);
        const order = orders.find(o => o.id === parseInt(order_id));
        
        if (!order) {
            return res.status(404).json({ error: '订单不存在' });
        }
        
        // 只能取消待审核或待支付的订单
        if (order.status !== 'pending' && order.status !== 'payment') {
            return res.status(400).json({ error: '只能取消待审核或待支付的订单' });
        }
        
        // 更新订单状态为已拒绝
        db.updateOrderStatus(parseInt(order_id), 'rejected', Date.now());
        
        res.json({ 
            success: true, 
            message: '订单已取消'
        });
        
    } catch (e) {
        console.error('取消订单错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取最佳域名列表（用于用户端显示节点状态）
// 需要登录才能访问
function getBestDomains(req, res) {
    try {
        // 验证用户是否已登录
        const user = validateUserSession(req);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: '请先登录' 
            });
        }
        
        const allDomains = db.getBestDomains();
        
        // 过滤掉禁用的节点，只返回启用的
        const enabledDomains = allDomains.filter(domain => {
            // 如果以___DISABLED___开头，说明是禁用的
            if (typeof domain === 'string' && domain.startsWith('___DISABLED___')) {
                return false;
            }
            return true;
        });
        
        res.json({
            success: true,
            domains: enabledDomains
        });
    } catch (e) {
        console.error('获取最佳域名错误:', e);
        res.status(500).json({ error: '服务器错误' });
    }
}

module.exports = {
    register,
    login,
    logout,
    getInfo,
    changePassword,
    getOrders,
    createOrder,
    payOrder,
    checkin,
    resetUUID,
    cancelOrder,
    getBestDomains
};
