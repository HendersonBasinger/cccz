# 构建阶段
FROM node:20-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# 只复制package文件以利用Docker缓存
COPY package*.json ./

# 安装所有依赖（包括dev依赖用于构建）
RUN npm ci --only=production && npm cache clean --force

# 运行阶段
FROM node:20-alpine

# 安装运行时依赖
RUN apk add --no-cache dumb-init sqlite && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 从构建阶段复制node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=nodejs:nodejs . .

# 创建数据目录并设置权限
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3000 \
    ADMIN_USERNAME=admin \
    ADMIN_PASSWORD=admin123 \
    ADMIN_PATH=/admin \
    DATABASE_PATH=/app/data/vles.db

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/users', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用dumb-init作为PID 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
