import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useEmployee, ROLE_LABELS, ROLE_LEVEL } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  LayoutDashboard, FileText, CalendarDays, BarChart3,
  Users, Building2, FolderKanban, Bell, Settings,
  ChevronLeft, ChevronRight, LogOut, User, Menu, X,
  Zap, TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  minRole?: string;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: { label: string; icon: React.ReactNode; href: string; minRole?: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "工作台",
    items: [
      { label: "首页总览", icon: <LayoutDashboard size={16} />, href: "/" },
      { label: "日报填报", icon: <FileText size={16} />, href: "/daily" },
      { label: "周报 / 月报", icon: <CalendarDays size={16} />, href: "/periodic" },
    ],
  },
  {
    title: "团队管理",
    items: [
      { label: "汇报查看", icon: <TrendingUp size={16} />, href: "/reports", minRole: "team_leader" },
      { label: "数据分析", icon: <BarChart3 size={16} />, href: "/analytics", minRole: "team_leader" },
    ],
  },
  {
    title: "系统管理",
    items: [
      { label: "员工管理", icon: <Users size={16} />, href: "/admin/employees", minRole: "admin" },
      { label: "部门机构", icon: <Building2 size={16} />, href: "/admin/departments", minRole: "admin" },
      { label: "机构管理", icon: <Building2 size={16} />, href: "/admin/organizations", minRole: "admin" },
      { label: "项目管理", icon: <FolderKanban size={16} />, href: "/admin/projects", minRole: "manager" },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { employee, loading } = useEmployee();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });

  const { data: notifications } = trpc.notification.list.useQuery(
    { unreadOnly: true },
    { enabled: !!employee, refetchInterval: 60000 }
  );
  const unreadCount = notifications?.length ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 bg-primary animate-pulse" />
          <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    window.location.href = "/login";
    return null;
  }

  const myRoleLevel = ROLE_LEVEL[employee.role] ?? 1;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`flex flex-col bg-sidebar text-sidebar-foreground h-full transition-all duration-200 ${
        mobile ? "w-64" : collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo 区域 */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border ${collapsed && !mobile ? "justify-center" : ""}`}>
        <div className="w-8 h-8 bg-primary flex-shrink-0 flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <div className="text-white font-bold text-sm tracking-tight leading-tight">WorkReport</div>
            <div className="text-sidebar-foreground/50 text-xs tracking-widest uppercase">Pro</div>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-sidebar-foreground/50 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* 导航 */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(item => {
            if (!item.minRole) return true;
            return myRoleLevel >= (ROLE_LEVEL[item.minRole] ?? 1);
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title} className="mb-4">
              {(!collapsed || mobile) && (
                <div className="px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-sidebar-foreground/40">
                  {group.title}
                </div>
              )}
              {visibleItems.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer relative
                        ${isActive
                          ? "bg-sidebar-accent text-white border-l-2 border-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white border-l-2 border-transparent"
                        }
                        ${collapsed && !mobile ? "justify-center px-0" : ""}
                      `}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
                      {
                        item.href === "/notifications" && unreadCount > 0 && (!collapsed || mobile) && (
                          <span className="ml-auto bg-primary text-white text-xs px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                            {unreadCount}
                          </span>
                        )
                      }
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* 用户信息 */}
      <div className={`border-t border-sidebar-border p-4 ${collapsed && !mobile ? "flex justify-center" : ""}`}>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {employee.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{employee.name}</div>
              <div className="text-sidebar-foreground/50 text-xs">{ROLE_LABELS[employee.role]}</div>
            </div>
            <button
              onClick={() => logoutMutation.mutate()}
              className="text-sidebar-foreground/50 hover:text-white transition-colors"
              title="退出登录"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="w-8 h-8 bg-primary flex items-center justify-center text-white text-xs font-bold cursor-pointer"
            title={employee.name}
          >
            {employee.name.charAt(0)}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 桌面侧边栏 */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full animate-slide-in">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部栏（移动端） */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-white">
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary" />
            <span className="font-bold text-sm">WorkReport Pro</span>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
