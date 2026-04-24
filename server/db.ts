import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, employees, departments, organizations, projects,
  projectMembers, projectTasks, dailyReports, dailyWorkItems,
  weeklyMonthlyReports, comments, notifications, employeeSessions
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── 原有用户相关（保持框架兼容）──────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── 员工认证 ──────────────────────────────────────────────────────────────
export async function getEmployeeByNo(employeeNo: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(employees).where(and(eq(employees.employeeNo, employeeNo), eq(employees.status, 1))).limit(1);
  return result[0] ?? null;
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createSession(employeeId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return;
  await db.insert(employeeSessions).values({ employeeId, token, expiresAt });
}

export async function getSessionByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(employeeSessions).where(eq(employeeSessions.token, token)).limit(1);
  return result[0] ?? null;
}

export async function deleteSession(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(employeeSessions).where(eq(employeeSessions.token, token));
}

// ─── 部门 ──────────────────────────────────────────────────────────────────
export async function getDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).orderBy(departments.sortOrder, departments.id);
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createDepartment(data: { name: string; parentId?: number | null; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(departments).values({ name: data.name, parentId: data.parentId ?? null, sortOrder: data.sortOrder ?? 0 });
}

export async function updateDepartment(id: number, data: { name?: string; parentId?: number | null; sortOrder?: number; status?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(departments).set(data as any).where(eq(departments.id, id));
}

export async function deleteDepartment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(departments).where(eq(departments.id, id));
}

// ─── 机构 ──────────────────────────────────────────────────────────────────
export async function getOrganizations(keyword?: string) {
  const db = await getDb();
  if (!db) return [];
  if (keyword) return db.select().from(organizations).where(like(organizations.name, `%${keyword}%`)).orderBy(organizations.id);
  return db.select().from(organizations).orderBy(organizations.id);
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createOrganization(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(organizations).values(data);
}

export async function updateOrganization(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(organizations).set(data).where(eq(organizations.id, id));
}

export async function deleteOrganization(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(organizations).where(eq(organizations.id, id));
}

// ─── 员工 ──────────────────────────────────────────────────────────────────
export async function getEmployees(params?: { keyword?: string; departmentId?: number; role?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.keyword) conditions.push(or(like(employees.name, `%${params.keyword}%`), like(employees.employeeNo, `%${params.keyword}%`)));
  if (params?.departmentId) conditions.push(eq(employees.departmentId, params.departmentId));
  if (params?.role) conditions.push(eq(employees.role, params.role as any));
  const query = db.select().from(employees);
  if (conditions.length > 0) return query.where(and(...conditions)).orderBy(employees.id);
  return query.orderBy(employees.id);
}

export async function createEmployee(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(employees).values(data);
}

export async function updateEmployee(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(employees).set({ status: 0 }).where(eq(employees.id, id));
}

export async function getSubordinateIds(supervisorId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const allEmployees = await db.select({ id: employees.id, supervisorId: employees.supervisorId }).from(employees).where(eq(employees.status, 1));
  const result: number[] = [];
  const queue = [supervisorId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const subs = allEmployees.filter(e => e.supervisorId === current);
    for (const sub of subs) { result.push(sub.id); queue.push(sub.id); }
  }
  return result;
}

// ─── 项目 ──────────────────────────────────────────────────────────────────
export async function getProjects(params?: { keyword?: string; status?: string; employeeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  if (params?.employeeId) {
    const memberRows = await db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.employeeId, params.employeeId));
    const projectIds = memberRows.map(r => r.projectId);
    if (projectIds.length === 0) return [];
    const conditions: any[] = [inArray(projects.id, projectIds)];
    if (params.keyword) conditions.push(like(projects.name, `%${params.keyword}%`));
    if (params.status) conditions.push(eq(projects.status, params.status as any));
    return db.select().from(projects).where(and(...conditions)).orderBy(desc(projects.createdAt));
  }
  const conditions: any[] = [];
  if (params?.keyword) conditions.push(like(projects.name, `%${params.keyword}%`));
  if (params?.status) conditions.push(eq(projects.status, params.status as any));
  const query = db.select().from(projects);
  if (conditions.length > 0) return query.where(and(...conditions)).orderBy(desc(projects.createdAt));
  return query.orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createProject(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(projects).values(data);
}

export async function updateProject(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projects).where(eq(projects.id, id));
}

export async function getProjectMembers(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ employee: employees }).from(projectMembers).innerJoin(employees, eq(projectMembers.employeeId, employees.id)).where(eq(projectMembers.projectId, projectId));
}

export async function setProjectMembers(projectId: number, employeeIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
  if (employeeIds.length > 0) await db.insert(projectMembers).values(employeeIds.map(eid => ({ projectId, employeeId: eid })));
}

export async function getProjectTasks(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId)).orderBy(projectTasks.id);
}

export async function createProjectTask(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(projectTasks).values(data);
}

export async function updateProjectTask(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projectTasks).set(data).where(eq(projectTasks.id, id));
}

export async function deleteProjectTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectTasks).where(eq(projectTasks.id, id));
}

// ─── 日报 ──────────────────────────────────────────────────────────────────
export async function getDailyReport(employeeId: number, reportDate: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.execute(sql`SELECT * FROM daily_reports WHERE employee_id = ${employeeId} AND DATE(report_date) = ${reportDate} LIMIT 1`);
  const rows = (result as unknown as any[][])[0];
  return rows?.[0] ?? null;
}

export async function getDailyReportById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getDailyReports(params: { employeeIds?: number[]; startDate?: string; endDate?: string; status?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params.employeeIds && params.employeeIds.length > 0) conditions.push(inArray(dailyReports.employeeId, params.employeeIds));
  if (params.startDate) conditions.push(sql`DATE(${dailyReports.reportDate}) >= ${params.startDate}`);
  if (params.endDate) conditions.push(sql`DATE(${dailyReports.reportDate}) <= ${params.endDate}`);
  if (params.status !== undefined) conditions.push(eq(dailyReports.status, params.status));
  const query = db.select().from(dailyReports);
  if (conditions.length > 0) return query.where(and(...conditions)).orderBy(desc(dailyReports.reportDate));
  return query.orderBy(desc(dailyReports.reportDate));
}

export async function upsertDailyReport(employeeId: number, reportDate: string, data: { tomorrowPlan?: string; status?: number; submittedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getDailyReport(employeeId, reportDate);
  if (existing) {
    await db.update(dailyReports).set(data as any).where(eq(dailyReports.id, existing.id));
    return existing.id as number;
  } else {
    const result = await db.execute(sql`INSERT INTO daily_reports (employee_id, report_date, tomorrow_plan, status) VALUES (${employeeId}, ${reportDate}, ${data.tomorrowPlan ?? null}, ${data.status ?? 0})`);
    return ((result as unknown as any[])[0] as any).insertId as number;
  }
}

export async function getWorkItems(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyWorkItems).where(eq(dailyWorkItems.dailyReportId, reportId)).orderBy(dailyWorkItems.sortOrder, dailyWorkItems.id);
}

export async function getFragmentItems(employeeId: number, date?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(dailyWorkItems.employeeId, employeeId), eq(dailyWorkItems.isFragment, true), isNull(dailyWorkItems.dailyReportId)];
  if (date) conditions.push(sql`DATE(${dailyWorkItems.recordDate}) = ${date}`);
  return db.select().from(dailyWorkItems).where(and(...conditions)).orderBy(desc(dailyWorkItems.createdAt));
}

export async function createWorkItem(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(dailyWorkItems).values(data);
  return (result as any).insertId as number;
}

export async function updateWorkItem(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(dailyWorkItems).set(data).where(eq(dailyWorkItems.id, id));
}

export async function deleteWorkItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(dailyWorkItems).where(eq(dailyWorkItems.id, id));
}

export async function mergeFragmentsToReport(reportId: number, fragmentIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (fragmentIds.length === 0) return;
  await db.update(dailyWorkItems).set({ dailyReportId: reportId, isFragment: false }).where(inArray(dailyWorkItems.id, fragmentIds));
}

// ─── 周报/月报 ─────────────────────────────────────────────────────────────
export async function getWeeklyMonthlyReport(employeeId: number, reportType: string, periodStart: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.execute(sql`SELECT * FROM weekly_monthly_reports WHERE employee_id = ${employeeId} AND report_type = ${reportType} AND DATE(period_start) = ${periodStart} LIMIT 1`);
  const rows = (result as unknown as any[][])[0];
  return rows?.[0] ?? null;
}

export async function getWeeklyMonthlyReportById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(weeklyMonthlyReports).where(eq(weeklyMonthlyReports.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getWeeklyMonthlyReports(params: { employeeIds?: number[]; reportType?: string; startDate?: string; endDate?: string; status?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params.employeeIds && params.employeeIds.length > 0) conditions.push(inArray(weeklyMonthlyReports.employeeId, params.employeeIds));
  if (params.reportType) conditions.push(eq(weeklyMonthlyReports.reportType, params.reportType as any));
  if (params.startDate) conditions.push(sql`DATE(${weeklyMonthlyReports.periodStart}) >= ${params.startDate}`);
  if (params.endDate) conditions.push(sql`DATE(${weeklyMonthlyReports.periodEnd}) <= ${params.endDate}`);
  if (params.status !== undefined) conditions.push(eq(weeklyMonthlyReports.status, params.status));
  const query = db.select().from(weeklyMonthlyReports);
  if (conditions.length > 0) return query.where(and(...conditions)).orderBy(desc(weeklyMonthlyReports.periodStart));
  return query.orderBy(desc(weeklyMonthlyReports.periodStart));
}

export async function upsertWeeklyMonthlyReport(employeeId: number, reportType: string, periodStart: string, periodEnd: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getWeeklyMonthlyReport(employeeId, reportType, periodStart);
  if (existing) {
    await db.update(weeklyMonthlyReports).set(data).where(eq(weeklyMonthlyReports.id, existing.id));
    return existing.id as number;
  } else {
    const result = await db.execute(sql`INSERT INTO weekly_monthly_reports (employee_id, report_type, period_start, period_end, period_label, current_summary, next_plan, status) VALUES (${employeeId}, ${reportType}, ${periodStart}, ${periodEnd}, ${data.periodLabel ?? null}, ${data.currentSummary ?? null}, ${data.nextPlan ?? null}, ${data.status ?? 0})`);
    return ((result as unknown as any[])[0] as any).insertId as number;
  }
}

// ─── 点评 ──────────────────────────────────────────────────────────────────
export async function getComments(reportType: string, reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).where(and(eq(comments.reportType, reportType as any), eq(comments.reportId, reportId))).orderBy(comments.createdAt);
}

export async function createComment(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(comments).values(data);
}

// ─── 通知 ──────────────────────────────────────────────────────────────────
export async function getNotifications(recipientId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(notifications.recipientId, recipientId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));
  return db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function createNotification(data: any) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(recipientId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.recipientId, recipientId));
}

// ─── 数据分析 ──────────────────────────────────────────────────────────────
export async function getHoursStats(employeeIds: number[], startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  if (employeeIds.length === 0) return [];
  const result = await db.execute(sql`
    SELECT wi.employee_id as employeeId, DATE(dr.report_date) as reportDate, SUM(wi.hours) as totalHours
    FROM daily_work_items wi
    INNER JOIN daily_reports dr ON wi.daily_report_id = dr.id
    WHERE wi.employee_id IN (${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)})
    AND DATE(dr.report_date) >= ${startDate}
    AND DATE(dr.report_date) <= ${endDate}
    AND dr.status = 1
    GROUP BY wi.employee_id, DATE(dr.report_date)
  `);
  return (result as unknown as any[][])[0] ?? [];
}

export async function getProjectHoursStats(employeeIds: number[], startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  if (employeeIds.length === 0) return [];
  const result = await db.execute(sql`
    SELECT wi.project_id as projectId, SUM(wi.hours) as totalHours
    FROM daily_work_items wi
    INNER JOIN daily_reports dr ON wi.daily_report_id = dr.id
    WHERE wi.employee_id IN (${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)})
    AND DATE(dr.report_date) >= ${startDate}
    AND DATE(dr.report_date) <= ${endDate}
    AND dr.status = 1
    GROUP BY wi.project_id
  `);
  return (result as unknown as any[][])[0] ?? [];
}

export async function getSubmitStatusStats(employeeIds: number[], startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  if (employeeIds.length === 0) return [];
  const result = await db.execute(sql`
    SELECT dr.employee_id as employeeId, DATE(dr.report_date) as reportDate, dr.status, dr.submitted_at as submittedAt
    FROM daily_reports dr
    WHERE dr.employee_id IN (${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)})
    AND DATE(dr.report_date) >= ${startDate}
    AND DATE(dr.report_date) <= ${endDate}
  `);
  return (result as unknown as any[][])[0] ?? [];
}
