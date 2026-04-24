import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, Edit2 } from "lucide-react";

export default function Organizations() {
  const [keyword, setKeyword] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "" });

  const { data: organizations = [], isLoading, refetch } = trpc.organization.list.useQuery({ keyword });
  const createMutation = trpc.organization.create.useMutation();
  const updateMutation = trpc.organization.update.useMutation();
  const deleteMutation = trpc.organization.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("机构名称不能为空");
      return;
    }
    try {
      await createMutation.mutateAsync(formData);
      toast.success("机构创建成功");
      setFormData({ name: "", code: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "创建失败");
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await updateMutation.mutateAsync({ id: editingId, ...formData });
      toast.success("机构更新成功");
      setEditingId(null);
      setFormData({ name: "", code: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "更新失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此机构吗？")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("机构删除成功");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    }
  };

  const handleEdit = (org: any) => {
    setEditingId(org.id);
    setFormData({ name: org.name, code: org.code || "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">机构管理</h1>
        <Button onClick={() => { setEditingId(null); setFormData({ name: "", code: "" }); }}>
          <Plus className="mr-2 h-4 w-4" />
          新增机构
        </Button>
      </div>

      {/* 创建/编辑表单 */}
      <Card className="p-6">
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">机构名称</label>
            <Input
              placeholder="输入机构名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">机构代码</label>
            <Input
              placeholder="输入机构代码（可选）"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            {editingId ? (
              <>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "更新中..." : "更新"}
                </Button>
                <Button variant="outline" onClick={() => { setEditingId(null); setFormData({ name: "", code: "" }); }}>
                  取消
                </Button>
              </>
            ) : (
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 搜索 */}
      <div className="flex gap-2">
        <Input
          placeholder="搜索机构名称..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* 机构列表 */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无机构</div>
        ) : (
          organizations.map((org: any) => (
            <Card key={org.id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{org.name}</h3>
                {org.code && <p className="text-sm text-gray-500">代码: {org.code}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(org)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(org.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
