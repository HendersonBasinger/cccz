/**
 * API 路由 - 公共接口
 */

const db = require('../database');
const crypto = require('crypto');

// API 密钥验证中间件
function verifyApiToken(req, res, next) {
    const settings = db.getSettings() || {};
    const apiToken = settings.apiToken;
    
    // 如果未设置 API 密钥，则允许访问（向后兼容）
    if (!apiToken) {
        console.warn('[API] ⚠️ 未设置 API 密钥，建议在设置中配置以提高安全性');
        return next();
    }
    
    // 检查请求头中的 Authorization
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Missing API token'
        });
    }
    
    // 支持 Bearer token 格式
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;
    
    if (token !== apiToken) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden: Invalid API token'
        });
    }
    
    next();
}

// 获取用户列表 (供节点端拉取)
function getUsers(req, res) {
    const users = db.getActiveUsers();
    const settings = db.getSettings() || {};
    
    res.json({
        users: users,
        settings: settings
    });
}

// 获取公告
function getAnnouncement(req, res) {
    const announcements = db.getEnabledAnnouncements();
    res.json({
        success: true,
        announcements: announcements
    });
}

// 获取套餐列表 (用户端)
function getPlans(req, res) {
    const plans = db.getAllPlans(false); // 只返回启用的套餐
    res.json({
        success: true,
        plans: plans
    });
}

// 获取支付通道 (用户端)
function getPaymentChannels(req, res) {
    const channels = db.getEnabledPaymentChannels();
    res.json({
        success: true,
        channels: channels
    });
}

// MD5 签名验证
async function verifyBepusdtSignature(params, token, signature) {
    // 如果没有签名，返回 false
    if (!signature) {
        return false;
    }
    
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys
        .filter(key => key !== 'signature' && params[key] !== undefined && params[key] !== '')
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    const toSign = signStr + token;
    const hashHex = crypto.createHash('md5').update(toSign).digest('hex');
    
    return hashHex.toLowerCase() === signature.toLowerCase();
}

// 支付回调通知
async function paymentNotify(req, res) {
    try {
        const body = req.body;
        
        console.log('=== 收到支付回调 ===');
        console.log('回调时间:', new Date().toISOString());
        console.log('回调数据:', JSON.stringify(body, null, 2));

        const { 
            trade_id, 
            order_id, 
            amount, 
            actual_amount, 
            token, 
            block_transaction_id,
            signature,
            status 
        } = body;

        // 参数验证
        if (!order_id || !status) {
            console.error('❌ 回调参数缺失: order_id 或 status 为空');
            return res.status(200).send('ok');
        }

        console.log('✓ 订单号:', order_id);
        
        // 直接使用order_id查询订单（不再解析ORDER_前缀）
        const order = db.getOrderByOrderNo(order_id);
        
        if (!order) {
            console.error('❌ 订单不存在:', order_id);
            return res.status(200).send('ok');
        }
        
        console.log('✓ 订单信息:', {
            id: order.id,
            status: order.status,
            amount: order.amount,
            user_id: order.user_id,
            plan_name: order.plan_name,
            payment_order_id: order.payment_order_id,
            payment_trade_id: order.payment_trade_id
        });
        
        // 获取用户信息 (从user_accounts表)
        const userAccount = db.getUserByUserId(order.user_id);
        if (!userAccount) {
            console.error('❌ 用户账号不存在: user_id =', order.user_id);
            return res.status(200).send('ok');
        }
        
        console.log('✓ 用户UUID:', userAccount.uuid);
        
        // 获取用户订阅信息 (从users表，包含expiry字段)
        const user = db.getUserByUUID(userAccount.uuid);
        if (!user) {
            console.error('❌ 用户订阅信息不存在: uuid =', userAccount.uuid);
            return res.status(200).send('ok');
        }
        
        // 获取支付通道配置进行签名验证
        const channels = db.getEnabledPaymentChannels();
        if (channels.length > 0) {
            const channel = db.getPaymentChannelById(channels[0].id);
            if (channel && signature) {
                const verifyParams = { trade_id, order_id, amount, actual_amount, token, block_transaction_id, status };
                const isValid = await verifyBepusdtSignature(verifyParams, channel.api_token, signature);
                console.log('✓ 签名验证结果:', isValid ? '通过' : '失败');
                if (!isValid) {
                    console.warn('⚠️ 签名验证失败,但继续处理订单');
                }
            } else {
                console.log('⚠️ 跳过签名验证 (无配置或无签名)');
            }
        }
        
        // 支付成功 (status === 2)
        console.log('支付状态码:', status, '订单当前状态:', order.status);
        
        if (status === 2 || status === '2') {
            if (order.status === 'approved') {
                console.log('⚠️ 订单已处理,跳过重复处理');
                return res.status(200).send('ok');
            }
            
            if (order.status === 'pending' || order.status === 'payment') {
                console.log('✓ 处理支付成功逻辑...');
                
                // 更新支付信息
                if (trade_id) {
                    db.updateOrderPaymentInfo(order.id, order_id, trade_id);
                    console.log('✓ 更新支付单号:', { payment_order_id: order_id, payment_trade_id: trade_id });
                }
                
                // 更新用户到期时间
                const currentExpiry = user && user.expiry ? user.expiry : Date.now();
                const newExpiry = Math.max(currentExpiry, Date.now()) + (order.duration_days * 24 * 60 * 60 * 1000);
                
                db.updateUserExpiry(userAccount.uuid, newExpiry);
                db.updateOrderStatus(order.id, 'approved', Date.now());
                
                console.log('✅ 订单支付成功处理完成:');
                console.log('   - 订单ID:', order.id);
                console.log('   - 用户UUID:', userAccount.uuid);
                console.log('   - 当前到期时间:', new Date(currentExpiry).toISOString());
                console.log('   - 新到期时间:', new Date(newExpiry).toISOString());
                console.log('   - 支付金额:', actual_amount || amount);
            } else {
                console.warn('⚠️ 订单状态异常,无法处理: status =', order.status);
            }
        } else {
            console.log('⚠️ 非成功状态,不处理 - status:', status, 'order.status:', order.status);
        }

        return res.status(200).send('ok');

    } catch (error) {
        console.error('❌ 处理支付回调异常:', error);
        console.error('错误堆栈:', error.stack);
        return res.status(200).send('ok');
    }
}

// API 密钥验证中间件
function verifyApiToken(req, res, next) {
    const settings = db.getSettings() || {};
    const apiToken = settings.apiToken;
    
    // 如果未设置 API 密钥，则允许访问（向后兼容）
    if (!apiToken) {
        console.warn('[API] ⚠️ 未设置 API 密钥，建议在设置中配置以提高安全性');
        return next();
    }
    
    // 检查请求头中的 Authorization
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Missing API token'
        });
    }
    
    // 支持 Bearer token 格式
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;
    
    if (token !== apiToken) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden: Invalid API token'
        });
    }
    
    next();
}

// 获取活跃的 ProxyIP 列表（按地理区域分组，供节点端智能匹配）
function getActiveProxyIPs(req, res) {
    try {
        const allProxies = db.getAllProxyIPsWithMeta();
        const activeProxies = allProxies.filter(p => p.status === 'active');
        
        // 按地理区域分组
        const proxyByRegion = {};
        const REGIONS = ['HK', 'TW', 'JP', 'SG', 'US', 'KR', 'DE', 'UK', 'FR', 'NL'];
        
        REGIONS.forEach(region => {
            proxyByRegion[region] = [];
        });
        proxyByRegion['OTHER'] = [];
        
        activeProxies.forEach(proxy => {
            const region = proxy.region || 'OTHER';
            const proxyAddr = proxy.port === 443 
                ? proxy.address 
                : `${proxy.address}:${proxy.port}`;
            
            if (proxyByRegion[region]) {
                proxyByRegion[region].push(proxyAddr);
            } else {
                proxyByRegion['OTHER'].push(proxyAddr);
            }
        });
        
        // 返回分组后的 ProxyIP 列表
        res.json({
            success: true,
            proxyIPs: proxyByRegion,
            totalActive: activeProxies.length,
            lastUpdate: Date.now()
        });
        
    } catch (error) {
        console.error('[API] 获取 ProxyIP 失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    verifyApiToken,
    getUsers,
    getAnnouncement,
    getPlans,
    getPaymentChannels,
    paymentNotify,
    getActiveProxyIPs
};
