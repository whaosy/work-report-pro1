import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import Combobox from "@/components/Combobox";
import { useEmployee, ROLE_LABELS } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Eye, MessageSquare, Bell, ChevronDown, ChevronUp, CheckCircle2, Clock, FileText, Send } from "lucide-react";

type Tab = "daily" | "weekly" | "monthly";

export default function ReportView() {
  const { employee } = useEmployee();
  const [tab, setTab] = useState<Tab>("daily");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterEmployee, setFilterEmployee] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState<Record<number, string>>({});

  const { data: employees = [] } = trpc.employee.list.useQuery({}, { enabled: !!employee });
  const empOptions = employees.map((e: any) => ({ value: e.id, label: e.name, sub: e.employeeNo }));

  const { data: dailyReports = [], refetch: refetchDaily } = trpc.dailyReport.list.useQuery(
    { startDate, endDate, employeeIds: filterEmployee ? [filterEmployee] : undefined },
    { enabled: !!employee && tab === "daily" }
  );

  const { data: periodicReports = [], refetch: refetchPeriodic } = trpc.weeklyMonthlyReport.list.useQuery(
    { reportType: tab === "weekly" ? "weekly" : "monthly", startDate, endDate, employeeIds: filterEmployee ? [filterEmployee] : undefined },
    { enabled: !!employee && (tab === "weekly" || tab === "monthly") }
  );

  const addCommentMutation = trpc.comment.add.useMutation({
    onSuccess: (_, vars) => {
      setCommentText(prev => ({ ...prev, [vars.reportId]: "" }));
      toast.success("点评已发送");
      if (tab === "daily") refetchDaily(); else refetchPeriodic();
    },
    onError: (err) => toast.error(err.message),
  });

  const urgeMutation = trpc.notification.urge.useMutation({
    onSuccess: () => toast.success("催办通知已发送"),
    onError: (err) => toast.error(err.message),
  });

  const reports = tab === "daily" ? dailyReports : periodicReports;

  const getEmployeeName = (id: number) => employees.find((e: any) => e.id === id)?.name ?? "未知";

  return (
    <AppLayout>
      <div className="p-6 md:p-8">
        {/* 页头 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-4 h-4 bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">团队管理</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">汇报查看</h1>
        </div>

        {/* 筛选栏 */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 border border-border bg-secondary">
          {/* 类型切换 */}
          <div className="flex border border-border">
            {(["daily", "weekly", "monthly"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${tab === t ? "bg-foreground text-white" : "hover:bg-white"}`}>
                {t === "daily" ? "日报" : t === "weekly" ? "周报" : "月报"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">日期</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-border px-2 py-1.5 text-xs focus:outline-none" />
            <span className="text-xs text-muted-foreground">至</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-border px-2 py-1.5 text-xs focus:outline-none" />
          </div>

          <Combobox
            options={empOptions}
            value={filterEmployee}
            onChange={(v) => setFilterEmployee(v as number | null)}
            placeholder="筛选员工"
            className="w-40"
          />
        </div>

        {/* 报告列表 */}
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
              暂无汇报数据
            </div>
          ) : (
            reports.map((report: any) => {
              const reportId = report.id;
              const isExpanded = expandedId === reportId;
              const isSubmitted = report.status === 1;
              const empName = getEmployeeName(report.employeeId ?? report.employee_id);
              const dateStr = report.reportDate ?? report.report_date ?? report.periodStart ?? report.period_start ?? "";

              return (
                <div key={reportId} className="border border-border bg-white">
                  {/* 报告头 */}
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : reportId)}>
                    <div className={`w-2 h-2 flex-shrink-0 ${isSubmitted ? "bg-green-500" : "bg-yellow-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{empName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{dateStr}</span>
                        {isSubmitted ? (
                          <span className="text-xs text-green-600 font-medium">已提交</span>
                        ) : (
                          <span className="text-xs text-yellow-600 font-medium">草稿</span>
                        )}
                      </div>
                      {tab === "daily" && report.items && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {report.items.length} 条工作记录
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 催办按钮 */}
                      {!isSubmitted && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            urgeMutation.mutate({ employeeId: report.employeeId ?? report.employee_id });
                          }}
                          className="text-xs border border-primary text-primary px-2 py-1 hover:bg-primary/5 transition-colors"
                        >
                          <Bell size={12} className="inline mr-1" />
                          催办
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </div>
                  </div>

                  {/* 展开内容 */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4">
                      {tab === "daily" ? (
                        <DailyReportDetail reportId={reportId} />
                      ) : (
                        <PeriodicReportDetail reportId={reportId} />
                      )}

                      {/* 点评区 */}
                      {isSubmitted && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={14} />
                            <span className="text-xs font-semibold uppercase tracking-wider">添加点评</span>
                          </div>
                          <div className="flex gap-2">
                            <textarea
                              value={commentText[reportId] ?? ""}
                              onChange={(e) => setCommentText(prev => ({ ...prev, [reportId]: e.target.value }))}
                              placeholder="输入点评内容..."
                              rows={2}
                              className="flex-1 border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-foreground"
                            />
                            <button
                              onClick={() => {
                                const content = commentText[reportId]?.trim();
                                if (!content) { toast.error("请输入点评内容"); return; }
                                addCommentMutation.mutate({ reportType: tab, reportId, content });
                              }}
                              className="bg-primary text-white px-4 py-2 text-sm hover:bg-primary/90 flex items-center gap-1 self-end"
                            >
                              <Send size={12} />
                              发送
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function DailyReportDetail({ reportId }: { reportId: number }) {
  const { data } = trpc.dailyReport.getDetail.useQuery({ id: reportId });
  if (!data) return <div className="text-sm text-muted-foreground">加载中...</div>;
  return (
    <div className="space-y-4">
      {data.items && data.items.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2">工作内容</div>
          <div className="space-y-2">
            {data.items.map((item: any) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-secondary border border-border">
                <div className="flex-1 text-sm">{item.description}</div>
                <div className="text-xs font-mono text-muted-foreground flex-shrink-0">{item.hours}h</div>
                <div className="text-xs text-muted-foreground flex-shrink-0">{item.completionRate ?? item.completion_rate}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(data.tomorrowPlan || (data as any).tomorrow_plan) && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2">明日计划</div>
          <div className="text-sm text-muted-foreground p-3 bg-secondary border border-border">
            {data.tomorrowPlan ?? (data as any).tomorrow_plan}
          </div>
        </div>
      )}
      {data.comments && data.comments.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2">点评记录</div>
          {data.comments.map((c: any) => (
            <div key={c.id} className="p-3 bg-primary/5 border border-primary/20 mb-2">
              <div className="text-xs text-muted-foreground mb-1">{c.commenterId}</div>
              <div className="text-sm">{c.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PeriodicReportDetail({ reportId }: { reportId: number }) {
  const { data } = trpc.weeklyMonthlyReport.getDetail.useQuery({ id: reportId });
  if (!data) return <div className="text-sm text-muted-foreground">加载中...</div>;
  const summary = (data as any).current_summary ?? data.currentSummary;
  const nextPlan = (data as any).next_plan ?? data.nextPlan;
  return (
    <div className="space-y-4">
      {summary && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2">工作总结</div>
          <div className="text-sm text-muted-foreground p-3 bg-secondary border border-border whitespace-pre-wrap">{summary}</div>
        </div>
      )}
      {nextPlan && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2">下期计划</div>
          <div className="text-sm text-muted-foreground p-3 bg-secondary border border-border whitespace-pre-wrap">{nextPlan}</div>
        </div>
      )}
      {data.comments && data.comments.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2">点评记录</div>
          {data.comments.map((c: any) => (
            <div key={c.id} className="p-3 bg-primary/5 border border-primary/20 mb-2">
              <div className="text-sm">{c.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
