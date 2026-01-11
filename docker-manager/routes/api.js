/**
 * API 路由 - 公共接口
 */

const db = require('../database');
const crypto = require('crypto');

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
        
        console.log('收到支付回调:', JSON.stringify(body));

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

        // 解析 order_id (格式: ORDER_订单ID)
        const orderIdMatch = order_id.match(/ORDER_(\d+)/);
        if (!orderIdMatch) {
            console.error('订单号格式错误:', order_id);
            return res.send('ok');
        }
        
        const orderId = parseInt(orderIdMatch[1]);
        
        // 获取订单信息
        const order = db.getOrderById(orderId);
        
        if (!order) {
            console.error('订单不存在:', orderId);
            return res.send('ok');
        }
        
        // 获取支付通道配置进行签名验证
        const channels = db.getEnabledPaymentChannels();
        if (channels.length > 0) {
            const channel = db.getPaymentChannelById(channels[0].id);
            if (channel) {
                const verifyParams = { trade_id, order_id, amount, actual_amount, token, block_transaction_id, status };
                const isValid = await verifyBepusdtSignature(verifyParams, channel.api_token, signature);
                if (!isValid) {
                    console.error('签名验证失败');
                }
            }
        }
        
        // 支付成功 (status === 2)
        if (status === 2 && order.status === 'pending') {
            // 更新用户到期时间
            const user = db.getUserByUUID(order.uuid);
            const currentExpiry = user && user.expiry ? user.expiry : Date.now();
            const newExpiry = Math.max(currentExpiry, Date.now()) + (order.duration_days * 24 * 60 * 60 * 1000);
            
            db.updateUserExpiry(order.uuid, newExpiry);
            db.updateOrderStatus(orderId, 'approved', Date.now());
            
            console.log('订单支付成功:', orderId, '用户到期时间更新为:', new Date(newExpiry).toISOString());
        }

        res.send('ok');

    } catch (error) {
        console.error('处理支付回调错误:', error);
        res.send('ok');
    }
}

module.exports = {
    getUsers,
    getAnnouncement,
    getPlans,
    getPaymentChannels,
    paymentNotify
};
