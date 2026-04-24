import React, { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import Combobox from "@/components/Combobox";
import { useEmployee } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Save, Send,
  Zap, Mic, MicOff, Sparkles, GripVertical, ChevronUp, ChevronDown,
  Clock, CheckCircle2, AlertCircle, X, MessageSquare
} from "lucide-react";

interface WorkItem {
  id?: number;
  projectId: number | null;
  description: string;
  hours: string;
  completionRate: number;
  sortOrder: number;
  isNew?: boolean;
}

const HOURS_OPTIONS = ["0", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8"];

export default function DailyReport() {
  const { employee } = useEmployee();
  const [currentDate, setCurrentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [items, setItems] = useState<WorkItem[]>([]);
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [reportId, setReportId] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showFragment, setShowFragment] = useState(false);
  const [fragmentText, setFragmentText] = useState("");
  const [fragmentProject, setFragmentProject] = useState<number | null>(null);
  const [fragmentHours, setFragmentHours] = useState("0");
  const [isRecording, setIsRecording] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();

  // 获取项目列表
  const { data: projects = [] } = trpc.project.list.useQuery({ employeeId: employee?.id }, { enabled: !!employee });
  const projectOptions = projects.map((p: any) => ({ value: p.id, label: p.name, sub: p.projectNo }));

  // 获取当天日报
  const { data: reportData, refetch: refetchReport } = trpc.dailyReport.getByDate.useQuery(
    { date: currentDate },
    { enabled: !!employee }
  );

  // 获取碎片
  const { data: fragments = [], refetch: refetchFragments } = trpc.dailyReport.getFragments.useQuery(
    { date: currentDate },
    { enabled: !!employee }
  );

  useEffect(() => {
    if (reportData) {
      setReportId(reportData.id);
      const plan = reportData.tomorrowPlan ?? (reportData as any).tomorrow_plan ?? "";
      setTomorrowPlan(typeof plan === 'string' ? plan : "");
      const loadedItems = (reportData.items ?? []).map((i: any) => ({
        id: i.id,
        projectId: i.projectId ?? i.project_id ?? null,
        description: i.description ?? "",
        hours: i.hours ?? "0",
        completionRate: i.completionRate ?? i.completion_rate ?? 0,
        sortOrder: i.sortOrder ?? i.sort_order ?? 0,
      }));
      setItems(loadedItems.length > 0 ? loadedItems : [createEmptyItem()]);
    } else {
      setReportId(null);
      setTomorrowPlan("");
      setItems([createEmptyItem()]);
    }
    setIsDirty(false);
  }, [reportData, currentDate]);

  function createEmptyItem(): WorkItem {
    return { projectId: null, description: "", hours: "0", completionRate: 0, sortOrder: 0 };
  }

  const saveMutation = trpc.dailyReport.save.useMutation({
    onSuccess: (data) => {
      setReportId(data.reportId);
      setIsDirty(false);
      refetchReport();
    },
    onError: (err) => toast.error(err.message),
  });

  const addFragmentMutation = trpc.dailyReport.addFragment.useMutation({
    onSuccess: () => {
      setFragmentText("");
      setFragmentProject(null);
      setFragmentHours("0");
      refetchFragments();
      toast.success("碎片记录已保存");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteFragmentMutation = trpc.dailyReport.deleteFragment.useMutation({
    onSuccess: () => refetchFragments(),
  });

  // AI 填充
  const generateDraftMutation = trpc.weeklyMonthlyReport.generateDraft.useMutation({
    onSuccess: (data) => {
      // 将 AI 生成内容放入明日计划
      setTomorrowPlan(typeof data.draft === 'string' ? data.draft : String(data.draft));
      toast.success("AI 已生成内容，请查看明日计划区域");
      setIsDirty(true);
    },
    onError: () => toast.error("AI 生成失败，请稍后重试"),
  });

  // 自动保存（草稿）
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (isDirty) handleSave(0);
    }, 3000);
  }, [isDirty, items, tomorrowPlan]);

  useEffect(() => {
    if (isDirty) triggerAutoSave();
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [isDirty]);

  // 离开页面自动保存
  useEffect(() => {
    const handler = () => { if (isDirty) handleSave(0); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, items, tomorrowPlan]);

  const handleSave = (status: number) => {
    const validItems = items.filter(i => i.description.trim());
    saveMutation.mutate({
      date: currentDate,
      tomorrowPlan,
      status,
      items: validItems.map((item, idx) => ({
        id: item.id,
        projectId: item.projectId,
        description: item.description,
        hours: item.hours,
        completionRate: item.completionRate,
        sortOrder: idx,
      })),
      fragmentIds: [],
    });
    if (status === 1) toast.success("日报已提交！");
    else toast.success("草稿已保存");
  };

  const addItem = () => {
    setItems([...items, { ...createEmptyItem(), sortOrder: items.length }]);
    setIsDirty(true);
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) { setItems([createEmptyItem()]); }
    else { setItems(items.filter((_, i) => i !== idx)); }
    setIsDirty(true);
  };

  const updateItem = (idx: number, field: keyof WorkItem, val: any) => {
    const next = [...items];
    (next[idx] as any)[field] = val;
    setItems(next);
    setIsDirty(true);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
    setIsDirty(true);
  };

  const mergeFragment = (frag: any) => {
    const newItem: WorkItem = {
      projectId: frag.projectId ?? frag.project_id ?? null,
      description: frag.description ?? "",
      hours: frag.hours ?? "0",
      completionRate: 0,
      sortOrder: items.length,
    };
    setItems([...items.filter(i => i.description.trim() !== ""), newItem]);
    deleteFragmentMutation.mutate({ id: frag.id });
    setIsDirty(true);
    toast.success("碎片已合并到日报");
  };

  const isSubmitted = reportData?.status === 1;
  const totalHours = items.reduce((sum, i) => sum + parseFloat(i.hours || "0"), 0);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-4 h-4 bg-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">日报填报</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">工作日报</h1>
          </div>
          {/* 日期切换 */}
          <div className="flex items-center gap-2 border border-border">
            <button onClick={() => setCurrentDate(format(subDays(new Date(currentDate), 1), "yyyy-MM-dd"))}
              className="p-2 hover:bg-secondary transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm font-medium font-mono min-w-[100px] text-center">
              {format(new Date(currentDate), "MM月dd日 EEE", { locale: zhCN })}
            </span>
            <button
              onClick={() => setCurrentDate(format(addDays(new Date(currentDate), 1), "yyyy-MM-dd"))}
              disabled={currentDate >= format(new Date(), "yyyy-MM-dd")}
              className="p-2 hover:bg-secondary transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* 状态栏 */}
        <div className="flex items-center gap-4 mb-6 p-3 bg-secondary border border-border">
          <div className="flex items-center gap-2">
            {isSubmitted ? (
              <><CheckCircle2 size={14} className="text-green-600" /><span className="text-xs font-medium text-green-700">已提交</span></>
            ) : (
              <><Clock size={14} className="text-yellow-600" /><span className="text-xs font-medium text-yellow-700">草稿</span></>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            总工时：<span className="font-mono font-bold text-foreground">{totalHours.toFixed(1)}h</span>
          </div>
          <div className="text-xs text-muted-foreground">
            工作条目：<span className="font-mono font-bold text-foreground">{items.filter(i => i.description.trim()).length}</span>
          </div>
          {isDirty && <span className="text-xs text-muted-foreground ml-auto">未保存更改...</span>}
        </div>

        {/* 碎片记录区 */}
        {fragments.length > 0 && (
          <div className="mb-6 border border-dashed border-primary/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">碎片记录（{fragments.length}条）</span>
              <span className="text-xs text-muted-foreground ml-2">点击合并到日报</span>
            </div>
            <div className="space-y-2">
              {fragments.map((frag: any) => (
                <div key={frag.id} className="flex items-center gap-3 bg-white border border-border p-3 hover:border-primary/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{frag.description}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{frag.hours}h</div>
                  </div>
                  <button onClick={() => mergeFragment(frag)}
                    className="text-xs bg-primary text-white px-2 py-1 hover:bg-primary/90 flex-shrink-0">
                    合并
                  </button>
                  <button onClick={() => deleteFragmentMutation.mutate({ id: frag.id })}
                    className="text-muted-foreground hover:text-primary">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 工作条目 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 bg-primary" />
            <h2 className="font-bold text-sm uppercase tracking-wider">工作内容</h2>
          </div>

          {/* 表头 */}
          <div className="hidden md:grid grid-cols-[auto_1fr_100px_120px_80px] gap-2 px-2 mb-2">
            {["排序", "工作描述 / 关联项目", "工时", "完成度", "操作"].map(h => (
              <div key={h} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</div>
            ))}
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="border border-border bg-white hover:border-foreground/30 transition-colors">
                {/* 移动端布局 */}
                <div className="md:hidden p-3 space-y-2">
                  <Combobox
                    options={projectOptions}
                    value={item.projectId}
                    onChange={(v) => updateItem(idx, "projectId", v)}
                    placeholder="关联项目（可选）"
                    className="w-full"
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    placeholder="描述工作内容..."
                    rows={2}
                    className="w-full border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-foreground"
                    disabled={isSubmitted}
                  />
                  <div className="flex gap-2">
                    <select value={item.hours} onChange={(e) => updateItem(idx, "hours", e.target.value)}
                      className="border border-border px-2 py-1.5 text-sm focus:outline-none flex-1" disabled={isSubmitted}>
                      {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}h</option>)}
                    </select>
                    <div className="flex items-center gap-2 flex-1">
                      <input type="range" min={0} max={100} step={10} value={item.completionRate}
                        onChange={(e) => updateItem(idx, "completionRate", Number(e.target.value))}
                        className="flex-1" disabled={isSubmitted} />
                      <span className="text-xs font-mono w-8 text-right">{item.completionRate}%</span>
                    </div>
                    <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-primary">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 桌面端布局 */}
                <div className="hidden md:grid grid-cols-[auto_1fr_100px_120px_80px] gap-2 items-start p-2">
                  {/* 排序 */}
                  <div className="flex flex-col items-center gap-0.5 pt-2">
                    <button onClick={() => moveItem(idx, -1)} disabled={idx === 0 || isSubmitted}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                      <ChevronUp size={14} />
                    </button>
                    <GripVertical size={14} className="text-muted-foreground/40" />
                    <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1 || isSubmitted}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  {/* 描述+项目 */}
                  <div className="space-y-1.5">
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="描述工作内容..."
                      rows={2}
                      className="w-full border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-foreground"
                      disabled={isSubmitted}
                    />
                    <Combobox
                      options={projectOptions}
                      value={item.projectId}
                      onChange={(v) => updateItem(idx, "projectId", v as number | null)}
                      placeholder="关联项目（可选）"
                    />
                  </div>
                  {/* 工时 */}
                  <div className="flex items-center gap-1 pt-2">
                    <button onClick={() => {
                      const cur = parseFloat(item.hours);
                      if (cur > 0) updateItem(idx, "hours", Math.max(0, cur - 0.5).toFixed(1));
                    }} disabled={isSubmitted} className="w-6 h-6 border border-border flex items-center justify-center text-sm hover:bg-secondary disabled:opacity-30">−</button>
                    <span className="font-mono text-sm w-10 text-center">{item.hours}h</span>
                    <button onClick={() => {
                      const cur = parseFloat(item.hours);
                      if (cur < 24) updateItem(idx, "hours", Math.min(24, cur + 0.5).toFixed(1));
                    }} disabled={isSubmitted} className="w-6 h-6 border border-border flex items-center justify-center text-sm hover:bg-secondary disabled:opacity-30">+</button>
                  </div>
                  {/* 完成度 */}
                  <div className="flex flex-col gap-1 pt-2">
                    <input type="range" min={0} max={100} step={10} value={item.completionRate}
                      onChange={(e) => updateItem(idx, "completionRate", Number(e.target.value))}
                      className="w-full" disabled={isSubmitted} />
                    <span className="text-xs font-mono text-center">{item.completionRate}%</span>
                  </div>
                  {/* 操作 */}
                  <div className="flex items-center justify-center pt-2">
                    <button onClick={() => removeItem(idx)} disabled={isSubmitted}
                      className="text-muted-foreground hover:text-primary disabled:opacity-30">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isSubmitted && (
            <button onClick={addItem}
              className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border px-4 py-2 w-full justify-center hover:border-foreground transition-colors">
              <Plus size={14} />
              添加工作条目
            </button>
          )}
        </div>

        {/* 明日计划 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 bg-foreground" />
            <h2 className="font-bold text-sm uppercase tracking-wider">明日计划</h2>
          </div>
          <textarea
            value={tomorrowPlan}
            onChange={(e) => { setTomorrowPlan(e.target.value); setIsDirty(true); }}
            placeholder="简述明日工作计划..."
            rows={3}
            className="w-full border border-border px-4 py-3 text-sm resize-none focus:outline-none focus:border-foreground"
            disabled={isSubmitted}
          />
        </div>

        {/* 操作按钮 */}
        {!isSubmitted && (
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => handleSave(0)} disabled={saveMutation.isPending}
              className="flex items-center gap-2 border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors">
              <Save size={14} />
              保存草稿
            </button>
            <button onClick={() => handleSave(1)} disabled={saveMutation.isPending}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
              <Send size={14} />
              提交日报
            </button>
            <button
              onClick={() => setShowFragment(!showFragment)}
              className="flex items-center gap-2 border border-dashed border-primary text-primary px-4 py-2.5 text-sm font-medium hover:bg-primary/5 transition-colors ml-auto"
            >
              <Zap size={14} />
              快捷记录
            </button>
          </div>
        )}

        {isSubmitted && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200">
            <CheckCircle2 size={16} className="text-green-600" />
            <span className="text-sm text-green-700 font-medium">日报已提交，如需修改请联系上级</span>
          </div>
        )}
      </div>

      {/* 悬浮快捷记录卡片 */}
      {showFragment && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-white border border-foreground shadow-xl animate-fade-up">
          <div className="flex items-center justify-between px-4 py-3 bg-foreground text-white">
            <div className="flex items-center gap-2">
              <Zap size={14} />
              <span className="text-sm font-semibold">快捷记录</span>
            </div>
            <button onClick={() => setShowFragment(false)} className="text-white/70 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <Combobox
              options={projectOptions}
              value={fragmentProject}
              onChange={(v) => setFragmentProject(v as number | null)}
              placeholder="关联项目（可选）"
            />
            <div className="relative">
              <textarea
                value={fragmentText}
                onChange={(e) => setFragmentText(e.target.value)}
                placeholder="快速记录工作内容..."
                rows={3}
                className="w-full border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-foreground pr-10"
              />
              <button
                className={`absolute right-2 bottom-2 ${isRecording ? "text-primary animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => {
                  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                    toast.error("当前浏览器不支持语音输入");
                    return;
                  }
                  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                  const recognition = new SpeechRecognition();
                  recognition.lang = "zh-CN";
                  recognition.continuous = false;
                  recognition.onstart = () => setIsRecording(true);
                  recognition.onend = () => setIsRecording(false);
                  recognition.onresult = (e: any) => {
                    const transcript = e.results[0][0].transcript;
                    setFragmentText(prev => prev + transcript);
                  };
                  recognition.onerror = () => { setIsRecording(false); toast.error("语音识别失败"); };
                  if (isRecording) { recognition.stop(); } else { recognition.start(); }
                }}
                title={isRecording ? "停止录音" : "语音输入"}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">工时</span>
              <select value={fragmentHours} onChange={(e) => setFragmentHours(e.target.value)}
                className="border border-border px-2 py-1 text-sm flex-1 focus:outline-none">
                {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}h</option>)}
              </select>
            </div>
            <button
              onClick={() => {
                if (!fragmentText.trim()) { toast.error("请输入工作内容"); return; }
                addFragmentMutation.mutate({ projectId: fragmentProject, description: fragmentText.trim(), hours: fragmentHours, date: currentDate });
              }}
              disabled={addFragmentMutation.isPending}
              className="w-full bg-primary text-white py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              保存碎片
            </button>
          </div>
        </div>
      )}

      {/* 悬浮触发按钮（当卡片关闭时） */}
      {!showFragment && (
        <button
          onClick={() => setShowFragment(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-foreground text-white flex items-center justify-center shadow-lg hover:bg-primary transition-colors"
          title="快捷记录"
        >
          <Zap size={18} />
        </button>
      )}
    </AppLayout>
  );
}
