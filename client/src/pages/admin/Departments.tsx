import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import Combobox from "@/components/Combobox";
import { useEmployee } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check, Building2, ChevronRight } from "lucide-react";

interface DeptForm { name: string; parentId: number | null; description: string; }
const emptyDeptForm: DeptForm = { name: "", parentId: null, description: "" };

interface OrgForm { name: string; code: string; description: string; }
const emptyOrgForm: OrgForm = { name: "", code: "", description: "" };

export default function Departments() {
  const { employee } = useEmployee();
  const [activeTab, setActiveTab] = useState<"dept" | "org">("dept");
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editDeptId, setEditDeptId] = useState<number | null>(null);
  const [deptForm, setDeptForm] = useState<DeptForm>(emptyDeptForm);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editOrgId, setEditOrgId] = useState<number | null>(null);
  const [orgForm, setOrgForm] = useState<OrgForm>(emptyOrgForm);

  const { data: departments = [], refetch: refetchDepts } = trpc.department.list.useQuery(undefined, { enabled: !!employee });
  const { data: organizations = [], refetch: refetchOrgs } = trpc.organization.list.useQuery(undefined, { enabled: !!employee });

  const deptOptions = departments.map((d: any) => ({ value: d.id, label: d.name }));

  const createDeptMutation = trpc.department.create.useMutation({
    onSuccess: () => { refetchDepts(); setShowDeptForm(false); setDeptForm(emptyDeptForm); toast.success("部门已创建"); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateDeptMutation = trpc.department.update.useMutation({
    onSuccess: () => { refetchDepts(); setShowDeptForm(false); setEditDeptId(null); toast.success("部门已更新"); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteDeptMutation = trpc.department.delete.useMutation({
    onSuccess: () => { refetchDepts(); toast.success("部门已删除"); },
    onError: (err: any) => toast.error(err.message),
  });

  const createOrgMutation = trpc.organization.create.useMutation({
    onSuccess: () => { refetchOrgs(); setShowOrgForm(false); setOrgForm(emptyOrgForm); toast.success("机构已创建"); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateOrgMutation = trpc.organization.update.useMutation({
    onSuccess: () => { refetchOrgs(); setShowOrgForm(false); setEditOrgId(null); toast.success("机构已更新"); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteOrgMutation = trpc.organization.delete.useMutation({
    onSuccess: () => { refetchOrgs(); toast.success("机构已删除"); },
    onError: (err: any) => toast.error(err.message),
  });

  // 构建部门树
  const buildTree = (items: any[], parentId: number | null = null): any[] => {
    return items
      .filter(i => (i.parentId ?? i.parent_id ?? null) === parentId)
      .map(i => ({ ...i, children: buildTree(items, i.id) }));
  };
  const deptTree = buildTree(departments as any[]);

  const DeptNode = ({ node, depth = 0 }: { node: any; depth?: number }) => (
    <div>
      <div className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors border-b border-border`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}>
        {depth > 0 && <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />}
        <Building2 size={14} className="text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-sm font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground">{node.description ?? ""}</span>
        <div className="flex items-center gap-1 ml-4">
          <button onClick={() => { setEditDeptId(node.id); setDeptForm({ name: node.name, parentId: node.parentId ?? node.parent_id ?? null, description: node.description ?? "" }); setShowDeptForm(true); }}
            className="text-xs border border-border px-2 py-1 hover:bg-secondary transition-colors">
            <Pencil size={10} />
          </button>
          <button onClick={() => { if (confirm("确认删除该部门？")) deleteDeptMutation.mutate({ id: node.id }); }}
            className="text-xs border border-border px-2 py-1 hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors">
            <Trash2 size={10} />
          </button>
        </div>
      </div>
      {node.children?.map((child: any) => <DeptNode key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );

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
            <h1 className="text-2xl font-bold tracking-tight">部门 / 机构管理</h1>
          </div>
          <button
            onClick={() => { if (activeTab === "dept") { setShowDeptForm(true); setEditDeptId(null); setDeptForm(emptyDeptForm); } else { setShowOrgForm(true); setEditOrgId(null); setOrgForm(emptyOrgForm); } }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            新增{activeTab === "dept" ? "部门" : "机构"}
          </button>
        </div>

        {/* Tab */}
        <div className="flex border-b border-border mb-6">
          {[["dept", "部门管理"], ["org", "机构管理"]].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t as "dept" | "org")}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "dept" ? (
          <div className="border border-border">
            {deptTree.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">暂无部门，点击右上角新增</div>
            ) : (
              deptTree.map((node: any) => <DeptNode key={node.id} node={node} />)
            )}
          </div>
        ) : (
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  {["机构名称", "机构代码", "描述", "操作"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">暂无机构数据</td></tr>
                ) : (
                  organizations.map((org: any) => (
                    <tr key={org.id} className="hover:bg-secondary transition-colors">
                      <td className="px-4 py-3 font-medium">{org.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{org.code ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{org.description ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditOrgId(org.id); setOrgForm({ name: org.name, code: org.code ?? "", description: org.description ?? "" }); setShowOrgForm(true); }}
                            className="text-xs border border-border px-2 py-1 hover:bg-secondary transition-colors">
                            <Pencil size={10} />
                          </button>
                          <button onClick={() => { if (confirm("确认删除？")) deleteOrgMutation.mutate({ id: org.id }); }}
                            className="text-xs border border-border px-2 py-1 hover:text-primary hover:border-primary transition-colors">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 部门表单 */}
        {showDeptForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white border border-foreground w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-bold text-sm uppercase tracking-wider">{editDeptId ? "编辑部门" : "新增部门"}</h2>
                <button onClick={() => { setShowDeptForm(false); setEditDeptId(null); }}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if (editDeptId) updateDeptMutation.mutate({ id: editDeptId, ...deptForm }); else createDeptMutation.mutate(deptForm as any); }} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">部门名称 *</label>
                  <input value={deptForm.name} onChange={(e) => setDeptForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">上级部门</label>
                  <Combobox options={deptOptions.filter(d => d.value !== editDeptId)} value={deptForm.parentId} onChange={(v) => setDeptForm(f => ({ ...f, parentId: v as number | null }))} placeholder="选择上级部门（可选）" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">描述</label>
                  <input value={deptForm.description} onChange={(e) => setDeptForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-primary text-white py-2.5 text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
                    <Check size={14} />{editDeptId ? "保存" : "创建"}
                  </button>
                  <button type="button" onClick={() => { setShowDeptForm(false); setEditDeptId(null); }} className="flex-1 border border-border py-2.5 text-sm hover:bg-secondary">取消</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 机构表单 */}
        {showOrgForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white border border-foreground w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-bold text-sm uppercase tracking-wider">{editOrgId ? "编辑机构" : "新增机构"}</h2>
                <button onClick={() => { setShowOrgForm(false); setEditOrgId(null); }}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if (editOrgId) updateOrgMutation.mutate({ id: editOrgId, ...orgForm }); else createOrgMutation.mutate(orgForm as any); }} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">机构名称 *</label>
                  <input value={orgForm.name} onChange={(e) => setOrgForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">机构代码</label>
                  <input value={orgForm.code} onChange={(e) => setOrgForm(f => ({ ...f, code: e.target.value }))}
                    className="w-full border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">描述</label>
                  <input value={orgForm.description} onChange={(e) => setOrgForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-primary text-white py-2.5 text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
                    <Check size={14} />{editOrgId ? "保存" : "创建"}
                  </button>
                  <button type="button" onClick={() => { setShowOrgForm(false); setEditOrgId(null); }} className="flex-1 border border-border py-2.5 text-sm hover:bg-secondary">取消</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
