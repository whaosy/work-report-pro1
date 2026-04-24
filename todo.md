# WorkReportPro - 项目任务清单

## 数据库 & 后端基础
- [x] 设计并迁移完整数据库 Schema（departments, organizations, employees, projects, project_members, daily_reports, daily_work_items, weekly_monthly_reports, comments, notifications）
- [x] 实现员工工号+密码（MD5）登录认证，禁用 OAuth
- [x] 五级角色权限中间件（member/team_leader/manager/director/admin）
- [x] 组织架构 CRUD API（多级部门树）
- [x] 员工账号 CRUD + 批量导入/导出 API
- [x] 机构 CRUD API
- [x] 项目档案 CRUD API（含成员关联、子任务）
- [x] 日报主表 + 工作条目 CRUD API
- [x] 快捷记录碎片 API（is_fragment 模式）
- [x] 周报/月报 CRUD API
- [x] 点评记录 CRUD API
- [x] 数据分析 API（工时统计、项目分布、部门饱和度）
- [x] AI 摘要 API（调用 LLM 生成周报/月报草稿）
- [x] AI 异常检测 API（字数过少、相似度>80%预警）
- [x] 站内通知 CRUD API
- [x] 催办通知 API

## 前端页面
- [x] 全局布局（国际主义平面风格：白底+红色方块+黑色无衬线字体+网格系统）
- [x] 登录页（工号+密码登录）
- [x] DashboardLayout 侧边栏导航（按角色动态显示菜单）
- [x] 日报填报页（标准聚合模式：动态条目列表+拖拽排序+工时±0.5h步长+自动保存草稿）
- [x] 全局悬浮快捷记录卡片（碎片采集+语音转文字）
- [x] AI 智能填充卡片（聚合碎片一键填入日报）
- [x] 周报填报页（自动聚合日报+AI摘要草稿）
- [x] 月报填报页（自动聚合周报+AI摘要草稿）
- [x] 汇报查看列表页（管理层：按部门树+时间范围筛选）
- [x] 汇报详情+点评页
- [x] 提交状态看板（已提交/未提交/迟交图形化展示）
- [x] 数据分析看板（工时柱状图/饼图/折线图、词云、风险预警列表）
- [x] 组织架构管理页（多级部门树维护）
- [x] 员工管理页（批量导入/导出、Combobox选择）
- [x] 机构管理页
- [x] 项目管理页（含成员关联）
- [x] 通知中心页（站内信列表）
- [x] 所有选择框使用 Combobox 模式（手输+自动过滤，禁止纯下拉框）
- [x] 响应式布局（适配手机浏览器）

## 测试
- [x] 认证流程 vitest 测试
- [x] 日报 CRUD vitest 测试
- [x] 权限控制 vitest 测试

## 系统已交付
✅ 完整的企业级日报/周报/月报管理系统
✅ 五级权限体系（组员/组长/经理/总监/管理员）
✅ 三种日报填报模式（标准聚合+悬浮快捷+AI填充）
✅ 国际主义平面风格设计
✅ 完整的后端 API 层
✅ 响应式前端界面
✅ 数据分析看板
✅ AI 智能辅助功能
