import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useEmployee } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, addWeeks, subMonths, addMonths } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Save, Send, Sparkles, CheckCircle2, Clock, Loader2 } from "lucide-react";

type ReportType = "weekly" | "monthly";

function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd"), label: `${format(start, "MM/dd")}–${format(end, "MM/dd")} 周报` };
}

function getMonthRange(date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd"), label: format(date, "yyyy年MM月") + " 月报" };
}

export default function PeriodicReport() {
  const { employee } = useEmployee();
  const [reportType, setReportType] = useState<ReportType>("weekly");
  const [refDate, setRefDate] = useState(new Date());

  const range = reportType === "weekly" ? getWeekRange(refDate) : getMonthRange(refDate);

  const [form, setForm] = useState({
    currentSummary: "",
    nextPlan: "",
    relatedProjects: "",
    coordinationNeeds: "",
    keyOutputs: "",
    nextMonthGoals: "",
    keyIssueAnalysis: "",
    projectProgress: "",
  });

  const { data: existingReport, refetch } = trpc.weeklyMonthlyReport.getByPeriod.useQuery(
    { reportType, periodStart: range.start },
    { enabled: !!employee }
  );

  const { data: aggregated } = trpc.weeklyMonthlyReport.aggregateDailyData.useQuery(
    { periodStart: range.start, periodEnd: range.end },
    { enabled: !!employee }
  );

  useEffect(() => {
    if (existingReport) {
      setForm({
        currentSummary: (existingReport as any).current_summary ?? existingReport.currentSummary ?? "",
        nextPlan: (existingReport as any).next_plan ?? existingReport.nextPlan ?? "",
        relatedProjects: (existingReport as any).related_projects ?? existingReport.relatedProjects ?? "",
        coordinationNeeds: (existingReport as any).coordination_needs ?? existingReport.coordinationNeeds ?? "",
        keyOutputs: (existingReport as any).key_outputs ?? existingReport.keyOutputs ?? "",
        nextMonthGoals: (existingReport as any).next_month_goals ?? existingReport.nextMonthGoals ?? "",
        keyIssueAnalysis: (existingReport as any).key_issue_analysis ?? existingReport.keyIssueAnalysis ?? "",
        projectProgress: (existingReport as any).project_progress ?? existingReport.projectProgress ?? "",
      });
    } else {
      setForm({ currentSummary: "", nextPlan: "", relatedProjects: "", coordinationNeeds: "", keyOutputs: "", nextMonthGoals: "", keyIssueAnalysis: "", projectProgress: "" });
    }
  }, [existingReport, range.start]);

  const saveMutation = trpc.weeklyMonthlyReport.save.useMutation({
    onSuccess: () => { refetch(); toast.success(existingReport?.status === 1 ? "已更新" : "草稿已保存"); },
    onError: (err) => toast.error(err.message),
  });

  const generateDraftMutation = trpc.weeklyMonthlyReport.generateDraft.useMutation({
    onSuccess: (data) => {
      const draft = typeof data.draft === 'string' ? data.draft : String(data.draft);
      setForm(f => ({ ...f, currentSummary: draft }));
      toast.success("AI 草稿已生成，请检查并修改");
    },
    onError: () => toast.error("AI 生成失败"),
  });

  const handleSave = (status: number) => {
    saveMutation.mutate({
      reportType,
      periodStart: range.start,
      periodEnd: range.end,
      periodLabel: range.label,
      ...form,
      status,
    });
    if (status === 1) toast.success(`${reportType === "weekly" ? "周报" : "月报"}已提交！`);
  };

  const isSubmitted = existingReport?.status === 1;

  const navigate = (dir: -1 | 1) => {
    if (reportType === "weekly") {
      setRefDate(dir === -1 ? subWeeks(refDate, 1) : addWeeks(refDate, 1));
    } else {
      setRefDate(dir === -1 ? subMonths(refDate, 1) : addMonths(refDate, 1));
    }
  };

  const weeklyFields = [
    { key: "currentSummary", label: "本周工作总结", placeholder: "总结本周主要工作内容、完成情况...", rows: 5 },
    { key: "nextPlan", label: "下周工作计划", placeholder: "规划下周工作重点与目标...", rows: 4 },
    { key: "relatedProjects", label: "关联项目进展", placeholder: "描述本周涉及项目的进展情况...", rows: 3 },
    { key: "coordinationNeeds", label: "需协调事项", placeholder: "需要跨部门协调或上级支持的事项...", rows: 2 },
  ];

  const monthlyFields = [
    { key: "currentSummary", label: "本月工作总结", placeholder: "总结本月工作成果与亮点...", rows: 5 },
    { key: "keyOutputs", label: "关键产出", placeholder: "列举本月核心交付物与成果...", rows: 3 },
    { key: "projectProgress", label: "项目进展", placeholder: "描述各项目本月进展与里程碑...", rows: 4 },
    { key: "keyIssueAnalysis", label: "问题与风险分析", placeholder: "描述遇到的主要问题、风险及应对措施...", rows: 3 },
    { key: "nextMonthGoals", label: "下月工作目标", placeholder: "规划下月工作重点与量化目标...", rows: 3 },
  ];

  const fields = reportType === "weekly" ? weeklyFields : monthlyFields;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-3xl">
        {/* 页头 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-4 h-4 bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">周报 / 月报</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">周期汇报</h1>
        </div>

        {/* 类型切换 + 日期导航 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex border border-border">
            {(["weekly", "monthly"] as ReportType[]).map((t) => (
              <button key={t} onClick={() => setReportType(t)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${reportType === t ? "bg-foreground text-white" : "hover:bg-secondary"}`}>
                {t === "weekly" ? "周报" : "月报"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border border-border ml-auto">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm font-medium min-w-[140px] text-center">{range.label}</span>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-secondary transition-colors">
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
              <><Clock size={14} className="text-yellow-600" /><span className="text-xs font-medium text-yellow-700">{existingReport ? "草稿" : "未填写"}</span></>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            本期已提交日报：<span className="font-mono font-bold text-foreground">{aggregated?.dailyCount ?? 0}</span> 天
          </div>
          <button
            onClick={() => generateDraftMutation.mutate({ reportType, periodStart: range.start, periodEnd: range.end })}
            disabled={generateDraftMutation.isPending || isSubmitted}
            className="ml-auto flex items-center gap-2 text-xs border border-primary text-primary px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {generateDraftMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI 生成草稿
          </button>
        </div>

        {/* 表单字段 */}
        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold uppercase tracking-widest text-foreground mb-2">
                {field.label}
              </label>
              <textarea
                value={(form as any)[field.key]}
                onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={field.rows}
                className="w-full border border-border px-4 py-3 text-sm resize-none focus:outline-none focus:border-foreground"
                disabled={isSubmitted}
              />
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        {!isSubmitted && (
          <div className="flex items-center gap-3 mt-8">
            <button onClick={() => handleSave(0)} disabled={saveMutation.isPending}
              className="flex items-center gap-2 border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors">
              <Save size={14} />
              保存草稿
            </button>
            <button onClick={() => handleSave(1)} disabled={saveMutation.isPending}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
              <Send size={14} />
              提交{reportType === "weekly" ? "周报" : "月报"}
            </button>
          </div>
        )}

        {isSubmitted && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 mt-8">
            <CheckCircle2 size={16} className="text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              {reportType === "weekly" ? "周报" : "月报"}已提交
            </span>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
