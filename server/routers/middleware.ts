import { TRPCError } from "@trpc/server";
import { getSessionByToken, getEmployeeById } from "../db";

const SESSION_COOKIE = "wrp_session";

export type EmployeeRole = "member" | "team_leader" | "manager" | "director" | "admin";

export interface AuthEmployee {
  id: number;
  employeeNo: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: EmployeeRole;
  departmentId: number | null;
  supervisorId: number | null;
}

export async function requireAuth(ctx: any): Promise<AuthEmployee> {
  const token = ctx.req.cookies?.[SESSION_COOKIE];
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
  const session = await getSessionByToken(token);
  if (!session || new Date(session.expiresAt) < new Date()) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "登录已过期，请重新登录" });
  }
  const employee = await getEmployeeById(session.employeeId);
  if (!employee || employee.status !== 1) throw new TRPCError({ code: "UNAUTHORIZED", message: "账号不存在或已停用" });
  return employee as AuthEmployee;
}

export async function requireRole(ctx: any, roles: EmployeeRole[]): Promise<AuthEmployee> {
  const employee = await requireAuth(ctx);
  if (!roles.includes(employee.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "权限不足" });
  }
  return employee;
}

// 角色层级映射（数字越大权限越高）
export const ROLE_LEVEL: Record<EmployeeRole, number> = {
  member: 1,
  team_leader: 2,
  manager: 3,
  director: 4,
  admin: 5,
};

export function hasHigherOrEqualRole(role: EmployeeRole, minRole: EmployeeRole): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minRole];
}
