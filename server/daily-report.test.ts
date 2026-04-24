import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { Employee } from "../drizzle/schema";

function createAuthContext(employee: Partial<Employee> = {}): TrpcContext {
  const defaultEmployee: Employee = {
    id: 1,
    employeeNo: "test001",
    name: "Test User",
    email: "test@company.com",
    phone: "13800000000",
    passwordMd5: "hash",
    role: "member",
    departmentId: 1,
    supervisorId: null,
    status: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as any,
    res: {
      cookie: () => {},
    } as any,
    user: { ...defaultEmployee, ...employee },
  };
}

describe("daily report CRUD", () => {
  it("should create a daily report with work items", async () => {
    const ctx = createAuthContext({ id: 1, employeeNo: "admin" });
    const caller = appRouter.createCaller(ctx);

    const reportDate = new Date();
    reportDate.setHours(0, 0, 0, 0);

    const result = await caller.dailyReport.save({
      reportDate: reportDate.toISOString(),
      workItems: [
        {
          projectId: null,
          description: "完成项目 A 需求分析",
          hours: 2.5,
          completionRate: 100,
          order: 1,
        },
      ],
      tomorrowPlan: "继续进行项目 B 开发",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should retrieve daily report for a specific date", async () => {
    const ctx = createAuthContext({ id: 1, employeeNo: "admin" });
    const caller = appRouter.createCaller(ctx);

    const reportDate = new Date();
    reportDate.setHours(0, 0, 0, 0);

    const result = await caller.dailyReport.get({
      reportDate: reportDate.toISOString(),
    });

    expect(result).toBeDefined();
  });

  it("should update daily report status", async () => {
    const ctx = createAuthContext({ id: 1, employeeNo: "admin" });
    const caller = appRouter.createCaller(ctx);

    const reportDate = new Date();
    reportDate.setHours(0, 0, 0, 0);

    // First create a report
    await caller.dailyReport.save({
      reportDate: reportDate.toISOString(),
      workItems: [],
      tomorrowPlan: "Test",
    });

    // Then update status
    const result = await caller.dailyReport.submit({
      reportDate: reportDate.toISOString(),
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should handle daily report list query", async () => {
    const ctx = createAuthContext({ id: 1, employeeNo: "admin" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dailyReport.list({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.reports)).toBe(true);
  });
});
