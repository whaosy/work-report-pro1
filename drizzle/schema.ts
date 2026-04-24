import {
  bigint,
  boolean,
  date,
  datetime,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── 用户表（保留原有结构，兼容框架）───────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── 机构表 ────────────────────────────────────────────────────────────────
export const organizations = mysqlTable("organizations", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  contactPerson: varchar("contact_person", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 200 }),
  status: tinyint("status").default(1).notNull(), // 1-正常 0-停用
  remark: text("remark"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;

// ─── 部门表 ────────────────────────────────────────────────────────────────
export const departments = mysqlTable("departments", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  parentId: bigint("parent_id", { mode: "number" }),
  sortOrder: int("sort_order").default(0),
  status: tinyint("status").default(1).notNull(), // 1-正常 0-停用
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Department = typeof departments.$inferSelect;

// ─── 员工表 ────────────────────────────────────────────────────────────────
export const employees = mysqlTable("employees", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  employeeNo: varchar("employee_no", { length: 50 }).notNull().unique(), // 工号
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  passwordMd5: varchar("password_md5", { length: 32 }).notNull(), // MD5加密密码
  departmentId: bigint("department_id", { mode: "number" }),
  supervisorId: bigint("supervisor_id", { mode: "number" }), // 直属上级
  role: mysqlEnum("role", ["member", "team_leader", "manager", "director", "admin"]).default("member").notNull(),
  status: tinyint("status").default(1).notNull(), // 1-在职 0-离职
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;

// ─── 项目表 ────────────────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  projectNo: varchar("project_no", { length: 100 }),
  name: varchar("name", { length: 300 }).notNull(),
  managerId: bigint("manager_id", { mode: "number" }), // 负责人
  organizationId: bigint("organization_id", { mode: "number" }), // 所属机构
  status: mysqlEnum("status", ["discussion", "evaluation", "development", "testing", "integration", "launch", "completed", "ended", "closed"]).default("discussion").notNull(),
  businessType: mysqlEnum("business_type", ["prepaid_card", "equity"]), // 预付卡业务/权益业务
  projectType: mysqlEnum("project_type", ["stock_support", "stock_new", "new_project", "new_merchant", "event_support", "product_optimization"]),
  startDate: date("start_date"),
  endDate: date("end_date"),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;

// ─── 项目成员表 ────────────────────────────────────────────────────────────
export const projectMembers = mysqlTable("project_members", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).notNull(),
  employeeId: bigint("employee_id", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── 项目子任务表 ──────────────────────────────────────────────────────────
export const projectTasks = mysqlTable("project_tasks", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  assigneeId: bigint("assignee_id", { mode: "number" }),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// ─── 日报主表 ──────────────────────────────────────────────────────────────
export const dailyReports = mysqlTable("daily_reports", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  employeeId: bigint("employee_id", { mode: "number" }).notNull(),
  reportDate: date("report_date").notNull(),
  tomorrowPlan: text("tomorrow_plan"),
  status: tinyint("status").default(0).notNull(), // 0-草稿 1-已提交 2-已点评
  submittedAt: datetime("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type DailyReport = typeof dailyReports.$inferSelect;

// ─── 工作条目表 ────────────────────────────────────────────────────────────
export const dailyWorkItems = mysqlTable("daily_work_items", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  dailyReportId: bigint("daily_report_id", { mode: "number" }), // 可为空（碎片）
  employeeId: bigint("employee_id", { mode: "number" }).notNull(),
  projectId: bigint("project_id", { mode: "number" }),
  description: text("description").notNull(),
  hours: decimal("hours", { precision: 5, scale: 2 }).default("0"),
  completionRate: int("completion_rate").default(0), // 0-100
  itemType: tinyint("item_type").default(1), // 1-手动 2-AI生成 3-快捷记录
  isFragment: boolean("is_fragment").default(false), // 碎片标记
  sortOrder: int("sort_order").default(0),
  recordDate: date("record_date"), // 碎片记录日期
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type DailyWorkItem = typeof dailyWorkItems.$inferSelect;

// ─── 周报/月报表 ───────────────────────────────────────────────────────────
export const weeklyMonthlyReports = mysqlTable("weekly_monthly_reports", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  employeeId: bigint("employee_id", { mode: "number" }).notNull(),
  reportType: mysqlEnum("report_type", ["weekly", "monthly"]).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  periodLabel: varchar("period_label", { length: 50 }), // 如 "2024-W01"
  currentSummary: text("current_summary"), // 本周/月工作总结
  nextPlan: text("next_plan"), // 下周/月工作计划
  relatedProjects: text("related_projects"), // JSON数组
  coordinationNeeds: text("coordination_needs"), // 需协调事项
  keyOutputs: text("key_outputs"), // 月报：关键产出
  nextMonthGoals: text("next_month_goals"), // 月报：下月目标
  keyIssueAnalysis: text("key_issue_analysis"), // 月报：重点事项分析
  projectProgress: text("project_progress"), // 月报：项目整体进度
  aiDraftContent: text("ai_draft_content"), // AI生成草稿
  status: tinyint("status").default(0).notNull(), // 0-草稿 1-已提交 2-已点评
  submittedAt: datetime("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WeeklyMonthlyReport = typeof weeklyMonthlyReports.$inferSelect;

// ─── 点评记录表 ────────────────────────────────────────────────────────────
export const comments = mysqlTable("comments", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  reportType: mysqlEnum("report_type", ["daily", "weekly", "monthly"]).notNull(),
  reportId: bigint("report_id", { mode: "number" }).notNull(),
  commenterId: bigint("commenter_id", { mode: "number" }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;

// ─── 站内通知表 ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  recipientId: bigint("recipient_id", { mode: "number" }).notNull(),
  senderId: bigint("sender_id", { mode: "number" }), // 系统通知为空
  type: mysqlEnum("type", ["reminder", "overdue", "urge", "comment", "ai_warning", "system"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  isRead: boolean("is_read").default(false).notNull(),
  relatedType: varchar("related_type", { length: 50 }), // daily/weekly/monthly
  relatedId: bigint("related_id", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─── 员工会话表 ────────────────────────────────────────────────────────────
export const employeeSessions = mysqlTable("employee_sessions", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  employeeId: bigint("employee_id", { mode: "number" }).notNull(),
  token: varchar("token", { length: 256 }).notNull().unique(),
  expiresAt: datetime("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
