import React, { useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/AppLayout";
import { useEmployee } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { FileText, CalendarDays, Bell, CheckCircle2, Clock, AlertCircle, ArrowRight, TrendingUp } from "lucide-react";

const today = format(new Date(), "yyyy-MM-dd");
const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

export default function Home() {
  const { employee } = useEmployee();

  const { data: todayReport } = trpc.dailyReport.getByDate.useQuery(
    { date: today },
    { enabled: !!employee }
  );

  const { data: notifications } = trpc.notification.list.useQuery(
    { unreadOnly: false },
    { enabled: !!employee }
  );

  const { data: weeklyReports } = trpc.dailyReport.list.useQuery(
    { startDate: weekStart, endDate: weekEnd },
    { enabled: !!employee }
  );

  const markReadMutation = trpc.notification.markRead.useMutation();
  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const unreadNotifications = notifications?.filter((n: any) => !n.isRead) ?? [];
  const todaySubmitted = todayReport?.status === 1;
  const weekSubmittedCount = weeklyReports?.filter((r: any) => r.status === 1).length ?? 0;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "早上好" : greetingHour < 18 ? "下午好" : "晚上好";

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl">
        {/* 页头 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-4 h-4 bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {format(new Date(), "yyyy年MM月dd日 EEEE", { locale: zhCN })}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {greeting}，{employee?.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {todaySubmitted ? "今日日报已提交，保持好状态！" : "今日日报尚未提交，记得填写哦。"}
          </p>
        </div>

        {/* 状态卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "今日日报",
              value: todaySubmitted ? "已提交" : "未提交",
              icon: <FileText size={18} />,
              status: todaySubmitted ? "ok" : "warn",
              href: "/daily",
            },
            {
              label: "本周提交",
              value: `${weekSubmittedCount} / 5 天`,
              icon: <CalendarDays size={18} />,
              status: weekSubmittedCount >= 5 ? "ok" : weekSubmittedCount >= 3 ? "warn" : "error",
              href: "/daily",
            },
            {
              label: "未读通知",
              value: `${unreadNotifications.length} 条`,
              icon: <Bell size={18} />,
              status: unreadNotifications.length === 0 ? "ok" : "warn",
              href: "#notifications",
            },
            {
              label: "本周工时",
              value: (() => {
                const items = weeklyReports?.flatMap((r: any) => []) ?? [];
                return "查看详情";
              })(),
              icon: <TrendingUp size={18} />,
              status: "ok",
              href: "/analytics",
            },
          ].map((card) => (
            <Link key={card.label} href={card.href}>
              <div className="border border-border p-4 hover:border-foreground transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-muted-foreground">{card.icon}</span>
                  <div className={`w-2 h-2 ${
                    card.status === "ok" ? "bg-green-500" :
                    card.status === "warn" ? "bg-yellow-500" : "bg-primary"
                  }`} />
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{card.label}</div>
                <div className={`text-lg font-bold ${
                  card.status === "error" ? "text-primary" : "text-foreground"
                }`}>{card.value}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 快速操作 */}
          <div className="border border-border">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-3 h-3 bg-primary" />
              <h2 className="font-bold text-sm uppercase tracking-wider">快速操作</h2>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: todaySubmitted ? "查看今日日报" : "填写今日日报", href: "/daily", icon: <FileText size={14} />, highlight: !todaySubmitted },
                { label: "填写本周周报", href: "/periodic", icon: <CalendarDays size={14} />, highlight: false },
                { label: "查看团队汇报", href: "/reports", icon: <TrendingUp size={14} />, highlight: false },
              ].map((action) => (
                <Link key={action.label} href={action.href}>
                  <div className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors group
                    ${action.highlight ? "bg-primary text-white" : "hover:bg-secondary"}
                  `}>
                    <div className="flex items-center gap-3">
                      <span>{action.icon}</span>
                      <span className="text-sm font-medium">{action.label}</span>
                    </div>
                    <ArrowRight size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 通知列表 */}
          <div className="border border-border" id="notifications">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-primary" />
                <h2 className="font-bold text-sm uppercase tracking-wider">最新通知</h2>
                {unreadNotifications.length > 0 && (
                  <span className="bg-primary text-white text-xs px-1.5 py-0.5 font-bold">
                    {unreadNotifications.length}
                  </span>
                )}
              </div>
              {unreadNotifications.length > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  全部已读
                </button>
              )}
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {notifications && notifications.length > 0 ? (
                notifications.slice(0, 8).map((n: any) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-secondary transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                    onClick={() => { if (!n.isRead) markReadMutation.mutate({ id: n.id }); }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{n.content}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                  暂无通知
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
