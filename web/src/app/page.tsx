"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { httpRequest } from "@/lib/request";
import { displayDataValue, type Account } from "@/lib/api";

type LogEntry = {
  id: string;
  time: string;
  type: string;
  summary: string;
  detail?: Record<string, unknown> | null;
};

type LogsResponse = {
  items: LogEntry[];
};

const STAT_ICONS: Record<string, string> = {
  total: "A",
  quota: "Q",
  today: "I",
  rate: "%",
};

export default function DashboardPage() {
  const { isCheckingAuth } = useAuthGuard(["admin"]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (isCheckingAuth) return;
    void httpRequest<{ items: Account[] }>("/api/accounts").then((r) => setAccounts(r.items ?? []));
    void httpRequest<LogsResponse>("/api/logs").then((r) => setLogs(r.items ?? []));
  }, [isCheckingAuth]);

  if (isCheckingAuth) {
    return <div className="text-sm text-content-tertiary">Đang kiểm tra phiên...</div>;
  }

  // Tổng hợp
  const total = accounts.length;
  const active = accounts.filter((a) => a.status === "正常").length;
  const limited = accounts.filter((a) => a.status === "限流").length;
  const abnormal = accounts.filter((a) => a.status === "异常").length;
  const disabled = accounts.filter((a) => a.status === "禁用").length;
  const quotaSum = accounts
    .filter((a) => a.status === "正常" && !a.image_quota_unknown)
    .reduce((sum, a) => sum + Math.max(0, a.quota), 0);

  const today = new Date().toISOString().slice(0, 10);
  const callsToday = logs.filter((l) => l.type === "call" && l.time?.startsWith(today));
  const todayCount = callsToday.length;
  const todaySuccess = callsToday.filter((l) => (l.detail as { status?: string } | null)?.status !== "failed").length;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const recentCalls = logs.filter((l) => l.type === "call" && l.time && l.time >= sevenDaysAgo);
  const recentSuccess = recentCalls.filter((l) => (l.detail as { status?: string } | null)?.status !== "failed").length;
  const successRate = recentCalls.length > 0 ? ((recentSuccess / recentCalls.length) * 100).toFixed(1) : "—";

  const recentLogs = logs.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng tài khoản" value={String(total)} sub={`${active} bình thường`} icon={STAT_ICONS.total} />
        <StatCard label="Quota còn" value={String(quotaSum)} sub="tổng số ảnh" icon={STAT_ICONS.quota} />
        <StatCard label="Ảnh hôm nay" value={String(todayCount)} sub={`${todaySuccess} thành công`} icon={STAT_ICONS.today} />
        <StatCard
          label="Tỉ lệ thành công"
          value={successRate === "—" ? "—" : `${successRate}%`}
          sub="7 ngày qua"
          icon={STAT_ICONS.rate}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trạng thái tài khoản</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2.5">
            <StatusTile bg="bg-emerald-100 dark:bg-emerald-950/30" text="text-emerald-800 dark:text-emerald-300" n={active} l="Bình thường" />
            <StatusTile bg="bg-amber-100 dark:bg-amber-950/30" text="text-amber-800 dark:text-amber-300" n={limited} l="Giới hạn" />
            <StatusTile bg="bg-red-100 dark:bg-red-950/30" text="text-red-800 dark:text-red-300" n={abnormal} l="Bất thường" />
            <StatusTile bg="bg-surface-secondary" text="text-content-secondary" n={disabled} l="Vô hiệu hoá" />
            <StatusTile bg="bg-violet-100 dark:bg-violet-950/30" text="text-violet-800 dark:text-violet-300" n={quotaSum} l="Quota" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">API Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-xl font-bold text-primary-600">
                ≈
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight leading-none">{todayCount}</div>
                <div className="mt-1 text-xs text-content-tertiary">request hôm nay</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {recentLogs.length === 0 ? (
            <div className="py-4 text-sm text-content-tertiary">Chưa có hoạt động</div>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex justify-between gap-4 border-b border-border py-3 last:border-b-0 text-sm"
              >
                <div className="min-w-0">
                  <div className="text-content truncate">{log.summary}</div>
                  <div className="mt-0.5 truncate text-xs text-content-tertiary">{formatDetail(log.detail)}</div>
                </div>
                <div className="shrink-0 text-xs text-content-tertiary self-center whitespace-nowrap">{log.time}</div>
              </div>
            ))
          )}
          <div className="pt-4">
            <Link href="/logs" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              Xem tất cả →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="text-xs font-medium text-content-secondary">{label}</div>
        <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-[11px] text-content-tertiary">{sub}</div>
        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10 text-sm font-bold text-primary-600">
          {icon}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 h-32 w-32"
          style={{ background: "radial-gradient(circle at top right, rgba(99,102,241,0.08), transparent 70%)" }}
        />
      </CardContent>
    </Card>
  );
}

function StatusTile({ bg, text, n, l }: { bg: string; text: string; n: number; l: string }) {
  return (
    <div className={`rounded-lg p-3.5 ${bg} ${text}`}>
      <div className="text-xl font-bold leading-none">{n}</div>
      <div className="mt-1 text-[11px] font-medium">{l}</div>
    </div>
  );
}

function formatDetail(detail: unknown): string {
  if (!detail || typeof detail !== "object") return "";
  return Object.entries(detail as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${displayDataValue(v)}`)
    .join(" · ");
}
