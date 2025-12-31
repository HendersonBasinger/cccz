/**
 * 部署说明：
 * 1. Cloudflare D1 绑定变量名必须为: DB
 * 2. 环境变量：
 *    - ADMIN_PASSWORD: 管理员密码
 *    - ADMIN_PATH: 管理员面板路径 (默认 /admin)
 * 3. (可选) 如果想从 KV 迁移数据，请暂时保留 KV 绑定 (变量名 VLESS_KV)，迁移完后再解绑。
 * 
 * 数据库表结构：
 * - users: UUID用户表 (uuid, name, expiry, create_at, enabled)
 * - user_accounts: 前端用户账号表 (id, username, password_hash, email, uuid, created_at, last_login)
 * - user_sessions: 用户会话表 (session_id, user_id, created_at, expires_at)
 * - settings: 系统配置表 (key, value)
 */

const SYSTEM_CONFIG_KEY = "SYSTEM_SETTINGS_V1";

// 北京时间转换辅助函数
function toBeijingTime(date) {
  const d = new Date(date);
  // 转换为 UTC+8 北京时间
  const beijingTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
  return beijingTime;
}

function formatBeijingDateTime(date) {
  if (!date) return '-';
  const d = toBeijingTime(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hour = String(d.getUTCHours()).padStart(2, '0');
  const minute = String(d.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatBeijingDate(date) {
  if (!date) return '-';
  const d = toBeijingTime(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const adminPath = env.ADMIN_PATH || '/admin';

    // 1. API 接口：供节点端拉取 (仅返回有效用户)
    if (path === '/api/users') {
      return await handleApiData(request, env);
    }

    // 2. 用户认证 API
    if (request.method === 'POST') {
      if (path === '/api/user/register') return await handleUserRegister(request, env);
      if (path === '/api/user/login') return await handleUserLogin(request, env);
      if (path === '/api/user/logout') return await handleUserLogout(request, env);
      if (path === '/api/user/info') return await handleUserInfo(request, env);
      if (path === '/api/user/changePassword') return await handleUserChangePassword(request, env);
      if (path === '/api/admin/login') return await handleAdminLogin(request, env);
      if (path === '/api/admin/logout') return await handleAdminLogout(request, env);
      if (path === '/api/admin/changePassword') return await handleAdminChangePassword(request, env);
    }
    
    // 获取公告 API
    if (request.method === 'GET' && path === '/api/announcement') {
      return await handleGetAnnouncement(request, env);
    }

    // 3. 管理员操作 API
    if (request.method === 'POST') {
      if (path === '/api/admin/add') return await handleAdminAdd(request, env);
      if (path === '/api/admin/update') return await handleAdminUpdate(request, env);
      if (path === '/api/admin/delete') return await handleAdminDeleteBatch(request, env);
      if (path === '/api/admin/status') return await handleAdminStatusBatch(request, env);
      if (path === '/api/admin/saveSettings') return await handleAdminSaveSettings(request, env);
      if (path === '/api/admin/updateSystemSettings') return await handleAdminUpdateSystemSettings(request, env);
      if (path === '/api/admin/migrate') return await handleAdminMigrate(request, env);
      if (path === '/api/admin/fetchBestIPs') return await handleFetchBestIPs(request, env);
      // 公告管理
      if (path === '/api/admin/announcements/create') return await handleAdminCreateAnnouncement(request, env);
      if (path === '/api/admin/announcements/update') return await handleAdminUpdateAnnouncement(request, env);
      if (path === '/api/admin/announcements/delete') return await handleAdminDeleteAnnouncement(request, env);
      // 套餐管理
      if (path === '/api/admin/plans/create') return await handleAdminCreatePlan(request, env);
      if (path === '/api/admin/plans/update') return await handleAdminUpdatePlan(request, env);
      if (path === '/api/admin/plans/toggle') return await handleAdminTogglePlan(request, env);
      if (path === '/api/admin/plans/delete') return await handleAdminDeletePlan(request, env);
      // 订单管理
      if (path === '/api/admin/orders/approve') return await handleAdminApproveOrder(request, env);
      if (path === '/api/admin/orders/reject') return await handleAdminRejectOrder(request, env);
      // 支付通道管理
      if (path === '/api/admin/payment/channels/save') return await handleAdminSavePaymentChannel(request, env);
      if (path === '/api/admin/payment/channels/delete') return await handleAdminDeletePaymentChannel(request, env);
      if (path === '/api/admin/payment/channels/toggle') return await handleAdminTogglePaymentChannel(request, env);
      if (path === '/api/admin/payment/channels/update') return await handleAdminUpdatePaymentChannel(request, env);
      // 支付回调
      if (path === '/api/payment/notify') return await handlePaymentNotify(request, env);
      // 邀请码管理
      if (path === '/api/admin/invites/create') return await handleAdminCreateInvite(request, env);
      if (path === '/api/admin/invites/delete') return await handleAdminDeleteInvite(request, env);
      if (path === '/api/admin/invites/toggle') return await handleAdminToggleInvite(request, env);
      if (path === '/api/admin/invites/update') return await handleAdminUpdateInvite(request, env);
    }
    
    // 4. 用户套餐和订单 API
    if (request.method === 'GET') {
      if (path === '/api/plans') return await handleGetPlans(request, env);
      if (path === '/api/admin/plans') return await handleAdminGetPlans(request, env);
      if (path === '/api/admin/orders') return await handleAdminGetOrders(request, env);
      if (path === '/api/admin/check') return await handleAdminCheck(request, env);
      // 公告管理
      if (path === '/api/admin/announcements') return await handleAdminGetAnnouncements(request, env);
      if (path.startsWith('/api/admin/announcements/')) {
        const id = path.split('/').pop();
        if (id && !isNaN(id)) return await handleAdminGetAnnouncement(request, env, id);
      }
      // 支付通道
      if (path === '/api/admin/payment/channels') return await handleAdminGetPaymentChannels(request, env);
      if (path === '/api/payment/channels') return await handleGetPaymentChannels(request, env);
      // 获取用户关联的前端账号
      if (path === '/api/admin/getUserAccount') return await handleAdminGetUserAccount(request, env);
      // 邀请码管理
      if (path === '/api/admin/invites') return await handleAdminGetInvites(request, env);
    }
    if (request.method === 'GET') {
      if (path === '/api/user/orders') return await handleUserGetOrders(request, env);
    }
    if (request.method === 'POST') {
      if (path === '/api/user/orders/create') return await handleUserCreateOrder(request, env);
      if (path === '/api/user/orders/pay') return await handleUserPayOrder(request, env);
      if (path === '/api/user/checkin') return await handleUserCheckin(request, env);
    }

    // 4. 管理员面板路径
    if (path.startsWith(adminPath)) {
      return await handleAdminPanel(request, env, adminPath);
    }

    // 5. 用户前端页面
    return await handleUserPanel(request, env);
  },
  
  // 定时任务：每15分钟自动更新优选 IP (需要在 wrangler.toml 中配置 cron trigger)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([
      autoUpdateBestIPs(env),
      autoCleanupInactiveUsers(env)
    ]));
  }
};

// --- 核心数据库操作封装 ---

// 获取所有有效用户 (API用)
async function dbGetActiveUsers(env) {
    const now = Date.now();
    // SQL: 选出 (启用=1) 且 (不过期 或 过期时间>现在) 的用户
    const { results } = await env.DB.prepare(
        "SELECT uuid, name, expiry FROM users WHERE enabled = 1 AND (expiry IS NULL OR expiry > ?)"
    ).bind(now).all();
    
    const users = {};
    results.forEach(r => {
        users[r.uuid] = {
            name: r.name,
            expiry: r.expiry || null
        };
    });
    return users;
}

// --- 用户认证数据库操作 ---

// 创建用户账号
async function dbCreateUserAccount(env, username, passwordHash, email, uuid) {
    const now = Date.now();
    try {
        await env.DB.prepare(
            "INSERT INTO user_accounts (username, password_hash, email, uuid, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(username, passwordHash, email, uuid, now, now).run();
        return true;
    } catch (e) {
        console.error('创建用户账号失败:', e);
        return false;
    }
}

// 根据用户名获取用户
async function dbGetUserByUsername(env, username) {
    try {
        const result = await env.DB.prepare(
            "SELECT * FROM user_accounts WHERE username = ?"
        ).bind(username).first();
        return result;
    } catch (e) {
        return null;
    }
}

// 根据用户ID获取用户
async function dbGetUserById(env, userId) {
    try {
        const result = await env.DB.prepare(
            "SELECT * FROM user_accounts WHERE id = ?"
        ).bind(userId).first();
        return result;
    } catch (e) {
        return null;
    }
}

// 更新最后登录时间
async function dbUpdateLastLogin(env, userId) {
    const now = Date.now();
    try {
        await env.DB.prepare(
            "UPDATE user_accounts SET last_login = ? WHERE id = ?"
        ).bind(now, userId).run();
    } catch (e) {
        console.error('更新登录时间失败:', e);
    }
}

// 创建会话
async function dbCreateSession(env, userId) {
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7天过期
    
    try {
        await env.DB.prepare(
            "INSERT INTO user_sessions (session_id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
        ).bind(sessionId, userId, now, expiresAt).run();
        return sessionId;
    } catch (e) {
        console.error('创建会话失败:', e);
        return null;
    }
}

// 验证会话
async function dbValidateSession(env, sessionId) {
    const now = Date.now();
    try {
        const result = await env.DB.prepare(
            "SELECT * FROM user_sessions WHERE session_id = ? AND expires_at > ?"
        ).bind(sessionId, now).first();
        return result;
    } catch (e) {
        return null;
    }
}

// 删除会话
async function dbDeleteSession(env, sessionId) {
    try {
        await env.DB.prepare(
            "DELETE FROM user_sessions WHERE session_id = ?"
        ).bind(sessionId).run();
    } catch (e) {
        console.error('删除会话失败:', e);
    }
}

// 清理过期会话
async function dbCleanExpiredSessions(env) {
    const now = Date.now();
    try {
        await env.DB.prepare(
            "DELETE FROM user_sessions WHERE expires_at < ?"
        ).bind(now).run();
    } catch (e) {
        console.error('清理过期会话失败:', e);
    }
}

// 获取全局配置
async function dbGetSettings(env) {
    try {
        const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(SYSTEM_CONFIG_KEY).first();
        return row ? JSON.parse(row.value) : null;
    } catch (e) {
        return null;
    }
}

// 获取所有用户列表 (管理面板用)
async function dbGetAllUsers(env) {
    try {
        const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY create_at DESC").all();
        return results.map(u => ({
            uuid: u.uuid,
            name: u.name,
            expiry: u.expiry,
            createAt: u.create_at,
            enabled: u.enabled === 1
        }));
    } catch (e) {
        return [];
    }
}

// -------------------------

// API: 返回数据给节点
// -------------------------
// 用户认证 API 处理函数
// -------------------------

// 简单的密码哈希函数 (使用 SHA-256)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// API: 用户注册
async function handleUserRegister(request, env) {
    // 从数据库读取注册开关设置
    const settings = await dbGetSettings(env) || {};
    const enableRegister = settings.enableRegister === true;
    if (!enableRegister) {
        return new Response(JSON.stringify({ error: '注册功能未开放' }), { 
            status: 403, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }

    try {
        const formData = await request.formData();
        const username = formData.get('username');
        const password = formData.get('password');
        const email = formData.get('email') || '';
        const inviteCode = formData.get('invite_code')?.trim() || '';

        // 验证输入
        if (!username || !password) {
            return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        if (username.length < 3 || username.length > 20) {
            return new Response(JSON.stringify({ error: '用户名长度必须在 3-20 个字符之间' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        if (password.length < 6) {
            return new Response(JSON.stringify({ error: '密码长度不能少于 6 个字符' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 验证邀请码（如果启用了邀请码要求）
        const requireInviteCode = settings.requireInviteCode === true;
        let inviteRecord = null;
        let inviteTrialDays = 0;
        
        if (requireInviteCode) {
            if (!inviteCode) {
                return new Response(JSON.stringify({ error: '请输入邀请码' }), { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json; charset=utf-8' } 
                });
            }
            
            // 查询邀请码
            inviteRecord = await env.DB.prepare(
                "SELECT * FROM invite_codes WHERE code = ? AND enabled = 1"
            ).bind(inviteCode).first();
            
            if (!inviteRecord) {
                return new Response(JSON.stringify({ error: '邀请码无效或已禁用' }), { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json; charset=utf-8' } 
                });
            }
            
            // 检查使用次数
            if (inviteRecord.used_count >= inviteRecord.max_uses) {
                return new Response(JSON.stringify({ error: '邀请码已达到使用次数上限' }), { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json; charset=utf-8' } 
                });
            }
            
            inviteTrialDays = inviteRecord.trial_days || 0;
        }

        // 检查用户名是否已存在
        const existingUser = await dbGetUserByUsername(env, username);
        if (existingUser) {
            return new Response(JSON.stringify({ error: '用户名已存在' }), { 
                status: 409, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 生成 UUID 并创建用户
        const uuid = crypto.randomUUID();
        const passwordHash = await hashPassword(password);
        
        // 检查是否开启新用户试用
        const enableTrial = settings.enableTrial === true;
        const trialDays = settings.trialDays || 7;
        
        // 优先使用邀请码赠送天数，其次使用系统试用天数，否则为 null
        let expiry = null;
        if (inviteTrialDays > 0) {
            // 邀请码赠送天数
            expiry = Date.now() + (inviteTrialDays * 24 * 60 * 60 * 1000);
        } else if (enableTrial) {
            // 系统试用天数
            expiry = Date.now() + (trialDays * 24 * 60 * 60 * 1000);
        }
        
        await env.DB.prepare(
            "INSERT INTO users (uuid, name, expiry, create_at, enabled) VALUES (?, ?, ?, ?, 1)"
        ).bind(uuid, username, expiry, Date.now()).run();

        // 再创建用户账号
        const success = await dbCreateUserAccount(env, username, passwordHash, email, uuid);
        if (!success) {
            return new Response(JSON.stringify({ error: '注册失败，请稍后重试' }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        // 更新邀请码使用次数
        if (inviteRecord) {
            await env.DB.prepare(
                "UPDATE invite_codes SET used_count = used_count + 1 WHERE id = ?"
            ).bind(inviteRecord.id).run();
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: '注册成功！请登录' 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });

    } catch (e) {
        console.error('注册错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// API: 管理员登录
async function handleAdminLogin(request, env) {
    try {
        const formData = await request.formData();
        const username = formData.get('username');
        const password = formData.get('password');
        const adminUsername = env.ADMIN_USERNAME || 'admin';
        const adminPassword = env.ADMIN_PASSWORD;

        if (!username || !password) {
            return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 验证管理员凭据
        if (username !== adminUsername || password !== adminPassword) {
            return new Response(JSON.stringify({ error: '用户名或密码错误' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 检查或创建管理员账号
        let adminUser = await dbGetUserByUsername(env, adminUsername);
        if (!adminUser) {
            const passwordHash = await hashPassword(adminPassword);
            const adminUUID = crypto.randomUUID();
            
            // 创建管理员 UUID 用户
            const expiry = Date.now() + (100 * 365 * 24 * 60 * 60 * 1000); // 100年
            await env.DB.prepare(
                "INSERT INTO users (uuid, name, expiry, create_at, enabled) VALUES (?, ?, ?, ?, 1)"
            ).bind(adminUUID, '管理员', expiry, Date.now()).run();

            // 创建管理员账号
            await dbCreateUserAccount(env, adminUsername, passwordHash, '', adminUUID);
            adminUser = await dbGetUserByUsername(env, adminUsername);
        }

        // 创建会话
        const sessionId = await dbCreateSession(env, adminUser.id);
        if (!sessionId) {
            return new Response(JSON.stringify({ error: '登录失败，请稍后重试' }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 更新最后登录时间
        await dbUpdateLastLogin(env, adminUser.id);

        const adminPath = env.ADMIN_PATH || '/admin';
        return new Response(JSON.stringify({ 
            success: true, 
            message: '登录成功',
            redirect: adminPath
        }), { 
            status: 200, 
            headers: { 
                'Content-Type': 'application/json; charset=utf-8',
                'Set-Cookie': `admin_session=${sessionId}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=Strict`
            } 
        });

    } catch (e) {
        console.error('管理员登录错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// API: 管理员登出
async function handleAdminLogout(request, env) {
    try {
        const cookie = request.headers.get('Cookie');
        if (cookie) {
            const match = cookie.match(/admin_session=([^;]+)/);
            if (match) {
                await dbDeleteSession(env, match[1]);
            }
        }

        const adminPath = env.ADMIN_PATH || '/admin';
        return new Response(JSON.stringify({ 
            success: true, 
            message: '已退出登录',
            redirect: adminPath
        }), { 
            status: 200, 
            headers: { 
                'Content-Type': 'application/json; charset=utf-8',
                'Set-Cookie': 'admin_session=; Path=/; Max-Age=0; HttpOnly'
            } 
        });

    } catch (e) {
        console.error('管理员登出错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// API: 管理员修改密码
async function handleAdminChangePassword(request, env) {
    try {
        // 验证管理员会话
        const cookie = request.headers.get('Cookie');
        if (!cookie) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const match = cookie.match(/admin_session=([^;]+)/);
        if (!match) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const session = await dbValidateSession(env, match[1]);
        if (!session) {
            return new Response(JSON.stringify({ error: '会话已过期，请重新登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const user = await dbGetUserById(env, session.user_id);
        if (!user || user.username !== 'admin') {
            return new Response(JSON.stringify({ error: '无权限' }), { 
                status: 403, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 获取表单数据
        const formData = await request.formData();
        const oldPassword = formData.get('oldPassword');
        const newPassword = formData.get('newPassword');

        if (!oldPassword || !newPassword) {
            return new Response(JSON.stringify({ error: '请填写所有字段' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        if (newPassword.length < 6) {
            return new Response(JSON.stringify({ error: '新密码长度至少6位' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 验证旧密码
        const oldPasswordHash = await sha256(oldPassword);
        if (oldPasswordHash !== user.password_hash) {
            return new Response(JSON.stringify({ error: '旧密码错误' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 更新密码
        const newPasswordHash = await sha256(newPassword);
        await env.DB.prepare(
            "UPDATE user_accounts SET password_hash = ? WHERE id = ?"
        ).bind(newPasswordHash, user.id).run();

        // 删除所有管理员会话，强制重新登录
        await env.DB.prepare(
            "DELETE FROM user_sessions WHERE user_id = ?"
        ).bind(user.id).run();

        const adminPath = env.ADMIN_PATH || '/admin';
        return new Response(JSON.stringify({ 
            success: true, 
            message: '密码修改成功',
            redirect: adminPath
        }), { 
            status: 200, 
            headers: { 
                'Content-Type': 'application/json; charset=utf-8',
                'Set-Cookie': 'admin_session=; Path=/; Max-Age=0; HttpOnly'
            } 
        });

    } catch (e) {
        console.error('管理员修改密码错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// API: 用户登录
async function handleUserLogin(request, env) {
    try {
        const formData = await request.formData();
        const username = formData.get('username');
        const password = formData.get('password');

        if (!username || !password) {
            return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 查找用户
        const user = await dbGetUserByUsername(env, username);
        if (!user) {
            return new Response(JSON.stringify({ error: '用户名或密码错误' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 验证密码
        const passwordHash = await hashPassword(password);
        if (passwordHash !== user.password_hash) {
            return new Response(JSON.stringify({ error: '用户名或密码错误' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 创建会话
        const sessionId = await dbCreateSession(env, user.id);
        if (!sessionId) {
            return new Response(JSON.stringify({ error: '登录失败，请稍后重试' }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 更新最后登录时间
        await dbUpdateLastLogin(env, user.id);

        return new Response(JSON.stringify({ 
            success: true, 
            message: '登录成功' 
        }), { 
            status: 200, 
            headers: { 
                'Content-Type': 'application/json; charset=utf-8',
                'Set-Cookie': `user_session=${sessionId}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=Strict`
            } 
        });

    } catch (e) {
        console.error('登录错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// API: 用户登出
async function handleUserLogout(request, env) {
    try {
        const cookie = request.headers.get('Cookie');
        if (cookie) {
            const match = cookie.match(/user_session=([^;]+)/);
            if (match) {
                await dbDeleteSession(env, match[1]);
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: '已退出登录' 
        }), { 
            status: 200, 
            headers: { 
                'Content-Type': 'application/json; charset=utf-8',
                'Set-Cookie': 'user_session=; Path=/; Max-Age=0; HttpOnly'
            } 
        });

    } catch (e) {
        console.error('登出错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// API: 获取用户信息
async function handleUserInfo(request, env) {
    try {
        const cookie = request.headers.get('Cookie');
        if (!cookie) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const match = cookie.match(/user_session=([^;]+)/);
        if (!match) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const session = await dbValidateSession(env, match[1]);
        if (!session) {
            return new Response(JSON.stringify({ error: '会话已过期，请重新登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const user = await dbGetUserById(env, session.user_id);
        if (!user) {
            return new Response(JSON.stringify({ error: '用户不存在' }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 获取 UUID 用户信息
        const uuidUser = await env.DB.prepare(
            "SELECT * FROM users WHERE uuid = ?"
        ).bind(user.uuid).first();

        const isExpired = uuidUser && uuidUser.expiry && uuidUser.expiry < Date.now();
        const isEnabled = uuidUser && uuidUser.enabled === 1;

        return new Response(JSON.stringify({ 
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
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });

    } catch (e) {
        console.error('获取用户信息错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// API: 用户修改密码
async function handleUserChangePassword(request, env) {
    try {
        // 验证用户会话
        const cookie = request.headers.get('Cookie');
        if (!cookie) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const match = cookie.match(/user_session=([^;]+)/);
        if (!match) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const session = await dbValidateSession(env, match[1]);
        if (!session) {
            return new Response(JSON.stringify({ error: '会话已过期，请重新登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const user = await dbGetUserById(env, session.user_id);
        if (!user) {
            return new Response(JSON.stringify({ error: '用户不存在' }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 获取表单数据
        const formData = await request.formData();
        const oldPassword = formData.get('oldPassword');
        const newPassword = formData.get('newPassword');

        if (!oldPassword || !newPassword) {
            return new Response(JSON.stringify({ error: '请填写所有字段' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        if (newPassword.length < 6) {
            return new Response(JSON.stringify({ error: '新密码长度至少6位' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 验证旧密码
        const oldPasswordHash = await sha256(oldPassword);
        if (oldPasswordHash !== user.password_hash) {
            return new Response(JSON.stringify({ error: '旧密码错误' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 更新密码
        const newPasswordHash = await sha256(newPassword);
        await env.DB.prepare(
            "UPDATE user_accounts SET password_hash = ? WHERE id = ?"
        ).bind(newPasswordHash, user.id).run();

        // 删除所有会话，强制重新登录
        await env.DB.prepare(
            "DELETE FROM user_sessions WHERE user_id = ?"
        ).bind(user.id).run();

        return new Response(JSON.stringify({ 
            success: true, 
            message: '密码修改成功' 
        }), { 
            status: 200, 
            headers: { 
                'Content-Type': 'application/json; charset=utf-8',
                'Set-Cookie': 'user_session=; Path=/; Max-Age=0; HttpOnly'
            } 
        });

    } catch (e) {
        console.error('修改密码错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// -------------------------
// 节点 API 处理函数
// -------------------------

async function handleApiData(request, env) {
  const [users, rawSettings] = await Promise.all([
      dbGetActiveUsers(env),
      dbGetSettings(env)
  ]);
  
  // 修复：防止 settings 为 null 导致 API 报错
  const settings = rawSettings || {};

  return new Response(JSON.stringify({
    users: users,
    settings: settings
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

// API: 数据迁移 (KV -> D1)
async function handleAdminMigrate(request, env) {
    if (!(await checkAuth(request, env))) return new Response('Unauthorized', { status: 401 });

    if (!env.VLESS_KV) {
        return new Response('未绑定 VLESS_KV，无法迁移旧数据。如果是全新部署，请忽略此功能。', { status: 400 });
    }

    let count = 0;
    
    // 1. 迁移配置
    const settingsJson = await env.VLESS_KV.get(SYSTEM_CONFIG_KEY);
    if (settingsJson) {
        await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(SYSTEM_CONFIG_KEY, settingsJson).run();
    }

    // 2. 迁移用户
    const list = await env.VLESS_KV.list();
    for (const key of list.keys) {
        if (key.name === SYSTEM_CONFIG_KEY) continue;
        
        let u = key.metadata;
        if (!u) u = await env.VLESS_KV.get(key.name, { type: 'json' });
        
        if (u) {
            await env.DB.prepare(
                "INSERT OR REPLACE INTO users (uuid, name, expiry, create_at, enabled) VALUES (?, ?, ?, ?, ?)"
            ).bind(
                key.name, 
                u.name || '未命名', 
                u.expiry || null, 
                u.createAt || Date.now(), 
                (u.enabled === false ? 0 : 1)
            ).run();
            count++;
        }
    }

    return new Response(`迁移成功！已将 ${count} 条 KV 数据导入 D1 数据库。`, { status: 200 });
}

// 定时任务：自动清理非活跃用户
async function autoCleanupInactiveUsers(env) {
  try {
    const settings = await dbGetSettings(env) || {};
    
    // 检查是否启用自动清理
    if (!settings.enableAutoCleanup) {
      return;
    }
    
    const cleanupDays = settings.autoCleanupDays || 7;
    const cutoffTime = Date.now() - (cleanupDays * 24 * 60 * 60 * 1000);
    
    console.log(`[定时任务] 开始清理过期超过 ${cleanupDays} 天且未登录的用户...`);
    
    // 查找需要删除的用户账号
    // 条件：订阅已过期（expiry < 当前时间）且过期后超过指定天数未登录
    // 排除：未激活用户（expiry 为 NULL）和订阅未过期的用户
    const { results: inactiveAccounts } = await env.DB.prepare(`
      SELECT ua.id, ua.uuid, ua.username, ua.last_login, ua.created_at, u.expiry
      FROM user_accounts ua
      INNER JOIN users u ON ua.uuid = u.uuid
      WHERE u.expiry IS NOT NULL
        AND u.expiry < ?
        AND (
          (ua.last_login IS NOT NULL AND ua.last_login < ?)
          OR (ua.last_login IS NULL AND u.expiry < ?)
        )
    `).bind(Date.now(), cutoffTime, cutoffTime).all();
    
    if (inactiveAccounts.length === 0) {
      console.log('[定时任务] 没有需要清理的非活跃用户');
      return;
    }
    
    console.log(`[定时任务] 找到 ${inactiveAccounts.length} 个非活跃用户账号`);
    
    // 批量删除用户
    for (const account of inactiveAccounts) {
      try {
        // 删除用户会话
        await env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(account.id).run();
        
        // 删除用户账号
        await env.DB.prepare("DELETE FROM user_accounts WHERE id = ?").bind(account.id).run();
        
        // 删除 UUID 用户
        if (account.uuid) {
          await env.DB.prepare("DELETE FROM users WHERE uuid = ?").bind(account.uuid).run();
        }
        
        console.log(`[定时任务] 已删除非活跃用户: ${account.username} (UUID: ${account.uuid})`);
      } catch (e) {
        console.error(`[定时任务] 删除用户 ${account.username} 失败:`, e.message);
      }
    }
    
    console.log(`[定时任务] 清理完成，共删除 ${inactiveAccounts.length} 个非活跃用户`);
    
  } catch (error) {
    console.error('[定时任务] 清理非活跃用户失败:', error.message);
  }
}

// 定时任务：自动更新优选 IP (替换旧IP而不是累加)
async function autoUpdateBestIPs(env) {
  try {
    console.log('[定时任务] 开始自动更新优选 IP...');
    
    // 获取当前配置
    const settings = await dbGetSettings(env) || { proxyIPs: [], bestDomains: [], subUrl: "" };
    
    // 抓取 IPv4 和 IPv6 优选 IP
    const ipv4Data = await fetchBestIPsFromWeb('v4');
    const ipv6Data = await fetchBestIPsFromWeb('v6');
    
    // 分类现有域名
    const manualDomains = [];
    const oldAutoDomains = {};
    
    settings.bestDomains.forEach(domain => {
      // 支持 IPv4: 1.2.3.4:443#v4移动 LAX 和 IPv6: [2606:4700::]:443#v6移动 SIN
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
    
    // 清理旧数据：确保每个线路不超过5个IP（修复历史遗留问题）
    Object.keys(oldAutoDomains).forEach(key => {
      if (oldAutoDomains[key].length > 5) {
        console.log(`[数据清理] ${key} 超出限制 (${oldAutoDomains[key].length}个)，截断为5个`);
        oldAutoDomains[key] = oldAutoDomains[key].slice(0, 5);
      }
    });
    
    // 合并新旧IP - 按线路分组处理
    const newAutoDomains = [];
    const allNewData = [...ipv4Data, ...ipv6Data];
    
    // 按lineKey分组新IP
    const newDataByLine = {};
    allNewData.forEach(item => {
      if (!newDataByLine[item.lineKey]) {
        newDataByLine[item.lineKey] = [];
      }
      newDataByLine[item.lineKey].push(item.entry);
    });
    
    // 获取所有线路（新的和旧的）
    const allLineKeys = new Set([...Object.keys(newDataByLine), ...Object.keys(oldAutoDomains)]);
    
    // 每条线路：新IP优先，不足5个用旧IP补齐，没有新IP则保留旧IP
    allLineKeys.forEach(lineKey => {
      const newIPs = newDataByLine[lineKey] || [];
      const oldIPs = oldAutoDomains[lineKey] || [];
      
      if (newIPs.length > 0) {
        // 有新IP：新IP优先，严格限制最多5个
        const merged = [...newIPs.slice(0, 5)]; // 先取新IP，最多5个
        
        // 如果新IP少于5个，用旧IP补齐
        if (merged.length < 5) {
          const need = 5 - merged.length;
          oldIPs.slice(0, need).forEach(oldIP => {
            if (!merged.includes(oldIP)) {
              merged.push(oldIP);
            }
          });
        }
        
        // 最终确保不超过5个
        newAutoDomains.push(...merged.slice(0, 5));
      } else {
        // 没有新IP：保留所有旧IP（最多5个）
        newAutoDomains.push(...oldIPs.slice(0, 5));
      }
    });
    
    settings.bestDomains = [...manualDomains, ...newAutoDomains];
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .bind(SYSTEM_CONFIG_KEY, JSON.stringify(settings))
      .run();
    
    console.log(`[定时任务] 更新完成: 保留手动 ${manualDomains.length} 条, 新增自动 ${newAutoDomains.length} 条`);
    
  } catch (error) {
    console.error('[定时任务] 更新失败:', error.message);
  }
}

// 内部函数：从网站抓取优选 IP (每个线路保留5个)
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
    
    // 先收集所有数据
    for (const tr of matches) {
      const lineTypeMatch = tr.match(/<td[^>]*data-label=["']线路名称["'][^>]*>([^<]+)<\/td/);
      const ipMatch = tr.match(/<td[^>]*data-label=["']优选地址["'][^>]*>([0-9a-fA-F:.]+)<\/td/);
      const dcMatch = tr.match(/<td[^>]*data-label=["']数据中心["'][^>]*>([^<]+)<\/td/);
      
      if (lineTypeMatch && ipMatch && dcMatch) {
        const lineType = lineTypeMatch[1].trim();
        const ip = ipMatch[1].trim();
        const dc = dcMatch[1].trim();
        const versionTag = ipType === 'v6' ? 'v6' : 'v4';
        
        // IPv6 需要用方括号包裹，IPv4 直接使用
        const formattedAddr = ipType === 'v6' ? `[${ip}]:443` : `${ip}:443`;
        
        allResults.push({
          lineType,
          ip,
          dc,
          name: `${lineType} ${dc}`,
          entry: `${formattedAddr}#${versionTag}${lineType} ${dc}`,
          ipVersion: ipType,
          lineKey: `${lineType}_${ipType}`
        });
      }
    }
    
    // 按线路分组,每个线路只保留前5个（严格限制）
    const lineGroups = {};
    allResults.forEach(item => {
      const key = item.lineKey;
      if (!lineGroups[key]) {
        lineGroups[key] = [];
      }
      // 严格限制：每个lineKey最多5个
      if (lineGroups[key].length < 5) {
        lineGroups[key].push(item);
      }
    });
    
    // 合并所有分组
    const results = [];
    Object.values(lineGroups).forEach(group => {
      results.push(...group);
    });
    
    return results;
  } catch (error) {
    console.error(`抓取 ${ipType} 失败:`, error.message);
    return [];
  }
}

// API: 自动抓取 Cloudflare 优选 IP (手动触发)
async function handleFetchBestIPs(request, env) {
  if (!(await checkAuth(request, env))) return new Response('Unauthorized', { status: 401 });
  
  const formData = await request.formData();
  const ipType = formData.get('type') || 'v4'; // v4 或 v6
  
  try {
    const results = await fetchBestIPsFromWeb(ipType);
    
    if (results.length === 0) {
      return new Response(JSON.stringify({ error: '未找到数据' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json; charset=utf-8' } 
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      count: results.length,
      data: results 
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json; charset=utf-8' } 
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json; charset=utf-8' } 
    });
  }
}

// API: 添加用户
async function handleAdminAdd(request, env) {
  if (!(await checkAuth(request, env))) return new Response('Unauthorized', { status: 401 });
  
  const formData = await request.formData();
  let name = formData.get('name');
  const expiryDateStr = formData.get('expiryDate');
  const customUUIDsInput = formData.get('uuids');
  let frontUsername = formData.get('frontUsername');
  let frontPassword = formData.get('frontPassword');
  
  if (!name || name.trim() === "") name = "未命名";

  let expiry = null;
  if (expiryDateStr) {
    // 将日期字符串解析为北京时间的当天 23:59:59
    // expiryDateStr 格式为 YYYY-MM-DD
    const [year, month, day] = expiryDateStr.split('-').map(Number);
    // 创建北京时间 23:59:59，然后转换为UTC时间戳
    // 北京时间 = UTC+8，所以需要减去8小时
    const beijingEndOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 8, 59, 59, 999));
    expiry = beijingEndOfDay.getTime();
  }

  let targetUUIDs = [];
  if (customUUIDsInput && customUUIDsInput.trim().length > 0) {
      const rawList = customUUIDsInput.split(/[,，\n\s]+/);
      targetUUIDs = [...new Set(rawList.map(u => u.trim().toLowerCase()).filter(u => u.length > 0))];
  } else {
      targetUUIDs.push(crypto.randomUUID());
  }

  const stmt = env.DB.prepare("INSERT INTO users (uuid, name, expiry, create_at, enabled) VALUES (?, ?, ?, ?, 1)");
  const batch = targetUUIDs.map(uuid => stmt.bind(uuid, name, expiry, Date.now()));
  
  await env.DB.batch(batch);

  // 如果只有一个 UUID，则创建前端账号
  if (targetUUIDs.length === 1) {
    const uuid = targetUUIDs[0];
    
    // 生成用户名：留空则随机生成 6 位
    if (!frontUsername || frontUsername.trim() === '') {
      frontUsername = generateRandomUsername();
    } else {
      frontUsername = frontUsername.trim();
    }
    
    // 密码：留空则与用户名相同
    if (!frontPassword || frontPassword.trim() === '') {
      frontPassword = frontUsername;
    } else {
      frontPassword = frontPassword.trim();
    }
    
    // 检查用户名是否已存在
    const existingUser = await dbGetUserByUsername(env, frontUsername);
    if (!existingUser) {
      // 创建前端账号
      const passwordHash = await hashPassword(frontPassword);
      await dbCreateUserAccount(env, frontUsername, passwordHash, '', uuid);
    }
  }

  return new Response('OK', { status: 200 });
}

// 生成随机用户名 (6位字母数字组合)
function generateRandomUsername() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// API: 编辑用户
async function handleAdminUpdate(request, env) {
  if (!(await checkAuth(request, env))) return new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const uuid = formData.get('uuid');
  const name = formData.get('name');
  const expiryDateStr = formData.get('expiryDate');
  const newPassword = formData.get('newPassword');

  if (!uuid) return new Response('UUID required', { status: 400 });

  let expiry = null;
  if (expiryDateStr) {
    // 将日期字符串解析为北京时间的当天 23:59:59
    // expiryDateStr 格式为 YYYY-MM-DD
    const [year, month, day] = expiryDateStr.split('-').map(Number);
    // 创建北京时间 23:59:59，然后转换为UTC时间戳
    // 北京时间 = UTC+8，所以需要减去8小时
    const beijingEndOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 8, 59, 59, 999));
    expiry = beijingEndOfDay.getTime();
  }

  await env.DB.prepare("UPDATE users SET name = ?, expiry = ? WHERE uuid = ?")
    .bind(name || '未命名', expiry, uuid)
    .run();

  // 如果提供了新密码，更新关联的前端账号密码
  if (newPassword && newPassword.trim() !== '') {
    const passwordHash = await hashPassword(newPassword.trim());
    await env.DB.prepare("UPDATE user_accounts SET password_hash = ? WHERE uuid = ?")
      .bind(passwordHash, uuid)
      .run();
  }

  return new Response('OK', { status: 200 });
}

// API: 批量修改状态
async function handleAdminStatusBatch(request, env) {
  if (!(await checkAuth(request, env))) return new Response('Unauthorized', { status: 401 });
  
  const formData = await request.formData();
  const uuids = formData.get('uuids'); 
  const enabledStr = formData.get('enabled'); // "true" or "false"
  
  if (!uuids) return new Response('UUIDs required', { status: 400 });
  
  const enabledVal = enabledStr === 'true' ? 1 : 0;
  const uuidList = uuids.split(',');

  // 构建 SQL IN 语句
  const placeholders = uuidList.map(() => '?').join(',');
  const query = `UPDATE users SET enabled = ? WHERE uuid IN (${placeholders})`;
  
  await env.DB.prepare(query).bind(enabledVal, ...uuidList).run();

  return new Response('OK', { status: 200 });
}

// API: 批量删除用户
async function handleAdminDeleteBatch(request, env) {
  if (!(await checkAuth(request, env))) return new Response('Unauthorized', { status: 401 });
  const formData = await request.formData();
  const uuids = formData.get('uuids');
  
  if (uuids) {
      const uuidList = uuids.split(',');
      const placeholders = uuidList.map(() => '?').join(',');
      await env.DB.prepare(`DELETE FROM users WHERE uuid IN (${placeholders})`).bind(...uuidList).run();
  }
  return new Response('OK', { status: 200 });
}

// API: 保存全局配置
async function handleAdminSaveSettings(request, env) {
  if (!(await checkAuth(request, env))) return new Response('Unauthorized', { status: 401 });
  const formData = await request.formData();
  
  const proxyIPStr = formData.get('proxyIP');
  const bestDomainsStr = formData.get('bestDomains');
  const subUrl = formData.get('subUrl');
  const websiteUrl = formData.get('websiteUrl'); // 官网地址

  let proxyIPs = proxyIPStr ? proxyIPStr.split(/[\n,]+/).map(d => d.trim()).filter(d => d.length > 0) : [];
  let bestDomains = bestDomainsStr ? bestDomainsStr.split(/[\n,]+/).map(d => d.trim()).filter(d => d.length > 0) : [];

  // 服务端验证：确保每条线路最多5个IP
  bestDomains = validateAndLimitIPs(bestDomains);

  // 获取现有设置，保留其他配置项
  const currentSettings = await dbGetSettings(env) || {};
  const settings = { ...currentSettings, proxyIPs, bestDomains, subUrl, websiteUrl };
  
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .bind(SYSTEM_CONFIG_KEY, JSON.stringify(settings))
    .run();

  return new Response('OK', { status: 200 });
}

// API: 更新系统设置（注册开关、自动审核开关等）
async function handleAdminUpdateSystemSettings(request, env) {
  if (!(await checkAuth(request, env))) return new Response('Unauthorized', { status: 401 });
  const formData = await request.formData();
  
  // 获取现有设置
  const currentSettings = await dbGetSettings(env) || {};
  
  // 更新开关设置
  if (formData.has('enableRegister')) {
    const enableRegister = formData.get('enableRegister') === 'true';
    const autoApproveOrder = formData.get('autoApproveOrder') === 'true';
    const enableTrial = formData.get('enableTrial') === 'true';
    const trialDays = parseInt(formData.get('trialDays')) || 7;
    const requireInviteCode = formData.get('requireInviteCode') === 'true';
    const wasAutoApproveEnabled = currentSettings.autoApproveOrder === true;
    
    currentSettings.enableRegister = enableRegister;
    currentSettings.autoApproveOrder = autoApproveOrder;
    currentSettings.enableTrial = enableTrial;
    currentSettings.trialDays = trialDays;
    currentSettings.requireInviteCode = requireInviteCode;
    
    // 如果自动审核开关从关闭变为开启，增加版本号（刷新所有用户的使用次数）
    if (!wasAutoApproveEnabled && autoApproveOrder) {
      currentSettings.autoApproveVersion = (currentSettings.autoApproveVersion || 0) + 1;
    }
  }
  
  // 更新订单过期时间设置
  if (formData.has('pendingOrderExpiry')) {
    currentSettings.pendingOrderExpiry = parseInt(formData.get('pendingOrderExpiry')) || 0;
  }
  if (formData.has('paymentOrderExpiry')) {
    currentSettings.paymentOrderExpiry = parseInt(formData.get('paymentOrderExpiry')) || 15;
  }
  
  // 更新自定义链接设置
  if (formData.has('customLink1Name')) {
    currentSettings.customLink1Name = formData.get('customLink1Name') || '';
  }
  if (formData.has('customLink1Url')) {
    currentSettings.customLink1Url = formData.get('customLink1Url') || '';
  }
  if (formData.has('customLink2Name')) {
    currentSettings.customLink2Name = formData.get('customLink2Name') || '';
  }
  if (formData.has('customLink2Url')) {
    currentSettings.customLink2Url = formData.get('customLink2Url') || '';
  }
  
  // 更新公告设置
  if (formData.has('announcementTitle') || formData.has('announcementContent')) {
    currentSettings.announcementTitle = formData.get('announcementTitle') || '';
    currentSettings.announcementContent = formData.get('announcementContent') || '';
    // 更新公告版本号，用于强制用户重新查看公告
    currentSettings.announcementVersion = (currentSettings.announcementVersion || 0) + 1;
  }
  
  // 更新站点名称
  if (formData.has('siteName')) {
    currentSettings.siteName = formData.get('siteName') || 'CFly';
  }
  
  // 更新自动清理非活跃用户设置
  if (formData.has('enableAutoCleanup')) {
    currentSettings.enableAutoCleanup = formData.get('enableAutoCleanup') === 'true';
  }
  if (formData.has('autoCleanupDays')) {
    currentSettings.autoCleanupDays = parseInt(formData.get('autoCleanupDays')) || 7;
  }
  
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .bind(SYSTEM_CONFIG_KEY, JSON.stringify(currentSettings))
    .run();

  return new Response('OK', { status: 200 });
}

// 验证并限制每条线路的IP数量
function validateAndLimitIPs(bestDomains) {
  const manualDomains = [];
  const autoDomains = {};
  
  // 分类域名
  bestDomains.forEach(domain => {
    // 匹配自动获取格式: IPv4: 1.2.3.4:443#v4移动 LAX 或 IPv6: [2606:4700::]:443#v6移动 SIN
    const autoMatch = domain.match(/^(\[?[0-9a-fA-F:.]+\]?):443#(v4|v6)(移动|联通|电信|铁通|广电)\s+[A-Z]{3}$/);
    
    if (!autoMatch) {
      // 手动添加的域名
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
  
  // 限制每条线路最多5个IP
  const limitedAutoDomains = [];
  let trimmedCount = 0;
  
  Object.keys(autoDomains).forEach(lineKey => {
    const ips = autoDomains[lineKey];
    if (ips.length > 5) {
      console.log(`[保存验证] ${lineKey} 超出限制 (${ips.length}个)，截断为5个`);
      trimmedCount += ips.length - 5;
      limitedAutoDomains.push(...ips.slice(0, 5));
    } else {
      limitedAutoDomains.push(...ips);
    }
  });
  
  if (trimmedCount > 0) {
    console.log(`[保存验证] 共截断 ${trimmedCount} 个超出限制的IP`);
  }
  
  // 返回：手动域名 + 限制后的自动IP
  return [...manualDomains, ...limitedAutoDomains];
}

async function checkAuth(request, env) {
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/admin_session=([^;]+)/);
    if (match) {
      const session = await dbValidateSession(env, match[1]);
      if (session) {
        const user = await dbGetUserById(env, session.user_id);
        if (user && user.username === (env.ADMIN_USERNAME || 'admin')) {
          return true;
        }
      }
    }
  }
  return false;
}

// 管理员面板处理
async function handleAdminPanel(request, env, adminPath) {
  const cookie = request.headers.get('Cookie');
  let isLogged = false;
  let adminUsername = env.ADMIN_USERNAME || 'admin';
  
  // 检查管理员会话
  if (cookie) {
    const match = cookie.match(/admin_session=([^;]+)/);
    if (match) {
      const session = await dbValidateSession(env, match[1]);
      if (session) {
        const user = await dbGetUserById(env, session.user_id);
        if (user && user.username === adminUsername) {
          isLogged = true;
        }
      }
    }
  }

  if (!isLogged) {
    return await renderAdminLoginPage(env, adminPath);
  }

  // 【关键修复】先并发获取数据
  const [usersData, rawSettings] = await Promise.all([
      dbGetAllUsers(env),
      dbGetSettings(env)
  ]);
  
  // 【关键修复】如果 rawSettings 为 null（首次使用 D1），则给一个安全的默认对象
  const settings = rawSettings || { proxyIPs: [], bestDomains: [], subUrl: "" };
  
  // 兼容处理：确保即使字段不存在也不会报错
  let proxyIPsList = settings.proxyIPs || (settings.proxyIP ? [settings.proxyIP] : []);
  let bestDomainsList = settings.bestDomains || [];
  let subUrl = settings.subUrl || "";
  let websiteUrl = settings.websiteUrl || ""; // 官网地址
  let siteName = settings.siteName || "CFly"; // 站点名称，默认CFly

  const rows = usersData.map(u => {
    const isExpired = u.expiry && u.expiry < Date.now();
    const isEnabled = u.enabled; 
    
    const expiryDateObj = u.expiry ? new Date(u.expiry) : null;
    const expiryText = expiryDateObj ? formatBeijingDateTime(u.expiry) : '未激活';
    const expiryVal = expiryDateObj ? formatBeijingDate(u.expiry) : '';
    const createDate = u.createAt ? formatBeijingDateTime(u.createAt) : '-';
    
    // 状态显示：未激活 > 已过期 > 已禁用 > 正常
    let statusHtml = !u.expiry ? '<span class="tag disabled">未激活</span>' : (isExpired ? '<span class="tag expired">已过期</span>' : (!isEnabled ? '<span class="tag disabled">已禁用</span>' : '<span class="tag active">正常</span>'));
    const safeName = u.name.replace(/'/g, "\\'");
    
    return `<tr data-uuid="${u.uuid}">
      <td><input type="checkbox" class="u-check" value="${u.uuid}"></td>
      <td class="mono" onclick="copy('${u.uuid}')">${u.uuid}</td>
      <td>${u.name}</td>
      <td>${createDate}</td>
      <td>${expiryText}</td>
      <td>${statusHtml}</td>
      <td class="actions">
        <div class="dropdown">
          <button class="btn-action btn-copy" onclick="toggleDropdown(event, '${u.uuid}')">订阅 ▼</button>
          <div class="dropdown-content" id="dropdown-${u.uuid}">
            <div class="dropdown-item original" onclick="copySubByType('${u.uuid}', 'original')"><span>🔗</span> 原始订阅</div>
            <div class="dropdown-item clash" onclick="copySubByType('${u.uuid}', 'clash')"><span>⚡</span> Clash</div>
            <div class="dropdown-item singbox" onclick="copySubByType('${u.uuid}', 'singbox')"><span>📦</span> SingBox</div>
            <div class="dropdown-item surge" onclick="copySubByType('${u.uuid}', 'surge')"><span>🌊</span> Surge</div>
            <div class="dropdown-item shadowrocket" onclick="copySubByType('${u.uuid}', 'shadowrocket')"><span>🚀</span> Shadowrocket</div>
            <div class="dropdown-item quantumult" onclick="copySubByType('${u.uuid}', 'quanx')"><span>🔮</span> Quantumult X</div>
            <div class="dropdown-item v2ray" onclick="copySubByType('${u.uuid}', 'v2ray')"><span>✈️</span> V2Ray/Xray</div>
            <div class="dropdown-item surfboard" onclick="copySubByType('${u.uuid}', 'surfboard')"><span>🏄</span> Surfboard</div>
          </div>
        </div>
        <button class="btn-action btn-edit" onclick="openEdit('${u.uuid}', '${safeName}', '${expiryVal}')">编辑</button>
        ${isEnabled && !isExpired ? `<button class="btn-action btn-danger" onclick="toggleStatus('${u.uuid}', false)">禁用</button>` : ''}
        ${!isEnabled && !isExpired ? `<button class="btn-action btn-success" onclick="toggleStatus('${u.uuid}', true)">启用</button>` : ''}
        ${isExpired ? `<button class="btn-action btn-secondary" disabled>过期</button>` : ''}
        <button class="btn-action btn-del" onclick="delUser('${u.uuid}')">删除</button>
      </td>
    </tr>`;
  }).join('');

  return new Response(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <title>${siteName} 控制面板</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        :root { --primary: #1890ff; --bg: #f0f2f5; --danger: #ff4d4f; --success: #52c41a; --warning: #faad14; --purple: #722ed1; --grey: #bfbfbf; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: #333; height: 100vh; overflow: hidden; }
        
        /* 主布局 */
        .layout { display: flex; height: 100vh; }
        
        /* 左侧导航 */
        .sidebar { width: 240px; background: #001529; color: white; overflow-y: auto; flex-shrink: 0; }
        .sidebar-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sidebar-header h1 { color: white; font-size: 18px; margin: 0; }
        .sidebar-header .date { font-size: 12px; color: rgba(255,255,255,0.65); margin-top: 5px; }
        
        .menu { list-style: none; padding: 10px 0; }
        .menu-item { padding: 12px 20px; cursor: pointer; transition: all 0.3s; border-left: 3px solid transparent; display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.85); }
        .menu-item:hover { background: rgba(255,255,255,0.1); color: white; }
        .menu-item.active { background: var(--primary); border-left-color: #fff; color: white; }
        .menu-item-icon { font-size: 16px; width: 20px; text-align: center; }
        
        /* 右侧内容区 */
        .main-content { flex: 1; overflow-y: auto; background: var(--bg); }
        .content-header { background: white; padding: 16px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); position: sticky; top: 0; z-index: 10; }
        .content-header h2 { font-size: 20px; margin: 0; }
        .content-body { padding: 24px; }
        
        .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .section { display: none; }
        .section.active { display: block; }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media(max-width:768px) { .grid { grid-template-columns: 1fr; } .layout { flex-direction: column; } .sidebar { width: 100%; height: auto; } }
        label { display: block; margin-bottom: 8px; font-size: 14px; color: #666; font-weight: 600; }
        input[type=text], input[type=date], textarea { width: 100%; padding: 10px; border: 1px solid #d9d9d9; border-radius: 4px; box-sizing: border-box; font-family: inherit; transition: 0.2s; }
        input:focus, textarea:focus { border-color: var(--primary); outline: none; }
        textarea { resize: vertical; min-height: 80px; font-family: monospace; font-size: 13px; }
        button { padding: 8px 16px; color: white; border: none; border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 14px; }
        button:hover { opacity: 0.9; }
        button:disabled { background: #ccc !important; cursor: not-allowed; }
        .btn-primary { background: var(--primary); }
        .btn-danger { background: var(--danger); }
        .btn-success { background: var(--success); }
        .actions { white-space: nowrap; }
        .btn-action { padding: 4px 10px; font-size: 12px; margin-right: 4px; }
        .btn-copy { background: var(--purple); }
        .btn-edit { background: var(--warning); }
        .btn-del { background: #ff7875; }
        .btn-secondary { background: var(--grey); }
        .config-list-container { border: 1px solid #eee; border-radius: 4px; padding: 10px; max-height: 200px; overflow-y: auto; background: #fafafa; }
        .config-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: white; border-bottom: 1px solid #eee; font-family: monospace; font-size: 13px; cursor: move; user-select: none; transition: background 0.2s; }
        .config-item:last-child { border-bottom: none; }
        .config-item:hover { background: #f0f0f0; }
        .config-item.dragging { opacity: 0.5; background: #e6f7ff; }
        .config-item .drag-handle { color: #999; margin-right: 8px; cursor: grab; font-weight: bold; }
        .config-item .drag-handle:active { cursor: grabbing; }
        .config-item .del-btn { color: var(--danger); cursor: pointer; font-weight: bold; padding: 0 5px; }
        .config-add-box { display: flex; gap: 10px; margin-bottom: 10px; }
        .config-add-box textarea { flex: 1; min-height: 60px; }
        .config-add-box button { align-self: flex-start; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #f0f0f0; }
        th { background: #fafafa; color: #666; font-weight: 600; }
        tr:hover { background: #fdfdfd; }
        .mono { font-family: monospace; color: var(--primary); cursor: pointer; }
        .tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
        .tag.active { color: var(--success); background: #f6ffed; border: 1px solid #b7eb8f; }
        .tag.expired { color: var(--danger); background: #fff1f0; border: 1px solid #ffa39e; }
        .tag.disabled { color: #999; background: #f5f5f5; border: 1px solid #d9d9d9; }
        .batch-bar { margin-bottom: 15px; display: flex; gap: 10px; align-items: center; background: #e6f7ff; padding: 10px; border-radius: 4px; border: 1px solid #91d5ff; display: none; }
        .batch-bar.show { display: flex; }
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 100; }
        .modal { background: white; padding: 25px; border-radius: 8px; width: 90%; max-width: 400px; }
        #toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 4px; opacity: 0; pointer-events: none; transition: 0.3s; z-index: 200; }
        #toast.show { opacity: 1; bottom: 50px; }
        .footer-actions { margin-top: 40px; padding-top: 20px; border-top: 1px dashed #ddd; text-align: center; color: #999; }
        .dropdown { position: relative; display: inline-block; }
        .dropdown-content { display: none; position: absolute; background: white; min-width: 180px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; border-radius: 6px; overflow-y: auto; max-height: 300px; top: 100%; left: 0; margin-top: 5px; }
        .dropdown-content.show { display: block; }
        .dropdown-item { padding: 10px 15px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f0f0f0; transition: background 0.2s; display: flex; align-items: center; gap: 8px; }
        .dropdown-item:last-child { border-bottom: none; }
        .dropdown-item:hover { background: #f5f5f5; }
        .dropdown-item.original { color: var(--purple); font-weight: 600; }
        .dropdown-item.clash { color: #1890ff; }
        .dropdown-item.surge { color: #ff9500; }
        .dropdown-item.shadowrocket { color: #00d4ff; }
        .dropdown-item.quantumult { color: #ff4d4f; }
        .dropdown-item.v2ray { color: #e91e63; }
        .dropdown-item.surfboard { color: #ff5722; }
        
        /* 开关按钮样式 */
        .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
        .switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; border-radius: 26px; transition: 0.3s; }
        .switch .slider:before { content: ""; position: absolute; height: 20px; width: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
        .switch input:checked + .slider:before { transform: translateX(24px); }
        
        /* 移动端汉堡菜单 */
        .admin-menu-toggle {
            display: none;
            position: fixed;
            top: 15px;
            left: 15px;
            z-index: 1001;
            background: #001529;
            color: white;
            border: none;
            border-radius: 8px;
            width: 45px;
            height: 45px;
            cursor: pointer;
            font-size: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: all 0.3s;
        }
        .admin-menu-toggle:active {
            transform: scale(0.95);
        }
        .admin-sidebar-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        }
        @media(max-width:768px) {
            .admin-menu-toggle {
                display: block;
            }
            .sidebar {
                position: fixed;
                left: -240px;
                top: 0;
                bottom: 0;
                width: 240px;
                z-index: 1000;
                transition: left 0.3s;
            }
            .sidebar.mobile-open {
                left: 0;
            }
            .admin-sidebar-overlay.show {
                display: block;
            }
            .main-content {
                width: 100%;
            }
            .content-header {
                padding-left: 70px;
            }
            .grid {
                grid-template-columns: 1fr;
            }
        }
      </style>
    </head>
    <body>
      <!-- 移动端菜单按钮 -->
      <button class="admin-menu-toggle" onclick="toggleAdminSidebar()">☰</button>
      
      <!-- 侧边栏遮罩层 -->
      <div class="admin-sidebar-overlay" onclick="toggleAdminSidebar()"></div>
      
      <div class="layout">
        <!-- 左侧导航 -->
        <div class="sidebar" id="admin-sidebar">
          <div class="sidebar-header">
            <h1>${siteName}</h1>
            <div class="date">${formatBeijingDate(Date.now())}</div>
            <button onclick="adminLogout()" style="margin-top:10px;width:100%;padding:8px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:4px;cursor:pointer;font-size:13px;" onmouseover="this.style.background=&quot;rgba(255,255,255,0.3)&quot;" onmouseout="this.style.background=&quot;rgba(255,255,255,0.2)&quot;">🚪 退出登录</button>
          </div>
          <ul class="menu">
            <li class="menu-item active" data-section="dashboard" onclick="switchSection('dashboard')">
              <span class="menu-item-icon">📊</span>
              <span>仪表盘</span>
            </li>
            <li class="menu-item" data-section="proxy-ips" onclick="switchSection('proxy-ips')">
              <span class="menu-item-icon">🌐</span>
              <span>反代 IP</span>
            </li>
            <li class="menu-item" data-section="best-domains" onclick="switchSection('best-domains')">
              <span class="menu-item-icon">⭐</span>
              <span>优选域名</span>
            </li>
            <li class="menu-item" data-section="users" onclick="switchSection('users')">
              <span class="menu-item-icon">👥</span>
              <span>用户管理</span>
            </li>
            <li class="menu-item" data-section="announcement" onclick="switchSection('announcement')">
              <span class="menu-item-icon">📢</span>
              <span>公告管理</span>
            </li>
            <li class="menu-item" data-section="plans" onclick="switchSection('plans')">
              <span class="menu-item-icon">📦</span>
              <span>套餐管理</span>
            </li>
            <li class="menu-item" data-section="orders" onclick="switchSection('orders')">
              <span class="menu-item-icon">💳</span>
              <span>订单管理</span>
            </li>
            <li class="menu-item" data-section="payment" onclick="switchSection('payment')">
              <span class="menu-item-icon">💰</span>
              <span>支付通道</span>
            </li>
            <li class="menu-item" data-section="invites" onclick="switchSection('invites')">
              <span class="menu-item-icon">🎫</span>
              <span>邀请码</span>
            </li>
            <li class="menu-item" data-section="change-password" onclick="switchSection('change-password')">
              <span class="menu-item-icon">🔒</span>
              <span>修改密码</span>
            </li>
          </ul>
        </div>

        <!-- 右侧内容区 -->
        <div class="main-content">
          
          <!-- 仪表盘 -->
          <div id="section-dashboard" class="section active">
            <div class="content-header">
              <h2>📊 仪表盘</h2>
            </div>
            <div class="content-body">
              <div class="card">
                <h3 style="margin-bottom:15px;">系统设置</h3>
                <div style="padding:15px;background:#f0f5ff;border-radius:8px;margin-bottom:15px;">
                  <div style="margin-bottom:8px;">
                    <span style="font-weight:600;display:block;margin-bottom:4px;">🏷️ 站点名称</span>
                    <div style="font-size:13px;color:#666;">用于显示需要站点名称的地方</div>
                  </div>
                  <input type="text" id="siteNameInput" value="${siteName}" onchange="updateSystemSettings()" placeholder="请输入站点名称，例如：CFly" style="width:100%;padding:10px;border:1px solid #d9d9d9;border-radius:4px;font-size:14px;">
                </div>
                <div style="padding:15px;background:#f8f9fa;border-radius:8px;margin-bottom:15px;">
                  <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                    <div>
                      <span style="font-weight:600;display:block;margin-bottom:4px;">开放用户注册</span>
                      <div style="font-size:13px;color:#666;">
                        开启后，用户可以自助注册账号；关闭后，只能由管理员手动添加用户
                      </div>
                    </div>
                    <div class="switch" onclick="toggleSwitch(event, 'enableRegisterCheck')">
                      <input type="checkbox" id="enableRegisterCheck" ${settings.enableRegister ? 'checked' : ''} onchange="updateSystemSettings()" style="display:none;">
                      <span class="slider" style="background:${settings.enableRegister ? '#52c41a' : '#d9d9d9'};"></span>
                    </div>
                  </label>
                </div>
                <div style="padding:15px;background:#fff7e6;border-radius:8px;margin-bottom:15px;">
                  <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                    <div>
                      <span style="font-weight:600;display:block;margin-bottom:4px;">自动审核订单</span>
                      <div style="font-size:13px;color:#666;">
                        开启后，用户订购<b style="color:#ff4d4f;">免费套餐（价格为0）</b>将自动审核通过；付费套餐仍需等待支付或手动审核
                      </div>
                    </div>
                    <div class="switch" onclick="toggleSwitch(event, 'autoApproveOrderCheck')">
                      <input type="checkbox" id="autoApproveOrderCheck" ${settings.autoApproveOrder ? 'checked' : ''} onchange="updateSystemSettings()" style="display:none;">
                      <span class="slider" style="background:${settings.autoApproveOrder ? '#52c41a' : '#d9d9d9'};"></span>
                    </div>
                  </label>
                </div>
                <div style="padding:15px;background:#f6ffed;border-radius:8px;margin-bottom:15px;">
                  <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                    <div>
                      <span style="font-weight:600;display:block;margin-bottom:4px;">🎁 新用户注册试用</span>
                      <div style="font-size:13px;color:#666;">
                        开启后，新注册用户自动获得免费试用时长；关闭后新用户需购买套餐才能使用
                      </div>
                    </div>
                    <div class="switch" onclick="toggleSwitch(event, 'enableTrialCheck')">
                      <input type="checkbox" id="enableTrialCheck" ${settings.enableTrial ? 'checked' : ''} onchange="updateSystemSettings()" style="display:none;">
                      <span class="slider" style="background:${settings.enableTrial ? '#52c41a' : '#d9d9d9'};"></span>
                    </div>
                  </label>
                  <div style="margin-top:12px;${settings.enableTrial ? '' : 'opacity:0.5;pointer-events:none;'}">
                    <label style="font-size:13px;color:#666;display:block;margin-bottom:5px;">试用时长（天）</label>
                    <select id="trialDays" onchange="updateSystemSettings()" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;">
                      <option value="1" ${settings.trialDays == 1 ? 'selected' : ''}>1 天</option>
                      <option value="3" ${settings.trialDays == 3 ? 'selected' : ''}>3 天</option>
                      <option value="7" ${!settings.trialDays || settings.trialDays == 7 ? 'selected' : ''}>7 天</option>
                      <option value="14" ${settings.trialDays == 14 ? 'selected' : ''}>14 天</option>
                      <option value="30" ${settings.trialDays == 30 ? 'selected' : ''}>30 天</option>
                    </select>
                  </div>
                </div>
                <div style="padding:15px;background:#e6fffb;border-radius:8px;margin-bottom:15px;">
                  <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                    <div>
                      <span style="font-weight:600;display:block;margin-bottom:4px;">🎫 注册需要邀请码</span>
                      <div style="font-size:13px;color:#666;">
                        开启后，用户注册时必须填写有效的邀请码；邀请码在"邀请码管理"中生成
                      </div>
                    </div>
                    <div class="switch" onclick="toggleSwitch(event, 'requireInviteCodeCheck')">
                      <input type="checkbox" id="requireInviteCodeCheck" ${settings.requireInviteCode ? 'checked' : ''} onchange="updateSystemSettings()" style="display:none;">
                      <span class="slider" style="background:${settings.requireInviteCode ? '#52c41a' : '#d9d9d9'};"></span>
                    </div>
                  </label>
                </div>
                <div style="padding:15px;background:#f0f5ff;border-radius:8px;margin-bottom:15px;">
                  <div style="margin-bottom:12px;">
                    <span style="font-weight:600;display:block;margin-bottom:4px;">⏱️ 订单过期时间设置</span>
                    <div style="font-size:13px;color:#666;">设置待审核订单和支付订单的自动过期时间</div>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                    <div>
                      <label style="font-size:13px;color:#666;display:block;margin-bottom:5px;">待审核订单过期时间</label>
                      <select id="pendingOrderExpiry" onchange="updateSystemSettings()" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;">
                        <option value="0" ${!settings.pendingOrderExpiry || settings.pendingOrderExpiry == 0 ? 'selected' : ''}>永不过期</option>
                        <option value="30" ${settings.pendingOrderExpiry == 30 ? 'selected' : ''}>30分钟</option>
                        <option value="60" ${settings.pendingOrderExpiry == 60 ? 'selected' : ''}>1小时</option>
                        <option value="120" ${settings.pendingOrderExpiry == 120 ? 'selected' : ''}>2小时</option>
                        <option value="360" ${settings.pendingOrderExpiry == 360 ? 'selected' : ''}>6小时</option>
                        <option value="720" ${settings.pendingOrderExpiry == 720 ? 'selected' : ''}>12小时</option>
                        <option value="1440" ${settings.pendingOrderExpiry == 1440 ? 'selected' : ''}>24小时</option>
                        <option value="4320" ${settings.pendingOrderExpiry == 4320 ? 'selected' : ''}>3天</option>
                        <option value="10080" ${settings.pendingOrderExpiry == 10080 ? 'selected' : ''}>7天</option>
                      </select>
                    </div>
                    <div>
                      <label style="font-size:13px;color:#666;display:block;margin-bottom:5px;">支付订单过期时间</label>
                      <select id="paymentOrderExpiry" onchange="updateSystemSettings()" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;">
                        <option value="15" ${!settings.paymentOrderExpiry || settings.paymentOrderExpiry == 15 ? 'selected' : ''}>15分钟</option>
                        <option value="30" ${settings.paymentOrderExpiry == 30 ? 'selected' : ''}>30分钟</option>
                        <option value="60" ${settings.paymentOrderExpiry == 60 ? 'selected' : ''}>1小时</option>
                        <option value="120" ${settings.paymentOrderExpiry == 120 ? 'selected' : ''}>2小时</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div style="padding:15px;background:#e6fffb;border-radius:8px;margin-bottom:15px;">
                  <div style="margin-bottom:12px;">
                    <span style="font-weight:600;display:block;margin-bottom:4px;">🔗 用户前端快捷链接</span>
                    <div style="font-size:13px;color:#666;">配置用户面板右上角显示的快捷链接（如TG客服、官方群组等）</div>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                    <div>
                      <label style="font-size:13px;color:#666;display:block;margin-bottom:5px;">链接1 名称</label>
                      <input type="text" id="customLink1Name" value="${settings.customLink1Name || ''}" onchange="updateSystemSettings()" placeholder="例如：TG客服" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;">
                    </div>
                    <div>
                      <label style="font-size:13px;color:#666;display:block;margin-bottom:5px;">链接1 地址</label>
                      <input type="text" id="customLink1Url" value="${settings.customLink1Url || ''}" onchange="updateSystemSettings()" placeholder="例如：https://t.me/ikun_cloudbot" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;">
                    </div>
                    <div>
                      <label style="font-size:13px;color:#666;display:block;margin-bottom:5px;">链接2 名称</label>
                      <input type="text" id="customLink2Name" value="${settings.customLink2Name || ''}" onchange="updateSystemSettings()" placeholder="例如：官方群组" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;">
                    </div>
                    <div>
                      <label style="font-size:13px;color:#666;display:block;margin-bottom:5px;">链接2 地址</label>
                      <input type="text" id="customLink2Url" value="${settings.customLink2Url || ''}" onchange="updateSystemSettings()" placeholder="例如：https://t.me/ikun_cloud" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;">
                    </div>
                  </div>
                </div>
                <div style="padding:15px;background:#fff1f0;border-radius:8px;margin-bottom:15px;">
                  <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                    <div>
                      <span style="font-weight:600;display:block;margin-bottom:4px;">🧹 自动清理非活跃用户</span>
                      <div style="font-size:13px;color:#666;">
                        自动删除指定天数内未登录的非活跃用户账号
                      </div>
                    </div>
                    <div class="switch" onclick="toggleSwitch(event, 'enableAutoCleanupCheck')">
                      <input type="checkbox" id="enableAutoCleanupCheck" ${settings.enableAutoCleanup ? 'checked' : ''} onchange="updateSystemSettings()" style="display:none;">
                      <span class="slider" style="background:${settings.enableAutoCleanup ? '#52c41a' : '#d9d9d9'};"></span>
                    </div>
                  </label>
                  <div style="margin-top:12px;${settings.enableAutoCleanup ? '' : 'opacity:0.5;pointer-events:none;'}">
                    <label style="font-size:13px;color:#666;display:block;margin-bottom:5px;">保留天数：</label>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <input type="number" id="autoCleanupDays" value="${settings.autoCleanupDays || 7}" min="1" max="365" onchange="updateSystemSettings()" style="width:80px;padding:8px;border:1px solid #d9d9d9;border-radius:4px;">
                      <span style="font-size:13px;color:#666;">天（超过此天数未登录的用户将被自动删除）</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="card">
                <h3 style="margin-bottom:15px;">系统概览</h3>
                <div class="grid">
                  <div style="padding:20px;background:#e6f7ff;border-radius:8px;text-align:center;">
                    <div style="font-size:32px;font-weight:bold;color:var(--primary);">${usersData.length}</div>
                    <div style="margin-top:8px;color:#666;">总用户数</div>
                  </div>
                  <div style="padding:20px;background:#f6ffed;border-radius:8px;text-align:center;">
                    <div style="font-size:32px;font-weight:bold;color:var(--success);">${usersData.filter(u => u.enabled && (!u.expiry || u.expiry > Date.now())).length}</div>
                    <div style="margin-top:8px;color:#666;">活跃用户</div>
                  </div>
                  <div style="padding:20px;background:#fff7e6;border-radius:8px;text-align:center;">
                    <div style="font-size:32px;font-weight:bold;color:var(--warning);">${bestDomainsList.length}</div>
                    <div style="margin-top:8px;color:#666;">配置节点数</div>
                  </div>
                  <div style="padding:20px;background:#fff1f0;border-radius:8px;text-align:center;">
                    <div style="font-size:32px;font-weight:bold;color:var(--danger);">${usersData.filter(u => u.expiry && u.expiry < Date.now()).length}</div>
                    <div style="margin-top:8px;color:#666;">已过期用户</div>
                  </div>
                </div>
              </div>
              <div class="card">
                <h3 style="margin-bottom:15px;">快捷操作</h3>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button onclick="switchSection('proxy-ips')" class="btn-primary">🌐 反代 IP</button>
                  <button onclick="switchSection('best-domains')" class="btn-primary">⭐ 优选域名</button>
                  <button onclick="switchSection('users')" class="btn-primary">👥 用户管理</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 反代 IP 配置 -->
          <div id="section-proxy-ips" class="section">
            <div class="content-header">
              <h2>🌐 反代 IP 配置</h2>
            </div>
            <div class="content-body">
              <div class="card">
                <h3 style="margin-bottom:15px;">节点订阅地址</h3>
                <div style="margin-bottom: 20px; padding: 15px; background: #fff7e6; border: 1px solid #ffd591; border-radius: 4px;">
                    <label style="color: #d46b08;">节点订阅地址 (用于生成订阅链接)</label>
                    <input type="text" id="subUrl" value="${subUrl}" placeholder="支持多个地址用英文逗号分隔，用户复制时随机获取一个">
                    <div style="margin-top:8px;font-size:12px;color:#666;">💡 支持多个地址，用英文逗号(,)分隔，用户复制订阅时会随机分配一个地址</div>
                </div>
                <div style="margin-bottom: 20px; padding: 15px; background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 4px;">
                    <label style="color: #0050b3;">官网地址 (显示在订阅节点列表中)</label>
                    <input type="text" id="websiteUrl" value="${websiteUrl}" placeholder="请输入官网地址, 例如: snippets.1412.me (不需要加 https://)">
                    <div style="margin-top:8px;font-size:12px;color:#666;">💡 此地址会显示在订阅节点的别名中，方便用户识别官网</div>
                </div>
              </div>
              
              <div class="card">
                <h3 style="margin-bottom:15px;">默认反代 IP 列表</h3>
                <div style="margin-bottom:10px;padding:10px;background:#f0f9ff;border:1px solid #bae7ff;border-radius:4px;font-size:13px;color:#0050b3;">
                  💡 <b>智能提示：</b>在代理地址中包含地区标识（如 HK/JP/US/SG），系统会根据目标地址自动选择同地区代理，提升连接速度。
                </div>
                <div class="config-add-box">
                  <textarea id="inputProxyIP" placeholder="批量添加，一行一个&#10;支持地理位置标识，节点会智能选择就近代理&#10;例如: ProxyIP.HK.CMLiussss.net:443&#10;例如: ProxyIP.JP.CMLiussss.net&#10;例如: 1.2.3.4 (自动补全 :443)"></textarea>
                  <button onclick="addConfig('ProxyIP')" class="btn-success">添加</button>
                </div>
                <div class="config-list-container" id="listProxyIP"></div>
                <div style="margin-top:20px;text-align:right;">
                  <button onclick="saveSettings()" id="saveProxyBtn" class="btn-primary" style="width:120px;">保存配置</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 优选域名配置 -->
          <div id="section-best-domains" class="section">
            <div class="content-header">
              <h2>⭐ 优选域名配置</h2>
            </div>
            <div class="content-body">
              <div class="card">
                <div style="margin-bottom: 20px; padding: 15px; background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 4px; font-size: 13px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                      <span style="font-size:16px;">ℹ️</span>
                      <strong style="color:#0050b3;">关于定时自动更新功能</strong>
                    </div>
                    <div style="color:#096dd9; line-height:1.6;">
                      <p style="margin:5px 0;">• <strong>网页部署</strong>: 不支持定时任务,需要手动点击按钮获取</p>
                      <p style="margin:5px 0;">• <strong>启用定时任务</strong>: 需在 Dashboard 的 <code style="background:#fff;padding:2px 6px;border-radius:3px;">触发器(Triggers)</code> 标签页添加 Cron 触发器</p>
                      <p style="margin:5px 0;">• <strong>Cron 表达式</strong>: <code style="background:#fff;padding:2px 6px;border-radius:3px;">*/15 * * * *</code> (每15分钟执行)</p>
                    </div>
                </div>
                <h3 style="margin-bottom:15px;">优选域名列表</h3>
                <div class="config-add-box">
                  <textarea id="inputBestDomain" placeholder="批量添加，一行一个&#10;格式: 域名/IP:端口#别名&#10;例如: www.visa.com:443#香港"></textarea>
                  <button onclick="addConfig('BestDomain')" class="btn-success">添加</button>
                </div>
                <div style="margin-bottom:10px;display:flex;gap:10px;">
                  <button onclick="fetchBestIPs('v4')" class="btn-primary" style="flex:1;">🚀 自动获取 IPv4 优选</button>
                  <button onclick="fetchBestIPs('v6')" class="btn-primary" style="flex:1;">🚀 自动获取 IPv6 优选</button>
                </div>
                <div class="config-list-container" id="listBestDomain"></div>
                <div style="margin-top:20px;text-align:right;">
                  <button onclick="saveSettings()" id="saveDomainBtn" class="btn-primary" style="width:120px;">保存配置</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 公告管理 -->
          <div id="section-announcement" class="section">
            <div class="content-header">
              <h2>📢 公告管理</h2>
            </div>
            <div class="content-body">
              <div class="card">
                <div style="margin-bottom:20px;padding:15px;background:#e6f7ff;border:1px solid #91d5ff;border-radius:8px;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <span style="font-size:16px;">ℹ️</span>
                    <strong style="color:#0050b3;">功能说明</strong>
                  </div>
                  <div style="color:#096dd9;line-height:1.6;font-size:14px;">
                    <p style="margin:5px 0;">• 启用的公告将在用户登录后按顺序弹出显示</p>
                    <p style="margin:5px 0;">• 用户可选择"不再提示"，但更新公告后会再次显示</p>
                    <p style="margin:5px 0;">• 可添加多个公告，通过开关控制是否显示</p>
                  </div>
                </div>
                
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                  <h3 style="margin:0;color:#333;">公告列表</h3>
                  <button onclick="openAddAnnouncement()" class="btn-primary" style="padding:8px 20px;">+ 添加公告</button>
                </div>
                
                <div id="announcementsList"></div>
              </div>
            </div>
          </div>

          <!-- 修改密码 -->
          <div id="section-change-password" class="section">
            <div class="content-header">
              <h2>🔒 修改密码</h2>
            </div>
            <div class="content-body">
              <div class="card" style="max-width: 500px;">
                <h3 style="margin-bottom:15px;">修改管理员密码</h3>
                <div style="margin-bottom:15px;">
                  <label>旧密码</label>
                  <input type="password" id="adminOldPassword" placeholder="请输入旧密码">
                </div>
                <div style="margin-bottom:15px;">
                  <label>新密码</label>
                  <input type="password" id="adminNewPassword" placeholder="请输入新密码">
                </div>
                <div style="margin-bottom:15px;">
                  <label>确认新密码</label>
                  <input type="password" id="adminConfirmPassword" placeholder="请再次输入新密码">
                </div>
                <button onclick="changeAdminPassword()" class="btn-primary">修改密码</button>
              </div>
            </div>
          </div>

          <!-- 套餐管理 -->
          <div id="section-plans" class="section">
            <div class="content-header">
              <h2>📦 套餐管理</h2>
            </div>
            <div class="content-body">
              <!-- 添加套餐 -->
              <div class="card">
                <h3 style="margin-bottom:15px;">添加新套餐</h3>
                <div class="grid">
                  <div><label>套餐名称</label><input type="text" id="planName" placeholder="例如：月度套餐"></div>
                  <div><label>时长(天)</label><input type="number" id="planDuration" placeholder="例如：30" min="1"></div>
                </div>
                <div style="margin-top:10px"><label>套餐描述</label><textarea id="planDescription" style="min-height:60px" placeholder="套餐说明..."></textarea></div>
                <div style="margin-top:10px"><label>价格</label><input type="number" id="planPrice" placeholder="0" min="0" step="0.01"></div>
                <div style="margin-top:15px;"><button onclick="addPlan()" class="btn-primary">添加套餐</button></div>
              </div>
              
              <!-- 套餐列表 -->
              <div class="card">
                <h3 style="margin-bottom:15px;">套餐列表</h3>
                <div id="plansList"></div>
              </div>
            </div>
          </div>

          <!-- 订单管理 -->
          <div id="section-orders" class="section">
            <div class="content-header">
              <h2>💳 订单管理</h2>
            </div>
            <div class="content-body">
              <div class="card">
                <div style="margin-bottom:15px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                  <div style="display:flex;align-items:center;gap:15px;">
                    <h3 style="margin:0;">订单列表</h3>
                    <select id="orderStatusFilter" onchange="loadOrders()" style="padding:5px 10px;border:1px solid #d9d9d9;border-radius:4px;">
                      <option value="all">全部订单</option>
                      <option value="pending" selected>待审核</option>
                    <option value="approved">已通过</option>
                    <option value="rejected">已拒绝</option>
                    <option value="expired">已过期</option>
                  </select>
                  </div>
                  <div id="orderBatchBar" style="display:none;align-items:center;gap:10px;">
                    <span>已选 <b id="orderSelCount">0</b> 个订单：</span>
                    <button onclick="batchOrderAction('approve')" class="btn-action" style="background:#52c41a;">批量通过</button>
                    <button onclick="batchOrderAction('reject')" class="btn-action btn-del">批量拒绝</button>
                  </div>
                </div>
                <div id="ordersList"></div>
              </div>
            </div>
          </div>

          <!-- 支付通道配置 -->
          <div id="section-payment" class="section">
            <div class="content-header">
              <h2>💰 支付通道配置</h2>
            </div>
            <div class="content-body">
              <div class="card">
                <div style="margin-bottom:20px;padding:15px;background:#e6f7ff;border:1px solid #91d5ff;border-radius:8px;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <span style="font-size:16px;">ℹ️</span>
                    <strong style="color:#0050b3;">BEpusdt 对接说明</strong>
                  </div>
                  <div style="color:#096dd9;line-height:1.6;font-size:14px;">
                    <p style="margin:5px 0;">• 支持对接 <a href="https://github.com/v03413/BEpusdt" target="_blank" style="color:#1890ff;">BEpusdt</a> USDT 收款网关</p>
                    <p style="margin:5px 0;">• API 地址填写 BEpusdt 服务地址 (如: https://epusdt.example.com)</p>
                    <p style="margin:5px 0;">• API Token 在 BEpusdt 的 conf.toml 中配置</p>
                    <p style="margin:5px 0;">• 支持多种交易类型: usdt.trc20, usdt.polygon, usdt.arbitrum 等</p>
                  </div>
                </div>
                
                <h3 style="margin-bottom:15px;">添加支付通道</h3>
                <div class="grid">
                  <div><label>通道名称</label><input type="text" id="payChannelName" placeholder="例如：USDT-TRC20"></div>
                  <div><label>通道代码</label><input type="text" id="payChannelCode" placeholder="例如：usdt.trc20"></div>
                </div>
                <div style="margin-top:10px;">
                  <label>API 地址</label>
                  <input type="text" id="payChannelApiUrl" placeholder="BEpusdt 服务地址，例如：https://epusdt.example.com">
                </div>
                <div style="margin-top:10px;">
                  <label>API Token</label>
                  <input type="password" id="payChannelApiToken" placeholder="BEpusdt API 认证令牌">
                </div>
                <div style="margin-top:15px;">
                  <button onclick="savePaymentChannel()" class="btn-primary">添加通道</button>
                </div>
              </div>
              
              <div class="card">
                <h3 style="margin-bottom:15px;">支付通道列表</h3>
                <div id="paymentChannelsList"></div>
              </div>
            </div>
          </div>

          <!-- 邀请码管理 -->
          <div id="section-invites" class="section">
            <div class="content-header">
              <h2>🎫 邀请码管理</h2>
            </div>
            <div class="content-body">
              <div class="card">
                <div style="margin-bottom:20px;padding:15px;background:#f6ffed;border:1px solid #b7eb8f;border-radius:8px;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <span style="font-size:16px;">💡</span>
                    <strong style="color:#389e0d;">邀请码使用说明</strong>
                  </div>
                  <div style="color:#52c41a;line-height:1.6;font-size:14px;">
                    <p style="margin:5px 0;">• 开启"开放用户注册"后，可配合"需要邀请码"限制注册</p>
                    <p style="margin:5px 0;">• 每个邀请码可设置使用次数，用完自动失效</p>
                    <p style="margin:5px 0;">• 可设置邀请码关联的试用天数，注册用户自动获得对应时长</p>
                  </div>
                </div>
                
                <h3 style="margin-bottom:15px;">生成邀请码</h3>
                <div class="grid">
                  <div>
                    <label>邀请码 <span style="color:#999;font-size:12px;">(留空随机生成)</span></label>
                    <input type="text" id="inviteCode" placeholder="留空自动生成8位邀请码">
                  </div>
                  <div>
                    <label>可使用次数</label>
                    <input type="number" id="inviteMaxUses" value="1" min="1" placeholder="默认1次">
                  </div>
                </div>
                <div class="grid" style="margin-top:10px;">
                  <div>
                    <label>赠送试用天数 <span style="color:#999;font-size:12px;">(0表示不赠送)</span></label>
                    <input type="number" id="inviteTrialDays" value="0" min="0" placeholder="注册后赠送的天数">
                  </div>
                  <div>
                    <label>备注</label>
                    <input type="text" id="inviteRemark" placeholder="可选，例如：给某渠道">
                  </div>
                </div>
                <div style="margin-top:15px;">
                  <button onclick="createInviteCode()" class="btn-primary">生成邀请码</button>
                </div>
              </div>
              
              <div class="card">
                <h3 style="margin-bottom:15px;">邀请码列表</h3>
                <div id="inviteCodesList"></div>
              </div>
            </div>
          </div>

          <!-- 用户管理 -->
          <div id="section-users" class="section">
            <div class="content-header">
              <h2>👥 用户管理</h2>
            </div>
            <div class="content-body">
              <!-- 添加用户 -->
              <div class="card">
                <h3 style="margin-bottom:15px;">添加新用户</h3>
        <div class="grid">
          <div><label>备注名称</label><input type="text" id="name" placeholder="默认 '未命名'"></div>
          <div><label>到期时间</label><input type="date" id="expiryDate"></div>
        </div>
        <div class="grid" style="margin-top:10px">
          <div><label>前端用户名 <span style="color:#999;font-size:12px;">(留空随机生成)</span></label><input type="text" id="frontUsername" placeholder="留空随机生成6位用户名"></div>
          <div><label>前端密码 <span style="color:#999;font-size:12px;">(留空与用户名相同)</span></label><input type="text" id="frontPassword" placeholder="留空默认与用户名相同"></div>
        </div>
        <div style="margin-top:10px"><label>自定义 UUID (可选)</label><textarea id="uuids" style="min-height:60px" placeholder="留空自动生成"></textarea></div>
        <div style="margin-top:15px;"><button onclick="addUser()" id="addBtn" class="btn-primary">生成 / 添加用户</button></div>
      </div>
              
              <!-- 用户列表 -->
              <div class="card">
                <h3 style="margin-bottom:15px;">用户列表 (${usersData.length})</h3>
        <div class="batch-bar" id="batchBar">
          <span>已选 <b id="selCount">0</b> 个用户：</span>
          <button onclick="batchAction('enable')" class="btn-success">批量启用</button>
          <button onclick="batchAction('disable')" class="btn-secondary">批量禁用</button>
          <button onclick="batchAction('delete')" class="btn-danger">批量删除</button>
        </div>
        <div style="overflow-x:auto">
          <table style="min-width:900px">
            <thead><tr><th width="40"><input type="checkbox" id="selectAll" onclick="toggleSelectAll()"></th><th>UUID</th><th>备注</th><th>创建时间</th><th>到期时间</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 编辑用户弹窗 -->
      <div class="modal-overlay" id="editModal">
        <div class="modal">
          <h3>编辑用户</h3>
          <input type="hidden" id="editUuid">
          <div style="margin-bottom:15px"><label>UUID</label><input type="text" id="editUuidDisplay" disabled style="background:#f5f5f5;color:#999"></div>
          <div style="margin-bottom:15px"><label>备注名称</label><input type="text" id="editName"></div>
          <div style="margin-bottom:15px"><label>到期时间</label><input type="date" id="editExpiryDate"></div>
          <div style="margin-bottom:15px;padding:15px;background:#f9f9f9;border-radius:8px;border:1px solid #e8e8e8;">
            <div style="margin-bottom:10px;font-weight:600;color:#666;">📝 前端账号管理</div>
            <div id="editAccountInfo" style="margin-bottom:10px;font-size:13px;color:#999;">加载中...</div>
            <div style="margin-bottom:10px"><label>新密码 <span style="color:#999;font-size:12px;">(留空不修改)</span></label><input type="text" id="editNewPassword" placeholder="输入新密码，留空则不修改"></div>
          </div>
          <div style="text-align:right;"><button onclick="closeEdit()" style="background:#999;margin-right:10px">取消</button><button onclick="saveUserEdit()" id="editSaveBtn" class="btn-primary">保存</button></div>
        </div>
      </div>

      <!-- 编辑套餐弹窗 -->
      <div class="modal-overlay" id="editPlanModal">
        <div class="modal">
          <h3>编辑套餐</h3>
          <input type="hidden" id="editPlanId">
          <div style="margin-bottom:15px"><label>套餐名称</label><input type="text" id="editPlanName"></div>
          <div style="margin-bottom:15px"><label>时长(天)</label><input type="number" id="editPlanDuration" min="1"></div>
          <div style="margin-bottom:15px"><label>套餐描述</label><textarea id="editPlanDescription" style="min-height:60px"></textarea></div>
          <div style="margin-bottom:20px"><label>价格</label><input type="number" id="editPlanPrice" min="0" step="0.01"></div>
          <div style="text-align:right;"><button onclick="closePlanEdit()" style="background:#999;margin-right:10px">取消</button><button onclick="savePlanEdit()" id="editPlanSaveBtn" class="btn-primary">保存</button></div>
        </div>
      </div>
      
      <!-- 编辑公告弹窗 -->
      <div class="modal-overlay" id="editAnnouncementModal">
        <div class="modal" style="max-width:600px;">
          <h3 id="announcementModalTitle">添加公告</h3>
          <input type="hidden" id="editAnnouncementId">
          <div style="margin-bottom:15px">
            <label>公告标题</label>
            <input type="text" id="editAnnouncementTitle" placeholder="例如：系统维护通知">
          </div>
          <div style="margin-bottom:15px">
            <label>公告内容</label>
            <textarea id="editAnnouncementContent" placeholder="支持换行，最多500字" style="min-height:120px;" maxlength="500"></textarea>
            <div style="text-align:right;font-size:12px;color:#999;margin-top:5px;">
              <span id="editAnnouncementCharCount">0</span>/500
            </div>
          </div>
          <div style="margin-bottom:15px">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
              <input type="checkbox" id="editAnnouncementEnabled" checked style="width:auto;">
              <span>启用此公告</span>
            </label>
          </div>
          <div style="text-align:right;">
            <button onclick="closeAnnouncementEdit()" style="background:#999;margin-right:10px">取消</button>
            <button onclick="saveAnnouncementEdit()" id="editAnnouncementSaveBtn" class="btn-primary">保存</button>
          </div>
        </div>
      </div>
      
      <!-- 编辑邀请码弹窗 -->
      <div class="modal-overlay" id="editInviteModal">
        <div class="modal" style="max-width:450px;">
          <h3>编辑邀请码</h3>
          <input type="hidden" id="editInviteId">
          <div style="margin-bottom:15px">
            <label>邀请码</label>
            <input type="text" id="editInviteCode" placeholder="邀请码">
          </div>
          <div style="margin-bottom:15px">
            <label>可使用次数</label>
            <input type="number" id="editInviteMaxUses" min="1" value="1">
          </div>
          <div style="margin-bottom:15px">
            <label>赠送试用天数 (0表示不赠送)</label>
            <input type="number" id="editInviteTrialDays" min="0" value="0">
          </div>
          <div style="margin-bottom:15px">
            <label>备注</label>
            <input type="text" id="editInviteRemark" placeholder="可选">
          </div>
          <div style="text-align:right;">
            <button onclick="closeEditInviteModal()" style="background:#999;margin-right:10px">取消</button>
            <button onclick="saveInviteCode()" class="btn-primary">保存</button>
          </div>
        </div>
      </div>
      
      <div id="toast"></div>

      <script>
        // 北京时间转换辅助函数（前端）
        function toBeijingTime(date) {
          const d = new Date(date);
          const beijingTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
          return beijingTime;
        }

        function formatBeijingDateTime(date) {
          if (!date) return '-';
          const d = toBeijingTime(date);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          const hour = String(d.getUTCHours()).padStart(2, '0');
          const minute = String(d.getUTCMinutes()).padStart(2, '0');
          return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
        }

        function formatBeijingDate(date) {
          if (!date) return '-';
          const d = toBeijingTime(date);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          return year + '-' + month + '-' + day;
        }
        
        let proxyIPs = ${JSON.stringify(proxyIPsList)};
        let bestDomains = ${JSON.stringify(bestDomainsList)};
        
        // 订阅转换服务配置
        const apiBaseUrl = 'https://url.v1.mk/sub';
        
        const toast = (msg) => { const t = document.getElementById('toast'); t.innerText = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); };
        
        // 配置列表渲染
        function renderList(type) {
          const list = type === 'ProxyIP' ? proxyIPs : bestDomains;
          const container = document.getElementById('list' + type);
          container.innerHTML = '';
          if(list.length === 0) { container.innerHTML = '<div style="padding:10px;color:#999;text-align:center;">暂无数据</div>'; return; }
          list.forEach((item, index) => {
            const div = document.createElement('div'); 
            div.className = 'config-item';
            div.draggable = true;
            div.dataset.index = index;
            div.dataset.type = type;
            div.innerHTML = \`<span class="drag-handle">☰</span><span style="flex:1">\${item}</span> <span class="del-btn" onclick="delConfig('\${type}', \${index})">×</span>\`;
            
            // 拖动开始
            div.addEventListener('dragstart', (e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', index);
              div.classList.add('dragging');
            });
            
            // 拖动结束
            div.addEventListener('dragend', () => {
              div.classList.remove('dragging');
            });
            
            // 拖动经过
            div.addEventListener('dragover', (e) => {
              e.preventDefault();
              const draggingEl = container.querySelector('.dragging');
              if (!draggingEl || draggingEl === div) return;
              const rect = div.getBoundingClientRect();
              const offset = e.clientY - rect.top - rect.height / 2;
              if (offset > 0) {
                div.after(draggingEl);
              } else {
                div.before(draggingEl);
              }
            });
            
            // 放置
            div.addEventListener('drop', (e) => {
              e.preventDefault();
              const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
              const toIndex = parseInt(div.dataset.index);
              if (fromIndex === toIndex) return;
              
              const targetList = type === 'ProxyIP' ? proxyIPs : bestDomains;
              const [movedItem] = targetList.splice(fromIndex, 1);
              const newToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
              targetList.splice(newToIndex, 0, movedItem);
              renderList(type);
              toast('✅ 顺序已调整');
            });
            
            container.appendChild(div);
          });
        }
        function addConfig(type) {
          const input = document.getElementById('input' + type);
          const raw = input.value; if(!raw.trim()) return;
          const lines = raw.split(/[\\n\\s,]+/);
          let count = 0;
          lines.forEach(line => {
            let val = line.trim(); if(!val) return;
            const parts = val.split('#');
            let addr = parts[0];
            if(!addr.includes(':')) addr += ':443';
            val = parts.length > 1 ? \`\${addr}#\${parts[1]}\` : addr;
            const targetList = type === 'ProxyIP' ? proxyIPs : bestDomains;
            if(!targetList.includes(val)) { targetList.push(val); count++; }
          });
          input.value = ''; renderList(type); if(count > 0) toast(\`已添加 \${count} 条\`);
        }
        function delConfig(type, index) { if(type === 'ProxyIP') proxyIPs.splice(index, 1); else bestDomains.splice(index, 1); renderList(type); }
        
        // API 交互
        async function api(url, data) { 
          const fd = new FormData(); 
          for(let k in data) fd.append(k, data[k]); 
          const res = await fetch(url, { method: 'POST', body: fd }); 
          if(res.ok) { 
            toast('操作成功'); 
            closeEdit(); 
            // 保存当前标签，刷新后恢复
            localStorage.setItem('adminCurrentSection', 'users');
            setTimeout(()=>location.reload(), 500); 
          } else { 
            toast('操作失败');
            document.getElementById('addBtn').disabled = false;
            document.getElementById('editSaveBtn').disabled = false;
          }
        }
        
        // 自动获取优选 IP (替换旧IP而不是累加)
        async function fetchBestIPs(type) {
          const btn = event.target;
          const originalText = btn.innerText;
          btn.innerText = '\u83b7\u53d6\u4e2d...';
          btn.disabled = true;
          
          try {
            const fd = new FormData();
            fd.append('type', type);
            const res = await fetch('/api/admin/fetchBestIPs', { method: 'POST', body: fd });
            
            if (!res.ok) {
              toast('\u274c \u83b7\u53d6\u5931\u8d25');
              return;
            }
            
            const result = await res.json();
            if (!result.success) {
              toast('\u274c ' + (result.error || '\u83b7\u53d6\u5931\u8d25'));
              return;
            }
            
            // 智能合并IP: 每条线路保持5个,新IP优先,不足时保留旧IP
            const ipVersion = type === 'v6' ? 'IPv6' : 'IPv4';
            const versionTag = type === 'v6' ? 'v6' : 'v4';
            
            // 分类现有域名
            const manualDomains = []; // 手动添加的
            const oldAutoDomains = {}; // 旧的自动IP,按线路分组
            
            bestDomains.forEach(domain => {
              // 匹配自动获取格式: IPv4: 1.2.3.4:443#v4移动 LAX 或 IPv6: [2606:4700::]:443#v6联通 SIN
              const autoMatch = domain.match(/^(\\[?[0-9a-fA-F:.]+\\]?):443#(v4|v6)(\\u79fb\\u52a8|\\u8054\\u901a|\\u7535\\u4fe1|\\u94c1\\u901a|\\u5e7f\\u7535)\\s+[A-Z]{3}$/);
              
              if (!autoMatch) {
                // 手动添加的
                manualDomains.push(domain);
              } else {
                const [, , ver, line] = autoMatch;
                // 只处理当前IP版本的旧数据
                if (ver === versionTag) {
                  // 使用 lineKey 格式: 移动_v4 或 联通_v6
                  const lineKey = line + '_' + ver;
                  if (!oldAutoDomains[lineKey]) oldAutoDomains[lineKey] = [];
                  oldAutoDomains[lineKey].push(domain);
                } else {
                  // 保留其他版本的IP
                  manualDomains.push(domain);
                }
              }
            });
            
            // 按线路合并新旧IP
            const newAutoDomains = [];
            const newDataByLine = {};
            
            // 新IP按lineKey(线路+版本)分组
            result.data.forEach(item => {
              const lineKey = item.lineKey; // 格式: 移动_v4 或 联通_v6
              if (!newDataByLine[lineKey]) newDataByLine[lineKey] = [];
              newDataByLine[lineKey].push(item.entry);
            });
            
            // 获取所有线路（新的和旧的）
            const allLineKeys = new Set([...Object.keys(newDataByLine), ...Object.keys(oldAutoDomains)]);
            
            // 每条线路: 新IP优先，没有新IP则保留旧IP
            allLineKeys.forEach(lineKey => {
              const newIPs = newDataByLine[lineKey] || [];
              const oldIPs = oldAutoDomains[lineKey] || [];
              
              if (newIPs.length > 0) {
                // 有新IP：新IP优先，严格限制最多5个
                const merged = [...newIPs.slice(0, 5)]; // 先取新IP，最多5个
                
                // 如果新IP少于5个，用旧IP补齐
                if (merged.length < 5) {
                  const need = 5 - merged.length;
                  oldIPs.slice(0, need).forEach(oldIP => {
                    if (!merged.includes(oldIP)) {
                      merged.push(oldIP);
                    }
                  });
                }
                
                // 最终确保不超过5个
                newAutoDomains.push(...merged.slice(0, 5));
              } else {
                // 没有新IP：保留所有旧IP（最多5个）
                newAutoDomains.push(...oldIPs.slice(0, 5));
              }
            });
            
            // 合并: 手动域名 + 新自动IP
            bestDomains = [...manualDomains, ...newAutoDomains];
            
            renderList('BestDomain');
            toast('\u2705 \u6210\u529f\u83b7\u53d6 ' + result.count + ' \u6761 ' + ipVersion + ' \u4f18\u9009IP\uff0c\u5df2\u66ff\u6362\u65e7\u6570\u636e');
            
          } catch (error) {
            toast('\u274c \u7f51\u7edc\u9519\u8bef: ' + error.message);
          } finally {
            btn.innerText = originalText;
            btn.disabled = false;
          }
        }
        
        function toggleSwitch(event, checkboxId) {
          event.preventDefault();
          const checkbox = document.getElementById(checkboxId);
          checkbox.checked = !checkbox.checked;
          const slider = event.currentTarget.querySelector('.slider');
          slider.style.background = checkbox.checked ? '#52c41a' : '#d9d9d9';
          updateSystemSettings();
        }
        
        async function updateSystemSettings() {
          const siteName = document.getElementById('siteNameInput').value;
          const enableRegister = document.getElementById('enableRegisterCheck').checked;
          const autoApproveOrder = document.getElementById('autoApproveOrderCheck').checked;
          const enableTrial = document.getElementById('enableTrialCheck').checked;
          const trialDays = document.getElementById('trialDays').value;
          const requireInviteCode = document.getElementById('requireInviteCodeCheck').checked;
          const pendingOrderExpiry = document.getElementById('pendingOrderExpiry').value;
          const paymentOrderExpiry = document.getElementById('paymentOrderExpiry').value;
          const customLink1Name = document.getElementById('customLink1Name').value;
          const customLink1Url = document.getElementById('customLink1Url').value;
          const customLink2Name = document.getElementById('customLink2Name').value;
          const customLink2Url = document.getElementById('customLink2Url').value;
          const enableAutoCleanup = document.getElementById('enableAutoCleanupCheck').checked;
          const autoCleanupDays = document.getElementById('autoCleanupDays').value;
          const fd = new FormData();
          fd.append('siteName', siteName);
          fd.append('enableRegister', enableRegister);
          fd.append('autoApproveOrder', autoApproveOrder);
          fd.append('enableTrial', enableTrial);
          fd.append('trialDays', trialDays);
          fd.append('requireInviteCode', requireInviteCode);
          fd.append('pendingOrderExpiry', pendingOrderExpiry);
          fd.append('paymentOrderExpiry', paymentOrderExpiry);
          fd.append('customLink1Name', customLink1Name);
          fd.append('customLink1Url', customLink1Url);
          fd.append('customLink2Name', customLink2Name);
          fd.append('customLink2Url', customLink2Url);
          fd.append('enableAutoCleanup', enableAutoCleanup);
          fd.append('autoCleanupDays', autoCleanupDays);
          
          // 更新试用天数选择器的禁用状态
          const autoCleanupDaysInput = document.getElementById('autoCleanupDays');
          if (autoCleanupDaysInput) {
            autoCleanupDaysInput.parentElement.parentElement.style.opacity = enableAutoCleanup ? '1' : '0.5';
            autoCleanupDaysInput.parentElement.parentElement.style.pointerEvents = enableAutoCleanup ? 'auto' : 'none';
          }
          const trialDaysSelect = document.getElementById('trialDays');
          if (trialDaysSelect) {
            trialDaysSelect.parentElement.style.opacity = enableTrial ? '1' : '0.5';
            trialDaysSelect.parentElement.style.pointerEvents = enableTrial ? 'auto' : 'none';
          }
          
          try {
            const res = await fetch('/api/admin/updateSystemSettings', { method: 'POST', body: fd });
            if(res.ok) {
              toast('✅ 设置已更新');
            } else {
              toast('❌ 更新失败');
            }
          } catch(e) {
            toast('❌ 网络错误');
          }
        }
        
        // 公告管理功能
        async function loadAnnouncements() {
          try {
            const res = await fetch('/api/admin/announcements');
            const data = await res.json();
            if(!data.success) return;
            
            const container = document.getElementById('announcementsList');
            if(!container) return;
            
            if(data.announcements.length === 0) {
              container.innerHTML = '<p style="text-align:center;color:#999;padding:40px 0;">暂无公告，点击右上角添加</p>';
              return;
            }
            
            let html = '<div style="overflow-x:auto;"><table style="width:100%;min-width:800px;"><thead><tr><th width="50">#</th><th width="80">显示</th><th>标题</th><th width="150">创建时间</th><th width="150">操作</th></tr></thead><tbody>';
            
            data.announcements.forEach((item, index) => {
              const createdDate = formatBeijingDateTime(item.created_at);
              const statusColor = item.enabled ? '#52c41a' : '#d9d9d9';
              const statusText = item.enabled ? '已启用' : '已禁用';
              
              html += '<tr>';
              html += '<td>' + (index + 1) + '</td>';
              html += '<td><span style="display:inline-block;padding:4px 12px;background:' + statusColor + ';color:white;border-radius:12px;font-size:12px;">' + statusText + '</span></td>';
              html += '<td style="font-weight:500;">' + escapeHtml(item.title) + '</td>';
              html += '<td style="color:#999;">' + createdDate + '</td>';
              html += '<td><button onclick="editAnnouncement(' + item.id + ')" class="btn-action btn-edit">编辑</button> ';
              html += '<button onclick="deleteAnnouncement(' + item.id + ')" class="btn-action btn-del">删除</button></td>';
              html += '</tr>';
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
          } catch(e) {
            console.error('加载公告失败:', e);
          }
        }
        
        function openAddAnnouncement() {
          document.getElementById('announcementModalTitle').innerText = '添加公告';
          document.getElementById('editAnnouncementId').value = '';
          document.getElementById('editAnnouncementTitle').value = '';
          document.getElementById('editAnnouncementContent').value = '';
          document.getElementById('editAnnouncementEnabled').checked = true;
          document.getElementById('editAnnouncementCharCount').innerText = '0';
          document.getElementById('editAnnouncementModal').style.display = 'flex';
        }
        
        async function editAnnouncement(id) {
          try {
            const res = await fetch('/api/admin/announcements/' + id);
            const data = await res.json();
            if(!data.success) return alert('获取公告失败');
            
            const item = data.announcement;
            document.getElementById('announcementModalTitle').innerText = '编辑公告';
            document.getElementById('editAnnouncementId').value = item.id;
            document.getElementById('editAnnouncementTitle').value = item.title;
            document.getElementById('editAnnouncementContent').value = item.content;
            document.getElementById('editAnnouncementEnabled').checked = item.enabled === 1;
            document.getElementById('editAnnouncementCharCount').innerText = item.content.length;
            document.getElementById('editAnnouncementModal').style.display = 'flex';
          } catch(e) {
            alert('获取公告失败: ' + e.message);
          }
        }
        
        function closeAnnouncementEdit() {
          document.getElementById('editAnnouncementModal').style.display = 'none';
        }
        
        async function saveAnnouncementEdit() {
          const id = document.getElementById('editAnnouncementId').value;
          const title = document.getElementById('editAnnouncementTitle').value.trim();
          const content = document.getElementById('editAnnouncementContent').value.trim();
          const enabled = document.getElementById('editAnnouncementEnabled').checked;
          
          if(!title || !content) return alert('请填写标题和内容');
          
          const btn = document.getElementById('editAnnouncementSaveBtn');
          btn.disabled = true;
          btn.innerText = '保存中...';
          
          const form = new FormData();
          if(id) form.append('id', id);
          form.append('title', title);
          form.append('content', content);
          form.append('enabled', enabled ? '1' : '0');
          
          try {
            const url = id ? '/api/admin/announcements/update' : '/api/admin/announcements/create';
            const res = await fetch(url, { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast('✅ ' + (id ? '更新成功' : '添加成功'));
              closeAnnouncementEdit();
              loadAnnouncements();
            } else {
              alert((id ? '更新' : '添加') + '失败: ' + result.error);
            }
          } catch(e) {
            alert('操作失败: ' + e.message);
          } finally {
            btn.disabled = false;
            btn.innerText = '保存';
          }
        }
        
        async function deleteAnnouncement(id) {
          if(!confirm('确定要删除此公告吗？')) return;
          
          const form = new FormData();
          form.append('id', id);
          
          try {
            const res = await fetch('/api/admin/announcements/delete', { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast('✅ 删除成功');
              loadAnnouncements();
            } else {
              alert('删除失败: ' + result.error);
            }
          } catch(e) {
            alert('删除失败: ' + e.message);
          }
        }
        
        // 监听公告内容输入，更新字符计数
        document.addEventListener('DOMContentLoaded', function() {
          const content = document.getElementById('editAnnouncementContent');
          if(content) {
            content.addEventListener('input', function() {
              document.getElementById('editAnnouncementCharCount').innerText = this.value.length;
            });
          }
        });
        
        async function saveSettings() {
          // 获取所有保存按钮，动态更新状态
          const saveProxyBtn = document.getElementById('saveProxyBtn');
          const saveDomainBtn = document.getElementById('saveDomainBtn');
          
          // 禁用所有保存按钮并显示加载状态
          if (saveProxyBtn) { saveProxyBtn.innerText = '保存中...'; saveProxyBtn.disabled = true; }
          if (saveDomainBtn) { saveDomainBtn.innerText = '保存中...'; saveDomainBtn.disabled = true; }
          
          // 前端预检查：统计每条线路的IP数量
          const lineStats = {};
          let hasOverLimit = false;
          
          bestDomains.forEach(domain => {
            const autoMatch = domain.match(/^(\\[?[0-9a-fA-F:.]+\\]?):443#(v4|v6)(\\u79fb\\u52a8|\\u8054\\u901a|\\u7535\\u4fe1|\\u94c1\\u901a|\\u5e7f\\u7535)\\s+[A-Z]{3}$/);
            if (autoMatch) {
              const [, , ver, line] = autoMatch;
              const lineKey = line + '_' + ver;
              lineStats[lineKey] = (lineStats[lineKey] || 0) + 1;
              if (lineStats[lineKey] > 5) hasOverLimit = true;
            }
          });
          
          const fd = new FormData();
          fd.append('proxyIP', proxyIPs.join('\\n'));
          fd.append('bestDomains', bestDomains.join('\\n'));
          fd.append('subUrl', document.getElementById('subUrl').value);
          fd.append('websiteUrl', document.getElementById('websiteUrl').value);
          
          try { 
            const res = await fetch('/api/admin/saveSettings', { method: 'POST', body: fd }); 
            if(res.ok) {
              if (hasOverLimit) {
                toast('⚠️ 配置已保存（部分线路超出5个IP限制已自动截断）');
              } else {
                toast('✅ 配置已保存');
              }
            } else {
              toast('❌ 保存失败');
            }
          } catch(e) { 
            toast('❌ 网络错误'); 
          }
          
          // 恢复所有按钮状态
          if (saveProxyBtn) { saveProxyBtn.innerText = '保存配置'; saveProxyBtn.disabled = false; }
          if (saveDomainBtn) { saveDomainBtn.innerText = '保存配置'; saveDomainBtn.disabled = false; }
        }

        function addUser() { document.getElementById('addBtn').disabled=true; api('/api/admin/add', { name: document.getElementById('name').value, expiryDate: document.getElementById('expiryDate').value, uuids: document.getElementById('uuids').value, frontUsername: document.getElementById('frontUsername').value, frontPassword: document.getElementById('frontPassword').value }); }
        function saveUserEdit() { document.getElementById('editSaveBtn').disabled=true; api('/api/admin/update', { uuid: document.getElementById('editUuid').value, name: document.getElementById('editName').value, expiryDate: document.getElementById('editExpiryDate').value, newPassword: document.getElementById('editNewPassword').value }); }
        
        // 单个操作
        function toggleStatus(uuid, isEnable) { api('/api/admin/status', { uuids: uuid, enabled: isEnable ? 'true' : 'false' }); }
        function delUser(uuid) { if(confirm('确定删除此用户？')) api('/api/admin/delete', { uuids: uuid }); }
        
        // 批量操作
        function toggleSelectAll() { const master = document.getElementById('selectAll'); document.querySelectorAll('.u-check').forEach(c => c.checked = master.checked); updateBatchBar(); }
        document.addEventListener('change', (e) => { if(e.target.classList.contains('u-check')) updateBatchBar(); });
        function updateBatchBar() { const count = document.querySelectorAll('.u-check:checked').length; document.getElementById('selCount').innerText = count; const bar = document.getElementById('batchBar'); if(count>0) bar.classList.add('show'); else bar.classList.remove('show'); }
        function getSelectedUUIDs() { return Array.from(document.querySelectorAll('.u-check:checked')).map(c => c.value); }
        async function batchAction(action) {
            const uuids = getSelectedUUIDs(); if(uuids.length === 0) return;
            if(action === 'delete' && !confirm(\`确定删除 \${uuids.length} 个用户？\`)) return;
            await api(action === 'delete' ? '/api/admin/delete' : '/api/admin/status', { uuids: uuids.join(','), enabled: action === 'enable' ? 'true' : 'false' });
        }

        // 辅助功能
        function toggleDropdown(event, uuid) {
            event.stopPropagation();
            const dropdown = document.getElementById('dropdown-' + uuid);
            // 关闭所有其他下拉菜单
            document.querySelectorAll('.dropdown-content').forEach(d => {
                if (d.id !== 'dropdown-' + uuid) d.classList.remove('show');
            });
            dropdown.classList.toggle('show');
        }
        
        function copySubByType(uuid, type) {
            let domainInput = document.getElementById('subUrl').value.trim();
            if (!domainInput) return toast('❌ 请先配置订阅地址');
            // 支持多个地址用逗号分隔，随机选择一个
            const domainList = domainInput.split(',').map(d => d.trim()).filter(d => d);
            if (domainList.length === 0) return toast('❌ 请先配置订阅地址');
            let domain = domainList[Math.floor(Math.random() * domainList.length)];
            if (domain.endsWith('/')) domain = domain.slice(0, -1);
            if (!domain.startsWith('http')) domain = 'https://' + domain;
            const originalUrl = domain + '/' + uuid;
            
            let finalUrl, clientName, schemeUrl;
            
            if (type === 'original') {
                finalUrl = originalUrl;
                clientName = '原始订阅';
                schemeUrl = originalUrl;
            } else {
                const clientNames = {
                    'clash': 'Clash',
                    'surge': 'Surge',
                    'shadowrocket': 'Shadowrocket',
                    'quanx': 'Quantumult X',
                    'v2ray': 'V2Ray',
                    'surfboard': 'Surfboard',
                    'singbox': 'SingBox'
                };
                const schemeMap = {
                    'clash': 'clash://install-config?url=',
                    'surge': 'surge:///install-config?url=',
                    'shadowrocket': 'shadowrocket://add/',
                    'quanx': 'quantumult-x:///add-resource?remote-resource=',
                    'v2ray': 'v2rayn://install-config?url=',
                    'surfboard': 'surfboard:///install-config?url=',
                    'singbox': 'sing-box://import-remote-profile?url='
                };
                const targetMap = {
                    'clash': 'clash',
                    'surge': 'surge',
                    'shadowrocket': 'shadowrocket',
                    'quanx': 'quanx',
                    'v2ray': 'v2ray',
                    'surfboard': 'surfboard',
                    'singbox': 'singbox'
                };
                finalUrl = apiBaseUrl + '?target=' + targetMap[type] + '&url=' + encodeURIComponent(originalUrl);
                clientName = clientNames[type];
                schemeUrl = schemeMap[type] + encodeURIComponent(finalUrl);
            }
            
            navigator.clipboard.writeText(finalUrl).then(() => {
                toast('✅ ' + clientName + ' 订阅已复制');
                document.getElementById('dropdown-' + uuid).classList.remove('show');
            }).catch(() => toast('❌ 复制失败'));
        }
        
        // 点击页面其他地方关闭下拉菜单
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        });
        function openEdit(uuid, name, exp) { 
          document.getElementById('editUuid').value=uuid; 
          document.getElementById('editUuidDisplay').value=uuid; 
          document.getElementById('editName').value=name; 
          document.getElementById('editExpiryDate').value=exp; 
          document.getElementById('editNewPassword').value=''; 
          document.getElementById('editModal').style.display='flex'; 
          // 加载关联的前端账号信息
          document.getElementById('editAccountInfo').innerHTML = '加载中...';
          fetch('/api/admin/getUserAccount?uuid=' + encodeURIComponent(uuid))
            .then(r => r.json())
            .then(data => {
              if(data.success && data.account) {
                document.getElementById('editAccountInfo').innerHTML = '👤 关联账号：<b>' + data.account.username + '</b>';
              } else {
                document.getElementById('editAccountInfo').innerHTML = '⚠️ 该用户暂无关联的前端账号';
              }
            })
            .catch(() => {
              document.getElementById('editAccountInfo').innerHTML = '❌ 加载账号信息失败';
            });
        }
        function closeEdit() { document.getElementById('editModal').style.display='none'; }
        function copy(t) { navigator.clipboard.writeText(t); toast('复制成功'); }

        // 数据清洗
        async function migrateData() {
            if(!confirm('确认将旧 KV 数据导入到 D1 数据库？(仅首次迁移使用)')) return;
            const res = await fetch('/api/admin/migrate', { method: 'POST' });
            if(res.ok) {
                const msg = await res.text();
                alert(msg);
                location.reload();
            } else {
                const err = await res.text();
                alert('操作失败: ' + err);
            }
        }

        // 切换功能区
        function switchSection(sectionName) {
          // 隐藏所有section
          document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
          // 显示目标section
          document.getElementById('section-' + sectionName).classList.add('active');
          
          // 更新菜单状态
          document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
          // 通过data属性找到对应的菜单项并激活
          document.querySelectorAll('.menu-item').forEach(item => {
            if(item.getAttribute('data-section') === sectionName) {
              item.classList.add('active');
            }
          });
          
          // 保存当前标签到localStorage
          localStorage.setItem('adminCurrentSection', sectionName);
          
          // 加载对应数据
          if(sectionName === 'plans') loadPlans();
          if(sectionName === 'orders') loadOrders();
          if(sectionName === 'announcement') loadAnnouncements();
          if(sectionName === 'payment') loadPaymentChannels();
          
          // 移动端切换页面时关闭侧边栏
          if (window.innerWidth <= 768) {
            var sidebar = document.getElementById('admin-sidebar');
            var overlay = document.querySelector('.admin-sidebar-overlay');
            if(sidebar && sidebar.classList.contains('mobile-open')) {
              sidebar.classList.remove('mobile-open');
              overlay.classList.remove('show');
            }
          }
          
          // 滚动到顶部
          document.querySelector('.main-content').scrollTop = 0;
        }
        
        function toggleAdminSidebar() {
          var sidebar = document.getElementById('admin-sidebar');
          var overlay = document.querySelector('.admin-sidebar-overlay');
          sidebar.classList.toggle('mobile-open');
          overlay.classList.toggle('show');
        }
        
        // 页面加载时恢复上次的标签
        window.addEventListener('DOMContentLoaded', function() {
          const lastSection = localStorage.getItem('adminCurrentSection');
          if(lastSection && lastSection !== 'dashboard') {
            const menuItem = document.querySelector('[onclick*="' + lastSection + '"]');
            if(menuItem) {
              document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
              document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
              menuItem.classList.add('active');
              document.getElementById('section-' + lastSection).classList.add('active');
              if(lastSection === 'plans') loadPlans();
              if(lastSection === 'orders') loadOrders();
              if(lastSection === 'payment') loadPaymentChannels();
            }
          } else {
            // 首次访问时清除可能存在的旧状态
            localStorage.removeItem('adminCurrentSection');
          }
        });
        
        // 套餐管理功能
        function escapeHtml(str) {
          const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'": '&#39;'};
          return String(str).replace(/[&<>"']/g, function(m) { return map[m]; });
        }
        
        async function loadPlans() {
          try {
            const res = await fetch('/api/admin/plans');
            const data = await res.json();
            if(!data.success) return;
            
            const container = document.getElementById('plansList');
            if(data.plans.length === 0) {
              container.innerHTML = '<p style="text-align:center;color:#999;">暂无套餐</p>';
              return;
            }
            
            var html = '';
            for(var i = 0; i < data.plans.length; i++) {
              var p = data.plans[i];
              var name = escapeHtml(p.name);
              var desc = escapeHtml(p.description || '\u65e0\u63cf\u8ff0');
              var bgColor = p.enabled ? '#52c41a' : '#ff9500';
              var statusText = p.enabled ? '\u5df2\u4e0a\u67b6' : '\u5df2\u4e0b\u67b6';
              var btnText = p.enabled ? '\u4e0b\u67b6' : '\u4e0a\u67b6';
              var btnColor = p.enabled ? '#ff9500' : '#52c41a';
              var enabledNum = p.enabled ? 1 : 0;
              
              html += '<div class="user-row" style="padding:15px;margin-bottom:10px;" data-plan-id="' + p.id + '" data-plan-name="' + escapeHtml(p.name) + '" data-plan-duration="' + p.duration_days + '" data-plan-desc="' + escapeHtml(p.description || '') + '" data-plan-price="' + (p.price || 0) + '">';
              html += '<div style="flex:1;">';
              html += '<strong style="font-size:16px;">' + name + '</strong>';
              html += '<p style="color:#666;font-size:13px;margin:5px 0;">' + desc + '</p>';
              html += '<div style="margin-top:8px;">';
              html += '<span class="badge" style="background:' + bgColor + ';">' + statusText + '</span>';
              html += '<span class="badge" style="background:#1890ff;margin-left:5px;">' + p.duration_days + '\u5929</span>';
              html += '<span style="margin-left:10px;font-size:15px;color:#ff4d4f;font-weight:600;">\uffe5' + (p.price || 0) + '</span>';
              html += '</div>';
              html += '</div>';
              html += '<div class="user-actions">';
              html += '<button onclick="openPlanEditFromRow(this)" class="btn-primary" style="padding:5px 12px;background:#faad14;">\u7f16\u8f91</button>';
              html += '<button onclick="togglePlan(' + p.id + ', ' + enabledNum + ')" class="btn-primary" style="padding:5px 12px;background:' + btnColor + ';">' + btnText + '</button>';
              html += '<button onclick="deletePlan(' + p.id + ')" class="btn-primary" style="padding:5px 12px;background:#ff4d4f;">\u5220\u9664</button>';
              html += '</div>';
              html += '</div>';
            }
            container.innerHTML = html;
          } catch(e) {
            console.error('加载套餐失败:', e);
          }
        }
        
        async function addPlan() {
          const name = document.getElementById('planName').value.trim();
          const duration = parseInt(document.getElementById('planDuration').value);
          const description = document.getElementById('planDescription').value.trim();
          const price = parseFloat(document.getElementById('planPrice').value) || 0;
          
          if(!name || !duration || duration <= 0) return alert('请填写套餐名称和时长');
          
          const form = new FormData();
          form.append('name', name);
          form.append('duration_days', duration);
          form.append('description', description);
          form.append('price', price);
          
          try {
            const res = await fetch('/api/admin/plans/create', { method: 'POST', body: form });
            const result = await res.json();
            if(res.ok && result.success) {
              document.getElementById('planName').value = '';
              document.getElementById('planDuration').value = '';
              document.getElementById('planDescription').value = '';
              document.getElementById('planPrice').value = '';
              toast('✅ 套餐创建成功');
              loadPlans();
            } else {
              alert('创建失败: ' + result.error);
            }
          } catch(e) {
            alert('创建失败: ' + e.message);
          }
        }
        
        async function togglePlan(id, currentEnabled) {
          const form = new FormData();
          form.append('id', id);
          form.append('enabled', currentEnabled ? 'false' : 'true');
          
          try {
            const res = await fetch('/api/admin/plans/toggle', { method: 'POST', body: form });
            const result = await res.json();
            if(res.ok && result.success) {
              toast('✅ 操作成功');
              loadPlans();
            } else {
              alert('操作失败: ' + result.error);
            }
          } catch(e) {
            alert('操作失败: ' + e.message);
          }
        }
        
        async function deletePlan(id) {
          if(!confirm('确定删除此套餐？')) return;
          
          const form = new FormData();
          form.append('id', id);
          
          try {
            const res = await fetch('/api/admin/plans/delete', { method: 'POST', body: form });
            const result = await res.json();
            if(res.ok && result.success) {
              toast('✅ 删除成功');
              loadPlans();
            } else {
              alert('删除失败: ' + result.error);
            }
          } catch(e) {
            alert('删除失败: ' + e.message);
          }
        }
        
        // 套餐编辑功能
        function openPlanEdit(id, name, duration, description, price) {
          document.getElementById('editPlanId').value = id;
          document.getElementById('editPlanName').value = name;
          document.getElementById('editPlanDuration').value = duration;
          document.getElementById('editPlanDescription').value = description;
          document.getElementById('editPlanPrice').value = price;
          document.getElementById('editPlanModal').style.display = 'flex';
        }
        
        // 从按钮的父元素中读取套餐数据
        function openPlanEditFromRow(button) {
          const row = button.closest('[data-plan-id]');
          if (!row) return;
          
          const id = row.getAttribute('data-plan-id');
          const name = row.getAttribute('data-plan-name');
          const duration = row.getAttribute('data-plan-duration');
          const desc = row.getAttribute('data-plan-desc');
          const price = row.getAttribute('data-plan-price');
          
          openPlanEdit(id, name, duration, desc, price);
        }
        
        function closePlanEdit() {
          document.getElementById('editPlanModal').style.display = 'none';
        }
        
        async function savePlanEdit() {
          const id = document.getElementById('editPlanId').value;
          const name = document.getElementById('editPlanName').value.trim();
          const duration = parseInt(document.getElementById('editPlanDuration').value);
          const description = document.getElementById('editPlanDescription').value.trim();
          const price = parseFloat(document.getElementById('editPlanPrice').value) || 0;
          
          if(!name || !duration || duration <= 0) {
            alert('请填写套餐名称和有效时长');
            return;
          }
          
          const btn = document.getElementById('editPlanSaveBtn');
          btn.disabled = true;
          btn.innerText = '保存中...';
          
          const form = new FormData();
          form.append('id', id);
          form.append('name', name);
          form.append('duration_days', duration);
          form.append('description', description);
          form.append('price', price);
          
          try {
            const res = await fetch('/api/admin/plans/update', { method: 'POST', body: form });
            const result = await res.json();
            if(res.ok && result.success) {
              toast('✅ 套餐更新成功');
              closePlanEdit();
              loadPlans();
            } else {
              alert('更新失败: ' + result.error);
            }
          } catch(e) {
            alert('更新失败: ' + e.message);
          } finally {
            btn.disabled = false;
            btn.innerText = '保存';
          }
        }
        
        // 订单管理功能
        async function loadOrders() {
          try {
            const res = await fetch('/api/admin/orders');
            const data = await res.json();
            if(!data.success) return;
            
            const container = document.getElementById('ordersList');
            const filterSelect = document.getElementById('orderStatusFilter');
            const statusFilter = filterSelect ? filterSelect.value : 'pending';
            
            // 根据状态筛选订单
            let filteredOrders = data.orders;
            if(statusFilter !== 'all') {
              filteredOrders = data.orders.filter(o => o.status === statusFilter);
            }
            
            // 隐藏批量操作栏
            document.getElementById('orderBatchBar').style.display = 'none';
            document.getElementById('orderSelCount').innerText = '0';
            
            if(filteredOrders.length === 0) {
              const statusText = {'pending': '待审核', 'approved': '已通过', 'rejected': '已拒绝', 'expired': '已过期', 'all': ''}[statusFilter];
              container.innerHTML = '<p style="text-align:center;color:#999;">暂无' + statusText + '订单</p>';
              return;
            }
            
            // 检查是否有待审核订单（只有待审核才显示复选框）
            const hasPending = statusFilter === 'pending' || (statusFilter === 'all' && filteredOrders.some(o => o.status === 'pending'));
            
            var html = '<table style="width:100%;"><thead><tr>';
            if(hasPending) {
              html += '<th width="40"><input type="checkbox" id="orderSelectAll" onclick="toggleOrderSelectAll()"></th>';
            }
            html += '<th>ID</th><th>用户</th><th>套餐</th><th>金额</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead><tbody>';
            
            for(var i = 0; i < filteredOrders.length; i++) {
              var o = filteredOrders[i];
              var username = escapeHtml(o.username);
              var planName = escapeHtml(o.plan_name);
              var createTime = formatBeijingDateTime(o.created_at);
              
              var statusBadge = '';
              var actions = '';
              var checkbox = '';
              
              if(o.status === 'pending') {
                statusBadge = '<span class="badge" style="background:#faad14;">待审核</span>';
                if(o.expires_at) {
                  var remaining = o.expires_at - Date.now();
                  if(remaining > 0) {
                    var mins = Math.floor(remaining / 60000);
                    var hours = Math.floor(mins / 60);
                    if(hours > 0) {
                      statusBadge += ' <span style="color:#999;font-size:12px;">(' + hours + '小时后过期)</span>';
                    } else {
                      statusBadge += ' <span style="color:#ff4d4f;font-size:12px;">(' + mins + '分钟后过期)</span>';
                    }
                  }
                }
                checkbox = '<input type="checkbox" class="order-checkbox" value="' + o.id + '" onchange="updateOrderSelection()">';
                actions = '<button onclick="approveOrder(' + o.id + ')" class="btn-action" style="background:#52c41a;">通过</button> ' +
                          '<button onclick="rejectOrder(' + o.id + ')" class="btn-action btn-del">拒绝</button>';
              } else if(o.status === 'approved') {
                statusBadge = '<span class="badge" style="background:#52c41a;">已通过</span>';
                actions = '<span style="color:#999;">-</span>';
              } else if(o.status === 'rejected') {
                statusBadge = '<span class="badge" style="background:#ff4d4f;">已拒绝</span>';
                actions = '<span style="color:#999;">-</span>';
              } else if(o.status === 'expired') {
                statusBadge = '<span class="badge" style="background:#999;">已过期</span>';
                actions = '<span style="color:#999;">-</span>';
              }
              
              html += '<tr>';
              if(hasPending) {
                html += '<td>' + checkbox + '</td>';
              }
              html += '<td>#' + o.id + '</td>';
              html += '<td>' + username + '</td>';
              html += '<td>' + planName + ' (' + o.duration_days + '天)</td>';
              html += '<td>¥' + (o.amount || 0) + '</td>';
              html += '<td>' + createTime + '</td>';
              html += '<td>' + statusBadge + '</td>';
              html += '<td>' + actions + '</td>';
              html += '</tr>';
            }
            html += '</tbody></table>';
            container.innerHTML = html;
          } catch(e) {
            console.error('加载订单失败:', e);
          }
        }
        
        function toggleOrderSelectAll() {
          const selectAll = document.getElementById('orderSelectAll');
          const checkboxes = document.querySelectorAll('.order-checkbox');
          checkboxes.forEach(cb => cb.checked = selectAll.checked);
          updateOrderSelection();
        }
        
        function updateOrderSelection() {
          const checkboxes = document.querySelectorAll('.order-checkbox:checked');
          const count = checkboxes.length;
          document.getElementById('orderSelCount').innerText = count;
          document.getElementById('orderBatchBar').style.display = count > 0 ? 'flex' : 'none';
          
          // 更新全选框状态
          const allCheckboxes = document.querySelectorAll('.order-checkbox');
          const selectAll = document.getElementById('orderSelectAll');
          if(selectAll) {
            selectAll.checked = allCheckboxes.length > 0 && checkboxes.length === allCheckboxes.length;
          }
        }
        
        async function batchOrderAction(action) {
          const checkboxes = document.querySelectorAll('.order-checkbox:checked');
          if(checkboxes.length === 0) {
            toast('请先选择订单');
            return;
          }
          
          const actionText = action === 'approve' ? '通过' : '拒绝';
          if(!confirm('确定要批量' + actionText + ' ' + checkboxes.length + ' 个订单吗？')) return;
          
          const orderIds = Array.from(checkboxes).map(cb => cb.value);
          let successCount = 0;
          let failCount = 0;
          
          for(const orderId of orderIds) {
            try {
              const form = new FormData();
              form.append('order_id', orderId);
              const endpoint = action === 'approve' ? '/api/admin/orders/approve' : '/api/admin/orders/reject';
              const res = await fetch(endpoint, { method: 'POST', body: form });
              const result = await res.json();
              if(res.ok && result.success) {
                successCount++;
              } else {
                failCount++;
              }
            } catch(e) {
              failCount++;
            }
          }
          
          toast('✅ 成功' + actionText + ' ' + successCount + ' 个' + (failCount > 0 ? '，失败 ' + failCount + ' 个' : ''));
          loadOrders();
        }
        
        async function approveOrder(orderId) {
          if(!confirm('确定通过此订单？')) return;
          
          const form = new FormData();
          form.append('order_id', orderId);
          
          try {
            const res = await fetch('/api/admin/orders/approve', { method: 'POST', body: form });
            const result = await res.json();
            if(res.ok && result.success) {
              toast('✅ 订单已通过');
              loadOrders();
            } else {
              alert('操作失败: ' + result.error);
            }
          } catch(e) {
            alert('操作失败: ' + e.message);
          }
        }
        
        async function rejectOrder(orderId) {
          if(!confirm('确定拒绝此订单？')) return;
          
          const form = new FormData();
          form.append('order_id', orderId);
          
          try {
            const res = await fetch('/api/admin/orders/reject', { method: 'POST', body: form });
            const result = await res.json();
            if(res.ok && result.success) {
              toast('✅ 订单已拒绝');
              loadOrders();
            } else {
              alert('操作失败: ' + result.error);
            }
          } catch(e) {
            alert('操作失败: ' + e.message);
          }
        }
        
        // ==================== 支付通道管理 ====================
        
        async function loadPaymentChannels() {
          try {
            const res = await fetch('/api/admin/payment/channels');
            const data = await res.json();
            
            const container = document.getElementById('paymentChannelsList');
            if(!data.success || !data.data || data.data.length === 0) {
              container.innerHTML = '<p style="text-align:center;color:#999;">暂无支付通道，请添加</p>';
              return;
            }
            
            var html = '<table style="width:100%;"><thead><tr><th>ID</th><th>名称</th><th>代码</th><th>API 地址</th><th>状态</th><th>操作</th></tr></thead><tbody>';
            for(var i = 0; i < data.data.length; i++) {
              var c = data.data[i];
              var statusBadge = c.enabled ? '<span class="badge" style="background:#52c41a;">启用</span>' : '<span class="badge" style="background:#999;">禁用</span>';
              var toggleBtn = c.enabled 
                ? '<button onclick="togglePaymentChannel(' + c.id + ', false)" class="btn-action" style="background:#ff9500;">禁用</button>'
                : '<button onclick="togglePaymentChannel(' + c.id + ', true)" class="btn-action" style="background:#52c41a;">启用</button>';
              
              html += '<tr>';
              html += '<td>' + c.id + '</td>';
              html += '<td>' + escapeHtml(c.name) + '</td>';
              html += '<td><code>' + escapeHtml(c.code) + '</code></td>';
              html += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(c.api_url) + '</td>';
              html += '<td>' + statusBadge + '</td>';
              html += '<td>' + toggleBtn + ' <button onclick="editPaymentChannel(' + c.id + ', decodeURIComponent(&#39;' + encodeURIComponent(c.name) + '&#39;), decodeURIComponent(&#39;' + encodeURIComponent(c.code) + '&#39;), decodeURIComponent(&#39;' + encodeURIComponent(c.api_url) + '&#39;))" class="btn-action" style="background:#1890ff;">编辑</button> <button onclick="deletePaymentChannel(' + c.id + ')" class="btn-action btn-del">删除</button></td>';
              html += '</tr>';
            }
            html += '</tbody></table>';
            container.innerHTML = html;
          } catch(e) {
            console.error('加载支付通道失败:', e);
          }
        }
        
        async function savePaymentChannel() {
          const name = document.getElementById('payChannelName').value.trim();
          const code = document.getElementById('payChannelCode').value.trim();
          const apiUrl = document.getElementById('payChannelApiUrl').value.trim();
          const apiToken = document.getElementById('payChannelApiToken').value.trim();
          
          if(!name || !code || !apiUrl || !apiToken) {
            alert('请填写所有字段');
            return;
          }
          
          const form = new FormData();
          form.append('name', name);
          form.append('code', code);
          form.append('api_url', apiUrl);
          form.append('api_token', apiToken);
          
          try {
            const res = await fetch('/api/admin/payment/channels/save', { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast('✅ 支付通道已添加');
              document.getElementById('payChannelName').value = '';
              document.getElementById('payChannelCode').value = '';
              document.getElementById('payChannelApiUrl').value = '';
              document.getElementById('payChannelApiToken').value = '';
              loadPaymentChannels();
            } else {
              alert('添加失败: ' + (result.error || '未知错误'));
            }
          } catch(e) {
            alert('添加失败: ' + e.message);
          }
        }
        
        async function togglePaymentChannel(id, enabled) {
          const form = new FormData();
          form.append('id', id);
          form.append('enabled', enabled);
          
          try {
            const res = await fetch('/api/admin/payment/channels/toggle', { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast(enabled ? '✅ 已启用' : '✅ 已禁用');
              loadPaymentChannels();
            } else {
              alert('操作失败');
            }
          } catch(e) {
            alert('操作失败: ' + e.message);
          }
        }
        
        async function deletePaymentChannel(id) {
          if(!confirm('确定删除此支付通道？')) return;
          
          const form = new FormData();
          form.append('id', id);
          
          try {
            const res = await fetch('/api/admin/payment/channels/delete', { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast('✅ 已删除');
              loadPaymentChannels();
            } else {
              alert('删除失败');
            }
          } catch(e) {
            alert('删除失败: ' + e.message);
          }
        }
        
        // 编辑支付通道
        function editPaymentChannel(id, name, code, apiUrl) {
          var modal = document.createElement('div');
          modal.id = 'editChannelModal';
          modal.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1000;';
          modal.innerHTML = '<div style="background:white;padding:25px;border-radius:10px;width:90%;max-width:500px;box-shadow:0 4px 20px rgba(0,0,0,0.2);">' +
            '<h3 style="margin:0 0 20px 0;">✏️ 编辑支付通道</h3>' +
            '<div style="margin-bottom:15px;"><label style="display:block;margin-bottom:5px;font-weight:500;">通道名称</label><input type="text" id="editChannelName" value="' + name + '" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;box-sizing:border-box;"></div>' +
            '<div style="margin-bottom:15px;"><label style="display:block;margin-bottom:5px;font-weight:500;">通道代码</label><input type="text" id="editChannelCode" value="' + code + '" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;box-sizing:border-box;"></div>' +
            '<div style="margin-bottom:15px;"><label style="display:block;margin-bottom:5px;font-weight:500;">API 地址</label><input type="text" id="editChannelApiUrl" value="' + apiUrl + '" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;box-sizing:border-box;"></div>' +
            '<div style="margin-bottom:15px;"><label style="display:block;margin-bottom:5px;font-weight:500;">新 API Token (不修改请留空)</label><input type="password" id="editChannelApiToken" placeholder="留空则不修改" style="width:100%;padding:8px;border:1px solid #d9d9d9;border-radius:4px;box-sizing:border-box;"></div>' +
            '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
            '<button onclick="closeEditChannelModal()" style="padding:8px 20px;background:#f0f0f0;border:none;border-radius:4px;cursor:pointer;">取消</button>' +
            '<button onclick="saveEditChannel(' + id + ')" style="padding:8px 20px;background:#1890ff;color:white;border:none;border-radius:4px;cursor:pointer;">保存</button>' +
            '</div></div>';
          document.body.appendChild(modal);
        }
        
        function closeEditChannelModal() {
          var modal = document.getElementById('editChannelModal');
          if(modal) modal.remove();
        }
        
        async function saveEditChannel(id) {
          const name = document.getElementById('editChannelName').value.trim();
          const code = document.getElementById('editChannelCode').value.trim();
          const apiUrl = document.getElementById('editChannelApiUrl').value.trim();
          const apiToken = document.getElementById('editChannelApiToken').value.trim();
          
          if(!name || !code || !apiUrl) {
            alert('名称、代码、API地址不能为空');
            return;
          }
          
          const form = new FormData();
          form.append('id', id);
          form.append('name', name);
          form.append('code', code);
          form.append('api_url', apiUrl);
          if(apiToken) form.append('api_token', apiToken);
          
          try {
            const res = await fetch('/api/admin/payment/channels/update', { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast('✅ 修改成功');
              closeEditChannelModal();
              loadPaymentChannels();
            } else {
              alert('修改失败: ' + (result.error || '未知错误'));
            }
          } catch(e) {
            alert('修改失败: ' + e.message);
          }
        }
        
        // ==================== 邀请码管理 ====================
        async function loadInviteCodes() {
          try {
            const res = await fetch('/api/admin/invites');
            const data = await res.json();
            
            const container = document.getElementById('inviteCodesList');
            if(!container) return;
            
            if(!data.success || !data.invites || data.invites.length === 0) {
              container.innerHTML = '<p style="text-align:center;color:#999;padding:40px 0;">暂无邀请码</p>';
              return;
            }
            
            let html = '<div style="overflow-x:auto;"><table style="width:100%;min-width:700px;"><thead><tr><th>邀请码</th><th>可用/总数</th><th>赠送天数</th><th>备注</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead><tbody>';
            
            data.invites.forEach(item => {
              const createdDate = formatBeijingDateTime(item.created_at);
              const remaining = item.max_uses - item.used_count;
              const isActive = item.enabled && remaining > 0;
              const statusColor = isActive ? '#52c41a' : '#d9d9d9';
              const statusText = !item.enabled ? '已禁用' : (remaining <= 0 ? '已用完' : '可用');
              
              html += '<tr>';
              html += '<td style="font-family:monospace;font-weight:600;cursor:pointer;" onclick="copy(decodeURIComponent(&#39;' + encodeURIComponent(item.code || '') + '&#39;))">' + item.code + ' 📋</td>';
              html += '<td>' + remaining + ' / ' + item.max_uses + '</td>';
              html += '<td>' + (item.trial_days > 0 ? item.trial_days + '天' : '-') + '</td>';
              html += '<td style="color:#666;">' + (item.remark || '-') + '</td>';
              html += '<td style="color:#999;font-size:13px;">' + createdDate + '</td>';
              html += '<td><span style="display:inline-block;padding:4px 12px;background:' + statusColor + ';color:white;border-radius:12px;font-size:12px;">' + statusText + '</span></td>';
              html += '<td>';
              if(item.enabled) {
                html += '<button onclick="toggleInviteCode(' + item.id + ', false)" class="btn-action btn-secondary" style="margin-right:5px;">禁用</button>';
              } else {
                html += '<button onclick="toggleInviteCode(' + item.id + ', true)" class="btn-action btn-success" style="margin-right:5px;">启用</button>';
              }
              html += '<button onclick="editInviteCode(' + item.id + ', decodeURIComponent(&#39;' + encodeURIComponent(item.code || '') + '&#39;), ' + item.max_uses + ', ' + item.trial_days + ', decodeURIComponent(&#39;' + encodeURIComponent(item.remark || '') + '&#39;))" class="btn-action" style="margin-right:5px;background:#1890ff;">编辑</button>';
              html += '<button onclick="deleteInviteCode(' + item.id + ')" class="btn-action btn-del">删除</button>';
              html += '</td>';
              html += '</tr>';
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
          } catch(e) {
            console.error('加载邀请码失败:', e);
          }
        }
        
        async function createInviteCode() {
          const code = document.getElementById('inviteCode').value.trim();
          const maxUses = document.getElementById('inviteMaxUses').value || 1;
          const trialDays = document.getElementById('inviteTrialDays').value || 0;
          const remark = document.getElementById('inviteRemark').value.trim();
          
          const form = new FormData();
          if(code) form.append('code', code);
          form.append('max_uses', maxUses);
          form.append('trial_days', trialDays);
          if(remark) form.append('remark', remark);
          
          try {
            const res = await fetch('/api/admin/invites/create', { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast('✅ 邀请码已生成: ' + result.code);
              document.getElementById('inviteCode').value = '';
              document.getElementById('inviteMaxUses').value = '1';
              document.getElementById('inviteTrialDays').value = '0';
              document.getElementById('inviteRemark').value = '';
              loadInviteCodes();
            } else {
              alert('生成失败: ' + (result.error || '未知错误'));
            }
          } catch(e) {
            alert('生成失败: ' + e.message);
          }
        }
        
        async function toggleInviteCode(id, enabled) {
          const form = new FormData();
          form.append('id', id);
          form.append('enabled', enabled);
          
          try {
            const res = await fetch('/api/admin/invites/toggle', { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast(enabled ? '✅ 已启用' : '✅ 已禁用');
              loadInviteCodes();
            } else {
              alert('操作失败');
            }
          } catch(e) {
            alert('操作失败: ' + e.message);
          }
        }
        
        async function deleteInviteCode(id) {
          if(!confirm('确定删除此邀请码？')) return;
          
          const form = new FormData();
          form.append('id', id);
          
          try {
            const res = await fetch('/api/admin/invites/delete', { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast('✅ 已删除');
              loadInviteCodes();
            } else {
              alert('删除失败');
            }
          } catch(e) {
            alert('删除失败: ' + e.message);
          }
        }
        
        // 编辑邀请码
        function editInviteCode(id, code, maxUses, trialDays, remark) {
          document.getElementById('editInviteId').value = id;
          document.getElementById('editInviteCode').value = code;
          document.getElementById('editInviteMaxUses').value = maxUses;
          document.getElementById('editInviteTrialDays').value = trialDays;
          document.getElementById('editInviteRemark').value = remark;
          document.getElementById('editInviteModal').style.display = 'flex';
        }
        
        function closeEditInviteModal() {
          document.getElementById('editInviteModal').style.display = 'none';
        }
        
        async function saveInviteCode() {
          const id = document.getElementById('editInviteId').value;
          const code = document.getElementById('editInviteCode').value.trim();
          const maxUses = document.getElementById('editInviteMaxUses').value || 1;
          const trialDays = document.getElementById('editInviteTrialDays').value || 0;
          const remark = document.getElementById('editInviteRemark').value.trim();
          
          if(!code) {
            alert('邀请码不能为空');
            return;
          }
          
          const form = new FormData();
          form.append('id', id);
          form.append('code', code);
          form.append('max_uses', maxUses);
          form.append('trial_days', trialDays);
          form.append('remark', remark);
          
          try {
            const res = await fetch('/api/admin/invites/update', { method: 'POST', body: form });
            const result = await res.json();
            
            if(res.ok && result.success) {
              toast('✅ 保存成功');
              closeEditInviteModal();
              loadInviteCodes();
            } else {
              alert('保存失败: ' + (result.error || '未知错误'));
            }
          } catch(e) {
            alert('保存失败: ' + e.message);
          }
        }
        
        // 页面加载时初始化邀请码列表
        if(document.getElementById('inviteCodesList')) {
          loadInviteCodes();
        }
        
        // 管理员登出
        async function adminLogout() {
          if(!confirm('确定要退出登录吗？')) return;
          
          // 清除保存的标签状态
          localStorage.removeItem('adminCurrentSection');
          
          try {
            const res = await fetch('/api/admin/logout', { method: 'POST' });
            const result = await res.json();
            
            if(res.ok && result.success) {
              window.location.href = result.redirect;
            } else {
              toast('❌ 退出失败');
            }
          } catch(e) {
            toast('❌ 网络错误');
          }
        }
        
        // 管理员修改密码
        async function changeAdminPassword() {
          const oldPassword = document.getElementById('adminOldPassword').value.trim();
          const newPassword = document.getElementById('adminNewPassword').value.trim();
          const confirmPassword = document.getElementById('adminConfirmPassword').value.trim();

          if (!oldPassword || !newPassword || !confirmPassword) {
            toast('❌ 请填写所有字段');
            return;
          }

          if (newPassword !== confirmPassword) {
            toast('❌ 两次输入的新密码不一致');
            return;
          }

          if (newPassword.length < 6) {
            toast('❌ 新密码长度至少6位');
            return;
          }

          try {
            const fd = new FormData();
            fd.append('oldPassword', oldPassword);
            fd.append('newPassword', newPassword);

            const res = await fetch('/api/admin/changePassword', { method: 'POST', body: fd });
            const result = await res.json();

            if (res.ok && result.success) {
              toast('✅ 密码修改成功，请重新登录');
              setTimeout(() => {
                window.location.href = result.redirect;
              }, 2000);
            } else {
              toast('❌ ' + (result.error || '修改失败'));
            }
          } catch (e) {
            toast('❌ 网络错误');
          }

          // 清空输入框
          document.getElementById('adminOldPassword').value = '';
          document.getElementById('adminNewPassword').value = '';
          document.getElementById('adminConfirmPassword').value = '';
        }
        
        // 移动端侧边栏切换
        function toggleAdminSidebar() {
          var sidebar = document.getElementById('admin-sidebar');
          var overlay = document.querySelector('.admin-sidebar-overlay');
          if(sidebar && overlay) {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('show');
          }
        }
        
        // 初始化渲染
        renderList('ProxyIP'); renderList('BestDomain');
      </script>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// 渲染管理员登录页面
async function renderAdminLoginPage(env, adminPath) {
    const settings = await dbGetSettings(env) || {};
    const siteName = settings.siteName || "CFly";
    const adminUsername = env.ADMIN_USERNAME || 'admin';
    return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理员登录</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
            padding: 40px;
        }
        h2 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #333;
            text-align: center;
        }
        .subtitle {
            color: #999;
            margin-bottom: 30px;
            font-size: 14px;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-size: 14px;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e1e8ed;
            border-radius: 10px;
            font-size: 14px;
            transition: all 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        button:active {
            transform: translateY(0);
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        .error {
            background: #fff1f0;
            border: 1px solid #ffccc7;
            color: #cf1322;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
        .error.show {
            display: block;
            animation: shake 0.3s;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 13px;
            color: #999;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div style="text-align:center;margin-bottom:20px;padding:15px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:8px;color:white;">
            <h2 style="margin:0 0 8px 0;font-size:20px;">⚡ ${siteName}</h2>
            <p style="margin:0;font-size:13px;opacity:0.9;">轻量级 VLESS 订阅管理系统</p>
        </div>
        <h2>🔐 管理员登录</h2>
        <p class="subtitle">登录管理后台</p>
        
        <div class="error" id="error"></div>
        
        <form id="login-form" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label>用户名</label>
                <input type="text" name="username" required placeholder="请输入管理员用户名" autocomplete="username">
            </div>
            <div class="form-group">
                <label>密码</label>
                <input type="password" name="password" required placeholder="请输入管理员密码" autocomplete="current-password">
            </div>
            <button type="submit" id="login-btn">登录</button>
        </form>
        
        <div class="footer">
            <a href="/">← 返回用户登录</a>
        </div>
    </div>

    <script>
        async function handleLogin(e) {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('login-btn');
            const errorDiv = document.getElementById('error');
            
            btn.disabled = true;
            btn.textContent = '登录中...';
            errorDiv.classList.remove('show');
            
            try {
                const formData = new FormData(form);
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    window.location.href = result.redirect || '${adminPath}';
                } else {
                    errorDiv.textContent = result.error || '登录失败';
                    errorDiv.classList.add('show');
                }
            } catch (error) {
                errorDiv.textContent = '网络错误，请稍后重试';
                errorDiv.classList.add('show');
            } finally {
                btn.disabled = false;
                btn.textContent = '登录';
            }
        }
    </script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// 用户前端面板处理
async function handleUserPanel(request, env) {
    const cookie = request.headers.get('Cookie');
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 检查用户登录状态
    let userSession = null;
    let userInfo = null;
    
    if (cookie) {
        const match = cookie.match(/user_session=([^;]+)/);
        if (match) {
            const session = await dbValidateSession(env, match[1]);
            if (session) {
                userSession = session;
                const user = await dbGetUserById(env, session.user_id);
                if (user) {
                    const uuidUser = await env.DB.prepare(
                        "SELECT * FROM users WHERE uuid = ?"
                    ).bind(user.uuid).first();
                    
                    const isExpired = uuidUser && uuidUser.expiry && uuidUser.expiry < Date.now();
                    const isEnabled = uuidUser && uuidUser.enabled === 1;
                    
                    userInfo = {
                        username: user.username,
                        email: user.email,
                        uuid: user.uuid,
                        createdAt: user.created_at,
                        lastLogin: user.last_login,
                        expiry: uuidUser ? uuidUser.expiry : null,
                        enabled: isEnabled,
                        expired: isExpired,
                        status: isExpired ? '已过期' : (!isEnabled ? '已禁用' : '正常')
                    };
                }
            }
        }
    }
    
    // 如果已登录，显示用户面板
    if (userSession && userInfo) {
        return renderUserDashboard(env, userInfo);
    }
    
    // 未登录，显示登录/注册页面
    return renderAuthPage(env);
}

// 渲染登录/注册页面
async function renderAuthPage(env) {
    const settings = await dbGetSettings(env) || { subUrl: "", enableRegister: false };
    const enableRegister = settings.enableRegister === true;
    const requireInviteCode = settings.requireInviteCode === true;
    const subUrl = settings.subUrl || "";
    const siteName = settings.siteName || "CFly";
    const adminPath = env.ADMIN_PATH || '/admin';
    
    return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VLESS 用户中心</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
            overflow: hidden;
        }
        .tabs {
            display: flex;
            background: #f8f9fa;
        }
        .tab {
            flex: 1;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 600;
            color: #666;
            border-bottom: 3px solid transparent;
        }
        .tab.active {
            color: #667eea;
            background: white;
            border-bottom-color: #667eea;
        }
        .tab:hover { background: white; }
        .form-container {
            padding: 40px;
        }
        .form-section {
            display: none;
        }
        .form-section.active {
            display: block;
            animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        h2 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #333;
        }
        .subtitle {
            color: #999;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-size: 14px;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e1e8ed;
            border-radius: 10px;
            font-size: 14px;
            transition: all 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        button:active {
            transform: translateY(0);
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        .error {
            background: #fff1f0;
            border: 1px solid #ffccc7;
            color: #cf1322;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
        .error.show {
            display: block;
            animation: shake 0.3s;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
        .success {
            background: #f6ffed;
            border: 1px solid #b7eb8f;
            color: #52c41a;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
        .success.show {
            display: block;
        }
        .footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            font-size: 13px;
            color: #999;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .register-disabled {
            background: #fff7e6;
            border: 1px solid #ffd591;
            color: #d46b08;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            font-size: 14px;
        }
        /* 移动端适配 */
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            .container {
                border-radius: 15px;
                max-width: 100%;
            }
            .form-container {
                padding: 25px 20px;
            }
            h2 {
                font-size: 24px;
            }
            .tab {
                padding: 15px 10px;
                font-size: 14px;
            }
            input {
                padding: 10px 12px;
                font-size: 14px;
            }
            button {
                padding: 12px;
                font-size: 15px;
            }
        }
        @media (max-width: 360px) {
            .form-container {
                padding: 20px 15px;
            }
            h2 {
                font-size: 22px;
            }
            .tab {
                padding: 12px 8px;
                font-size: 13px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="tabs">
            <div class="tab active" onclick="switchTab('login')">登录</div>
            <div class="tab" onclick="switchTab('register')">注册</div>
        </div>
        
        <div class="form-container">
            <!-- 登录表单 -->
            <div class="form-section active" id="login-section">
                <div style="text-align:center;margin-bottom:20px;padding:15px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:8px;color:white;">
                    <h2 style="margin:0 0 8px 0;font-size:20px;">⚡ ${siteName}</h2>
                    <p style="margin:0;font-size:13px;opacity:0.9;">轻量级 VLESS 订阅服务</p>
                </div>
                <h2>🔐 用户登录</h2>
                <p class="subtitle">登录您的账号以管理订阅</p>
                
                <div class="error" id="login-error"></div>
                
                <form id="login-form" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label>用户名</label>
                        <input type="text" name="username" required placeholder="请输入用户名">
                    </div>
                    <div class="form-group">
                        <label>密码</label>
                        <input type="password" name="password" required placeholder="请输入密码">
                    </div>
                    <button type="submit" id="login-btn">登录</button>
                </form>
            </div>
            
            <!-- 注册表单 -->
            <div class="form-section" id="register-section">
                <div style="text-align:center;margin-bottom:20px;padding:15px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:8px;color:white;">
                    <h2 style="margin:0 0 8px 0;font-size:20px;">⚡ ${siteName}</h2>
                    <p style="margin:0;font-size:13px;opacity:0.9;">轻量级 VLESS 订阅服务</p>
                </div>
                <h2>📝 用户注册</h2>
                <p class="subtitle">创建新账号开始使用</p>
                
                <div class="error" id="register-error"></div>
                <div class="success" id="register-success"></div>
                
                ${enableRegister ? `
                <form id="register-form" onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label>用户名 (3-20字符)</label>
                        <input type="text" name="username" required placeholder="请输入用户名" minlength="3" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>密码 (至少6字符)</label>
                        <input type="password" name="password" required placeholder="请输入密码" minlength="6">
                    </div>
                    <div class="form-group">
                        <label>确认密码</label>
                        <input type="password" name="confirm_password" required placeholder="请再次输入密码">
                    </div>
                    ${requireInviteCode ? `
                    <div class="form-group">
                        <label>邀请码 <span style="color:#ff4d4f;">*</span></label>
                        <input type="text" name="invite_code" required placeholder="请输入邀请码">
                    </div>
                    ` : ''}
                    <button type="submit" id="register-btn">注册</button>
                </form>
                ` : `
                <div class="register-disabled">
                    ⚠️ 注册功能暂未开放<br>
                    请联系管理员获取账号
                </div>
                `}
            </div>
        </div>
    </div>

    <script>
        function switchTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
            
            event.currentTarget.classList.add('active');
            document.getElementById(tab + '-section').classList.add('active');
            
            // 清除错误提示
            document.querySelectorAll('.error, .success').forEach(e => e.classList.remove('show'));
        }

        async function handleLogin(e) {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('login-btn');
            const errorDiv = document.getElementById('login-error');
            
            btn.disabled = true;
            btn.textContent = '登录中...';
            errorDiv.classList.remove('show');
            
            try {
                const formData = new FormData(form);
                const response = await fetch('/api/user/login', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    window.location.href = '/';
                } else {
                    errorDiv.textContent = result.error || '登录失败';
                    errorDiv.classList.add('show');
                }
            } catch (error) {
                errorDiv.textContent = '网络错误，请稍后重试';
                errorDiv.classList.add('show');
            } finally {
                btn.disabled = false;
                btn.textContent = '登录';
            }
        }

        async function handleRegister(e) {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('register-btn');
            const errorDiv = document.getElementById('register-error');
            const successDiv = document.getElementById('register-success');
            
            const password = form.password.value;
            const confirmPassword = form.confirm_password.value;
            
            if (password !== confirmPassword) {
                errorDiv.textContent = '两次输入的密码不一致';
                errorDiv.classList.add('show');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = '注册中...';
            errorDiv.classList.remove('show');
            successDiv.classList.remove('show');
            
            try {
                const formData = new FormData(form);
                const response = await fetch('/api/user/register', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    successDiv.textContent = result.message;
                    successDiv.classList.add('show');
                    form.reset();
                    
                    // 3秒后切换到登录页面
                    setTimeout(() => {
                        switchTab('login');
                        document.querySelector('.tab[onclick*="login"]').click();
                    }, 2000);
                } else {
                    errorDiv.textContent = result.error || '注册失败';
                    errorDiv.classList.add('show');
                }
            } catch (error) {
                errorDiv.textContent = '网络错误，请稍后重试';
                errorDiv.classList.add('show');
            } finally {
                btn.disabled = false;
                btn.textContent = '注册';
            }
        }
    </script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// 渲染用户仪表板
async function renderUserDashboard(env, userInfo) {
    const settings = await dbGetSettings(env) || { subUrl: "" };
    const subUrl = settings.subUrl || "";
    const siteName = settings.siteName || "CFly";
    const adminPath = env.ADMIN_PATH || '/admin';
    
    // 获取自定义链接配置
    const customLink1Name = settings.customLink1Name || "";
    const customLink1Url = settings.customLink1Url || "";
    const customLink2Name = settings.customLink2Name || "";
    const customLink2Url = settings.customLink2Url || "";
    
    const apiBaseUrl = 'https://url.v1.mk/sub';
    const originalSubUrl = subUrl + '/' + userInfo.uuid;
    const clashUrl = apiBaseUrl + '?target=clash&url=' + encodeURIComponent(originalSubUrl);
    const surgeUrl = apiBaseUrl + '?target=surge&url=' + encodeURIComponent(originalSubUrl);
    const shadowrocketUrl = apiBaseUrl + '?target=shadowrocket&url=' + encodeURIComponent(originalSubUrl);
    const quanxUrl = apiBaseUrl + '?target=quanx&url=' + encodeURIComponent(originalSubUrl);
    
    const expiryText = userInfo.expiry ? formatBeijingDateTime(userInfo.expiry) : '未激活';
    const expiryDate = userInfo.expiry ? formatBeijingDate(userInfo.expiry) : '';
    const createdDate = formatBeijingDateTime(userInfo.createdAt);
    const lastLoginDate = formatBeijingDateTime(userInfo.lastLogin);
    
    let statusClass = 'status-active';
    let statusText = '✅ 正常';
    if (!userInfo.expiry) {
        statusClass = 'status-expired';
        statusText = '⚠️ 未激活';
    } else if (userInfo.expired) {
        statusClass = 'status-expired';
        statusText = '❌ 已过期';
    } else if (!userInfo.enabled) {
        statusClass = 'status-disabled';
        statusText = '⚠️ 已禁用';
    }
    
    // 生成自定义链接 HTML
    let customLinksHtml = '';
    if (customLink1Name && customLink1Url) {
        customLinksHtml += `<a href="${customLink1Url}" target="_blank" class="custom-link">${customLink1Name}</a>`;
    }
    if (customLink2Name && customLink2Url) {
        customLinksHtml += `<a href="${customLink2Url}" target="_blank" class="custom-link">${customLink2Name}</a>`;
    }
    
    return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteName} 用户面板</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f0f2f5;
            height: 100vh;
            overflow: hidden;
        }
        
        /* 布局容器 */
        .layout {
            display: flex;
            height: 100vh;
        }
        
        /* 左侧边栏 */
        .sidebar {
            width: 240px;
            background: #001529;
            color: white;
            overflow-y: auto;
            flex-shrink: 0;
        }
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sidebar-header h1 {
            color: white;
            font-size: 18px;
            margin-bottom: 8px;
        }
        .user-info-mini {
            font-size: 12px;
            color: rgba(255,255,255,0.65);
            margin-top: 5px;
        }
        
        .menu {
            list-style: none;
            padding: 10px 0;
        }
        .menu-item {
            padding: 12px 20px;
            cursor: pointer;
            transition: all 0.3s;
            border-left: 3px solid transparent;
            display: flex;
            align-items: center;
            gap: 10px;
            color: rgba(255,255,255,0.85);
        }
        .menu-item:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .menu-item.active {
            background: #1890ff;
            border-left-color: #fff;
            color: white;
        }
        
        /* 右侧内容区 */
        .main-content {
            flex: 1;
            overflow-y: auto;
            background: #f0f2f5;
        }
        .content-header {
            background: white;
            padding: 16px 24px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .content-header h2 {
            font-size: 20px;
            margin: 0;
        }
        .content-body {
            padding: 24px;
        }
        
        .section {
            display: none;
        }
        .section.active {
            display: block;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 5px;
        }
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        .logout-btn {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
        }
        .logout-btn:hover {
            background: white;
            color: #667eea;
        }
        .card {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .card h2 {
            font-size: 20px;
            margin-bottom: 20px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        .info-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .info-label {
            color: #999;
            font-size: 13px;
            margin-bottom: 5px;
        }
        .info-value {
            color: #333;
            font-size: 16px;
            font-weight: 600;
            word-break: break-all;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        .status-active {
            background: #f6ffed;
            color: #52c41a;
            border: 1px solid #b7eb8f;
        }
        .status-expired {
            background: #fff1f0;
            color: #ff4d4f;
            border: 1px solid #ffa39e;
        }
        .status-disabled {
            background: #fff7e6;
            color: #faad14;
            border: 1px solid #ffd591;
        }
        .uuid-box {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
            position: relative;
            border: 2px solid #e8e8e8;
        }
        .copy-btn {
            background: #1890ff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
            transition: all 0.3s;
        }
        .copy-btn:hover {
            background: #40a9ff;
            transform: translateY(-2px);
        }
        .copy-btn:active {
            transform: translateY(0);
        }
        .sub-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin: 5px;
            transition: all 0.3s;
            display: inline-block;
            min-width: 140px;
            text-align: center;
        }
        .sub-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .sub-btn:active {
            transform: translateY(0);
        }
        .sub-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        .warning {
            background: #fff7e6;
            border: 1px solid #ffd591;
            color: #d46b08;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s;
            z-index: 1000;
        }
        .toast.show {
            opacity: 1;
            bottom: 50px;
        }
        
        /* 订阅按钮下拉菜单 */
        .sub-btn-wrapper {
            position: relative;
            display: inline-block;
        }
        .sub-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 180px;
            z-index: 100;
            margin-top: 5px;
            overflow: hidden;
        }
        .sub-dropdown.show {
            display: block;
            animation: dropdownFade 0.2s;
        }
        @keyframes dropdownFade {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .sub-dropdown-item {
            padding: 12px 16px;
            cursor: pointer;
            transition: background 0.2s;
            color: #333;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .sub-dropdown-item:hover {
            background: #f5f5f5;
        }
        .sub-dropdown-item:active {
            background: #e8e8e8;
        }
        
        /* 移动端汉堡菜单按钮 */
        .menu-toggle {
            display: none;
            position: fixed;
            top: 15px;
            left: 15px;
            z-index: 1001;
            background: #001529;
            color: white;
            border: none;
            border-radius: 8px;
            width: 45px;
            height: 45px;
            cursor: pointer;
            font-size: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: all 0.3s;
        }
        .menu-toggle:active {
            transform: scale(0.95);
        }
        
        /* 遮罩层 */
        .sidebar-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        }
        
        @media (max-width: 768px) {
            .menu-toggle {
                display: block;
            }
            .sidebar {
                position: fixed;
                left: -240px;
                top: 0;
                bottom: 0;
                width: 240px;
                z-index: 1000;
                transition: left 0.3s;
            }
            .sidebar.mobile-open {
                left: 0;
            }
            .sidebar-overlay.show {
                display: block;
            }
            .main-content {
                width: 100%;
            }
            .header {
                text-align: center;
            }
            .info-grid {
                grid-template-columns: 1fr;
            }
            .content-header {
                padding-left: 70px;
            }
        }
        
        /* 自定义链接样式 */
        .custom-links {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .custom-link {
            padding: 6px 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 6px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s;
            white-space: nowrap;
        }
        .custom-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        @media (max-width: 768px) {
            .custom-links {
                flex-wrap: wrap;
            }
            .custom-link {
                padding: 5px 10px;
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <!-- 移动端菜单按钮 -->
    <button class="menu-toggle" onclick="toggleMobileSidebar()">☰</button>
    
    <!-- 侧边栏遮罩层 -->
    <div class="sidebar-overlay" onclick="toggleMobileSidebar()"></div>
    
    <div class="layout">
        <!-- 左侧导航 -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h1>${siteName}</h1>
                <div class="user-info-mini">
                    ${userInfo.username}<br>
                    ${new Date().toLocaleDateString('zh-CN')}
                </div>
                <button onclick="handleLogout()" style="margin-top:10px;width:100%;padding:8px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:4px;cursor:pointer;font-size:13px;">🚪 退出登录</button>
            </div>
            <ul class="menu">
                <li class="menu-item active" onclick="switchSection('account', event)">
                    <span>📊</span>
                    <span>账号信息</span>
                </li>
                <li class="menu-item" onclick="switchSection('orders', event)">
                    <span>💳</span>
                    <span>我的订单</span>
                </li>
                <li class="menu-item" onclick="switchSection('plans', event)">
                    <span>📦</span>
                    <span>套餐购买</span>
                </li>
            </ul>
        </div>

        <!-- 右侧内容区 -->
        <div class="main-content">
            <!-- 账号信息页 -->
            <div id="section-account" class="section active">
                <div class="content-header">
                    <h2>📊 账号信息</h2>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <div class="custom-links">${customLinksHtml}</div>
                        <button onclick="viewAllAnnouncements()" style="padding:8px 16px;background:#1890ff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:6px;">
                            📢 查看公告
                        </button>
                    </div>
                </div>
                <div class="content-body">
                    <div class="card">
                        <h2>基本信息</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">用户名</div>
                    <div class="info-value">${userInfo.username}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">账号状态</div>
                    <div class="info-value">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-label">注册时间</div>
                    <div class="info-value">${createdDate}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">订阅到期时间</div>
                    <div class="info-value">${expiryText}</div>
                </div>
            </div>
        </div>

        <!-- 订阅链接 -->
        <div class="card">
            <h2>📡 订阅链接</h2>
            ${!subUrl ? `
            <div class="warning">
                ⚠️ 管理员尚未配置订阅地址，请联系管理员
            </div>
            ` : `
            ${!userInfo.enabled || userInfo.expired ? `
            <div class="warning">
                ⚠️ 您的账号${userInfo.expired ? '已过期' : '已被禁用'}，无法使用订阅功能<br>
                请联系管理员处理
            </div>
            ` : ''}
            
            <div class="sub-buttons">
                <div class="sub-btn-wrapper">
                    <button class="sub-btn" onclick="toggleSubDropdown('original')">🔗 通用订阅 ▼</button>
                    <div class="sub-dropdown" id="sub-dropdown-original">
                        <div class="sub-dropdown-item" onclick="copySubOnly('original')">📋 复制订阅</div>
                        <div class="sub-dropdown-item" onclick="importSub('original')">⬇️ 一键导入</div>
                    </div>
                </div>
                <div class="sub-btn-wrapper">
                    <button class="sub-btn" onclick="toggleSubDropdown('clash')">⚡ Clash ▼</button>
                    <div class="sub-dropdown" id="sub-dropdown-clash">
                        <div class="sub-dropdown-item" onclick="copySubOnly('clash')">📋 复制 Clash 订阅</div>
                        <div class="sub-dropdown-item" onclick="importSub('clash')">⬇️ 一键导入 Clash</div>
                    </div>
                </div>
                <div class="sub-btn-wrapper">
                    <button class="sub-btn" onclick="toggleSubDropdown('singbox')">📦 SingBox ▼</button>
                    <div class="sub-dropdown" id="sub-dropdown-singbox">
                        <div class="sub-dropdown-item" onclick="copySubOnly('singbox')">📋 复制 SingBox 订阅</div>
                        <div class="sub-dropdown-item" onclick="importSub('singbox')">⬇️ 一键导入 SingBox</div>
                    </div>
                </div>
                <div class="sub-btn-wrapper">
                    <button class="sub-btn" onclick="toggleSubDropdown('surge')">🌊 Surge ▼</button>
                    <div class="sub-dropdown" id="sub-dropdown-surge">
                        <div class="sub-dropdown-item" onclick="copySubOnly('surge')">📋 复制 Surge 订阅</div>
                        <div class="sub-dropdown-item" onclick="importSub('surge')">⬇️ 一键导入 Surge</div>
                    </div>
                </div>
                <div class="sub-btn-wrapper">
                    <button class="sub-btn" onclick="toggleSubDropdown('shadowrocket')">🚀 Shadowrocket ▼</button>
                    <div class="sub-dropdown" id="sub-dropdown-shadowrocket">
                        <div class="sub-dropdown-item" onclick="copySubOnly('shadowrocket')">📋 复制 Shadowrocket 订阅</div>
                        <div class="sub-dropdown-item" onclick="importSub('shadowrocket')">⬇️ 一键导入 Shadowrocket</div>
                    </div>
                </div>
                <div class="sub-btn-wrapper">
                    <button class="sub-btn" onclick="toggleSubDropdown('quanx')">🔮 Quantumult X ▼</button>
                    <div class="sub-dropdown" id="sub-dropdown-quanx">
                        <div class="sub-dropdown-item" onclick="copySubOnly('quanx')">📋 复制 Quantumult X 订阅</div>
                        <div class="sub-dropdown-item" onclick="importSub('quanx')">⬇️ 一键导入 Quantumult X</div>
                    </div>
                </div>
            </div>
            `}
        </div>

        <!-- 每日签到 -->
        <div class="card">
            <h2>📅 每日签到</h2>
            <p style="color:#666;margin-bottom:15px;">每日签到可获得1天使用时长奖励</p>
            <button onclick="userCheckin()" class="copy-btn" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:12px 40px;font-size:16px;">✨ 立即签到</button>
        </div>

        <!-- 修改密码 -->
        <div class="card">
            <h2>🔒 修改密码</h2>
            <div style="max-width: 400px;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #666; font-size: 14px;">旧密码</label>
                    <input type="password" id="oldPassword" placeholder="请输入旧密码" style="width: 100%; padding: 10px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #666; font-size: 14px;">新密码</label>
                    <input type="password" id="newPassword" placeholder="请输入新密码" style="width: 100%; padding: 10px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #666; font-size: 14px;">确认新密码</label>
                    <input type="password" id="confirmPassword" placeholder="请再次输入新密码" style="width: 100%; padding: 10px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;">
                </div>
                <button class="copy-btn" onclick="changeUserPassword()" style="margin-top: 10px;">🔄 修改密码</button>
            </div>
        </div>
                </div>
            </div>

            <!-- 订单管理页 -->
            <div id="section-orders" class="section">
                <div class="content-header">
                    <h2>💳 我的订单</h2>
                </div>
                <div class="content-body">
                    <div id="userOrdersList"></div>
                </div>
            </div>

            <!-- 套餐购买页 -->
            <div id="section-plans" class="section">
                <div class="content-header">
                    <h2>📦 套餐购买</h2>
                </div>
                <div class="content-body">
                    <div id="userPlansList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;"></div>
                </div>
            </div>

        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        // 北京时间转换辅助函数（前端）
        function toBeijingTime(date) {
          const d = new Date(date);
          const beijingTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
          return beijingTime;
        }

        function formatBeijingDateTime(date) {
          if (!date) return '-';
          const d = toBeijingTime(date);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          const hour = String(d.getUTCHours()).padStart(2, '0');
          const minute = String(d.getUTCMinutes()).padStart(2, '0');
          return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
        }

        function formatBeijingDate(date) {
          if (!date) return '-';
          const d = toBeijingTime(date);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          return year + '-' + month + '-' + day;
        }
        
        // 订阅转换后端配置
        const apiBaseUrl = 'https://url.v1.mk/sub';
        const subUrlList = \`${subUrl}\`.split(',').map(s => s.trim()).filter(s => s);
        const uuid = \`${userInfo.uuid}\`;
        
        // 随机获取一个订阅地址
        function getRandomSubUrl() {
            if (subUrlList.length === 0) return '';
            const randomIndex = Math.floor(Math.random() * subUrlList.length);
            return subUrlList[randomIndex];
        }

        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(function() { toast.classList.remove('show'); }, 3000);
        }

        function copyText(text, label) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('\u2705 ' + label + ' \u5df2\u590d\u5236');
            }).catch(function() {
                showToast('\u274c \u590d\u5236\u5931\u8d25');
            });
        }

        function toggleSubDropdown(type) {
            event.stopPropagation();
            const dropdown = document.getElementById('sub-dropdown-' + type);
            const allDropdowns = document.querySelectorAll('.sub-dropdown');
            allDropdowns.forEach(function(d) {
                if (d !== dropdown) d.classList.remove('show');
            });
            dropdown.classList.toggle('show');
        }
        
        function copySubOnly(type) {
            event.stopPropagation();
            const subUrl = getRandomSubUrl();
            if (!subUrl) {
                showToast('\u274c \u8ba2\u9605\u5730\u5740\u672a\u914d\u7f6e');
                return;
            }

            // 确保 URL有https://前缀
            let normalizedSubUrl = subUrl.trim();
            if (!normalizedSubUrl.startsWith('http://') && !normalizedSubUrl.startsWith('https://')) {
                normalizedSubUrl = 'https://' + normalizedSubUrl;
            }
            const originalUrl = normalizedSubUrl + '/' + uuid;
            let finalUrl, clientName;

            if (type === 'original') {
                finalUrl = originalUrl;
                clientName = '\u901a\u7528\u8ba2\u9605';
            } else {
                const clientNames = {
                    'clash': 'Clash',
                    'surge': 'Surge',
                    'shadowrocket': 'Shadowrocket',
                    'quanx': 'Quantumult X',
                    'singbox': 'SingBox'
                };
                const targetMap = {
                    'clash': 'clash',
                    'surge': 'surge',
                    'shadowrocket': 'shadowrocket',
                    'quanx': 'quanx',
                    'singbox': 'singbox'
                };
                finalUrl = apiBaseUrl + '?target=' + targetMap[type] + '&url=' + encodeURIComponent(originalUrl);
                clientName = clientNames[type];
            }

            navigator.clipboard.writeText(finalUrl).then(function() {
                showToast('\u2705 ' + clientName + ' \u8ba2\u9605\u94fe\u63a5\u5df2\u590d\u5236');
                document.getElementById('sub-dropdown-' + type).classList.remove('show');
            }).catch(function() {
                showToast('\u274c \u590d\u5236\u5931\u8d25');
            });
        }
        
        function importSub(type) {
            event.stopPropagation();
            const subUrl = getRandomSubUrl();
            if (!subUrl) {
                showToast('\u274c \u8ba2\u9605\u5730\u5740\u672a\u914d\u7f6e');
                return;
            }

            // 确保 URL有https://前缀
            let normalizedSubUrl = subUrl.trim();
            if (!normalizedSubUrl.startsWith('http://') && !normalizedSubUrl.startsWith('https://')) {
                normalizedSubUrl = 'https://' + normalizedSubUrl;
            }
            const originalUrl = normalizedSubUrl + '/' + uuid;
            let finalUrl, clientName, schemeUrl;

            if (type === 'original') {
                finalUrl = originalUrl;
                clientName = '\u901a\u7528\u5ba2\u6237\u7aef';
                schemeUrl = originalUrl;
            } else {
                const clientNames = {
                    'clash': 'Clash',
                    'surge': 'Surge',
                    'shadowrocket': 'Shadowrocket',
                    'quanx': 'Quantumult X',
                    'singbox': 'SingBox'
                };
                const schemeMap = {
                    'clash': 'clash://install-config?url=',
                    'surge': 'surge:///install-config?url=',
                    'shadowrocket': 'shadowrocket://add/',
                    'quanx': 'quantumult-x:///add-resource?remote-resource=',
                    'singbox': 'sing-box://import-remote-profile?url='
                };
                const targetMap = {
                    'clash': 'clash',
                    'surge': 'surge',
                    'shadowrocket': 'shadowrocket',
                    'quanx': 'quanx',
                    'singbox': 'singbox'
                };
                finalUrl = apiBaseUrl + '?target=' + targetMap[type] + '&url=' + encodeURIComponent(originalUrl);
                clientName = clientNames[type];
                schemeUrl = schemeMap[type] + encodeURIComponent(finalUrl);
            }

            window.location.href = schemeUrl;
            showToast('\u2705 \u6b63\u5728\u6253\u5f00 ' + clientName + '...');
            document.getElementById('sub-dropdown-' + type).classList.remove('show');
        }
        
        // 点击页面其他地方关闭下拉菜单
        document.addEventListener('click', function() {
            document.querySelectorAll('.sub-dropdown').forEach(function(d) {
                d.classList.remove('show');
            });
        });

        function switchSection(sectionName, event) {
            var items = document.querySelectorAll('.menu-item');
            for(var i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            var sections = document.querySelectorAll('.section');
            for(var i = 0; i < sections.length; i++) {
                sections[i].classList.remove('active');
            }
            
            if(event && event.currentTarget) {
                event.currentTarget.classList.add('active');
            }
            document.getElementById('section-' + sectionName).classList.add('active');
            
            // 保存当前标签
            localStorage.setItem('userCurrentSection', sectionName);
            
            // 加载对应数据
            if(sectionName === 'plans') {
                loadUserPlans();
            }
            if(sectionName === 'orders') {
                loadUserOrders();
            }
            
            // 移动端切换页面时关闭侧边栏
            if (window.innerWidth <= 768) {
                var sidebar = document.getElementById('sidebar');
                var overlay = document.querySelector('.sidebar-overlay');
                if(sidebar && sidebar.classList.contains('mobile-open')) {
                    sidebar.classList.remove('mobile-open');
                    overlay.classList.remove('show');
                }
            }
        }
        
        function toggleMobileSidebar() {
            var sidebar = document.getElementById('sidebar');
            var overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('show');
        }
        
        // 页面加载时恢复上次的标签
        window.addEventListener('DOMContentLoaded', function() {
            const lastSection = localStorage.getItem('userCurrentSection');
            if(lastSection && lastSection !== 'account') {
                var items = document.querySelectorAll('.menu-item');
                for(var i = 0; i < items.length; i++) {
                    items[i].classList.remove('active');
                    if(items[i].getAttribute('onclick') && items[i].getAttribute('onclick').indexOf(lastSection) > -1) {
                        items[i].classList.add('active');
                    }
                }
                var sections = document.querySelectorAll('.section');
                for(var i = 0; i < sections.length; i++) {
                    sections[i].classList.remove('active');
                }
                var targetSection = document.getElementById('section-' + lastSection);
                if(targetSection) {
                    targetSection.classList.add('active');
                    if(lastSection === 'plans') {
                        loadUserPlans();
                    }
                    if(lastSection === 'orders') {
                        loadUserOrders();
                    }
                }
            }
        });
        
        function toggleMobileSidebar() {
            var sidebar = document.getElementById('sidebar');
            var overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('show');
        }

        async function handleLogout() {
            if (!confirm('\u786e\u5b9a\u8981\u9000\u51fa\u767b\u5f55\u5417\uff1f')) return;
            
            // 清除保存的标签状态
            localStorage.removeItem('userCurrentSection');
            
            try {
                const response = await fetch('/api/user/logout', {
                    method: 'POST'
                });
                
                if (response.ok) {
                    window.location.href = '/';
                } else {
                    showToast('\u274c \u9000\u51fa\u5931\u8d25');
                }
            } catch (error) {
                showToast('\u274c \u7f51\u7edc\u9519\u8bef');
            }
        }

        async function userCheckin() {
            try {
                const res = await fetch('/api/user/checkin', { method: 'POST' });
                const result = await res.json();
                
                if(res.ok && result.success) {
                    const newExpiry = new Date(result.new_expiry).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'});
                    alert('\u2705 \u7b7e\u5230\u6210\u529f\uff01\\n\u5df2\u5ef6\u957f 1 \u5929\u4f7f\u7528\u65f6\u957f\\n\u65b0\u5230\u671f\u65f6\u95f4\uff1a' + newExpiry);
                    location.reload();
                } else {
                    showToast('\u274c ' + (result.error || '\u7b7e\u5230\u5931\u8d25'));
                }
            } catch(e) {
                showToast('\u274c \u7b7e\u5230\u5931\u8d25: ' + e.message);
            }
        }
        
        async function loadUserOrders() {
            try {
                const res = await fetch('/api/user/orders');
                const data = await res.json();
                
                const container = document.getElementById('userOrdersList');
                if(!container) return;
                
                if(!data.success || data.orders.length === 0) {
                    container.innerHTML = '<div class="card"><p style="text-align:center;color:#999;padding:40px 0;">暂无订单记录</p></div>';
                    return;
                }
                
                var html = '';
                for(var i = 0; i < data.orders.length; i++) {
                    var o = data.orders[i];
                    var statusColor = '#faad14';
                    var statusText = '待审核';
                    if(o.status === 'approved') {
                        statusColor = '#52c41a';
                        statusText = '已通过';
                    } else if(o.status === 'rejected') {
                        statusColor = '#ff4d4f';
                        statusText = '已拒绝';
                    } else if(o.status === 'expired') {
                        statusColor = '#999999';
                        statusText = '已过期';
                    }
                    var createTime = formatBeijingDateTime(o.created_at);
                    var paidTime = o.paid_at ? formatBeijingDateTime(o.paid_at) : '-';
                    
                    html += '<div class="card" style="margin-bottom:15px;">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:15px;">';
                    html += '<div>';
                    html += '<h3 style="margin:0 0 10px 0;color:#333;">订单 #' + o.id + '</h3>';
                    html += '<p style="color:#666;margin:5px 0;">📦 套餐：' + o.plan_name + ' (' + o.duration_days + '天)</p>';
                    html += '<p style="color:#666;margin:5px 0;">💰 金额：￥' + (o.amount || 0) + '</p>';
                    html += '<p style="color:#999;font-size:13px;margin:5px 0;">🕒 下单时间：' + createTime + '</p>';
                    if(o.status === 'approved') {
                        html += '<p style="color:#999;font-size:13px;margin:5px 0;">✅ 审核时间：' + paidTime + '</p>';
                    }
                    html += '</div>';
                    html += '<span style="padding:6px 16px;border-radius:20px;font-size:14px;font-weight:600;background:' + statusColor + '20;color:' + statusColor + ';border:1px solid ' + statusColor + ';">' + statusText + '</span>';
                    html += '</div>';
                    
                    if(o.status === 'pending') {
                        html += '<div style="padding:12px;background:#fff7e6;border:1px solid #ffd591;border-radius:8px;color:#d46b08;font-size:13px;">';
                        html += '⏳ 订单已提交，请耐心等待管理员审核';
                        html += '</div>';
                    } else if(o.status === 'approved') {
                        html += '<div style="padding:12px;background:#f6ffed;border:1px solid #b7eb8f;border-radius:8px;color:#52c41a;font-size:13px;">';
                        html += '✅ 订单已通过，套餐时长已增加到您的账号';
                        html += '</div>';
                    } else if(o.status === 'rejected') {
                        html += '<div style="padding:12px;background:#fff1f0;border:1px solid #ffa39e;border-radius:8px;color:#ff4d4f;font-size:13px;">';
                        html += '❌ 订单已被拒绝';
                        html += '</div>';
                    } else if(o.status === 'expired') {
                        html += '<div style="padding:12px;background:#f5f5f5;border:1px solid #d9d9d9;border-radius:8px;color:#999999;font-size:13px;">';
                        html += '⏰ 订单已过期';
                        html += '</div>';
                    }
                    
                    html += '</div>';
                }
                container.innerHTML = html;
            } catch(e) {
                console.error('加载订单失败:', e);
                var container = document.getElementById('userOrdersList');
                if(container) {
                    container.innerHTML = '<div class="card"><p style="text-align:center;color:#ff4d4f;padding:40px 0;">加载订单失败，请刷新页面重试</p></div>';
                }
            }
        }
        
        async function loadUserPlans() {
            try {
                // 同时加载套餐和支付通道
                const [plansRes, channelsRes] = await Promise.all([
                    fetch('/api/plans'),
                    fetch('/api/payment/channels')
                ]);
                const plansData = await plansRes.json();
                const channelsData = await channelsRes.json();
                
                if(!plansData.success) return;
                
                const container = document.getElementById('userPlansList');
                if(!container) return;
                
                // 保存支付通道到全局
                window.paymentChannels = channelsData.success ? channelsData.data : [];
                
                if(plansData.plans.length === 0) {
                    container.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;">\u6682\u65e0\u53ef\u8d2d\u4e70\u5957\u9910</p>';
                    return;
                }
                
                var html = '';
                for(var i = 0; i < plansData.plans.length; i++) {
                    var p = plansData.plans[i];
                    html += '<div class="card" style="text-align:center;padding:25px;">';
                    html += '<h3 style="margin:0 0 10px 0;font-size:20px;color:#1890ff;">' + p.name + '</h3>';
                    html += '<p style="color:#666;font-size:14px;margin:10px 0;min-height:40px;">' + (p.description || '\u65e0\u63cf\u8ff0') + '</p>';
                    html += '<div style="margin:15px 0;">';
                    html += '<span style="font-size:32px;font-weight:bold;color:#1890ff;">' + p.duration_days + '</span>';
                    html += '<span style="font-size:16px;color:#999;">\u5929</span>';
                    html += '</div>';
                    html += '<div style="margin:15px 0;color:#ff4d4f;font-size:20px;font-weight:600;">\uffe5' + (p.price || 0) + '</div>';
                    html += '<button onclick="buyPlan(' + p.id + ', ' + (p.price || 0) + ')" data-plan-name="' + p.name.replace(/"/g, '&quot;') + '" class="copy-btn" style="width:100%;padding:10px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">\u7acb\u5373\u8ba2\u8d2d</button>';
                    html += '</div>';
                }
                container.innerHTML = html;
            } catch(e) {
                console.error('\u52a0\u8f7d\u5957\u9910\u5931\u8d25:', e);
            }
        }
        
        async function buyPlan(planId, price) {
            const planName = event.target.getAttribute('data-plan-name');
            const channels = window.paymentChannels || [];
            
            // 如果没有配置支付通道或价格为0，使用旧的流程
            if(channels.length === 0 || price === 0) {
                if(!confirm('\u786e\u5b9a\u8981\u8ba2\u8d2d\u5957\u9910\u300c' + planName + '\u300d\u5417\uff1f\\n\u8ba2\u5355\u63d0\u4ea4\u540e\u9700\u7b49\u5f85\u7ba1\u7406\u5458\u5ba1\u6838\u901a\u8fc7\u3002')) return;
                
                const form = new FormData();
                form.append('plan_id', planId);
                
                try {
                    const res = await fetch('/api/user/orders/create', { method: 'POST', body: form });
                    const result = await res.json();
                    
                    if(res.ok && result.success) {
                        showToast('\u2705 ' + result.message);
                    } else {
                        showToast('\u274c ' + (result.error || '\u8ba2\u8d2d\u5931\u8d25'));
                    }
                } catch(e) {
                    showToast('\u274c \u8ba2\u8d2d\u5931\u8d25: ' + e.message);
                }
                return;
            }
            
            // 显示支付方式选择弹窗
            showPaymentModal(planId, planName, price, channels);
        }
        
        function showPaymentModal(planId, planName, price, channels) {
            // 创建弹窗
            var modal = document.createElement('div');
            modal.id = 'paymentModal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1000;';
            
            var content = '<div style="background:white;padding:25px;border-radius:12px;max-width:400px;width:90%;">';
            content += '<h3 style="margin:0 0 20px 0;text-align:center;">\u9009\u62e9\u652f\u4ed8\u65b9\u5f0f</h3>';
            content += '<div style="padding:15px;background:#f5f5f5;border-radius:8px;margin-bottom:20px;">';
            content += '<p style="margin:0;"><strong>\u5957\u9910\uff1a</strong>' + planName + '</p>';
            content += '<p style="margin:5px 0 0 0;color:#ff4d4f;font-size:18px;font-weight:600;">\u91d1\u989d\uff1a\uffe5' + price + '</p>';
            content += '</div>';
            
            content += '<div style="margin-bottom:20px;">';
            content += '<label style="display:block;margin-bottom:8px;font-weight:600;">\u652f\u4ed8\u901a\u9053</label>';
            content += '<select id="payChannelSelect" style="width:100%;padding:10px;border:1px solid #d9d9d9;border-radius:4px;">';
            for(var i = 0; i < channels.length; i++) {
                content += '<option value="' + channels[i].id + '" data-code="' + channels[i].code + '">' + channels[i].name + '</option>';
            }
            content += '</select>';
            content += '</div>';
            
            content += '<div style="display:flex;gap:10px;">';
            content += '<button onclick="closePaymentModal()" style="flex:1;padding:10px;background:#999;color:white;border:none;border-radius:4px;cursor:pointer;">\u53d6\u6d88</button>';
            content += '<button onclick="submitPayment(' + planId + ')" style="flex:1;padding:10px;background:#52c41a;color:white;border:none;border-radius:4px;cursor:pointer;">\u786e\u8ba4\u652f\u4ed8</button>';
            content += '</div>';
            content += '</div>';
            
            modal.innerHTML = content;
            document.body.appendChild(modal);
        }
        
        function closePaymentModal() {
            var modal = document.getElementById('paymentModal');
            if(modal) modal.remove();
        }
        
        async function submitPayment(planId) {
            const channelSelect = document.getElementById('payChannelSelect');
            if(!channelSelect || !channelSelect.value) {
                showToast('❌ 请选择支付通道');
                return;
            }
            const channelId = channelSelect.value;
            const selectedOption = channelSelect.options[channelSelect.selectedIndex];
            const tradeType = selectedOption ? selectedOption.getAttribute('data-code') : 'usdt.trc20';
            
            closePaymentModal();
            showToast('⏳ 正在创建订单...');
            
            // 先创建订单
            const createForm = new FormData();
            createForm.append('plan_id', planId);
            
            try {
                const createRes = await fetch('/api/user/orders/create', { method: 'POST', body: createForm });
                const createResult = await createRes.json();
                
                if(!createRes.ok || !createResult.success) {
                    showToast('❌ ' + (createResult.error || '创建订单失败'));
                    return;
                }
                
                // 如果不需要支付（免费套餐已自动审核或待审核），直接显示消息
                if(!createResult.need_payment) {
                    showToast('✅ ' + createResult.message);
                    return;
                }
                
                // 获取订单ID并发起支付
                const orderId = createResult.order_id;
                if(!orderId) {
                    showToast('❌ 订单已创建，请到订单列表查看');
                    return;
                }
                
                showToast('⏳ 正在发起支付...');
                
                // 调用支付接口
                const payForm = new FormData();
                payForm.append('order_id', orderId);
                payForm.append('channel_id', channelId);
                payForm.append('trade_type', tradeType || 'usdt.trc20');
                
                const payRes = await fetch('/api/user/orders/pay', { method: 'POST', body: payForm });
                const payResult = await payRes.json();
                
                if(payRes.ok && payResult.success && payResult.data && payResult.data.payment_url) {
                    // 新窗口打开支付页面，避免丢失当前会话
                    showToast('✅ 支付页面已打开，请在新窗口完成支付');
                    window.open(payResult.data.payment_url, '_blank');
                } else {
                    showToast('❌ ' + (payResult.error || '发起支付失败，请检查支付通道配置'));
                }
            } catch(e) {
                showToast('❌ 支付失败: ' + e.message);
            }
        }
        
        if(document.getElementById('userPlansList')) {
            loadUserPlans();
        }

        async function changeUserPassword() {
            const oldPassword = document.getElementById('oldPassword').value.trim();
            const newPassword = document.getElementById('newPassword').value.trim();
            const confirmPassword = document.getElementById('confirmPassword').value.trim();

            if (!oldPassword || !newPassword || !confirmPassword) {
                showToast('\u274c \u8bf7\u586b\u5199\u6240\u6709\u5b57\u6bb5');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('\u274c \u4e24\u6b21\u8f93\u5165\u7684\u65b0\u5bc6\u7801\u4e0d\u4e00\u81f4');
                return;
            }

            if (newPassword.length < 6) {
                showToast('\u274c \u65b0\u5bc6\u7801\u957f\u5ea6\u81f3\u5c116\u4f4d');
                return;
            }

            try {
                const fd = new FormData();
                fd.append('oldPassword', oldPassword);
                fd.append('newPassword', newPassword);

                const response = await fetch('/api/user/changePassword', {
                    method: 'POST',
                    body: fd
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showToast('\u2705 \u5bc6\u7801\u4fee\u6539\u6210\u529f\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55');
                    setTimeout(function() {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    showToast('\u274c ' + (result.error || '\u4fee\u6539\u5931\u8d25'));
                }
            } catch (error) {
                showToast('\u274c \u7f51\u7edc\u9519\u8bef');
            }

            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        }
        
        // 手动查看所有公告
        async function viewAllAnnouncements() {
            try {
                const res = await fetch('/api/announcement');
                const data = await res.json();
                
                if (!data.success || !data.announcements || data.announcements.length === 0) {
                    showToast('📢 暂无公告');
                    return;
                }
                
                // 显示公告列表选择器
                showAnnouncementList(data.announcements);
            } catch(e) {
                showToast('❌ 加载公告失败');
            }
        }
        
        // 显示公告列表选择界面
        function showAnnouncementList(announcements) {
            const overlay = document.createElement('div');
            overlay.id = 'announcementListOverlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;justify-content:center;align-items:center;';
            
            const modal = document.createElement('div');
            modal.style.cssText = 'background:white;border-radius:12px;max-width:600px;width:90%;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
            
            const header = document.createElement('div');
            header.style.cssText = 'padding:20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;';
            header.innerHTML = '<h3 style="margin:0;font-size:18px;color:#1890ff;">📢 系统公告列表</h3>';
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = 'background:none;border:none;font-size:24px;color:#999;cursor:pointer;padding:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:4px;';
            closeBtn.onmouseover = function() { this.style.background = '#f0f0f0'; this.style.color = '#333'; };
            closeBtn.onmouseout = function() { this.style.background = 'none'; this.style.color = '#999'; };
            closeBtn.onclick = function() { document.body.removeChild(overlay); };
            header.appendChild(closeBtn);
            
            const body = document.createElement('div');
            body.style.cssText = 'padding:0;overflow-y:auto;flex:1;';
            
            announcements.forEach((ann, index) => {
                const item = document.createElement('div');
                item.style.cssText = 'padding:15px 20px;border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background 0.2s;';
                item.onmouseover = function() { this.style.background = '#f9f9f9'; };
                item.onmouseout = function() { this.style.background = 'white'; };
                item.onclick = function() {
                    document.body.removeChild(overlay);
                    showAnnouncementModal(ann.id, ann.title, ann.content, true);
                };
                
                const title = document.createElement('div');
                title.style.cssText = 'font-size:16px;font-weight:500;color:#333;margin-bottom:5px;';
                title.textContent = ann.title;
                
                const time = document.createElement('div');
                time.style.cssText = 'font-size:12px;color:#999;';
                time.textContent = new Date(ann.created_at).toLocaleString('zh-CN');
                
                item.appendChild(title);
                item.appendChild(time);
                body.appendChild(item);
            });
            
            modal.appendChild(header);
            modal.appendChild(body);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        }
        
        // 公告功能
        async function loadAndShowAnnouncement() {
            try {
                const res = await fetch('/api/announcement');
                const data = await res.json();
                
                if (!data.success || !data.announcements || data.announcements.length === 0) return;
                
                // 获取本次登录已经dismissed的公告ID列表(使用sessionStorage)
                const dismissedIds = JSON.parse(sessionStorage.getItem('dismissed_announcements') || '[]');
                
                // 过滤出未被dismiss的公告
                const unreadAnnouncements = data.announcements.filter(ann => !dismissedIds.includes(ann.id));
                
                if (unreadAnnouncements.length === 0) return;
                
                // 显示第一个未读公告
                const announcement = unreadAnnouncements[0];
                showAnnouncementModal(announcement.id, announcement.title, announcement.content);
            } catch(e) {
                console.error('加载公告失败:', e);
            }
        }
        
        function showAnnouncementModal(id, title, content, isManualView = false) {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.id = 'announcementOverlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;justify-content:center;align-items:center;';
            
            // 创建弹窗
            const modal = document.createElement('div');
            modal.style.cssText = 'background:white;border-radius:12px;max-width:500px;width:90%;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
            
            // 标题栏
            const header = document.createElement('div');
            header.style.cssText = 'padding:20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;';
            header.innerHTML = '<h3 style="margin:0;font-size:18px;color:#1890ff;">📢 ' + (title || '系统公告') + '</h3>';
            
            // 关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = 'background:none;border:none;font-size:24px;color:#999;cursor:pointer;padding:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:4px;';
            closeBtn.onmouseover = function() { this.style.background = '#f0f0f0'; this.style.color = '#333'; };
            closeBtn.onmouseout = function() { this.style.background = 'none'; this.style.color = '#999'; };
            closeBtn.onclick = function() { document.body.removeChild(overlay); };
            header.appendChild(closeBtn);
            
            // 内容区域
            const body = document.createElement('div');
            body.style.cssText = 'padding:20px;overflow-y:auto;flex:1;line-height:1.8;color:#333;white-space:pre-wrap;word-wrap:break-word;';
            body.textContent = content || '暂无公告内容';
            
            // 底部按钮区
            const footer = document.createElement('div');
            footer.style.cssText = 'padding:15px 20px;border-top:1px solid #f0f0f0;display:flex;gap:10px;justify-content:flex-end;';
            
            // 手动查看时不显示"不再提醒"按钮
            if (!isManualView) {
                const dismissBtn = document.createElement('button');
                dismissBtn.textContent = '本次登录不再提醒';
                dismissBtn.style.cssText = 'padding:8px 20px;background:#f5f5f5;color:#666;border:1px solid #d9d9d9;border-radius:6px;cursor:pointer;font-size:14px;';
                dismissBtn.onclick = function() {
                    // 将此公告ID添加到session级别的已dismiss列表
                    const dismissedIds = JSON.parse(sessionStorage.getItem('dismissed_announcements') || '[]');
                    if (!dismissedIds.includes(id)) {
                        dismissedIds.push(id);
                        sessionStorage.setItem('dismissed_announcements', JSON.stringify(dismissedIds));
                    }
                    document.body.removeChild(overlay);
                    showToast('✅ 本次登录不再提醒此公告');
                };
                footer.appendChild(dismissBtn);
            }
            
            const closeBtn2 = document.createElement('button');
            closeBtn2.textContent = isManualView ? '关闭' : '我知道了';
            closeBtn2.style.cssText = 'padding:8px 20px;background:#1890ff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;';
            closeBtn2.onclick = function() { 
                document.body.removeChild(overlay);
            };
            
            footer.appendChild(closeBtn2);
            
            // 组装弹窗
            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            
            // 添加到页面
            document.body.appendChild(overlay);
        }
        
        // 页面加载完成后检查公告
        window.addEventListener('DOMContentLoaded', function() {
            setTimeout(loadAndShowAnnouncement, 500); // 延迟500ms显示，确保页面加载完成
        });
    </script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// ==================== 套餐管理 API ====================

// 管理员获取所有套餐（包括禁用的）
async function handleAdminGetPlans(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const plans = await env.DB.prepare(
            "SELECT * FROM subscription_plans ORDER BY duration_days ASC"
        ).all();
        
        return new Response(JSON.stringify({ 
            success: true, 
            plans: plans.results || [] 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('管理员获取套餐错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 获取启用的套餐（用户端）
async function handleGetPlans(request, env) {
    try {
        const plans = await env.DB.prepare(
            "SELECT * FROM subscription_plans WHERE enabled = 1 ORDER BY duration_days ASC"
        ).all();
        
        return new Response(JSON.stringify({ 
            success: true, 
            plans: plans.results || [] 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('获取套餐错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 管理员创建套餐
async function handleAdminCreatePlan(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const name = formData.get('name');
        const description = formData.get('description') || '';
        const durationDays = parseInt(formData.get('duration_days'));
        const price = parseFloat(formData.get('price') || 0);
        
        if (!name || !durationDays) {
            return new Response(JSON.stringify({ error: '套餐名称和时长不能为空' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        await env.DB.prepare(
            "INSERT INTO subscription_plans (name, description, duration_days, price, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)"
        ).bind(name, description, durationDays, price, Date.now()).run();
        
        return new Response(JSON.stringify({ success: true, message: '套餐创建成功' }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('创建套餐错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 管理员更新套餐
async function handleAdminUpdatePlan(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));
        const name = formData.get('name');
        const description = formData.get('description') || '';
        const durationDays = parseInt(formData.get('duration_days'));
        const price = parseFloat(formData.get('price') || 0);
        const enabled = formData.get('enabled') === 'true' ? 1 : 0;
        
        if (!id || !name || !durationDays) {
            return new Response(JSON.stringify({ error: '参数错误' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        await env.DB.prepare(
            "UPDATE subscription_plans SET name = ?, description = ?, duration_days = ?, price = ?, enabled = ? WHERE id = ?"
        ).bind(name, description, durationDays, price, enabled, id).run();
        
        return new Response(JSON.stringify({ success: true, message: '套餐更新成功' }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('更新套餐错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 管理员切换套餐启用状态
async function handleAdminTogglePlan(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));
        const enabled = formData.get('enabled') === 'true' ? 1 : 0;
        
        if (!id) {
            return new Response(JSON.stringify({ error: '参数错误' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        await env.DB.prepare(
            "UPDATE subscription_plans SET enabled = ? WHERE id = ?"
        ).bind(enabled, id).run();
        
        return new Response(JSON.stringify({ success: true, message: '套餐状态更新成功' }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('切换套餐状态错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 管理员删除套餐
async function handleAdminDeletePlan(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));
        
        if (!id) {
            return new Response(JSON.stringify({ error: '参数错误' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        // 检查是否有订单引用此套餐
        const ordersCount = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM orders WHERE plan_id = ?"
        ).bind(id).first();
        
        if (ordersCount && ordersCount.count > 0) {
            return new Response(JSON.stringify({ 
                error: '无法删除：该套餐已有 ' + ordersCount.count + ' 个订单引用，请先处理相关订单' 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        await env.DB.prepare("DELETE FROM subscription_plans WHERE id = ?").bind(id).run();
        
        return new Response(JSON.stringify({ success: true, message: '套餐删除成功' }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('删除套餐错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误: ' + e.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 用户获取自己的订单列表
async function handleUserGetOrders(request, env) {
    try {
        const cookie = request.headers.get('Cookie');
        if (!cookie) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const match = cookie.match(/user_session=([^;]+)/);
        if (!match) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const session = await dbValidateSession(env, match[1]);
        if (!session) {
            return new Response(JSON.stringify({ error: '会话已过期' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const user = await dbGetUserById(env, session.user_id);
        if (!user) {
            return new Response(JSON.stringify({ error: '用户不存在' }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 获取系统设置中的过期时间配置
        const settings = await dbGetSettings(env) || {};
        const pendingOrderExpiry = settings.pendingOrderExpiry || 0; // 分钟，0表示永不过期
        
        // 如果设置了过期时间，先更新该用户过期的订单
        if (pendingOrderExpiry > 0) {
            const expiryTime = Date.now() - (pendingOrderExpiry * 60 * 1000);
            await env.DB.prepare(`
                UPDATE orders SET status = 'expired' 
                WHERE status = 'pending' AND user_id = ? AND created_at < ?
            `).bind(user.id, expiryTime).run();
        }

        // 获取该用户的所有订单
        const orders = await env.DB.prepare(`
            SELECT 
                o.id, 
                o.plan_id, 
                o.amount, 
                o.status, 
                o.created_at, 
                o.paid_at,
                sp.name as plan_name,
                sp.duration_days
            FROM orders o
            LEFT JOIN subscription_plans sp ON o.plan_id = sp.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `).bind(user.id).all();

        return new Response(JSON.stringify({ 
            success: true, 
            orders: orders.results || [] 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('获取用户订单错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 用户创建订单
async function handleUserCreateOrder(request, env) {
    try {
        const cookie = request.headers.get('Cookie');
        if (!cookie) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const match = cookie.match(/user_session=([^;]+)/);
        if (!match) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const session = await dbValidateSession(env, match[1]);
        if (!session) {
            return new Response(JSON.stringify({ error: '会话已过期' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const formData = await request.formData();
        const planId = parseInt(formData.get('plan_id'));
        
        if (!planId) {
            return new Response(JSON.stringify({ error: '参数错误' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        // 获取系统设置，检查是否开启自动审核
        const settings = await dbGetSettings(env) || {};
        const autoApproveEnabled = settings.autoApproveOrder === true;
        const autoApproveVersion = settings.autoApproveVersion || 0; // 用于追踪开关重置次数
        
        // 先获取套餐信息
        const plan = await env.DB.prepare(
            "SELECT * FROM subscription_plans WHERE id = ? AND enabled = 1"
        ).bind(planId).first();
        
        if (!plan) {
            return new Response(JSON.stringify({ error: '套餐不存在或已下架' }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        // 检查用户是否可以使用自动审核
        // 重要：自动审核只对免费套餐（price = 0）生效，付费套餐必须等待支付
        let canAutoApprove = false;
        const isFreeplan = plan.price === 0 || plan.price === '0';
        
        if (autoApproveEnabled && isFreeplan) {
            // 检查用户账户中的自动审核版本号
            const userAccount = await env.DB.prepare(
                "SELECT auto_approve_version FROM user_accounts WHERE id = ?"
            ).bind(session.user_id).first();
            
            // 如果用户的版本号小于当前系统版本号，说明可以使用本轮自动审核
            if (!userAccount || userAccount.auto_approve_version < autoApproveVersion) {
                canAutoApprove = true;
            }
        }
        
        // 创建订单
        const now = Date.now();
        const orderStatus = canAutoApprove ? 'approved' : 'pending';
        const result = await env.DB.prepare(
            "INSERT INTO orders (user_id, plan_id, amount, status, created_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(session.user_id, planId, plan.price, orderStatus, now).run();
        
        // 如果可以自动审核，直接延长用户有效期
        if (canAutoApprove) {
            const user = await dbGetUserById(env, session.user_id);
            if (user && user.uuid) {
                const uuidUser = await env.DB.prepare(
                    "SELECT * FROM users WHERE uuid = ?"
                ).bind(user.uuid).first();
                
                if (uuidUser) {
                    // 修复到期时间计算逻辑：
                    // 1. 如果当前是永久有效(null)，从现在开始计算
                    // 2. 如果当前已过期，从现在开始计算
                    // 3. 如果当前未过期，从到期时间累加
                    let baseTime;
                    if (!uuidUser.expiry) {
                        // 永久有效的情况，从现在开始计算
                        baseTime = now;
                    } else if (uuidUser.expiry < now) {
                        // 已过期，从现在开始计算
                        baseTime = now;
                    } else {
                        // 未过期，从到期时间累加
                        baseTime = uuidUser.expiry;
                    }
                    
                    // 修复：使用正确的字段名 duration_days
                    const newExpiry = baseTime + (plan.duration_days * 24 * 60 * 60 * 1000);
                    
                    await env.DB.prepare(
                        "UPDATE users SET expiry = ?, enabled = 1 WHERE uuid = ?"
                    ).bind(newExpiry, user.uuid).run();
                }
            }
            
            // 记录用户已使用本轮自动审核
            await env.DB.prepare(
                "UPDATE user_accounts SET auto_approve_version = ? WHERE id = ?"
            ).bind(autoApproveVersion, session.user_id).run();
            
            return new Response(JSON.stringify({ 
                success: true, 
                message: '订单已自动审核通过，服务时长已延长' 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        // 根据套餐类型和自动审核状态返回不同的消息
        let message;
        let needPayment = false;
        
        if (isFreeplan) {
            // 免费套餐
            if (autoApproveEnabled) {
                message = '您已使用过免费试用，订单已提交，请等待管理员审核';
            } else {
                message = '订单创建成功，请等待管理员审核';
            }
        } else {
            // 付费套餐，需要支付
            message = '订单创建成功，请完成支付';
            needPayment = true;
        }
        
        // 获取刚创建的订单ID
        const newOrder = await env.DB.prepare(
            "SELECT id FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
        ).bind(session.user_id).first();
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: message,
            order_id: newOrder ? newOrder.id : null,
            need_payment: needPayment
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('创建订单错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 检查管理员权限
async function handleAdminCheck(request, env) {
    // 先检查管理员 session
    let isAdmin = await checkAuth(request, env);
    
    // 如果不是管理员 session，检查用户 session 是否是管理员账号
    if (!isAdmin) {
        const cookie = request.headers.get('Cookie');
        if (cookie) {
            const match = cookie.match(/user_session=([^;]+)/);
            if (match) {
                const session = await dbValidateUserSession(env, match[1]);
                if (session) {
                    const user = await dbGetUserAccountById(env, session.user_id);
                    const adminUsername = env.ADMIN_USERNAME || 'admin';
                    // 检查用户名是否等于管理员用户名
                    if (user && user.username === adminUsername) {
                        isAdmin = true;
                    }
                }
            }
        }
    }
    
    return new Response(JSON.stringify({ isAdmin }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json; charset=utf-8' } 
    });
}

// 获取公告 API (用户端)
async function handleGetAnnouncement(request, env) {
    try {
        // 获取所有启用的公告
        const { results } = await env.DB.prepare(
            "SELECT * FROM announcements WHERE enabled = 1 ORDER BY created_at DESC"
        ).all();
        
        return new Response(JSON.stringify({
            success: true,
            announcements: results || []
        }), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}

// 管理员获取所有公告
async function handleAdminGetAnnouncements(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const { results } = await env.DB.prepare(
            "SELECT * FROM announcements ORDER BY created_at DESC"
        ).all();
        
        return new Response(JSON.stringify({ 
            success: true, 
            announcements: results || [] 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}

// 管理员获取单个公告
async function handleAdminGetAnnouncement(request, env, id) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const result = await env.DB.prepare(
            "SELECT * FROM announcements WHERE id = ?"
        ).bind(id).first();
        
        if (!result) {
            return new Response(JSON.stringify({ success: false, error: '公告不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            announcement: result 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}

// 管理员创建公告
async function handleAdminCreateAnnouncement(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const title = formData.get('title');
        const content = formData.get('content');
        const enabled = formData.get('enabled') === '1' ? 1 : 0;
        
        if (!title || !content) {
            return new Response(JSON.stringify({ success: false, error: '标题和内容不能为空' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }
        
        const now = Date.now();
        await env.DB.prepare(
            "INSERT INTO announcements (title, content, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(title, content, enabled, now, now).run();
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}

// 管理员更新公告
async function handleAdminUpdateAnnouncement(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = formData.get('id');
        const title = formData.get('title');
        const content = formData.get('content');
        const enabled = formData.get('enabled') === '1' ? 1 : 0;
        
        if (!id || !title || !content) {
            return new Response(JSON.stringify({ success: false, error: '参数不完整' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }
        
        const now = Date.now();
        await env.DB.prepare(
            "UPDATE announcements SET title = ?, content = ?, enabled = ?, updated_at = ? WHERE id = ?"
        ).bind(title, content, enabled, now, id).run();
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}

// 管理员删除公告
async function handleAdminDeleteAnnouncement(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = formData.get('id');
        
        if (!id) {
            return new Response(JSON.stringify({ success: false, error: '缺少ID' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }
        
        await env.DB.prepare("DELETE FROM announcements WHERE id = ?").bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}

// 管理员获取订单列表
async function handleAdminGetOrders(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        // 获取系统设置中的过期时间配置
        const settings = await dbGetSettings(env) || {};
        const pendingOrderExpiry = settings.pendingOrderExpiry || 0; // 分钟，0表示永不过期
        
        // 如果设置了过期时间，先更新过期的订单
        if (pendingOrderExpiry > 0) {
            const expiryTime = Date.now() - (pendingOrderExpiry * 60 * 1000);
            await env.DB.prepare(`
                UPDATE orders SET status = 'expired' 
                WHERE status = 'pending' AND created_at < ?
            `).bind(expiryTime).run();
        }
        
        const orders = await env.DB.prepare(`
            SELECT 
                o.id, 
                o.user_id, 
                o.plan_id, 
                o.amount, 
                o.status, 
                o.created_at, 
                o.paid_at,
                ua.username,
                sp.name as plan_name,
                sp.duration_days,
                u.expiry as user_expiry
            FROM orders o
            LEFT JOIN user_accounts ua ON o.user_id = ua.id
            LEFT JOIN subscription_plans sp ON o.plan_id = sp.id
            LEFT JOIN users u ON ua.uuid = u.uuid
            ORDER BY o.created_at DESC
        `).all();
        
        // 计算每个待审核订单的过期时间
        const ordersWithExpiry = (orders.results || []).map(o => {
            if (o.status === 'pending' && pendingOrderExpiry > 0) {
                o.expires_at = o.created_at + (pendingOrderExpiry * 60 * 1000);
            }
            return o;
        });
        
        return new Response(JSON.stringify({ 
            success: true, 
            orders: ordersWithExpiry 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('获取订单错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 管理员审核通过订单
async function handleAdminApproveOrder(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const orderId = parseInt(formData.get('order_id'));
        
        if (!orderId) {
            return new Response(JSON.stringify({ error: '参数错误' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        const order = await env.DB.prepare(
            "SELECT o.*, p.duration_days, u.uuid FROM orders o JOIN subscription_plans p ON o.plan_id = p.id JOIN user_accounts ua ON o.user_id = ua.id JOIN users u ON ua.uuid = u.uuid WHERE o.id = ?"
        ).bind(orderId).first();
        
        if (!order) {
            return new Response(JSON.stringify({ error: '订单不存在' }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        if (order.status !== 'pending') {
            return new Response(JSON.stringify({ error: '订单已处理' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        const user = await env.DB.prepare("SELECT expiry FROM users WHERE uuid = ?").bind(order.uuid).first();
        const currentExpiry = user && user.expiry ? user.expiry : Date.now();
        const newExpiry = Math.max(currentExpiry, Date.now()) + (order.duration_days * 24 * 60 * 60 * 1000);
        
        await env.DB.prepare(
            "UPDATE users SET expiry = ? WHERE uuid = ?"
        ).bind(newExpiry, order.uuid).run();
        
        await env.DB.prepare(
            "UPDATE orders SET status = 'approved', paid_at = ? WHERE id = ?"
        ).bind(Date.now(), orderId).run();
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: '订单已审核通过' 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('审核订单错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 管理员拒绝订单
async function handleAdminRejectOrder(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const orderId = parseInt(formData.get('order_id'));
        
        if (!orderId) {
            return new Response(JSON.stringify({ error: '参数错误' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        await env.DB.prepare(
            "UPDATE orders SET status = 'rejected' WHERE id = ?"
        ).bind(orderId).run();
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: '订单已拒绝' 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('拒绝订单错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 用户签到（每天+1天）
async function handleUserCheckin(request, env) {
    try {
        const cookie = request.headers.get('Cookie');
        if (!cookie) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const match = cookie.match(/user_session=([^;]+)/);
        if (!match) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const session = await dbValidateSession(env, match[1]);
        if (!session) {
            return new Response(JSON.stringify({ error: '会话已过期' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const user = await dbGetUserById(env, session.user_id);
        if (!user) {
            return new Response(JSON.stringify({ error: '用户不存在' }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        // 使用北京时间判断是否为同一天
        const now = new Date();
        const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const todayBeijing = beijingNow.toISOString().split('T')[0]; // YYYY-MM-DD 格式
        
        // 从 settings 中获取用户签到记录
        const settings = await dbGetSettings(env) || {};
        const checkinRecords = settings.userCheckinRecords || {};
        const userCheckinDate = checkinRecords[user.uuid];
        
        if (userCheckinDate === todayBeijing) {
            return new Response(JSON.stringify({ error: '今天已经签到过了' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        const uuidUser = await env.DB.prepare("SELECT expiry FROM users WHERE uuid = ?").bind(user.uuid).first();
        const currentExpiry = uuidUser && uuidUser.expiry ? uuidUser.expiry : Date.now();
        const newExpiry = Math.max(currentExpiry, Date.now()) + (24 * 60 * 60 * 1000);
        
        await env.DB.prepare(
            "UPDATE users SET expiry = ? WHERE uuid = ?"
        ).bind(newExpiry, user.uuid).run();
        
        // 更新签到记录
        checkinRecords[user.uuid] = todayBeijing;
        settings.userCheckinRecords = checkinRecords;
        
        await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
            .bind(SYSTEM_CONFIG_KEY, JSON.stringify(settings))
            .run();
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: '签到成功！已延长 1 天使用时长',
            new_expiry: newExpiry
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('签到错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// =============================================================================
// 支付通道管理 API
// =============================================================================

// 管理员获取用户关联的前端账号信息
async function handleAdminGetUserAccount(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const url = new URL(request.url);
        const uuid = url.searchParams.get('uuid');
        
        if (!uuid) {
            return new Response(JSON.stringify({ error: '缺少 UUID 参数' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        const account = await env.DB.prepare(
            "SELECT id, username, email, created_at, last_login FROM user_accounts WHERE uuid = ?"
        ).bind(uuid).first();
        
        return new Response(JSON.stringify({ 
            success: true, 
            account: account || null
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('获取用户账号错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// =============================================================================
// 邀请码管理 API
// =============================================================================

// 获取邀请码列表
async function handleAdminGetInvites(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        // 首先确保表存在
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS invite_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                max_uses INTEGER NOT NULL DEFAULT 1,
                used_count INTEGER NOT NULL DEFAULT 0,
                trial_days INTEGER NOT NULL DEFAULT 0,
                remark TEXT,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            )
        `).run();
        
        const { results } = await env.DB.prepare(
            "SELECT * FROM invite_codes ORDER BY created_at DESC"
        ).all();
        
        return new Response(JSON.stringify({ 
            success: true, 
            invites: results || []
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('获取邀请码错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 创建邀请码
async function handleAdminCreateInvite(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        // 确保表存在
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS invite_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                max_uses INTEGER NOT NULL DEFAULT 1,
                used_count INTEGER NOT NULL DEFAULT 0,
                trial_days INTEGER NOT NULL DEFAULT 0,
                remark TEXT,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            )
        `).run();
        
        const formData = await request.formData();
        let code = formData.get('code')?.trim();
        const maxUses = parseInt(formData.get('max_uses')) || 1;
        const trialDays = parseInt(formData.get('trial_days')) || 0;
        const remark = formData.get('remark')?.trim() || '';
        
        // 如果没有提供邀请码，随机生成8位
        if (!code) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        
        // 检查邀请码是否已存在
        const existing = await env.DB.prepare(
            "SELECT id FROM invite_codes WHERE code = ?"
        ).bind(code).first();
        
        if (existing) {
            return new Response(JSON.stringify({ error: '邀请码已存在' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        await env.DB.prepare(
            "INSERT INTO invite_codes (code, max_uses, trial_days, remark, created_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(code, maxUses, trialDays, remark, Date.now()).run();
        
        return new Response(JSON.stringify({ 
            success: true, 
            code: code
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('创建邀请码错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 切换邀请码状态
async function handleAdminToggleInvite(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));
        const enabled = formData.get('enabled') === 'true' ? 1 : 0;
        
        await env.DB.prepare(
            "UPDATE invite_codes SET enabled = ? WHERE id = ?"
        ).bind(enabled, id).run();
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('切换邀请码状态错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 删除邀请码
async function handleAdminDeleteInvite(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));
        
        await env.DB.prepare(
            "DELETE FROM invite_codes WHERE id = ?"
        ).bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('删除邀请码错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 编辑邀请码
async function handleAdminUpdateInvite(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));
        const code = formData.get('code')?.trim();
        const maxUses = parseInt(formData.get('max_uses')) || 1;
        const trialDays = parseInt(formData.get('trial_days')) || 0;
        const remark = formData.get('remark')?.trim() || '';
        
        if (!code) {
            return new Response(JSON.stringify({ error: '邀请码不能为空' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        // 检查邀请码是否已被其他记录使用
        const existing = await env.DB.prepare(
            "SELECT id FROM invite_codes WHERE code = ? AND id != ?"
        ).bind(code, id).first();
        
        if (existing) {
            return new Response(JSON.stringify({ error: '邀请码已存在' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        await env.DB.prepare(
            "UPDATE invite_codes SET code = ?, max_uses = ?, trial_days = ?, remark = ? WHERE id = ?"
        ).bind(code, maxUses, trialDays, remark, id).run();
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('编辑邀请码错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 管理员获取支付通道列表
async function handleAdminGetPaymentChannels(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const { results } = await env.DB.prepare(
            "SELECT * FROM payment_channels ORDER BY created_at DESC"
        ).all();
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: results || []
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('获取支付通道错误:', e);
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 用户获取启用的支付通道
async function handleGetPaymentChannels(request, env) {
    try {
        const { results } = await env.DB.prepare(
            "SELECT id, name, code FROM payment_channels WHERE enabled = 1"
        ).all();
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: results || []
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 保存支付通道
async function handleAdminSavePaymentChannel(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = formData.get('id');
        const name = formData.get('name');
        const code = formData.get('code');
        const apiUrl = formData.get('api_url');
        const apiToken = formData.get('api_token');
        
        if (!name || !code || !apiUrl || !apiToken) {
            return new Response(JSON.stringify({ error: '参数不完整' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        if (id) {
            // 更新
            await env.DB.prepare(
                "UPDATE payment_channels SET name = ?, code = ?, api_url = ?, api_token = ? WHERE id = ?"
            ).bind(name, code, apiUrl, apiToken, id).run();
        } else {
            // 新增
            await env.DB.prepare(
                "INSERT INTO payment_channels (name, code, api_url, api_token, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)"
            ).bind(name, code, apiUrl, apiToken, Date.now()).run();
        }
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        console.error('保存支付通道错误:', e);
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 删除支付通道
async function handleAdminDeletePaymentChannel(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = formData.get('id');
        
        await env.DB.prepare("DELETE FROM payment_channels WHERE id = ?").bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 切换支付通道状态
async function handleAdminTogglePaymentChannel(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = formData.get('id');
        const enabled = formData.get('enabled') === 'true' ? 1 : 0;
        
        await env.DB.prepare(
            "UPDATE payment_channels SET enabled = ? WHERE id = ?"
        ).bind(enabled, id).run();
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// 更新支付通道
async function handleAdminUpdatePaymentChannel(request, env) {
    if (!(await checkAuth(request, env))) {
        return new Response(JSON.stringify({ error: '未授权' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
    
    try {
        const formData = await request.formData();
        const id = formData.get('id');
        const name = formData.get('name');
        const code = formData.get('code');
        const apiUrl = formData.get('api_url');
        const apiToken = formData.get('api_token');
        
        if (!id || !name || !code || !apiUrl) {
            return new Response(JSON.stringify({ error: '参数不完整' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }
        
        // 如果提供了新的 API Token 则更新
        if (apiToken) {
            await env.DB.prepare(
                "UPDATE payment_channels SET name = ?, code = ?, api_url = ?, api_token = ? WHERE id = ?"
            ).bind(name, code, apiUrl, apiToken, id).run();
        } else {
            await env.DB.prepare(
                "UPDATE payment_channels SET name = ?, code = ?, api_url = ? WHERE id = ?"
            ).bind(name, code, apiUrl, id).run();
        }
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: '服务器错误' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}

// =============================================================================
// 支付回调处理
// =============================================================================

// BEpusdt 签名验证
async function verifyBepusdtSignature(params, token, signature) {
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys
        .filter(key => key !== 'signature' && params[key] !== undefined && params[key] !== '')
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    const toSign = signStr + token;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(toSign);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.toLowerCase() === signature.toLowerCase();
}

// 支付回调通知
async function handlePaymentNotify(request, env) {
    try {
        const body = await request.json();
        
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
            return new Response('ok', { status: 200 });
        }
        
        const orderId = parseInt(orderIdMatch[1]);
        
        // 获取订单信息
        const order = await env.DB.prepare(
            "SELECT o.*, p.duration_days, u.uuid FROM orders o JOIN subscription_plans p ON o.plan_id = p.id JOIN user_accounts ua ON o.user_id = ua.id JOIN users u ON ua.uuid = u.uuid WHERE o.id = ?"
        ).bind(orderId).first();
        
        if (!order) {
            console.error('订单不存在:', orderId);
            return new Response('ok', { status: 200 });
        }
        
        // 获取支付通道配置进行签名验证
        const channel = await env.DB.prepare(
            "SELECT api_token FROM payment_channels WHERE enabled = 1 LIMIT 1"
        ).first();
        
        if (channel) {
            const verifyParams = { trade_id, order_id, amount, actual_amount, token, block_transaction_id, status };
            const isValid = await verifyBepusdtSignature(verifyParams, channel.api_token, signature);
            if (!isValid) {
                console.error('签名验证失败');
                // 即使签名失败也返回 ok，避免重复回调
            }
        }
        
        // 支付成功 (status === 2)
        if (status === 2 && order.status === 'pending') {
            // 更新用户到期时间
            const user = await env.DB.prepare("SELECT expiry FROM users WHERE uuid = ?").bind(order.uuid).first();
            const currentExpiry = user && user.expiry ? user.expiry : Date.now();
            const newExpiry = Math.max(currentExpiry, Date.now()) + (order.duration_days * 24 * 60 * 60 * 1000);
            
            await env.DB.prepare(
                "UPDATE users SET expiry = ? WHERE uuid = ?"
            ).bind(newExpiry, order.uuid).run();
            
            // 更新订单状态
            await env.DB.prepare(
                "UPDATE orders SET status = 'approved', paid_at = ?, payment_trade_id = ? WHERE id = ?"
            ).bind(Date.now(), trade_id, orderId).run();
            
            console.log('订单支付成功:', orderId, '用户到期时间更新为:', new Date(newExpiry).toISOString());
        }

        return new Response('ok', { status: 200 });

    } catch (error) {
        console.error('处理支付回调错误:', error);
        return new Response('ok', { status: 200 });
    }
}

// =============================================================================
// 用户支付订单
// =============================================================================

// 生成 BEpusdt 签名
async function generateBepusdtSignature(params, token) {
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys
        .filter(key => key !== 'signature' && params[key] !== undefined && params[key] !== '')
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    const toSign = signStr + token;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(toSign);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.toLowerCase();
}

// 用户支付订单
async function handleUserPayOrder(request, env) {
    try {
        const cookie = request.headers.get('Cookie');
        if (!cookie) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const match = cookie.match(/user_session=([^;]+)/);
        if (!match) {
            return new Response(JSON.stringify({ error: '未登录' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const session = await dbValidateSession(env, match[1]);
        if (!session) {
            return new Response(JSON.stringify({ error: '会话已过期' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        const formData = await request.formData();
        const orderId = parseInt(formData.get('order_id'));
        const channelId = parseInt(formData.get('channel_id'));
        const tradeType = formData.get('trade_type') || 'usdt.trc20';

        if (!orderId) {
            return new Response(JSON.stringify({ error: '订单ID不能为空' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 获取订单
        const order = await env.DB.prepare(
            "SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'"
        ).bind(orderId, session.user_id).first();

        if (!order) {
            return new Response(JSON.stringify({ error: '订单不存在或已处理' }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 获取支付通道
        let channel;
        if (channelId) {
            channel = await env.DB.prepare(
                "SELECT * FROM payment_channels WHERE id = ? AND enabled = 1"
            ).bind(channelId).first();
        } else {
            channel = await env.DB.prepare(
                "SELECT * FROM payment_channels WHERE enabled = 1 LIMIT 1"
            ).first();
        }

        if (!channel) {
            return new Response(JSON.stringify({ error: '支付通道未配置或已禁用' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        // 获取系统设置中的支付订单过期时间
        const settings = await dbGetSettings(env) || {};
        const paymentOrderExpiry = settings.paymentOrderExpiry || 15; // 默认15分钟

        // 构建支付请求
        const url = new URL(request.url);
        const notifyUrl = `${url.origin}/api/payment/notify`;
        const redirectUrl = `${url.origin}/user`; // 支付完成后跳转到用户面板
        const paymentOrderId = `ORDER_${orderId}`;

        const payParams = {
            order_id: paymentOrderId,
            amount: order.amount,
            notify_url: notifyUrl,
            redirect_url: redirectUrl,
            trade_type: tradeType
        };

        // 生成签名（不包含 expiration_time）
        payParams.signature = await generateBepusdtSignature(payParams, channel.api_token);

        // 调用 BEpusdt 创建订单（不传 expiration_time，使用 BEpusdt 默认值）
        let response;
        let result;
        try {
            response = await fetch(`${channel.api_url}/api/v1/order/create-transaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payParams)
            });
            result = await response.json();
        } catch (fetchError) {
            console.error('调用BEpusdt失败:', fetchError);
            return new Response(JSON.stringify({
                success: false,
                error: '无法连接支付网关: ' + fetchError.message
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

        console.log('BEpusdt响应:', JSON.stringify(result));

        if (result.status_code === 200) {
            // 更新订单支付信息
            await env.DB.prepare(
                "UPDATE orders SET payment_order_id = ?, payment_type = ? WHERE id = ?"
            ).bind(paymentOrderId, tradeType, orderId).run();

            return new Response(JSON.stringify({
                success: true,
                data: {
                    trade_id: result.data.trade_id,
                    amount: result.data.amount,
                    actual_amount: result.data.actual_amount,
                    token: result.data.token,
                    payment_url: result.data.payment_url,
                    expiration_time: result.data.expiration_time
                }
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: result.message || result.msg || '支付网关返回错误: ' + JSON.stringify(result)
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json; charset=utf-8' } 
            });
        }

    } catch (error) {
        console.error('支付订单错误:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        });
    }
}
