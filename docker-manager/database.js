/**
 * VLES 用户管理系统 - Docker 服务器版
 * 数据库操作模块 (SQLite)
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DATABASE_PATH = process.env.DATABASE_PATH || './data/vles.db';
const SYSTEM_CONFIG_KEY = "SYSTEM_SETTINGS_V1";

let db = null;

// 初始化数据库
function initDatabase() {
    const dbPath = path.resolve(DATABASE_PATH);
    console.log(`[数据库] 初始化数据库: ${dbPath}`);
    
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // 创建表结构
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            uuid TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL DEFAULT '未命名',
            expiry INTEGER,
            create_at INTEGER NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS user_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            uuid TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_login INTEGER NOT NULL,
            last_checkin INTEGER DEFAULT 0,
            checkin_streak INTEGER DEFAULT 0,
            total_checkin_days INTEGER DEFAULT 0,
            auto_approve_version INTEGER DEFAULT 0,
            FOREIGN KEY (uuid) REFERENCES users(uuid) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts(username);
        CREATE INDEX IF NOT EXISTS idx_user_accounts_uuid ON user_accounts(uuid);

        CREATE TABLE IF NOT EXISTS user_sessions (
            session_id TEXT PRIMARY KEY NOT NULL,
            user_id INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES user_accounts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS subscription_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            duration_days INTEGER NOT NULL,
            price REAL NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            sort_order INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at INTEGER NOT NULL,
            paid_at INTEGER,
            payment_order_id TEXT,
            payment_trade_id TEXT,
            payment_type TEXT DEFAULT 'manual',
            FOREIGN KEY (user_id) REFERENCES user_accounts(id) ON DELETE CASCADE,
            FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
        );

        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS payment_channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            api_url TEXT NOT NULL,
            api_token TEXT NOT NULL,
            callback_url TEXT,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS invite_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            max_uses INTEGER NOT NULL DEFAULT 1,
            used_count INTEGER NOT NULL DEFAULT 0,
            trial_days INTEGER NOT NULL DEFAULT 0,
            remark TEXT,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL
        );
    `);
    
    // 数据库迁移：检查并添加缺失的字段
    try {
        // 检查 user_accounts 表是否有 last_checkin 字段
        const tableInfo = db.prepare("PRAGMA table_info(user_accounts)").all();
        const hasLastCheckin = tableInfo.some(col => col.name === 'last_checkin');
        
        if (!hasLastCheckin) {
            console.log('[数据库迁移] 添加 last_checkin 字段...');
            db.exec('ALTER TABLE user_accounts ADD COLUMN last_checkin INTEGER DEFAULT 0');
            console.log('[数据库迁移] ✅ last_checkin 字段添加成功');
        }
        
        const hasCheckinStreak = tableInfo.some(col => col.name === 'checkin_streak');
        if (!hasCheckinStreak) {
            console.log('[数据库迁移] 添加 checkin_streak 字段...');
            db.exec('ALTER TABLE user_accounts ADD COLUMN checkin_streak INTEGER DEFAULT 0');
            console.log('[数据库迁移] ✅ checkin_streak 字段添加成功');
        }
        
        const hasTotalCheckinDays = tableInfo.some(col => col.name === 'total_checkin_days');
        if (!hasTotalCheckinDays) {
            console.log('[数据库迁移] 添加 total_checkin_days 字段...');
            db.exec('ALTER TABLE user_accounts ADD COLUMN total_checkin_days INTEGER DEFAULT 0');
            console.log('[数据库迁移] ✅ total_checkin_days 字段添加成功');
        }
        
        // 修复现有用户的 NULL 值
        console.log('[数据库迁移] 修复签到字段的 NULL 值...');
        db.exec(`
            UPDATE user_accounts 
            SET last_checkin = 0 
            WHERE last_checkin IS NULL
        `);
        db.exec(`
            UPDATE user_accounts 
            SET checkin_streak = 0 
            WHERE checkin_streak IS NULL
        `);
        db.exec(`
            UPDATE user_accounts 
            SET total_checkin_days = 0 
            WHERE total_checkin_days IS NULL
        `);
        console.log('[数据库迁移] ✅ NULL 值修复完成');
        
        const hasAutoApproveVersion = tableInfo.some(col => col.name === 'auto_approve_version');
        if (!hasAutoApproveVersion) {
            console.log('[数据库迁移] 添加 auto_approve_version 字段...');
            db.exec('ALTER TABLE user_accounts ADD COLUMN auto_approve_version INTEGER DEFAULT 0');
            console.log('[数据库迁移] ✅ auto_approve_version 字段添加成功');
        }
        
        // 检查 payment_channels 表是否有 callback_url 字段
        const paymentChannelsInfo = db.prepare("PRAGMA table_info(payment_channels)").all();
        const hasCallbackUrl = paymentChannelsInfo.some(col => col.name === 'callback_url');
        
        if (!hasCallbackUrl) {
            console.log('[数据库迁移] 添加 callback_url 字段到 payment_channels 表...');
            db.exec('ALTER TABLE payment_channels ADD COLUMN callback_url TEXT');
            console.log('[数据库迁移] ✅ callback_url 字段添加成功');
        }
    } catch (e) {
        console.error('[数据库迁移] 错误:', e.message);
    }
    
    // 迁移：为 subscription_plans 表添加 sort_order 字段
    try {
        const checkColumn = db.prepare("PRAGMA table_info(subscription_plans)").all();
        const hasSortOrder = checkColumn.some(col => col.name === 'sort_order');
        
        if (!hasSortOrder) {
            console.log('[数据库迁移] 添加 sort_order 字段到 subscription_plans 表...');
            db.exec('ALTER TABLE subscription_plans ADD COLUMN sort_order INTEGER DEFAULT 0');
            // 为现有套餐设置排序值（按ID升序）
            db.exec('UPDATE subscription_plans SET sort_order = id WHERE sort_order = 0 OR sort_order IS NULL');
            console.log('[数据库迁移] ✅ sort_order 字段添加成功');
        }
    } catch (e) {
        console.error('[数据库迁移] 错误:', e.message);
    }
    
    console.log('[数据库] 初始化完成');
    return db;
}

// 获取数据库实例
function getDb() {
    if (!db) {
        initDatabase();
    }
    return db;
}

// 密码哈希
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 生成 UUID
function generateUUID() {
    return crypto.randomUUID();
}

// --- 用户相关操作 ---

// 获取所有有效用户 (供节点API使用)
function getActiveUsers() {
    const now = Date.now();
    const stmt = getDb().prepare(
        "SELECT uuid, name, expiry FROM users WHERE enabled = 1 AND (expiry IS NULL OR expiry > ?)"
    );
    const results = stmt.all(now);
    
    const users = {};
    results.forEach(r => {
        users[r.uuid] = {
            name: r.name,
            expiry: r.expiry || null
        };
    });
    return users;
}

// 获取所有用户列表 (管理面板用)
function getAllUsers() {
    const stmt = getDb().prepare("SELECT * FROM users ORDER BY create_at DESC");
    const results = stmt.all();
    return results.map(u => ({
        uuid: u.uuid,
        name: u.name,
        expiry: u.expiry,
        createAt: u.create_at,
        enabled: u.enabled === 1
    }));
}

// 添加用户
function addUser(uuid, name, expiry) {
    const stmt = getDb().prepare(
        "INSERT INTO users (uuid, name, expiry, create_at, enabled) VALUES (?, ?, ?, ?, 1)"
    );
    return stmt.run(uuid, name, expiry, Date.now());
}

// 更新用户
function updateUser(uuid, name, expiry) {
    const stmt = getDb().prepare("UPDATE users SET name = ?, expiry = ? WHERE uuid = ?");
    return stmt.run(name || '未命名', expiry, uuid);
}

// 更新用户UUID
function updateUserUUID(oldUUID, newUUID) {
    const db = getDb();
    // 需要在事务中先关闭外键约束，更新后再打开
    db.exec('PRAGMA foreign_keys = OFF');
    try {
        const stmtUser = db.prepare("UPDATE users SET uuid = ? WHERE uuid = ?");
        stmtUser.run(newUUID, oldUUID);
        // 同时更新user_accounts表中的关联
        const stmtAccount = db.prepare("UPDATE user_accounts SET uuid = ? WHERE uuid = ?");
        stmtAccount.run(newUUID, oldUUID);
    } finally {
        db.exec('PRAGMA foreign_keys = ON');
    }
}

// 批量更新用户状态
function updateUsersStatus(uuids, enabled) {
    const placeholders = uuids.map(() => '?').join(',');
    const stmt = getDb().prepare(`UPDATE users SET enabled = ? WHERE uuid IN (${placeholders})`);
    return stmt.run(enabled ? 1 : 0, ...uuids);
}

// 批量删除用户
function deleteUsers(uuids) {
    const placeholders = uuids.map(() => '?').join(',');
    const stmt = getDb().prepare(`DELETE FROM users WHERE uuid IN (${placeholders})`);
    return stmt.run(...uuids);
}

// 根据 UUID 获取用户
function getUserByUUID(uuid) {
    const stmt = getDb().prepare("SELECT * FROM users WHERE uuid = ?");
    return stmt.get(uuid);
}

// --- 用户账号相关操作 ---

// 创建用户账号
function createUserAccount(username, passwordHash, email, uuid) {
    const now = Date.now();
    const stmt = getDb().prepare(
        "INSERT INTO user_accounts (username, password_hash, email, uuid, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)"
    );
    try {
        return stmt.run(username, passwordHash, email, uuid, now, now);
    } catch (e) {
        console.error('创建用户账号失败:', e.message);
        return null;
    }
}

// 根据用户名获取用户账号
function getUserByUsername(username) {
    const stmt = getDb().prepare("SELECT * FROM user_accounts WHERE username = ?");
    const user = stmt.get(username);
    if (user) {
        // 确保签到相关字段存在并有默认值
        if (user.last_checkin === undefined || user.last_checkin === null) {
            user.last_checkin = 0;
        }
        if (user.checkin_streak === undefined || user.checkin_streak === null) {
            user.checkin_streak = 0;
        }
        if (user.total_checkin_days === undefined || user.total_checkin_days === null) {
            user.total_checkin_days = 0;
        }
    }
    return user;
}

// 根据ID获取用户账号
function getUserById(userId) {
    const stmt = getDb().prepare("SELECT * FROM user_accounts WHERE id = ?");
    const user = stmt.get(userId);
    if (user) {
        // 确保签到相关字段存在并有默认值
        if (user.last_checkin === undefined || user.last_checkin === null) {
            user.last_checkin = 0;
        }
        if (user.checkin_streak === undefined || user.checkin_streak === null) {
            user.checkin_streak = 0;
        }
        if (user.total_checkin_days === undefined || user.total_checkin_days === null) {
            user.total_checkin_days = 0;
        }
    }
    return user;
}

// 根据 UUID 获取用户账号
function getUserAccountByUUID(uuid) {
    const stmt = getDb().prepare("SELECT * FROM user_accounts WHERE uuid = ?");
    return stmt.get(uuid);
}

// 更新用户账号用户名
function updateUserAccountUsername(userId, newUsername) {
    const stmt = getDb().prepare("UPDATE user_accounts SET username = ? WHERE id = ?");
    return stmt.run(newUsername, userId);
}

// 更新用户账号密码
function updateUserAccountPassword(userId, passwordHash) {
    const stmt = getDb().prepare("UPDATE user_accounts SET password_hash = ? WHERE id = ?");
    return stmt.run(passwordHash, userId);
}

// 更新最后登录时间
function updateLastLogin(userId) {
    const stmt = getDb().prepare("UPDATE user_accounts SET last_login = ? WHERE id = ?");
    return stmt.run(Date.now(), userId);
}

// 更新最后签到时间
function updateLastCheckin(userId, timestamp) {
    const stmt = getDb().prepare("UPDATE user_accounts SET last_checkin = ? WHERE id = ?");
    return stmt.run(timestamp, userId);
}

// 更新签到统计（连续签到和累计签到）
function updateCheckinStats(userId, streak, totalDays) {
    const stmt = getDb().prepare("UPDATE user_accounts SET checkin_streak = ?, total_checkin_days = ? WHERE id = ?");
    return stmt.run(streak, totalDays, userId);
}

// 更新用户的自动审核版本号
function updateUserAutoApproveVersion(userId, version) {
    const stmt = getDb().prepare("UPDATE user_accounts SET auto_approve_version = ? WHERE id = ?");
    return stmt.run(version, userId);
}

// 更新用户密码
function updateUserPassword(userId, passwordHash) {
    const stmt = getDb().prepare("UPDATE user_accounts SET password_hash = ? WHERE id = ?");
    return stmt.run(passwordHash, userId);
}

// 更新用户密码 (通过 UUID)
function updateUserPasswordByUUID(uuid, passwordHash) {
    const stmt = getDb().prepare("UPDATE user_accounts SET password_hash = ? WHERE uuid = ?");
    return stmt.run(passwordHash, uuid);
}

// --- 会话相关操作 ---

// 创建会话
function createSession(userId) {
    const sessionId = generateUUID();
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7天过期
    
    const stmt = getDb().prepare(
        "INSERT INTO user_sessions (session_id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
    );
    try {
        stmt.run(sessionId, userId, now, expiresAt);
        return sessionId;
    } catch (e) {
        console.error('创建会话失败:', e.message);
        return null;
    }
}

// 验证会话
function validateSession(sessionId) {
    const now = Date.now();
    const stmt = getDb().prepare(
        "SELECT * FROM user_sessions WHERE session_id = ? AND expires_at > ?"
    );
    return stmt.get(sessionId, now);
}

// 删除会话
function deleteSession(sessionId) {
    const stmt = getDb().prepare("DELETE FROM user_sessions WHERE session_id = ?");
    return stmt.run(sessionId);
}

// 删除用户的所有会话
function deleteUserSessions(userId) {
    const stmt = getDb().prepare("DELETE FROM user_sessions WHERE user_id = ?");
    return stmt.run(userId);
}

// 清理过期会话
function cleanExpiredSessions() {
    const now = Date.now();
    const stmt = getDb().prepare("DELETE FROM user_sessions WHERE expires_at < ?");
    return stmt.run(now);
}

// --- 配置相关操作 ---

// 获取系统配置
function getSettings() {
    const stmt = getDb().prepare("SELECT value FROM settings WHERE key = ?");
    const row = stmt.get(SYSTEM_CONFIG_KEY);
    return row ? JSON.parse(row.value) : null;
}

// 保存系统配置
function saveSettings(settings) {
    const stmt = getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    return stmt.run(SYSTEM_CONFIG_KEY, JSON.stringify(settings));
}

// --- 套餐相关操作 ---

// 获取所有套餐
function getAllPlans(includeDisabled = false) {
    const sql = includeDisabled 
        ? "SELECT * FROM subscription_plans ORDER BY sort_order ASC, id ASC"
        : "SELECT * FROM subscription_plans WHERE enabled = 1 ORDER BY sort_order ASC, id ASC";
    const stmt = getDb().prepare(sql);
    return stmt.all();
}

// 获取单个套餐
function getPlanById(id) {
    const stmt = getDb().prepare("SELECT * FROM subscription_plans WHERE id = ?");
    return stmt.get(id);
}

// 创建套餐
function createPlan(name, description, durationDays, price) {
    const stmt = getDb().prepare(
        "INSERT INTO subscription_plans (name, description, duration_days, price, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)"
    );
    return stmt.run(name, description, durationDays, price, Date.now());
}

// 更新套餐
function updatePlan(id, name, description, durationDays, price) {
    const stmt = getDb().prepare(
        "UPDATE subscription_plans SET name = ?, description = ?, duration_days = ?, price = ? WHERE id = ?"
    );
    return stmt.run(name, description, durationDays, price, id);
}

// 切换套餐状态
function togglePlan(id) {
    const stmt = getDb().prepare("UPDATE subscription_plans SET enabled = 1 - enabled WHERE id = ?");
    return stmt.run(id);
}

// 删除套餐
function deletePlan(id) {
    const db = getDb();
    // 暂时禁用外键约束
    db.prepare("PRAGMA foreign_keys = OFF").run();
    try {
        const stmt = db.prepare("DELETE FROM subscription_plans WHERE id = ?");
        const result = stmt.run(id);
        return result;
    } finally {
        // 恢复外键约束
        db.prepare("PRAGMA foreign_keys = ON").run();
    }
}

// 更新套餐排序
function updatePlansSortOrder(orders) {
    const db = getDb();
    const stmt = db.prepare('UPDATE subscription_plans SET sort_order = ? WHERE id = ?');
    const transaction = db.transaction((orders) => {
        for (const order of orders) {
            stmt.run(order.sort_order, order.id);
        }
    });
    transaction(orders);
}

// --- 订单相关操作 ---

// 获取订单列表（支持分页）
function getOrders(status = 'all', limit = 100, offset = 0) {
    let sql = `
        SELECT o.*, 
               COALESCE(p.name, '已删除套餐') as plan_name, 
               COALESCE(p.duration_days, 0) as duration_days, 
               COALESCE(p.price, o.amount) as price, 
               ua.username, ua.uuid 
        FROM orders o 
        LEFT JOIN subscription_plans p ON o.plan_id = p.id 
        JOIN user_accounts ua ON o.user_id = ua.id
    `;
    if (status !== 'all') {
        sql += ` WHERE o.status = ?`;
    }
    sql += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    
    const stmt = getDb().prepare(sql);
    return status !== 'all' ? stmt.all(status, limit, offset) : stmt.all(limit, offset);
}

// 获取订单总数
function getOrdersCount(status = 'all') {
    let sql = 'SELECT COUNT(*) as count FROM orders o';
    if (status !== 'all') {
        sql += ' WHERE o.status = ?';
    }
    const stmt = getDb().prepare(sql);
    const result = status !== 'all' ? stmt.get(status) : stmt.get();
    return result ? result.count : 0;
}

// 获取用户订单
function getUserOrders(userId) {
    const stmt = getDb().prepare(`
        SELECT o.*, 
               COALESCE(p.name, '已删除套餐') as plan_name, 
               COALESCE(p.duration_days, 0) as duration_days 
        FROM orders o 
        LEFT JOIN subscription_plans p ON o.plan_id = p.id 
        WHERE o.user_id = ? 
        ORDER BY o.created_at DESC
    `);
    return stmt.all(userId);
}

// 获取套餐关联的订单
function getOrdersByPlanId(planId) {
    const stmt = getDb().prepare(`
        SELECT o.* FROM orders o WHERE o.plan_id = ?
    `);
    return stmt.all(planId);
}

// 获取套餐关联的待支付订单
function getPendingOrdersByPlanId(planId) {
    const stmt = getDb().prepare(`
        SELECT o.* FROM orders o WHERE o.plan_id = ? AND o.status = 'pending'
    `);
    return stmt.all(planId);
}

// 解除订单与套餐的关联（用于删除套餐前保留订单历史）
function unlinkOrdersFromPlan(planId) {
    const stmt = getDb().prepare(`
        UPDATE orders SET plan_id = NULL WHERE plan_id = ?
    `);
    return stmt.run(planId);
}

// 创建订单
function createOrder(userId, planId, amount) {
    const stmt = getDb().prepare(
        "INSERT INTO orders (user_id, plan_id, amount, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
    );
    return stmt.run(userId, planId, amount, Date.now());
}

// 获取订单详情
function getOrderById(id) {
    const stmt = getDb().prepare(`
        SELECT o.*, p.name as plan_name, p.duration_days, ua.uuid 
        FROM orders o 
        JOIN subscription_plans p ON o.plan_id = p.id 
        JOIN user_accounts ua ON o.user_id = ua.id 
        WHERE o.id = ?
    `);
    return stmt.get(id);
}

// 更新订单状态
function updateOrderStatus(id, status, paidAt = null) {
    if (paidAt) {
        const stmt = getDb().prepare("UPDATE orders SET status = ?, paid_at = ? WHERE id = ?");
        return stmt.run(status, paidAt, id);
    } else {
        const stmt = getDb().prepare("UPDATE orders SET status = ? WHERE id = ?");
        return stmt.run(status, id);
    }
}

// 更新用户到期时间
function updateUserExpiry(uuid, newExpiry) {
    const stmt = getDb().prepare("UPDATE users SET expiry = ? WHERE uuid = ?");
    return stmt.run(newExpiry, uuid);
}

// 更新订单支付信息
function updateOrderPaymentInfo(orderId, paymentOrderId, paymentTradeId) {
    const stmt = getDb().prepare("UPDATE orders SET payment_order_id = ?, payment_trade_id = ? WHERE id = ?");
    return stmt.run(paymentOrderId, paymentTradeId, orderId);
}

// 根据用户ID获取用户账号 (别名方法)
function getUserByUserId(userId) {
    return getUserById(userId);
}

// --- 公告相关操作 ---

// 获取所有公告
function getAllAnnouncements() {
    const stmt = getDb().prepare("SELECT * FROM announcements ORDER BY created_at DESC");
    return stmt.all();
}

// 获取启用的公告
function getEnabledAnnouncements() {
    const stmt = getDb().prepare("SELECT * FROM announcements WHERE enabled = 1 ORDER BY created_at DESC");
    return stmt.all();
}

// 获取单个公告
function getAnnouncementById(id) {
    const stmt = getDb().prepare("SELECT * FROM announcements WHERE id = ?");
    return stmt.get(id);
}

// 创建公告
function createAnnouncement(title, content) {
    const now = Date.now();
    const stmt = getDb().prepare(
        "INSERT INTO announcements (title, content, enabled, created_at, updated_at) VALUES (?, ?, 1, ?, ?)"
    );
    return stmt.run(title, content, now, now);
}

// 更新公告
function updateAnnouncement(id, title, content, enabled) {
    const stmt = getDb().prepare(
        "UPDATE announcements SET title = ?, content = ?, enabled = ?, updated_at = ? WHERE id = ?"
    );
    return stmt.run(title, content, enabled ? 1 : 0, Date.now(), id);
}

// 删除公告
function deleteAnnouncement(id) {
    const stmt = getDb().prepare("DELETE FROM announcements WHERE id = ?");
    return stmt.run(id);
}

// --- 邀请码相关操作 ---

// 获取所有邀请码
function getAllInviteCodes() {
    const stmt = getDb().prepare("SELECT * FROM invite_codes ORDER BY created_at DESC");
    return stmt.all();
}

// 根据邀请码获取
function getInviteByCode(code) {
    const stmt = getDb().prepare("SELECT * FROM invite_codes WHERE code = ? AND enabled = 1");
    return stmt.get(code);
}

// 创建邀请码
function createInviteCode(code, maxUses, trialDays, remark) {
    const stmt = getDb().prepare(
        "INSERT INTO invite_codes (code, max_uses, trial_days, remark, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)"
    );
    return stmt.run(code, maxUses, trialDays, remark || '', Date.now());
}

// 更新邀请码使用次数
function incrementInviteUsage(id) {
    const stmt = getDb().prepare("UPDATE invite_codes SET used_count = used_count + 1 WHERE id = ?");
    return stmt.run(id);
}

// 切换邀请码状态
function toggleInviteCode(id) {
    const stmt = getDb().prepare("UPDATE invite_codes SET enabled = 1 - enabled WHERE id = ?");
    return stmt.run(id);
}

// 删除邀请码
function deleteInviteCode(id) {
    const stmt = getDb().prepare("DELETE FROM invite_codes WHERE id = ?");
    return stmt.run(id);
}

// 更新邀请码
function updateInviteCode(id, code, maxUses, trialDays, remark) {
    const stmt = getDb().prepare(
        "UPDATE invite_codes SET code = ?, max_uses = ?, trial_days = ?, remark = ? WHERE id = ?"
    );
    return stmt.run(code, maxUses, trialDays, remark || '', id);
}

// --- 支付通道相关操作 ---

// 获取所有支付通道
function getAllPaymentChannels() {
    const stmt = getDb().prepare("SELECT * FROM payment_channels ORDER BY created_at DESC");
    return stmt.all();
}

// 获取启用的支付通道
function getEnabledPaymentChannels() {
    const stmt = getDb().prepare("SELECT id, name, code FROM payment_channels WHERE enabled = 1 ORDER BY created_at DESC");
    return stmt.all();
}

// 获取支付通道
function getPaymentChannelById(id) {
    const stmt = getDb().prepare("SELECT * FROM payment_channels WHERE id = ?");
    return stmt.get(id);
}

// 创建支付通道
function createPaymentChannel(name, code, apiUrl, apiToken, callbackUrl = null) {
    const stmt = getDb().prepare(
        "INSERT INTO payment_channels (name, code, api_url, api_token, callback_url, enabled, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)"
    );
    return stmt.run(name, code, apiUrl, apiToken, callbackUrl, Date.now());
}

// 更新支付通道
function updatePaymentChannel(id, name, code, apiUrl, apiToken = null, callbackUrl = null) {
    if (apiToken) {
        const stmt = getDb().prepare(
            "UPDATE payment_channels SET name = ?, code = ?, api_url = ?, api_token = ?, callback_url = ? WHERE id = ?"
        );
        return stmt.run(name, code, apiUrl, apiToken, callbackUrl, id);
    } else {
        const stmt = getDb().prepare(
            "UPDATE payment_channels SET name = ?, code = ?, api_url = ?, callback_url = ? WHERE id = ?"
        );
        return stmt.run(name, code, apiUrl, callbackUrl, id);
    }
}

// 切换支付通道状态
function togglePaymentChannel(id) {
    const stmt = getDb().prepare("UPDATE payment_channels SET enabled = 1 - enabled WHERE id = ?");
    return stmt.run(id);
}

// 删除支付通道
function deletePaymentChannel(id) {
    const stmt = getDb().prepare("DELETE FROM payment_channels WHERE id = ?");
    return stmt.run(id);
}

// --- 数据导出/导入 ---

// 导出所有数据
// --- 反代IP和优选域名管理 ---

// 获取反代IP列表
function getProxyIPs() {
    const settings = getSettings() || {};
    return settings.proxyIPs || [];
}

// 保存反代IP列表
function saveProxyIPs(proxyIPs) {
    const settings = getSettings() || {};
    settings.proxyIPs = proxyIPs;
    return saveSettings(settings);
}

// 获取优选域名列表
function getBestDomains() {
    const settings = getSettings() || {};
    return settings.bestDomains || [];
}

// 保存优选域名列表
function saveBestDomains(bestDomains) {
    const settings = getSettings() || {};
    settings.bestDomains = bestDomains;
    return saveSettings(settings);
}

// ==================== 日志管理 ====================
function addLog(action, details = '', level = 'info') {
    const settings = getSettings();
    if (!settings.systemLogs) {
        settings.systemLogs = [];
    }
    
    const log = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action,
        details,
        level // info, warning, error, success
    };
    
    settings.systemLogs.unshift(log); // 新日志在前
    
    // 只保留最近1000条日志
    if (settings.systemLogs.length > 1000) {
        settings.systemLogs = settings.systemLogs.slice(0, 1000);
    }
    
    saveSettings(settings);
    return log;
}

function getLogs(limit = 100) {
    const settings = getSettings();
    const logs = settings.systemLogs || [];
    return logs.slice(0, limit);
}

function clearLogs() {
    const settings = getSettings();
    settings.systemLogs = [];
    saveSettings(settings);
    return true;
}

// ==================== 统计数据 ====================
function getStats() {
    const db = getDb();
    
    // 用户统计
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE enabled = 1').get().count;
    const expiredUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE expiry < ?').get(Date.now()).count;
    
    // 订单统计
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const pendingOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('pending').count;
    const completedOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('approved').count;
    
    // 收入统计（已完成订单）
    const totalRevenue = db.prepare('SELECT IFNULL(SUM(amount), 0) as total FROM orders WHERE status = ?').get('approved').total;
    
    // 套餐统计
    const totalPlans = db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get().count;
    const activePlans = db.prepare('SELECT COUNT(*) as count FROM subscription_plans WHERE enabled = 1').get().count;
    
    // 邀请码统计
    const totalInvites = db.prepare('SELECT COUNT(*) as count FROM invite_codes').get().count;
    const activeInvites = db.prepare('SELECT COUNT(*) as count FROM invite_codes WHERE enabled = 1').get().count;
    
    // 支付通道统计
    const totalChannels = db.prepare('SELECT COUNT(*) as count FROM payment_channels').get().count;
    const activeChannels = db.prepare('SELECT COUNT(*) as count FROM payment_channels WHERE enabled = 1').get().count;
    
    // 最近7天用户增长
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const startTime = date.getTime();
        const endTime = startTime + 24 * 60 * 60 * 1000;
        
        const count = db.prepare('SELECT COUNT(*) as count FROM users WHERE create_at >= ? AND create_at < ?')
            .get(startTime, endTime).count;
        
        last7Days.push({
            date: date.toLocaleDateString('zh-CN'),
            count
        });
    }
    
    // 最近7天订单统计
    const last7DaysOrders = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const startTime = date.getTime();
        const endTime = startTime + 24 * 60 * 60 * 1000;
        
        const count = db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at < ?')
            .get(startTime, endTime).count;
        const revenue = db.prepare('SELECT IFNULL(SUM(amount), 0) as total FROM orders WHERE status = ? AND created_at >= ? AND created_at < ?')
            .get('approved', startTime, endTime).total;
        
        last7DaysOrders.push({
            date: date.toLocaleDateString('zh-CN'),
            count,
            revenue
        });
    }
    
    return {
        users: {
            total: totalUsers,
            active: activeUsers,
            expired: expiredUsers,
            last7Days
        },
        orders: {
            total: totalOrders,
            pending: pendingOrders,
            completed: completedOrders,
            totalRevenue,
            last7Days: last7DaysOrders
        },
        plans: {
            total: totalPlans,
            active: activePlans
        },
        invites: {
            total: totalInvites,
            active: activeInvites
        },
        channels: {
            total: totalChannels,
            active: activeChannels
        }
    };
}

// --- 数据导出 ---

function exportAllData() {
    return {
        users: getDb().prepare("SELECT * FROM users").all(),
        userAccounts: getDb().prepare("SELECT id, username, email, uuid, created_at, last_login FROM user_accounts").all(),
        settings: getDb().prepare("SELECT * FROM settings").all(),
        plans: getDb().prepare("SELECT * FROM subscription_plans").all(),
        orders: getDb().prepare("SELECT * FROM orders").all(),
        announcements: getDb().prepare("SELECT * FROM announcements").all(),
        inviteCodes: getDb().prepare("SELECT * FROM invite_codes").all(),
        paymentChannels: getDb().prepare("SELECT * FROM payment_channels").all()
    };
}

// 自动清理非活跃用户
function cleanupInactiveUsers(cleanupDays) {
    const cutoffTime = Date.now() - (cleanupDays * 24 * 60 * 60 * 1000);
    
    // 查找需要删除的用户账号
    const stmt = getDb().prepare(`
        SELECT ua.id, ua.uuid, ua.username, ua.last_login, ua.created_at, u.expiry
        FROM user_accounts ua
        INNER JOIN users u ON ua.uuid = u.uuid
        WHERE u.expiry IS NOT NULL
          AND u.expiry < ?
          AND (
            (ua.last_login IS NOT NULL AND ua.last_login < ?)
            OR (ua.last_login IS NULL AND u.expiry < ?)
          )
    `);
    const inactiveAccounts = stmt.all(Date.now(), cutoffTime, cutoffTime);
    
    if (inactiveAccounts.length === 0) {
        return 0;
    }
    
    // 批量删除
    const deleteSession = getDb().prepare("DELETE FROM user_sessions WHERE user_id = ?");
    const deleteAccount = getDb().prepare("DELETE FROM user_accounts WHERE id = ?");
    const deleteUser = getDb().prepare("DELETE FROM users WHERE uuid = ?");
    
    const transaction = getDb().transaction((accounts) => {
        for (const account of accounts) {
            deleteSession.run(account.id);
            deleteAccount.run(account.id);
            if (account.uuid) {
                deleteUser.run(account.uuid);
            }
        }
    });
    
    transaction(inactiveAccounts);
    return inactiveAccounts.length;
}

module.exports = {
    initDatabase,
    getDb,
    hashPassword,
    generateUUID,
    SYSTEM_CONFIG_KEY,
    
    // 用户
    getActiveUsers,
    getAllUsers,
    addUser,
    updateUser,
    updateUserUUID,
    updateUsersStatus,
    deleteUsers,
    getUserByUUID,
    
    // 用户账号
    createUserAccount,
    getUserByUsername,
    getUserById,
    getUserAccountByUUID,
    updateUserAccountUsername,
    updateUserAccountPassword,
    updateLastLogin,
    updateLastCheckin,
    updateCheckinStats,
    updateUserAutoApproveVersion,
    updateUserPassword,
    updateUserPasswordByUUID,
    
    // 会话
    createSession,
    validateSession,
    deleteSession,
    deleteUserSessions,
    cleanExpiredSessions,
    
    // 配置
    getSettings,
    saveSettings,
    
    // 套餐
    getAllPlans,
    getPlanById,
    createPlan,
    updatePlan,
    togglePlan,
    deletePlan,
    
    // 订单
    getOrders,
    getOrdersCount,
    getUserOrders,
    getOrdersByPlanId,
    getPendingOrdersByPlanId,
    unlinkOrdersFromPlan,
    createOrder,
    getOrderById,
    updateOrderStatus,
    updateUserExpiry,
    updateOrderPaymentInfo,
    getUserByUserId,
    updatePlansSortOrder,
    
    // 公告
    getAllAnnouncements,
    getEnabledAnnouncements,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    
    // 邀请码
    getAllInviteCodes,
    getInviteByCode,
    createInviteCode,
    incrementInviteUsage,
    toggleInviteCode,
    deleteInviteCode,
    updateInviteCode,
    
    // 支付通道
    getAllPaymentChannels,
    getEnabledPaymentChannels,
    getPaymentChannelById,
    createPaymentChannel,
    updatePaymentChannel,
    togglePaymentChannel,
    deletePaymentChannel,
    
    // 数据
    exportAllData,
    cleanupInactiveUsers,
    
    // 反代IP和优选域名
    getProxyIPs,
    saveProxyIPs,
    getBestDomains,
    saveBestDomains,
    
    // 日志
    addLog,
    getLogs,
    clearLogs,
    
    // 统计
    getStats
};
