import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import Combobox from "@/components/Combobox";
import { useEmployee } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, X, Check, Search, FolderKanban } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "discussion", label: "讨论中" },
  { value: "evaluation", label: "评估中" },
  { value: "development", label: "开发中" },
  { value: "testing", label: "测试中" },
  { value: "integration", label: "集成中" },
  { value: "launch", label: "上线中" },
  { value: "completed", label: "已完成" },
  { value: "ended", label: "已结束" },
  { value: "closed", label: "已关闭" },
];

const STATUS_COLORS: Record<string, string> = {
  discussion: "bg-gray-100 text-gray-600",
  evaluation: "bg-blue-50 text-blue-600",
  development: "bg-yellow-50 text-yellow-700",
  testing: "bg-purple-50 text-purple-600",
  integration: "bg-orange-50 text-orange-600",
  launch: "bg-green-50 text-green-700",
  completed: "bg-green-100 text-green-800",
  ended: "bg-gray-100 text-gray-500",
  closed: "bg-red-50 text-red-600",
};

const BUSINESS_TYPE_OPTIONS = [
  { value: "prepaid_card", label: "储值卡" },
  { value: "equity", label: "权益" },
];

const PROJECT_TYPE_OPTIONS = [
  { value: "stock_support", label: "存量支持" },
  { value: "stock_new", label: "存量新增" },
  { value: "new_project", label: "新项目" },
  { value: "new_merchant", label: "新商户" },
  { value: "event_support", label: "活动支持" },
  { value: "product_optimization", label: "产品优化" },
];

interface ProjectForm {
  name: string; projectNo: string; managerId: number | null;
  organizationId: number | null; status: string; businessType: string;
  projectType: string; startDate: string; endDate: string;
  estimatedHours: string; description: string; memberIds: number[];
}
const emptyForm: ProjectForm = { name: "", projectNo: "", managerId: null, organizationId: null, status: "discussion", businessType: "", projectType: "", startDate: "", endDate: "", estimatedHours: "", description: "", memberIds: [] };

export default function Projects() {
  const { employee } = useEmployee();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);

  const { data: projects = [], refetch } = trpc.project.list.useQuery(
    { keyword: search || undefined, status: filterStatus || undefined },
    { enabled: !!employee }
  );
  const { data: employees = [] } = trpc.employee.list.useQuery({}, { enabled: !!employee });
  const { data: organizations = [] } = trpc.organization.list.useQuery(undefined, { enabled: !!employee });

  const empOptions = employees.map((e: any) => ({ value: e.id, label: e.name, sub: e.employeeNo }));
  const orgOptions = organizations.map((o: any) => ({ value: o.id, label: o.name }));
  const statusOptions = STATUS_OPTIONS;

  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm(emptyForm); toast.success("项目已创建"); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setEditId(null); toast.success("项目已更新"); },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("项目名称为必填项"); return; }
    if (editId) {
      updateMutation.mutate({ id: editId, ...(form as any) });
    } else {
      createMutation.mutate(form as any);
    }
  };

  const handleEdit = (proj: any) => {
    setEditId(proj.id);
    setForm({
      name: proj.name ?? "",
      projectNo: proj.projectNo ?? proj.project_no ?? "",
      managerId: proj.managerId ?? proj.manager_id ?? null,
      organizationId: proj.organizationId ?? proj.organization_id ?? null,
      status: proj.status ?? "discussion",
      businessType: proj.businessType ?? proj.business_type ?? "",
      projectType: proj.projectType ?? proj.project_type ?? "",
      startDate: proj.startDate ?? proj.start_date ?? "",
      endDate: proj.endDate ?? proj.end_date ?? "",
      estimatedHours: proj.estimatedHours ?? proj.estimated_hours ?? "",
      description: proj.description ?? "",
      memberIds: [],
    });
    setShowForm(true);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-4 h-4 bg-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">系统管理</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">项目管理</h1>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 text-sm hover:bg-primary/90 transition-colors">
            <Plus size={14} />新增项目
          </button>
        </div>

        {/* 筛选 */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索项目名称..."
              className="border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-foreground w-48" />
          </div>
          <Combobox options={statusOptions} value={filterStatus} onChange={(v) => setFilterStatus(v as string | null)} placeholder="筛选状态" className="w-36" />
          <span className="text-xs text-muted-foreground">共 {projects.length} 个项目</span>
        </div>

        {/* 项目列表 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-3 border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
              暂无项目数据
            </div>
          ) : (
            projects.map((proj: any) => {
              const statusLabel = STATUS_OPTIONS.find(s => s.value === proj.status)?.label ?? proj.status;
              const statusColor = STATUS_COLORS[proj.status] ?? "bg-gray-100 text-gray-600";
              return (
                <div key={proj.id} className="border border-border p-5 hover:border-foreground/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FolderKanban size={16} className="text-muted-foreground flex-shrink-0" />
                      <span className="font-bold text-sm truncate">{proj.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 font-medium flex-shrink-0 ${statusColor}`}>{statusLabel}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mb-2">{proj.projectNo ?? proj.project_no ?? "—"}</div>
                  {proj.description && (
                    <div className="text-xs text-muted-foreground mb-3 line-clamp-2">{proj.description}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {proj.startDate ?? proj.start_date ? `${proj.startDate ?? proj.start_date} ~ ${proj.endDate ?? proj.end_date ?? "进行中"}` : "未设置时间"}
                    </div>
                    <button onClick={() => handleEdit(proj)} className="text-xs border border-border px-2 py-1 hover:bg-secondary transition-colors flex items-center gap-1">
                      <Pencil size={10} />编辑
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 表单弹窗 */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white border border-foreground w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-bold text-sm uppercase tracking-wider">{editId ? "编辑项目" : "新增项目"}</h2>
                <button onClick={() => { setShowForm(false); setEditId(null); }}><X size={16} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">项目名称 *</label>
                    <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">项目编号</label>
                    <input value={form.projectNo} onChange={(e) => setForm(f => ({ ...f, projectNo: e.target.value }))}
                      className="w-full border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">项目负责人</label>
                    <Combobox options={empOptions} value={form.managerId} onChange={(v) => setForm(f => ({ ...f, managerId: v as number | null }))} placeholder="选择负责人" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">所属机构</label>
                    <Combobox options={orgOptions} value={form.organizationId} onChange={(v) => setForm(f => ({ ...f, organizationId: v as number | null }))} placeholder="选择机构" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">项目状态</label>
                    <Combobox options={statusOptions} value={form.status} onChange={(v) => setForm(f => ({ ...f, status: v as string }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">业务类型</label>
                    <Combobox options={BUSINESS_TYPE_OPTIONS} value={form.businessType || null} onChange={(v) => setForm(f => ({ ...f, businessType: v as string ?? "" }))} placeholder="选择类型" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">项目类型</label>
                    <Combobox options={PROJECT_TYPE_OPTIONS} value={form.projectType || null} onChange={(v) => setForm(f => ({ ...f, projectType: v as string ?? "" }))} placeholder="选择类型" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">开始日期</label>
                    <input type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">结束日期</label>
                    <input type="date" value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">预估工时(h)</label>
                    <input type="number" value={form.estimatedHours} onChange={(e) => setForm(f => ({ ...f, estimatedHours: e.target.value }))}
                      className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">项目描述</label>
                  <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} className="w-full border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-foreground" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">项目成员</label>
                  <div className="border border-border p-3 max-h-32 overflow-y-auto">
                    {employees.map((emp: any) => (
                      <label key={emp.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-secondary px-2">
                        <input type="checkbox" checked={form.memberIds.includes(emp.id)}
                          onChange={(e) => setForm(f => ({ ...f, memberIds: e.target.checked ? [...f.memberIds, emp.id] : f.memberIds.filter(id => id !== emp.id) }))} />
                        <span className="text-sm">{emp.name}</span>
                        <span className="text-xs text-muted-foreground">{emp.employeeNo ?? emp.employee_no}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 bg-primary text-white py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Check size={14} />{editId ? "保存修改" : "创建项目"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                    className="flex-1 border border-border py-2.5 text-sm hover:bg-secondary">取消</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
