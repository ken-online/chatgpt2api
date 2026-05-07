"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type PageHeaderContextValue = {
  actions: ReactNode | null;
  setActions: (node: ReactNode | null) => void;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode | null>(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeaderActions() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error("usePageHeaderActions phải được dùng bên trong PageHeaderProvider");
  }
  return ctx;
}
