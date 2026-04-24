import React, { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import Combobox from "@/components/Combobox";
import { useEmployee } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { TrendingUp, Clock, FileText, AlertTriangle, Sparkles, Loader2 } from "lucide-react";

const COLORS = ["#c0392b", "#1a1a1a", "#7f8c8d", "#e74c3c", "#555555"];

export default function Analytics() {
  const { employee } = useEmployee();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterEmployee, setFilterEmployee] = useState<number | null>(null);
  const [filterDept, setFilterDept] = useState<number | null>(null);

  const { data: employees = [] } = trpc.employee.list.useQuery({}, { enabled: !!employee });
  const { data: departments = [] } = trpc.department.list.useQuery(undefined, { enabled: !!employee });

  const empOptions = employees.map((e: any) => ({ value: e.id, label: e.name, sub: e.employeeNo }));
  const deptOptions = departments.map((d: any) => ({ value: d.id, label: d.name }));

  const empIds = filterEmployee ? [filterEmployee] : [];
  const { data: hoursStatsData, isLoading: loadingHours } = trpc.analytics.hoursStats.useQuery(
    { startDate, endDate, employeeIds: empIds.length ? empIds : undefined },
    { enabled: !!employee }
  );
  const { data: projectHoursData, isLoading: loadingProj } = trpc.analytics.projectHours.useQuery(
    { startDate, endDate, employeeIds: empIds.length ? empIds : undefined },
    { enabled: !!employee }
  );
  const { data: submitStatusData, isLoading: loadingSubmit } = trpc.analytics.submitStatus.useQuery(
    { startDate, endDate, employeeIds: empIds.length ? empIds : undefined },
    { enabled: !!employee }
  );
  const isLoading = loadingHours || loadingProj || loadingSubmit;

  const { data: aiSummaryData, mutate: generateSummary, isPending: aiLoading } = trpc.analytics.generateSummary.useMutation();
  const aiSummary = aiSummaryData as any;

  const hoursData = (hoursStatsData ?? []) as any[];
  const projectData = (projectHoursData ?? []).map((p: any) => ({ name: p.projectName ?? '未关联项目', hours: p.totalHours ?? 0 }));
  const submissionData = (submitStatusData ?? []).map((s: any) => ({ name: s.employeeName, rate: s.submittedCount && s.totalDays ? Math.round(s.submittedCount / s.totalDays * 100) : 0 }));
  const warnings: any[] = [];
  const totalHours = hoursData.reduce((sum: number, d: any) => sum + (d.totalHours ?? 0), 0).toFixed(1);
  const totalReports = submitStatusData?.reduce((sum: number, s: any) => sum + (s.submittedCount ?? 0), 0) ?? 0;
  const submissionRateAvg = submissionData.length > 0 ? Math.round(submissionData.reduce((sum: number, s: any) => sum + s.rate, 0) / submissionData.length) : 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-8">
        {/* 页头 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-4 h-4 bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">团队管理</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">数据分析</h1>
        </div>

        {/* 筛选栏 */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 border border-border bg-secondary">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">日期范围</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-border px-2 py-1.5 text-xs focus:outline-none" />
            <span className="text-xs text-muted-foreground">至</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-border px-2 py-1.5 text-xs focus:outline-none" />
          </div>
          <Combobox options={deptOptions} value={filterDept} onChange={(v) => setFilterDept(v as number | null)} placeholder="筛选部门" className="w-36" />
          <Combobox options={empOptions} value={filterEmployee} onChange={(v) => setFilterEmployee(v as number | null)} placeholder="筛选员工" className="w-36" />
          <button
            onClick={() => generateSummary({ startDate, endDate, scope: filterEmployee ? `employee:${filterEmployee}` : undefined })}
            disabled={aiLoading}
            className="ml-auto flex items-center gap-2 text-xs border border-primary text-primary px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI 生成综述
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "总工时", value: `${totalHours}h`, icon: <Clock size={18} /> },
                { label: "提交日报", value: `${totalReports} 份`, icon: <FileText size={18} /> },
                { label: "提交率", value: `${submissionRateAvg}%`, icon: <TrendingUp size={18} /> },
                { label: "预警数", value: `${warnings.length} 条`, icon: <AlertTriangle size={18} />, highlight: warnings.length > 0 },
              ].map((card) => (
                <div key={card.label} className={`border p-4 ${card.highlight ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={card.highlight ? "text-primary" : "text-muted-foreground"}>{card.icon}</span>
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{card.label}</div>
                  <div className={`text-2xl font-bold ${card.highlight ? "text-primary" : "text-foreground"}`}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* 图表区 */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* 每日工时折线图 */}
              <div className="border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">每日工时趋势</h3>
                </div>
                {hoursData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={hoursData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="hours" stroke="#c0392b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">暂无数据</div>
                )}
              </div>

              {/* 项目工时饼图 */}
              <div className="border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-foreground" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">项目工时分布</h3>
                </div>
                {projectData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={projectData} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {projectData.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">暂无数据</div>
                )}
              </div>

              {/* 提交率柱状图 */}
              <div className="border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">人员提交率</h3>
                </div>
                {submissionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={submissionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip formatter={(v: any) => `${v}%`} />
                      <Bar dataKey="rate" fill="#c0392b" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">暂无数据</div>
                )}
              </div>

              {/* 预警列表 */}
              <div className="border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">风险预警</h3>
                </div>
                {warnings.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {warnings.map((w: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20">
                        <AlertTriangle size={14} className="text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{w.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{w.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                    <div className="text-center">
                      <div className="text-2xl mb-2">✓</div>
                      暂无风险预警
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI 综述 */}
            {aiSummary && (
              <div className="border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={14} className="text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">AI 周期综述</h3>
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {aiSummary.summary}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
