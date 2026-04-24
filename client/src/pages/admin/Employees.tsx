import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import Combobox from "@/components/Combobox";
import { useEmployee, ROLE_LABELS } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Download, Upload, Search, X, Check } from "lucide-react";

interface EmployeeForm {
  employeeNo: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  departmentId: number | null;
  supervisorId: number | null;
  password: string;
}

const ROLE_OPTIONS = [
  { value: "member", label: "组员" },
  { value: "team_leader", label: "组长" },
  { value: "manager", label: "经理" },
  { value: "director", label: "总监" },
  { value: "admin", label: "管理员" },
];

const emptyForm: EmployeeForm = { employeeNo: "", name: "", email: "", phone: "", role: "member", departmentId: null, supervisorId: null, password: "" };

export default function Employees() {
  const { employee } = useEmployee();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const { data: employees = [], refetch } = trpc.employee.list.useQuery({ keyword: search || undefined }, { enabled: !!employee });
  const { data: departments = [] } = trpc.department.list.useQuery(undefined, { enabled: !!employee });

  const deptOptions = departments.map((d: any) => ({ value: d.id, label: d.name }));
  const empOptions = employees.map((e: any) => ({ value: e.id, label: e.name, sub: e.employeeNo }));

  const createMutation = trpc.employee.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm(emptyForm); toast.success("员工已创建"); },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.employee.update.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setEditId(null); setForm(emptyForm); toast.success("员工信息已更新"); },
    onError: (err) => toast.error(err.message),
  });

  const importMutation = trpc.employee.batchImport.useMutation({
    onSuccess: (data: any) => { refetch(); setShowImport(false); setImportText(""); toast.success(`成功导入 ${data.success} 名员工`); },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeNo || !form.name) { toast.error("工号和姓名为必填项"); return; }
    if (editId) {
      updateMutation.mutate({ id: editId, ...(form as any) });
    } else {
      if (!form.password) { toast.error("新员工需要设置密码"); return; }
      createMutation.mutate(form as any);
    }
  };

  const handleEdit = (emp: any) => {
    setEditId(emp.id);
    setForm({
      employeeNo: emp.employeeNo ?? emp.employee_no ?? "",
      name: emp.name ?? "",
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      role: emp.role ?? "member",
      departmentId: emp.departmentId ?? emp.department_id ?? null,
      supervisorId: emp.supervisorId ?? emp.supervisor_id ?? null,
      password: "",
    });
    setShowForm(true);
  };

  const handleExport = () => {
    const rows = [["工号", "姓名", "邮箱", "手机", "角色", "部门ID", "直属上级ID"]];
    employees.forEach((e: any) => {
      rows.push([e.employeeNo ?? e.employee_no, e.name, e.email ?? "", e.phone ?? "", e.role, e.departmentId ?? e.department_id ?? "", e.supervisorId ?? e.supervisor_id ?? ""]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "employees.csv"; a.click();
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
            <h1 className="text-2xl font-bold tracking-tight">员工管理</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors">
              <Download size={14} />导出
            </button>
            <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-2 border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors">
              <Upload size={14} />批量导入
            </button>
            <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 text-sm hover:bg-primary/90 transition-colors">
              <Plus size={14} />新增员工
            </button>
          </div>
        </div>

        {/* 批量导入区 */}
        {showImport && (
          <div className="mb-6 border border-dashed border-primary p-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-3">批量导入（CSV 格式）</div>
            <div className="text-xs text-muted-foreground mb-2">格式：工号,姓名,邮箱,手机,角色(member/team_leader/manager/director/admin),部门ID,直属上级工号,初始密码</div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="粘贴 CSV 数据..."
              rows={5}
              className="w-full border border-border px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:border-foreground mb-3"
            />
            <button
              onClick={() => {
                // 解析 CSV 数据
                const lines = importText.trim().split('\n').filter(l => l.trim());
                const rows = lines.map(line => {
                  const [employeeNo, name, email, phone, role, deptId, , password] = line.split(',').map(s => s.trim());
                  return { employeeNo, name, email: email || undefined, phone: phone || undefined, role: (role as any) || 'member', departmentId: deptId ? Number(deptId) : undefined, password: password || '123456' };
                });
                importMutation.mutate(rows);
              }}
              disabled={importMutation.isPending || !importText.trim()}
              className="bg-primary text-white px-4 py-2 text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              导入
            </button>
          </div>
        )}

        {/* 搜索 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索工号、姓名..."
              className="w-full border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-foreground"
            />
          </div>
          <span className="text-xs text-muted-foreground">共 {employees.length} 人</span>
        </div>

        {/* 员工表格 */}
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary">
                {["工号", "姓名", "角色", "部门", "邮箱", "手机", "操作"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">暂无员工数据</td></tr>
              ) : (
                employees.map((emp: any) => {
                  const dept = departments.find((d: any) => d.id === (emp.departmentId ?? emp.department_id));
                  return (
                    <tr key={emp.id} className="hover:bg-secondary transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{emp.employeeNo ?? emp.employee_no}</td>
                      <td className="px-4 py-3 font-medium">{emp.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 font-medium ${emp.role === "admin" ? "bg-primary text-white" : "bg-secondary border border-border"}`}>
                          {ROLE_LABELS[emp.role] ?? emp.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{dept?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.email ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.phone ?? "-"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleEdit(emp)} className="text-xs border border-border px-2 py-1 hover:bg-secondary transition-colors flex items-center gap-1">
                          <Pencil size={10} />编辑
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 新增/编辑表单 */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white border border-foreground w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-bold text-sm uppercase tracking-wider">{editId ? "编辑员工" : "新增员工"}</h2>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">工号 *</label>
                    <input value={form.employeeNo} onChange={(e) => setForm(f => ({ ...f, employeeNo: e.target.value }))}
                      className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">姓名 *</label>
                    <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">角色</label>
                  <Combobox options={ROLE_OPTIONS} value={form.role} onChange={(v) => setForm(f => ({ ...f, role: v as string }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">部门</label>
                  <Combobox options={deptOptions} value={form.departmentId} onChange={(v) => setForm(f => ({ ...f, departmentId: v as number | null }))} placeholder="选择部门" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">直属上级</label>
                  <Combobox options={empOptions} value={form.supervisorId} onChange={(v) => setForm(f => ({ ...f, supervisorId: v as number | null }))} placeholder="选择上级" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">邮箱</label>
                    <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">手机</label>
                    <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{editId ? "新密码（留空不修改）" : "初始密码 *"}</label>
                  <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 bg-primary text-white py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Check size={14} />
                    {editId ? "保存修改" : "创建员工"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                    className="flex-1 border border-border py-2.5 text-sm hover:bg-secondary transition-colors">
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
