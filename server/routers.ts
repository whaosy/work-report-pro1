import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { departmentRouter, organizationRouter, employeeRouter, projectRouter } from "./routers/admin";
import { dailyReportRouter, weeklyMonthlyReportRouter, commentRouter, notificationRouter, analyticsRouter } from "./routers/reports";

export const appRouter = router({
  system: systemRouter,

  // 认证（工号+密码，禁用OAuth）
  auth: authRouter,

  // 组织架构管理
  department: departmentRouter,
  organization: organizationRouter,
  employee: employeeRouter,
  project: projectRouter,

  // 日报/周报/月报
  dailyReport: dailyReportRouter,
  weeklyMonthlyReport: weeklyMonthlyReportRouter,
  comment: commentRouter,
  notification: notificationRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
