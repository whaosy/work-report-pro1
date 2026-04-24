import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { Employee } from "../drizzle/schema";
import { createHash } from "crypto";

function md5(str: string) {
  return createHash("md5").update(str).digest("hex");
}

function createTestContext(): { ctx: TrpcContext; setCookies: Map<string, string> } {
  const setCookies = new Map<string, string>();

  const ctx: TrpcContext = {
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as any,
    res: {
      cookie: (name: string, value: string, options?: any) => {
        setCookies.set(name, value);
      },
    } as any,
    user: null,
  };

  return { ctx, setCookies };
}

describe("auth.login", () => {
  it("should reject login with incorrect password", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.login({
        employeeNo: "admin",
        password: "WrongPassword",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toContain("工号或密码错误");
    }
  });

  it("should reject login with non-existent employee", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.login({
        employeeNo: "nonexistent",
        password: "AnyPassword",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toContain("工号或密码错误");
    }
  });

  it("should successfully login with correct credentials and set session cookie", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      employeeNo: "admin",
      password: "Admin@123",
    });

    expect(result.success).toBe(true);
    expect(result.employee).toBeDefined();
    expect(result.employee.employeeNo).toBe("admin");
    expect(result.employee.role).toBe("admin");
    expect(setCookies.has("wrp_session")).toBe(true);
  });

  it("should return correct employee info on successful login", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      employeeNo: "admin",
      password: "Admin@123",
    });

    expect(result.employee.id).toBeDefined();
    expect(result.employee.name).toBe("系统管理员");
    expect(result.employee.email).toBe("admin@company.com");
    expect(result.employee.role).toBe("admin");
  });
});
