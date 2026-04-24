import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Zap, ArrowRight } from "lucide-react";
import { useEmployee } from "@/contexts/AuthContext";

export default function Login() {
  const [, navigate] = useLocation();
  const { employee, refetch } = useEmployee();
  const [employeeNo, setEmployeeNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (employee) navigate("/");
  }, [employee]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      refetch();
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message ?? "登录失败");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeNo.trim() || !password.trim()) {
      toast.error("请填写工号和密码");
      return;
    }
    loginMutation.mutate({ employeeNo: employeeNo.trim(), password });
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* 左侧装饰区 */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[oklch(0.08_0_0)] relative overflow-hidden">
        {/* 网格背景 */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />
        {/* 红色方块装饰 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary" />
        <div className="absolute bottom-24 left-12 w-16 h-16 bg-primary opacity-60" />
        <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-primary" />

        <div className="relative z-10 flex flex-col h-full p-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg tracking-tight">WorkReport Pro</div>
              <div className="text-white/40 text-xs tracking-widest uppercase">智能日报管理系统</div>
            </div>
          </div>

          {/* 主标题 */}
          <div className="mt-auto mb-16">
            <div className="w-12 h-1 bg-primary mb-8" />
            <h1 className="text-white text-5xl font-bold leading-tight tracking-tight">
              高效<br />
              <span className="text-primary">工作汇报</span><br />
              从这里开始
            </h1>
            <p className="text-white/50 mt-6 text-base leading-relaxed max-w-xs">
              日报 · 周报 · 月报 · 数据分析<br />
              五级权限 · AI 智能摘要 · 实时催办
            </p>
          </div>

          {/* 底部特性列表 */}
          <div className="grid grid-cols-2 gap-4">
            {["日报快捷填报", "AI 智能摘要", "团队数据看板", "多级权限管控"].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary flex-shrink-0" />
                <span className="text-white/60 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧登录区 */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          {/* 移动端 Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-primary flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-base">WorkReport Pro</span>
          </div>

          {/* 标题 */}
          <div className="mb-10">
            <div className="w-8 h-1 bg-primary mb-4" />
            <h2 className="text-3xl font-bold text-foreground tracking-tight">登录</h2>
            <p className="text-muted-foreground text-sm mt-2">使用工号和密码登录您的账号</p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-foreground mb-2">
                工号
              </label>
              <input
                type="text"
                value={employeeNo}
                onChange={(e) => setEmployeeNo(e.target.value)}
                placeholder="请输入工号"
                className="w-full border border-border px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors bg-white"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-foreground mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full border border-border px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors bg-white pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-primary text-white py-3 text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <span className="animate-pulse">登录中...</span>
              ) : (
                <>
                  <span>登录</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* 提示 */}
          <p className="text-xs text-muted-foreground mt-8 text-center">
            默认管理员账号：<span className="font-mono font-medium text-foreground">admin</span>
            &nbsp;/&nbsp;密码：<span className="font-mono font-medium text-foreground">Admin@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
