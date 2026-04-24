import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getDailyReport, getDailyReportById, getDailyReports, upsertDailyReport,
  getWorkItems, getFragmentItems, createWorkItem, updateWorkItem, deleteWorkItem, mergeFragmentsToReport,
  getWeeklyMonthlyReport, getWeeklyMonthlyReportById, getWeeklyMonthlyReports, upsertWeeklyMonthlyReport,
  getComments, createComment,
  getNotifications, createNotification, markNotificationRead, markAllNotificationsRead,
  getHoursStats, getProjectHoursStats, getSubmitStatusStats,
  getSubordinateIds, getEmployees, getProjects, getEmployeeById,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { requireAuth, requireRole, ROLE_LEVEL } from "./middleware";
import { invokeLLM } from "../_core/llm";

// ─── 日报路由 ──────────────────────────────────────────────────────────────
export const dailyReportRouter = router({
  // 获取某天日报（含工作条目）
  getByDate: publicProcedure
    .input(z.object({ date: z.string(), employeeId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      const targetId = input.employeeId ?? me.id;
      // 只有上级或本人可查看
      if (targetId !== me.id) {
        const subIds = await getSubordinateIds(me.id);
        if (!subIds.includes(targetId) && me.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      const report = await getDailyReport(targetId, input.date);
      if (!report) return null;
      const items = await getWorkItems(report.id);
      return { ...report, items };
    }),

  // 获取日报列表（管理层查看下级）
  list: publicProcedure
    .input(z.object({
      employeeIds: z.array(z.number()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      let targetIds = input.employeeIds;
      if (!targetIds || targetIds.length === 0) {
        if (ROLE_LEVEL[me.role] >= ROLE_LEVEL["team_leader"]) {
          const subIds = await getSubordinateIds(me.id);
          targetIds = [me.id, ...subIds];
        } else {
          targetIds = [me.id];
        }
      }
      const reports = await getDailyReports({ employeeIds: targetIds, ...input });
      return reports;
    }),

  // 保存草稿或提交日报
  save: publicProcedure
    .input(z.object({
      date: z.string(),
      tomorrowPlan: z.string().optional(),
      status: z.number().default(0), // 0-草稿 1-提交
      items: z.array(z.object({
        id: z.number().optional(),
        projectId: z.number().nullable().optional(),
        description: z.string(),
        hours: z.string().default("0"),
        completionRate: z.number().default(0),
        sortOrder: z.number().default(0),
        itemType: z.number().default(1),
      })),
      fragmentIds: z.array(z.number()).optional(), // 要合并的碎片ID
    }))
    .mutation(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      const submittedAt = input.status === 1 ? new Date() : null;
      const reportId = await upsertDailyReport(me.id, input.date, {
        tomorrowPlan: input.tomorrowPlan,
        status: input.status,
        submittedAt,
      });

      // 合并碎片
      if (input.fragmentIds && input.fragmentIds.length > 0) {
        await mergeFragmentsToReport(reportId, input.fragmentIds);
      }

      // 更新工作条目
      const existingItems = await getWorkItems(reportId);
      const existingIds = existingItems.map((i: any) => i.id);
      const inputIds = input.items.filter(i => i.id).map(i => i.id!);

      // 删除不在输入中的条目
      for (const eid of existingIds) {
        if (!inputIds.includes(eid)) await deleteWorkItem(eid);
      }

      // 更新或新增条目
      for (const item of input.items) {
        if (item.id && existingIds.includes(item.id)) {
          await updateWorkItem(item.id, {
            projectId: item.projectId ?? null,
            description: item.description,
            hours: item.hours,
            completionRate: item.completionRate,
            sortOrder: item.sortOrder,
          });
        } else {
          await createWorkItem({
            dailyReportId: reportId,
            employeeId: me.id,
            projectId: item.projectId ?? null,
            description: item.description,
            hours: item.hours,
            completionRate: item.completionRate,
            sortOrder: item.sortOrder,
            itemType: item.itemType,
            isFragment: false,
            recordDate: input.date,
          });
        }
      }

      // 提交时发送通知给上级
      if (input.status === 1 && me.supervisorId) {
        await createNotification({
          recipientId: me.supervisorId,
          type: "system",
          title: `${me.name} 提交了日报`,
          content: `${me.name} 已提交 ${input.date} 的日报，请查看。`,
          relatedType: "daily",
          relatedId: reportId,
        });
      }

      return { success: true, reportId };
    }),

  // 快捷记录（碎片）
  addFragment: publicProcedure
    .input(z.object({
      projectId: z.number().nullable().optional(),
      description: z.string().min(1).max(500),
      hours: z.string().default("0"),
      date: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      const today = input.date ?? new Date().toISOString().split("T")[0];
      const id = await createWorkItem({
        employeeId: me.id,
        projectId: input.projectId ?? null,
        description: input.description,
        hours: input.hours,
        isFragment: true,
        itemType: 3,
        recordDate: today,
        completionRate: 0,
        sortOrder: 0,
      });
      return { success: true, id };
    }),

  // 获取碎片列表
  getFragments: publicProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      return getFragmentItems(me.id, input.date);
    }),

  // 删除碎片
  deleteFragment: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      await deleteWorkItem(input.id);
      return { success: true };
    }),

  // 获取日报详情（含条目和点评）
  getDetail: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      const report = await getDailyReportById(input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      if (report.employeeId !== me.id) {
        const subIds = await getSubordinateIds(me.id);
        if (!subIds.includes(report.employeeId) && me.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      const items = await getWorkItems(report.id);
      const reportComments = await getComments("daily", report.id);
      return { ...report, items, comments: reportComments };
    }),
});

// ─── 周报/月报路由 ─────────────────────────────────────────────────────────
export const weeklyMonthlyReportRouter = router({
  getByPeriod: publicProcedure
    .input(z.object({ reportType: z.enum(["weekly", "monthly"]), periodStart: z.string(), employeeId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      const targetId = input.employeeId ?? me.id;
      if (targetId !== me.id) {
        const subIds = await getSubordinateIds(me.id);
        if (!subIds.includes(targetId) && me.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      }
      const report = await getWeeklyMonthlyReport(targetId, input.reportType, input.periodStart);
      if (!report) return null;
      const reportComments = await getComments(input.reportType, report.id);
      return { ...report, comments: reportComments };
    }),

  list: publicProcedure
    .input(z.object({
      reportType: z.enum(["weekly", "monthly"]).optional(),
      employeeIds: z.array(z.number()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      let targetIds = input.employeeIds;
      if (!targetIds || targetIds.length === 0) {
        if (ROLE_LEVEL[me.role] >= ROLE_LEVEL["team_leader"]) {
          const subIds = await getSubordinateIds(me.id);
          targetIds = [me.id, ...subIds];
        } else {
          targetIds = [me.id];
        }
      }
      return getWeeklyMonthlyReports({ employeeIds: targetIds, ...input });
    }),

  save: publicProcedure
    .input(z.object({
      reportType: z.enum(["weekly", "monthly"]),
      periodStart: z.string(),
      periodEnd: z.string(),
      periodLabel: z.string().optional(),
      currentSummary: z.string().optional(),
      nextPlan: z.string().optional(),
      relatedProjects: z.string().optional(),
      coordinationNeeds: z.string().optional(),
      keyOutputs: z.string().optional(),
      nextMonthGoals: z.string().optional(),
      keyIssueAnalysis: z.string().optional(),
      projectProgress: z.string().optional(),
      status: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      const { reportType, periodStart, periodEnd, status, ...data } = input;
      const submittedAt = status === 1 ? new Date() : undefined;
      const reportId = await upsertWeeklyMonthlyReport(me.id, reportType, periodStart, periodEnd, {
        ...data, status, submittedAt,
      });
      if (status === 1 && me.supervisorId) {
        await createNotification({
          recipientId: me.supervisorId,
          type: "system",
          title: `${me.name} 提交了${reportType === "weekly" ? "周报" : "月报"}`,
          content: `${me.name} 已提交 ${input.periodLabel ?? periodStart} 的${reportType === "weekly" ? "周报" : "月报"}。`,
          relatedType: reportType,
          relatedId: reportId,
        });
      }
      return { success: true, reportId };
    }),

  // AI 生成草稿
  generateDraft: publicProcedure
    .input(z.object({
      reportType: z.enum(["weekly", "monthly"]),
      periodStart: z.string(),
      periodEnd: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      // 获取该周期内的日报数据
      const dailyList = await getDailyReports({
        employeeIds: [me.id],
        startDate: input.periodStart,
        endDate: input.periodEnd,
        status: 1,
      });

      if (dailyList.length === 0) {
        return { draft: "本周期内暂无已提交的日报数据，请先提交日报后再生成草稿。" };
      }

      // 收集工作条目
      const allItems: any[] = [];
      for (const report of dailyList) {
        const items = await getWorkItems(report.id);
        allItems.push(...items.map((i: any) => ({ date: report.reportDate, ...i })));
      }

      const itemsText = allItems.map((i: any) =>
        `[${i.date}] ${i.description}（工时：${i.hours}h，完成度：${i.completionRate}%）`
      ).join("\n");

      const prompt = input.reportType === "weekly"
        ? `请根据以下工作记录，生成一份结构化的周报草稿。要求包含：本周工作总结、主要成果、遇到的问题与解决方案、下周工作计划。\n\n工作记录：\n${itemsText}`
        : `请根据以下工作记录，生成一份结构化的月报草稿。要求包含：本月关键产出、项目进展、遇到的挑战与应对、下月工作目标与重点。\n\n工作记录：\n${itemsText}`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一个专业的工作汇报助手，擅长将零散的工作记录整理成结构清晰、语言专业的工作报告。" },
            { role: "user", content: prompt },
          ],
        });
        const draft = response.choices[0]?.message?.content ?? "AI 生成失败，请手动填写。";
        return { draft };
      } catch {
        return { draft: "AI 服务暂时不可用，请手动填写报告内容。" };
      }
    }),

  // 聚合日报数据生成草稿内容
  aggregateDailyData: publicProcedure
    .input(z.object({ periodStart: z.string(), periodEnd: z.string() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      const dailyList = await getDailyReports({
        employeeIds: [me.id],
        startDate: input.periodStart,
        endDate: input.periodEnd,
        status: 1,
      });
      const allItems: any[] = [];
      for (const report of dailyList) {
        const items = await getWorkItems(report.id);
        allItems.push(...items.map((i: any) => ({ date: (report as any).report_date ?? report.reportDate, ...i })));
      }
      return { dailyCount: dailyList.length, items: allItems };
    }),

  getDetail: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      const report = await getWeeklyMonthlyReportById(input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      if (report.employeeId !== me.id) {
        const subIds = await getSubordinateIds(me.id);
        if (!subIds.includes(report.employeeId) && me.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      }
      const reportComments = await getComments(report.reportType, report.id);
      return { ...report, comments: reportComments };
    }),
});

// ─── 点评路由 ──────────────────────────────────────────────────────────────
export const commentRouter = router({
  list: publicProcedure
    .input(z.object({ reportType: z.enum(["daily", "weekly", "monthly"]), reportId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireAuth(ctx);
      return getComments(input.reportType, input.reportId);
    }),
  add: publicProcedure
    .input(z.object({ reportType: z.enum(["daily", "weekly", "monthly"]), reportId: z.number(), content: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      await createComment({ reportType: input.reportType, reportId: input.reportId, commenterId: me.id, content: input.content });
      // 通知被点评人
      let reportEmployeeId: number | null = null;
      if (input.reportType === "daily") {
        const report = await getDailyReportById(input.reportId);
        reportEmployeeId = report?.employeeId ?? null;
      } else {
        const report = await getWeeklyMonthlyReportById(input.reportId);
        reportEmployeeId = report?.employeeId ?? null;
      }
      if (reportEmployeeId && reportEmployeeId !== me.id) {
        await createNotification({
          recipientId: reportEmployeeId,
          senderId: me.id,
          type: "comment",
          title: `${me.name} 点评了您的${input.reportType === "daily" ? "日报" : input.reportType === "weekly" ? "周报" : "月报"}`,
          content: input.content.substring(0, 100),
          relatedType: input.reportType,
          relatedId: input.reportId,
        });
      }
      return { success: true };
    }),
});

// ─── 通知路由 ──────────────────────────────────────────────────────────────
export const notificationRouter = router({
  list: publicProcedure
    .input(z.object({ unreadOnly: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      return getNotifications(me.id, input.unreadOnly);
    }),
  markRead: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireAuth(ctx);
      await markNotificationRead(input.id);
      return { success: true };
    }),
  markAllRead: publicProcedure.mutation(async ({ ctx }) => {
    const me = await requireAuth(ctx);
    await markAllNotificationsRead(me.id);
    return { success: true };
  }),
  // 催办
  urge: publicProcedure
    .input(z.object({ employeeId: z.number(), message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const me = await requireRole(ctx, ["team_leader", "manager", "director", "admin"]);
      const target = await getEmployeeById(input.employeeId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      await createNotification({
        recipientId: input.employeeId,
        senderId: me.id,
        type: "urge",
        title: `${me.name} 催您提交日报`,
        content: input.message ?? `请尽快提交今日日报，感谢配合！`,
      });
      return { success: true };
    }),
});

// ─── 数据分析路由 ──────────────────────────────────────────────────────────
export const analyticsRouter = router({
  hoursStats: publicProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string(), employeeIds: z.array(z.number()).optional() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      let targetIds = input.employeeIds;
      if (!targetIds || targetIds.length === 0) {
        if (ROLE_LEVEL[me.role] >= ROLE_LEVEL["team_leader"]) {
          const subIds = await getSubordinateIds(me.id);
          targetIds = [me.id, ...subIds];
        } else {
          targetIds = [me.id];
        }
      }
      return getHoursStats(targetIds, input.startDate, input.endDate);
    }),

  projectHours: publicProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string(), employeeIds: z.array(z.number()).optional() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      let targetIds = input.employeeIds;
      if (!targetIds || targetIds.length === 0) {
        if (ROLE_LEVEL[me.role] >= ROLE_LEVEL["team_leader"]) {
          const subIds = await getSubordinateIds(me.id);
          targetIds = [me.id, ...subIds];
        } else {
          targetIds = [me.id];
        }
      }
      const stats = await getProjectHoursStats(targetIds, input.startDate, input.endDate);
      // 附加项目名称
      const projectIds = Array.from(new Set(stats.map((s: any) => s.projectId).filter(Boolean)));
      const projectList = projectIds.length > 0 ? await getProjects() : [];
      return stats.map((s: any) => ({
        ...s,
        projectName: projectList.find((p: any) => p.id === s.projectId)?.name ?? "未关联项目",
      }));
    }),

  submitStatus: publicProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string(), employeeIds: z.array(z.number()).optional() }))
    .query(async ({ input, ctx }) => {
      const me = await requireAuth(ctx);
      let targetIds = input.employeeIds;
      if (!targetIds || targetIds.length === 0) {
        if (ROLE_LEVEL[me.role] >= ROLE_LEVEL["team_leader"]) {
          const subIds = await getSubordinateIds(me.id);
          targetIds = [me.id, ...subIds];
        } else {
          targetIds = [me.id];
        }
      }
      const stats = await getSubmitStatusStats(targetIds, input.startDate, input.endDate);
      const empList = await getEmployees();
      return stats.map((s: any) => ({
        ...s,
        employeeName: empList.find((e: any) => e.id === s.employeeId)?.name ?? "未知",
      }));
    }),

  // AI 生成周期综述
  generateSummary: publicProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string(), scope: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const me = await requireRole(ctx, ["team_leader", "manager", "director", "admin"]);
      const subIds = await getSubordinateIds(me.id);
      const targetIds = [me.id, ...subIds];
      const reports = await getDailyReports({ employeeIds: targetIds, startDate: input.startDate, endDate: input.endDate, status: 1 });
      const empList = await getEmployees();

      if (reports.length === 0) return { summary: "该时间段内暂无已提交的日报数据。" };

      const reportTexts = reports.slice(0, 30).map((r: any) => {
        const emp = empList.find((e: any) => e.id === r.employeeId);
        return `${emp?.name ?? "未知"}（${r.report_date ?? r.reportDate}）：${r.tomorrow_plan ?? r.tomorrowPlan ?? ""}`;
      }).join("\n");

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一个管理分析助手，擅长从团队工作汇报中提炼关键信息，生成管理层所需的综述报告。" },
            { role: "user", content: `请根据以下团队成员的工作汇报，生成一份${input.startDate}至${input.endDate}的团队工作综述，包含：主要工作成果、团队整体状态、存在的问题与风险、建议关注事项。\n\n${reportTexts}` },
          ],
        });
        return { summary: response.choices[0]?.message?.content ?? "生成失败" };
      } catch {
        return { summary: "AI 服务暂时不可用。" };
      }
    }),
});
