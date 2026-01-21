#!/usr/bin/env node

/**
 * 快速配置 Turnstile 密钥
 */

const db = require('./database');

// 你的 Turnstile 密钥
const SITE_KEY = '0x4AAAAAACN1N2HXhvvi1PqZ';
const SECRET_KEY = '0x4AAAAAACN1N0NnbiibScZofI5T3jWGtNs';

console.log('🔧 正在配置 Turnstile 密钥...\n');

try {
    // 获取当前设置
    const settings = db.getSettings() || {};
    
    // 添加 Turnstile 密钥
    settings.turnstileSiteKey = SITE_KEY;
    settings.turnstileSecretKey = SECRET_KEY;
    
    // 保存设置
    db.saveSettings(settings);
    
    console.log('✅ Turnstile 密钥配置成功！\n');
    console.log('配置信息：');
    console.log('  Site Key:   ' + SITE_KEY);
    console.log('  Secret Key: ' + SECRET_KEY.substring(0, 20) + '...\n');
    console.log('🎉 现在访问注册页面应该可以看到人机验证了！');
    console.log('📝 如果没有显示，请刷新页面或清除浏览器缓存。\n');
    
} catch (error) {
    console.error('❌ 配置失败:', error.message);
    process.exit(1);
}
