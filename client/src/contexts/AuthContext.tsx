import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export interface AuthEmployee {
  id: number;
  employeeNo: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "member" | "team_leader" | "manager" | "director" | "admin";
  departmentId: number | null;
  supervisorId: number | null;
}

interface AuthContextType {
  employee: AuthEmployee | null;
  loading: boolean;
  isAuthenticated: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType>({
  employee: null,
  loading: true,
  isAuthenticated: false,
  refetch: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <AuthContext.Provider value={{
      employee: data ?? null,
      loading: isLoading,
      isAuthenticated: !!data,
      refetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useEmployee() {
  return useContext(AuthContext);
}

export const ROLE_LABELS: Record<string, string> = {
  member: "组员",
  team_leader: "组长",
  manager: "经理",
  director: "总监",
  admin: "管理员",
};

export const ROLE_LEVEL: Record<string, number> = {
  member: 1,
  team_leader: 2,
  manager: 3,
  director: 4,
  admin: 5,
};
