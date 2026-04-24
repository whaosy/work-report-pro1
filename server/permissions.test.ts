import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { Employee } from "../drizzle/schema";

function createContextWithRole(role: "member" | "team_leader" | "manager" | "director" | "admin"): TrpcContext {
  const employee: Employee = {
    id: 1,
    employeeNo: "test001",
    name: "Test User",
    email: "test@company.com",
    phone: "13800000000",
    passwordMd5: "hash",
    role,
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
    user: employee,
  };
}

describe("permission control", () => {
  it("should allow admin to access admin procedures", async () => {
    const ctx = createContextWithRole("admin");
    const caller = appRouter.createCaller(ctx);

    // Admin should be able to list employees
    const result = await caller.employee.list({});
    expect(result).toBeDefined();
  });

  it("should reject member from accessing admin procedures", async () => {
    const ctx = createContextWithRole("member");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.employee.list({});
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should allow manager and above to view team reports", async () => {
    const ctx = createContextWithRole("manager");
    const caller = appRouter.createCaller(ctx);

    // Manager should be able to view team reports
    const result = await caller.dailyReport.listTeam({
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(result).toBeDefined();
  });

  it("should allow team_leader to view direct reports", async () => {
    const ctx = createContextWithRole("team_leader");
    const caller = appRouter.createCaller(ctx);

    // Team leader should be able to view team reports
    const result = await caller.dailyReport.listTeam({
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(result).toBeDefined();
  });

  it("should allow director to access all reports", async () => {
    const ctx = createContextWithRole("director");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dailyReport.listTeam({
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(result).toBeDefined();
  });

  it("should allow all roles to submit their own daily reports", async () => {
    const roles: Array<"member" | "team_leader" | "manager" | "director" | "admin"> = [
      "member",
      "team_leader",
      "manager",
      "director",
      "admin",
    ];

    for (const role of roles) {
      const ctx = createContextWithRole(role);
      const caller = appRouter.createCaller(ctx);

      const reportDate = new Date();
      reportDate.setHours(0, 0, 0, 0);

      const result = await caller.dailyReport.save({
        reportDate: reportDate.toISOString(),
        workItems: [],
        tomorrowPlan: "Test",
      });

      expect(result).toBeDefined();
    }
  });

  it("should reject unauthenticated user from protected procedures", async () => {
    const ctx: TrpcContext = {
      req: {
        protocol: "https",
        headers: {},
        cookies: {},
      } as any,
      res: {
        cookie: () => {},
      } as any,
      user: null,
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dailyReport.save({
        reportDate: new Date().toISOString(),
        workItems: [],
        tomorrowPlan: "Test",
      });
      expect.fail("Should have thrown UNAUTHORIZED error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });
});
