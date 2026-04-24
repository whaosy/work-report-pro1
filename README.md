# WorkReportPro - 企业级智能日报填报系统

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/Version-1.0.0-green.svg)
![Node](https://img.shields.io/badge/Node-22.13.0-brightgreen.svg)

## 📋 项目概述

**WorkReportPro** 是一套完整的企业级日报/周报/月报管理系统，支持从填报、审阅、智能分析到提醒催办的完整工作汇报闭环。系统采用国际主义平面风格设计，提供五级权限体系、多种填报模式、AI 辅助功能和数据分析看板。

### 核心特性

- **五级权限体系**: 组员 → 组长 → 经理 → 总监 → 管理员，基于组织树层级控制
- **三种日报填报模式**:
  - 标准聚合填写：动态工作条目列表，工时以 ±0.5h 为步长调整，支持拖拽排序
  - 全局悬浮快捷记录：碎片化采集，支持语音输入转文字
  - AI 智能填充：自动聚合碎片与第三方数据生成日报内容
- **周报/月报自动生成**: 系统自动聚合日报数据，AI 摘要辅助
- **数据分析看板**: 工时统计、项目分布、部门饱和度、词云、风险预警
- **通知提醒系统**: 定时填报提醒、逾期预警、一键催办
- **完整的组织架构**: 多级部门树、员工关系、项目成员管理

## 🏗️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + Vite | 19 + 7.1 |
| 样式系统 | Tailwind CSS | 4.1 |
| UI 组件库 | shadcn/ui | 最新 |
| 后端框架 | Express | 4.21 |
| RPC 框架 | tRPC | 11.6 |
| 数据库 | MySQL / TiDB | 8.0+ |
| ORM | Drizzle ORM | 0.44 |
| 测试框架 | Vitest | 2.1 |
| 数据可视化 | Recharts | 2.15 |
| 日期处理 | date-fns | 4.1 |

## 📦 项目结构

```
work-report-pro/
├── client/                          # 前端应用
│   ├── src/
│   │   ├── pages/                   # 页面组件
│   │   │   ├── Login.tsx            # 登录页
│   │   │   ├── Home.tsx             # 首页总览
│   │   │   ├── DailyReport.tsx      # 日报填报
│   │   │   ├── PeriodicReport.tsx   # 周报/月报
│   │   │   ├── ReportView.tsx       # 汇报查看
│   │   │   ├── Analytics.tsx        # 数据分析
│   │   │   ├── Notifications.tsx    # 通知中心
│   │   │   └── admin/               # 管理页面
│   │   ├── components/
│   │   │   ├── AppLayout.tsx        # 侧边栏布局
│   │   │   ├── Combobox.tsx         # 通用选择器
│   │   │   └── ...                  # 其他组件
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx      # 认证上下文
│   │   │   └── ThemeContext.tsx     # 主题上下文
│   │   ├── lib/
│   │   │   └── trpc.ts              # tRPC 客户端
│   │   ├── App.tsx                  # 路由配置
│   │   ├── main.tsx                 # 入口文件
│   │   └── index.css                # 全局样式
│   ├── public/                      # 静态资源
│   └── index.html                   # HTML 模板
├── server/                          # 后端应用
│   ├── routers/
│   │   ├── auth.ts                  # 认证路由
│   │   ├── admin.ts                 # 管理路由
│   │   ├── reports.ts               # 汇报路由
│   │   └── middleware.ts            # 权限中间件
│   ├── db.ts                        # 数据库查询辅助
│   ├── routers.ts                   # 主路由
│   ├── _core/
│   │   ├── index.ts                 # 服务器启动
│   │   ├── context.ts               # tRPC 上下文
│   │   ├── trpc.ts                  # tRPC 配置
│   │   └── ...                      # 其他核心文件
│   ├── *.test.ts                    # 测试文件
│   └── db.ts                        # 数据库查询
├── drizzle/
│   ├── schema.ts                    # 数据库 Schema
│   └── migrations/                  # 数据库迁移
├── shared/                          # 共享代码
│   └── const.ts                     # 常量定义
├── package.json                     # 项目配置
├── tsconfig.json                    # TypeScript 配置
├── vite.config.ts                   # Vite 配置
├── tailwind.config.ts               # Tailwind 配置
└── README.md                        # 项目说明
```

## 🚀 快速开始

### 前置要求

- Node.js 22.13.0+
- pnpm 10.4.1+
- MySQL 8.0+ 或 TiDB

### 本地开发

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd work-report-pro
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **配置环境变量**
   ```bash
   # 创建 .env.local 文件
   cp .env.example .env.local
   
   # 编辑 .env.local，配置以下变量:
   DATABASE_URL=mysql://user:password@localhost:3306/work_report_pro
   JWT_SECRET=your-secret-key
   NODE_ENV=development
   ```

4. **初始化数据库**
   ```bash
   # 生成迁移文件
   pnpm drizzle-kit generate
   
   # 执行迁移
   pnpm drizzle-kit migrate
   ```

5. **启动开发服务器**
   ```bash
   pnpm dev
   ```

   访问 http://localhost:3000

### 默认账号

| 字段 | 值 |
|------|-----|
| 工号 | admin |
| 密码 | Admin@123 |
| 角色 | 系统管理员 |

## 📚 核心功能说明

### 1. 认证与权限

系统采用**工号+密码**登录方式（禁用 OAuth），密码使用 MD5 加密存储。

**五级权限体系**:
- **member** (组员): 只能填写和查看自己的日报
- **team_leader** (组长): 可查看直属团队成员的汇报
- **manager** (经理): 可查看部门级别的汇报和数据分析
- **director** (总监): 可查看跨部门汇报和全公司数据分析
- **admin** (管理员): 拥有系统管理权限

### 2. 日报填报

#### 标准聚合模式
- 动态工作条目列表，每条包含：项目、描述、工时、完成度
- 工时以 ±0.5h 为步长调整（0h, 0.5h, 1h, 1.5h...）
- 支持拖拽排序
- 离开页面自动保存草稿
- 支持关联项目（Combobox 选择）

#### 全局悬浮快捷记录卡片
- 在任何页面快速记录工作碎片
- 支持语音输入，自动转换为文字
- 碎片自动保存到数据库

#### AI 智能填充
- 自动聚合悬浮卡片碎片
- 调用 LLM 生成结构化日报内容
- 用户确认修改后提交

### 3. 周报/月报

- 系统自动聚合日报数据生成周报/月报草稿
- AI 摘要辅助，生成结构化内容
- 用户可修改后提交
- 支持多版本草稿保存

### 4. 汇报查看与管理

- 管理层可按部门树、时间范围筛选查看团队汇报
- 支持点评功能，记录反馈意见
- 提交状态看板：已提交/未提交/迟交图形化展示
- 支持一键催办通知

### 5. 数据分析看板

**多维度统计**:
- 个人工时统计（柱状图、饼图、折线图）
- 项目工时分布
- 部门饱和度分析
- 关键词云展示
- 风险与问题预警列表

**AI 能力**:
- 自动生成周期综述
- 异常检测：字数过少、连续相似度 > 80% 预警

### 6. 通知系统

- 定时填报提醒（邮件+站内信）
- 逾期预警通知
- 一键催办功能
- 通知中心管理（已读/未读筛选）

## 🗄️ 数据库设计

### 核心表结构

| 表名 | 说明 |
|------|------|
| `organizations` | 机构表 |
| `departments` | 部门表（支持多级树） |
| `employees` | 员工表 |
| `employee_sessions` | 员工会话表 |
| `projects` | 项目表 |
| `project_members` | 项目成员关联表 |
| `project_tasks` | 项目任务表 |
| `daily_reports` | 日报主表 |
| `daily_work_items` | 日报工作条目表 |
| `weekly_monthly_reports` | 周报/月报表 |
| `comments` | 点评表 |
| `notifications` | 通知表 |

详见 `drizzle/schema.ts`

## 🔌 API 路由

### 认证相关
- `POST /api/trpc/auth.login` - 工号+密码登录
- `GET /api/trpc/auth.me` - 获取当前用户信息
- `POST /api/trpc/auth.logout` - 登出

### 日报相关
- `POST /api/trpc/dailyReport.save` - 保存日报草稿
- `GET /api/trpc/dailyReport.get` - 获取日报
- `POST /api/trpc/dailyReport.submit` - 提交日报
- `GET /api/trpc/dailyReport.list` - 列表查询
- `GET /api/trpc/dailyReport.listTeam` - 团队汇报查询

### 管理相关
- `GET /api/trpc/employee.list` - 员工列表
- `POST /api/trpc/employee.create` - 创建员工
- `POST /api/trpc/employee.update` - 更新员工
- `POST /api/trpc/employee.delete` - 删除员工
- `POST /api/trpc/employee.import` - 批量导入

### 数据分析
- `GET /api/trpc/analytics.hoursStats` - 工时统计
- `GET /api/trpc/analytics.projectHours` - 项目工时
- `GET /api/trpc/analytics.departmentStats` - 部门统计
- `POST /api/trpc/analytics.generateSummary` - AI 生成综述

详见 `server/routers.ts`

## 🧪 测试

### 运行测试
```bash
pnpm test
```

### 测试覆盖
- ✅ 员工登录认证 (`server/auth.login.test.ts`)
- ✅ 日报 CRUD 操作 (`server/daily-report.test.ts`)
- ✅ 权限控制 (`server/permissions.test.ts`)

## 📦 构建与部署

### 生产构建
```bash
pnpm build
```

### 启动生产服务
```bash
pnpm start
```

### Docker 部署

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

## 🎨 设计系统

### 国际主义平面风格

- **色彩**: 纯白色画布 + 大胆红色方块 (#DC2626) + 黑色文字
- **字体**: 无衬线字体（Inter, Helvetica Neue）
- **布局**: 严格的数学网格系统，充裕留白
- **分割线**: 细黑分割线，强调结构
- **美学**: 结构化、功能性、不对称、永恒现代

### 响应式设计

- 移动端: 320px+
- 平板: 768px+
- 桌面: 1024px+

## 📖 使用指南

### 员工入职流程

1. 管理员在"员工管理"页面新增员工或批量导入
2. 员工使用工号+密码登录
3. 首次登录后可修改密码（可选）
4. 员工开始填写日报

### 日报填报流程

1. 进入"日报填报"页面
2. 选择日期（默认当天）
3. 添加工作条目：
   - 选择项目（可选）
   - 输入工作描述
   - 设置工时（±0.5h 步长）
   - 设置完成度
4. 支持拖拽调整顺序
5. 点击"保存草稿"自动保存
6. 确认无误后点击"提交日报"

### 数据分析查看

1. 进入"数据分析"页面（需要 team_leader 及以上权限）
2. 选择日期范围、部门、员工进行筛选
3. 查看各类统计图表
4. 点击"AI 生成综述"获取智能分析

## 🔐 安全性

- 密码使用 MD5 加密存储
- 会话使用 HTTP-Only Cookie，支持 SameSite 和 Secure 标志
- 所有 API 请求需要认证（除登录页）
- 权限控制基于角色和组织树层级
- 数据库连接使用 SSL/TLS 加密

## 🐛 常见问题

### Q: 如何重置管理员密码？

A: 直接在数据库中更新 admin 账号的 password_md5 字段：
```sql
UPDATE employees 
SET password_md5 = MD5('NewPassword123') 
WHERE employee_no = 'admin';
```

### Q: 支持多语言吗？

A: 当前版本仅支持中文。可通过 i18n 库扩展多语言支持。

### Q: 如何集成企业 SSO？

A: 修改 `server/routers/auth.ts` 中的登录逻辑，调用企业 SSO API 进行认证。

### Q: 数据库可以使用其他数据库吗？

A: 可以。Drizzle ORM 支持 PostgreSQL、SQLite 等。修改 `package.json` 中的驱动依赖和 `drizzle.config.ts` 配置即可。

## 📝 更新日志

### v1.0.0 (2026-04-24)
- ✅ 初版发布
- ✅ 完整的日报/周报/月报管理系统
- ✅ 五级权限体系
- ✅ 三种日报填报模式
- ✅ AI 辅助功能
- ✅ 数据分析看板
- ✅ 通知提醒系统

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

- 项目主页: [GitHub]
- 问题反馈: [Issues]
- 邮箱: support@workreportpro.com

---

**最后更新**: 2026-04-24  
**版本**: 1.0.0  
**维护状态**: 积极维护
