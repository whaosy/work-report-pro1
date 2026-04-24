import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { z } from "zod";
import {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getOrganizations, createOrganization, updateOrganization, deleteOrganization,
  getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee,
  getProjects, getProjectById, createProject, updateProject, deleteProject,
  getProjectMembers, setProjectMembers, getProjectTasks, createProjectTask, updateProjectTask, deleteProjectTask,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { requireAuth, requireRole } from "./middleware";

function md5(str: string) { return createHash("md5").update(str).digest("hex"); }

// ─── 部门路由 ──────────────────────────────────────────────────────────────
export const departmentRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    await requireAuth(ctx);
    return getDepartments();
  }),
  create: publicProcedure
    .input(z.object({ name: z.string().min(1), parentId: z.number().optional(), sortOrder: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin"]);
      await createDepartment(input);
      return { success: true };
    }),
  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), parentId: z.number().nullable().optional(), sortOrder: z.number().optional(), status: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin"]);
      const { id, ...data } = input;
      await updateDepartment(id, data);
      return { success: true };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin"]);
      await deleteDepartment(input.id);
      return { success: true };
    }),
});

// ─── 机构路由 ──────────────────────────────────────────────────────────────
export const organizationRouter = router({
  list: publicProcedure
    .input(z.object({ keyword: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      await requireAuth(ctx);
      return getOrganizations(input?.keyword);
    }),
  create: publicProcedure
    .input(z.object({ name: z.string().min(1), contactPerson: z.string().optional(), contactPhone: z.string().optional(), contactEmail: z.string().optional(), remark: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin", "manager", "director"]);
      await createOrganization(input);
      return { success: true };
    }),
  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), contactPerson: z.string().optional(), contactPhone: z.string().optional(), contactEmail: z.string().optional(), status: z.number().optional(), remark: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin", "manager", "director"]);
      const { id, ...data } = input;
      await updateOrganization(id, data);
      return { success: true };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin"]);
      await deleteOrganization(input.id);
      return { success: true };
    }),
});

// ─── 员工路由 ──────────────────────────────────────────────────────────────
export const employeeRouter = router({
  list: publicProcedure
    .input(z.object({ keyword: z.string().optional(), departmentId: z.number().optional(), role: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      await requireAuth(ctx);
      return getEmployees(input);
    }),
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireAuth(ctx);
      return getEmployeeById(input.id);
    }),
  create: publicProcedure
    .input(z.object({
      employeeNo: z.string().min(1),
      name: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      password: z.string().default("123456"),
      departmentId: z.number().optional(),
      supervisorId: z.number().optional(),
      role: z.enum(["member", "team_leader", "manager", "director", "admin"]).default("member"),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin"]);
      const { password, ...rest } = input;
      await createEmployee({ ...rest, passwordMd5: md5(password) });
      return { success: true };
    }),
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      departmentId: z.number().nullable().optional(),
      supervisorId: z.number().nullable().optional(),
      role: z.enum(["member", "team_leader", "manager", "director", "admin"]).optional(),
      status: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin"]);
      const { id, ...data } = input;
      await updateEmployee(id, data);
      return { success: true };
    }),
  resetPassword: publicProcedure
    .input(z.object({ id: z.number(), password: z.string().default("123456") }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin"]);
      await updateEmployee(input.id, { passwordMd5: md5(input.password) });
      return { success: true };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin"]);
      await deleteEmployee(input.id);
      return { success: true };
    }),
  // 批量导入
  batchImport: publicProcedure
    .input(z.array(z.object({
      employeeNo: z.string(),
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      password: z.string().optional(),
      departmentId: z.number().optional(),
      supervisorId: z.number().optional(),
      role: z.enum(["member", "team_leader", "manager", "director", "admin"]).optional(),
    })))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin"]);
      let success = 0, failed = 0;
      for (const emp of input) {
        try {
          const { password, ...rest } = emp;
          await createEmployee({ ...rest, passwordMd5: md5(password ?? "123456"), role: rest.role ?? "member" });
          success++;
        } catch { failed++; }
      }
      return { success, failed };
    }),
});

// ─── 项目路由 ──────────────────────────────────────────────────────────────
export const projectRouter = router({
  list: publicProcedure
    .input(z.object({ keyword: z.string().optional(), status: z.string().optional(), employeeId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      await requireAuth(ctx);
      return getProjects(input);
    }),
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireAuth(ctx);
      return getProjectById(input.id);
    }),
  create: publicProcedure
    .input(z.object({
      projectNo: z.string().optional(),
      name: z.string().min(1),
      managerId: z.number().optional(),
      organizationId: z.number().optional(),
      status: z.enum(["discussion","evaluation","development","testing","integration","launch","completed","ended","closed"]).optional(),
      businessType: z.enum(["prepaid_card","equity"]).optional(),
      projectType: z.enum(["stock_support","stock_new","new_project","new_merchant","event_support","product_optimization"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      estimatedHours: z.string().optional(),
      description: z.string().optional(),
      memberIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin", "manager", "director"]);
      const { memberIds, ...projectData } = input;
      const result = await createProject(projectData);
      const projectId = (result as any).insertId as number;
      if (memberIds && memberIds.length > 0) await setProjectMembers(projectId, memberIds);
      return { success: true, id: projectId };
    }),
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      projectNo: z.string().optional(),
      name: z.string().optional(),
      managerId: z.number().nullable().optional(),
      organizationId: z.number().nullable().optional(),
      status: z.enum(["discussion","evaluation","development","testing","integration","launch","completed","ended","closed"]).optional(),
      businessType: z.enum(["prepaid_card","equity"]).nullable().optional(),
      projectType: z.enum(["stock_support","stock_new","new_project","new_merchant","event_support","product_optimization"]).nullable().optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      estimatedHours: z.string().nullable().optional(),
      description: z.string().optional(),
      memberIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin", "manager", "director"]);
      const { id, memberIds, ...projectData } = input;
      await updateProject(id, projectData);
      if (memberIds !== undefined) await setProjectMembers(id, memberIds);
      return { success: true };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin", "manager", "director"]);
      await deleteProject(input.id);
      return { success: true };
    }),
  getMembers: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireAuth(ctx);
      return getProjectMembers(input.projectId);
    }),
  setMembers: publicProcedure
    .input(z.object({ projectId: z.number(), employeeIds: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin", "manager", "director"]);
      await setProjectMembers(input.projectId, input.employeeIds);
      return { success: true };
    }),
  // 子任务
  getTasks: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireAuth(ctx);
      return getProjectTasks(input.projectId);
    }),
  createTask: publicProcedure
    .input(z.object({ projectId: z.number(), name: z.string().min(1), description: z.string().optional(), assigneeId: z.number().optional(), estimatedHours: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin", "manager", "director", "team_leader"]);
      await createProjectTask(input);
      return { success: true };
    }),
  updateTask: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), assigneeId: z.number().nullable().optional(), estimatedHours: z.string().nullable().optional(), status: z.enum(["pending","in_progress","completed"]).optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin", "manager", "director", "team_leader"]);
      const { id, ...data } = input;
      await updateProjectTask(id, data);
      return { success: true };
    }),
  deleteTask: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx, ["admin", "manager", "director", "team_leader"]);
      await deleteProjectTask(input.id);
      return { success: true };
    }),
});
