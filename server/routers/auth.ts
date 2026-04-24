import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { getEmployeeByNo, createSession, getSessionByToken, deleteSession, getEmployeeById } from "../db";
import { publicProcedure, router } from "../_core/trpc";

const SESSION_COOKIE = "wrp_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function md5(str: string) {
  return createHash("md5").update(str).digest("hex");
}

export const authRouter = router({
  // 工号+密码登录
  login: publicProcedure
    .input(z.object({ employeeNo: z.string().min(1), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const employee = await getEmployeeByNo(input.employeeNo);
      if (!employee) throw new TRPCError({ code: "UNAUTHORIZED", message: "工号或密码错误" });
      const passwordMd5 = md5(input.password);
      if (employee.passwordMd5 !== passwordMd5) throw new TRPCError({ code: "UNAUTHORIZED", message: "工号或密码错误" });

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
      await createSession(employee.id, token, expiresAt);

      // 设置 cookie
      ctx.res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: SESSION_DURATION_MS / 1000,
      });

      return {
        success: true,
        employee: {
          id: employee.id,
          employeeNo: employee.employeeNo,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          departmentId: employee.departmentId,
          supervisorId: employee.supervisorId,
        },
      };
    }),

  // 获取当前登录员工信息
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.[SESSION_COOKIE];
    if (!token) return null;
    const session = await getSessionByToken(token);
    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) await deleteSession(token);
      return null;
    }
    const employee = await getEmployeeById(session.employeeId);
    if (!employee || employee.status !== 1) return null;
    return {
      id: employee.id,
      employeeNo: employee.employeeNo,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      departmentId: employee.departmentId,
      supervisorId: employee.supervisorId,
    };
  }),

  // 登出
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = ctx.req.cookies?.[SESSION_COOKIE];
    if (token) await deleteSession(token);
    ctx.res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: "none", path: "/" });
    return { success: true };
  }),

  // 修改密码
  changePassword: publicProcedure
    .input(z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(6) }))
    .mutation(async ({ input, ctx }) => {
      const token = ctx.req.cookies?.[SESSION_COOKIE];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED" });
      const session = await getSessionByToken(token);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const employee = await getEmployeeById(session.employeeId);
      if (!employee) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (employee.passwordMd5 !== md5(input.oldPassword)) throw new TRPCError({ code: "BAD_REQUEST", message: "原密码错误" });
      const { updateEmployee } = await import("../db");
      await updateEmployee(employee.id, { passwordMd5: md5(input.newPassword) });
      return { success: true };
    }),
});
