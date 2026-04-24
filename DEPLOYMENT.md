# WorkReportPro 本地化部署流程指南

## 📋 目录

1. [系统要求](#系统要求)
2. [环境准备](#环境准备)
3. [数据库安装](#数据库安装)
4. [项目部署](#项目部署)
5. [配置说明](#配置说明)
6. [常见问题](#常见问题)
7. [性能优化](#性能优化)
8. [备份恢复](#备份恢复)

## 系统要求

### 硬件要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 磁盘 | 20GB | 100GB+ |
| 网络 | 100Mbps | 1Gbps |

### 软件要求

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | 22.13.0+ | 运行时环境 |
| npm/pnpm | 10.4.1+ | 包管理器 |
| MySQL | 8.0+ | 数据库（或 TiDB） |
| Git | 2.0+ | 版本控制 |
| Docker | 20.10+ | 容器化（可选） |

### 操作系统支持

- ✅ Ubuntu 20.04 LTS / 22.04 LTS
- ✅ CentOS 7 / 8
- ✅ Windows Server 2019 / 2022
- ✅ macOS 12+

## 环境准备

### 1. 安装 Node.js

#### Ubuntu/Debian
```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # v22.13.0+
npm --version   # 10.4.1+
```

#### CentOS/RHEL
```bash
# 使用 NodeSource 仓库
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version
npm --version
```

#### macOS
```bash
# 使用 Homebrew
brew install node

# 或使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22.13.0
nvm use 22.13.0
```

### 2. 安装 pnpm

```bash
# 全局安装 pnpm
npm install -g pnpm@10.4.1

# 验证安装
pnpm --version  # 10.4.1+

# 配置 pnpm（可选）
pnpm config set store-dir ~/.pnpm-store
```

### 3. 安装 MySQL

#### Ubuntu/Debian
```bash
# 安装 MySQL Server
sudo apt-get update
sudo apt-get install -y mysql-server

# 启动服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 初始化（首次安装）
sudo mysql_secure_installation

# 验证安装
mysql --version
```

#### CentOS/RHEL
```bash
# 安装 MySQL 8.0
sudo yum install -y mysql-server

# 启动服务
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 初始化
sudo mysql_secure_installation

# 验证安装
mysql --version
```

#### macOS
```bash
# 使用 Homebrew
brew install mysql

# 启动服务
brew services start mysql

# 初始化
mysql_secure_installation

# 验证安装
mysql --version
```

#### Docker 安装（推荐）
```bash
# 拉取 MySQL 镜像
docker pull mysql:8.0

# 运行容器
docker run -d \
  --name work-report-mysql \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=work_report_pro \
  -p 3306:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0

# 验证容器运行
docker ps | grep work-report-mysql
```

### 4. 创建数据库用户

```bash
# 连接到 MySQL
mysql -u root -p

# 执行以下 SQL 命令
CREATE USER 'work_report'@'localhost' IDENTIFIED BY 'secure_password_123';
GRANT ALL PRIVILEGES ON work_report_pro.* TO 'work_report'@'localhost';
FLUSH PRIVILEGES;

# 验证用户
SELECT user FROM mysql.user WHERE user='work_report';

# 退出
EXIT;
```

### 5. 克隆项目

```bash
# 克隆仓库
git clone https://github.com/your-org/work-report-pro.git
cd work-report-pro

# 检查分支
git branch -a

# 切换到主分支（如需要）
git checkout main
```

## 数据库安装

### 1. 初始化数据库

#### 方法一：使用 SQL 脚本（推荐）

```bash
# 进入项目目录
cd work-report-pro

# 执行初始化脚本
mysql -u work_report -p work_report_pro < scripts/init-db.sql

# 输入密码：secure_password_123

# 验证初始化
mysql -u work_report -p work_report_pro -e "SHOW TABLES;"
```

#### 方法二：使用 Drizzle Kit

```bash
# 生成迁移文件
pnpm drizzle-kit generate

# 执行迁移
pnpm drizzle-kit migrate

# 验证
pnpm drizzle-kit studio  # 打开可视化管理界面
```

### 2. 验证数据库

```bash
# 连接到数据库
mysql -u work_report -p work_report_pro

# 查看表
SHOW TABLES;

# 查看员工表
SELECT * FROM employees;

# 查看初始数据
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM departments;
SELECT COUNT(*) FROM organizations;

# 退出
EXIT;
```

## 项目部署

### 1. 安装依赖

```bash
# 进入项目目录
cd work-report-pro

# 清空缓存（可选）
pnpm store prune
rm -rf node_modules pnpm-lock.yaml

# 安装依赖
pnpm install

# 验证安装
pnpm list | head -20
```

### 2. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env.local

# 编辑 .env.local
nano .env.local
```

**必需的环境变量**:

```env
# 数据库配置
DATABASE_URL=mysql://work_report:secure_password_123@localhost:3306/work_report_pro

# 应用配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# JWT 配置
JWT_SECRET=your-very-secure-jwt-secret-key-change-this

# OAuth 配置（如需要）
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# 其他配置
VITE_APP_TITLE=WorkReportPro
VITE_APP_LOGO=https://example.com/logo.png
```

### 3. 构建项目

```bash
# 开发环境构建
pnpm build

# 验证构建
ls -la dist/

# 检查构建大小
du -sh dist/
```

### 4. 启动服务

#### 开发环境

```bash
# 启动开发服务器
pnpm dev

# 访问应用
# http://localhost:3000

# 查看日志
tail -f .manus-logs/devserver.log
```

#### 生产环境

```bash
# 启动生产服务
pnpm start

# 使用 PM2 管理进程（推荐）
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'work-report-pro',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs work-report-pro

# 设置开机自启
pm2 startup
pm2 save
```

#### 使用 Docker

```bash
# 构建镜像
docker build -t work-report-pro:latest .

# 运行容器
docker run -d \
  --name work-report-pro \
  -p 3000:3000 \
  -e DATABASE_URL=mysql://work_report:password@mysql:3306/work_report_pro \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  --link work-report-mysql:mysql \
  work-report-pro:latest

# 查看容器
docker ps | grep work-report-pro

# 查看日志
docker logs -f work-report-pro
```

### 5. 配置反向代理

#### Nginx 配置

```nginx
# /etc/nginx/sites-available/work-report-pro
upstream work_report_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name work-report.example.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name work-report.example.com;
    
    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/work-report.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/work-report.example.com/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 日志
    access_log /var/log/nginx/work-report-access.log;
    error_log /var/log/nginx/work-report-error.log;
    
    # 代理配置
    location / {
        proxy_pass http://work_report_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;
}
```

启用配置:
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/work-report-pro /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### Apache 配置

```apache
# /etc/apache2/sites-available/work-report-pro.conf
<VirtualHost *:80>
    ServerName work-report.example.com
    Redirect permanent / https://work-report.example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName work-report.example.com
    
    # SSL 配置
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/work-report.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/work-report.example.com/privkey.pem
    
    # 日志
    ErrorLog ${APACHE_LOG_DIR}/work-report-error.log
    CustomLog ${APACHE_LOG_DIR}/work-report-access.log combined
    
    # 代理配置
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
    
    # WebSocket 支持
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:3000/$1" [P,L]
</VirtualHost>
```

启用配置:
```bash
# 启用模块
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod ssl

# 启用站点
sudo a2ensite work-report-pro

# 测试配置
sudo apache2ctl configtest

# 重启 Apache
sudo systemctl restart apache2
```

## 配置说明

### 核心配置文件

#### 1. .env.local

```env
# 数据库
DATABASE_URL=mysql://user:password@host:3306/database

# 应用
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# JWT
JWT_SECRET=your-secret-key-min-32-chars-long

# 日志级别
LOG_LEVEL=info

# 会话配置
SESSION_TIMEOUT=86400000  # 24小时（毫秒）
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax

# 文件上传
MAX_UPLOAD_SIZE=52428800  # 50MB
UPLOAD_PATH=./uploads

# 邮件配置（可选）
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@company.com
```

#### 2. tailwind.config.ts

自定义主题颜色（国际主义平面风格）:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#DC2626',    // 红色
        background: '#FFFFFF', // 白色
        foreground: '#000000', // 黑色
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
}
```

#### 3. drizzle.config.ts

数据库连接配置:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  driver: 'mysql2',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'work_report_pro',
  },
});
```

## 常见问题

### Q1: 数据库连接失败

**症状**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决方案**:
```bash
# 检查 MySQL 服务状态
sudo systemctl status mysql

# 启动 MySQL 服务
sudo systemctl start mysql

# 检查连接字符串
echo $DATABASE_URL

# 测试连接
mysql -u work_report -p -h localhost work_report_pro
```

### Q2: 端口被占用

**症状**: `Error: listen EADDRINUSE :::3000`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或使用其他端口
PORT=3001 pnpm start
```

### Q3: 内存不足

**症状**: `JavaScript heap out of memory`

**解决方案**:
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS=--max-old-space-size=4096 pnpm start

# 或在 PM2 配置中设置
# ecosystem.config.js
node_args: '--max-old-space-size=4096'
```

### Q4: 密码重置

**症状**: 忘记管理员密码

**解决方案**:
```bash
# 连接数据库
mysql -u root -p work_report_pro

# 重置 admin 密码为 Admin@123
UPDATE employees 
SET password_md5 = MD5('Admin@123') 
WHERE employee_no = 'admin';

# 验证
SELECT employee_no, password_md5 FROM employees WHERE employee_no = 'admin';
```

## 性能优化

### 1. 数据库优化

```sql
-- 添加索引
ALTER TABLE daily_reports ADD INDEX idx_employee_date (employee_id, report_date DESC);
ALTER TABLE daily_work_items ADD INDEX idx_report_order (daily_report_id, item_order);
ALTER TABLE notifications ADD INDEX idx_recipient_read (recipient_id, is_read);

-- 启用查询缓存
SET GLOBAL query_cache_type = 1;
SET GLOBAL query_cache_size = 268435456;  # 256MB

-- 查看慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

### 2. 应用优化

```typescript
// 启用 gzip 压缩
import compression from 'compression';
app.use(compression());

// 缓存中间件
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=3600');
  }
  next();
});

// 连接池配置
const pool = mysql.createPool({
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});
```

### 3. 前端优化

```typescript
// 代码分割
const DailyReport = lazy(() => import('./pages/DailyReport'));

// 图片优化
<img src={imageUrl} alt="..." loading="lazy" />

// 虚拟列表（大数据）
import { FixedSizeList } from 'react-window';
```

## 备份恢复

### 1. 数据库备份

```bash
# 完整备份
mysqldump -u work_report -p work_report_pro > backup_$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
mysqldump -u work_report -p work_report_pro | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 定时备份（crontab）
# 每天凌晨 2 点执行备份
0 2 * * * mysqldump -u work_report -p'password' work_report_pro | gzip > /backups/work_report_pro_$(date +\%Y\%m\%d).sql.gz
```

### 2. 数据库恢复

```bash
# 从备份恢复
mysql -u work_report -p work_report_pro < backup_20260424_120000.sql

# 从压缩备份恢复
gunzip < backup_20260424_120000.sql.gz | mysql -u work_report -p work_report_pro
```

### 3. 应用备份

```bash
# 备份整个项目
tar -czf work-report-pro_backup_$(date +%Y%m%d).tar.gz work-report-pro/

# 备份配置文件
cp .env.local .env.local.backup
cp ecosystem.config.js ecosystem.config.js.backup
```

---

## 支持与帮助

- 📖 [完整文档](./README.md)
- 🐛 [问题报告](https://github.com/your-org/work-report-pro/issues)
- 💬 [讨论区](https://github.com/your-org/work-report-pro/discussions)
- 📧 [联系我们](mailto:support@company.com)

**最后更新**: 2026-04-24  
**版本**: 1.0.0
