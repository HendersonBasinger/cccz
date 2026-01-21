#!/bin/bash

# 快速配置 Turnstile 密钥
# 这个脚本会通过 API 将密钥保存到数据库

SITE_KEY="0x4AAAAAACN1N2HXhvvi1PqZ"
SECRET_KEY="0x4AAAAAACN1N0NnbiibScZofI5T3jWGtNs"

echo "🔧 正在配置 Turnstile 密钥..."
echo ""

# 在容器内执行数据库更新
docker exec vles-manager node -e "
const db = require('./database');
try {
    const settings = db.getSettings() || {};
    settings.turnstileSiteKey = '$SITE_KEY';
    settings.turnstileSecretKey = '$SECRET_KEY';
    db.saveSettings(settings);
    console.log('✅ Turnstile 密钥配置成功！');
    console.log('');
    console.log('配置信息：');
    console.log('  Site Key:   $SITE_KEY');
    console.log('  Secret Key: ${SECRET_KEY:0:20}...');
    console.log('');
    console.log('🎉 现在访问注册页面应该可以看到人机验证了！');
} catch (error) {
    console.error('❌ 配置失败:', error.message);
    process.exit(1);
}
"

if [ $? -eq 0 ]; then
    echo ""
    echo "📝 提示："
    echo "   1. 刷新注册页面查看效果"
    echo "   2. 或者在后台管理界面也可以修改密钥"
    echo ""
else
    echo ""
    echo "❌ 配置失败，请检查容器是否正在运行"
    echo "   运行以下命令检查: docker ps | grep vles-manager"
    echo ""
fi
