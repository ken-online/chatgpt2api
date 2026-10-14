"use client";

import { AlertTriangle, Cookie, LoaderCircle, PlugZap, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  testProxy,
  testProxyClearance,
  type ClearanceTestResult,
  type ProxyRuntimeClearanceMode,
  type ProxyRuntimeEgressMode,
  type ProxyTestResult,
} from "@/lib/api";

import { useSettingsStore } from "../store";

export function ProxyRuntimeCard() {
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [isTestingClearance, setIsTestingClearance] = useState(false);
  const [proxyResult, setProxyResult] = useState<ProxyTestResult | null>(null);
  const [clearanceResult, setClearanceResult] = useState<ClearanceTestResult | null>(null);
  const [targetUrl, setTargetUrl] = useState("https://chatgpt.com");
  const config = useSettingsStore((state) => state.config);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const saveConfig = useSettingsStore((state) => state.saveConfig);
  const setProxyRuntimeField = useSettingsStore((state) => state.setProxyRuntimeField);
  const setProxyRuntimeClearanceField = useSettingsStore((state) => state.setProxyRuntimeClearanceField);
  const setProxyRuntimeStatusCodesText = useSettingsStore((state) => state.setProxyRuntimeStatusCodesText);

  if (isLoadingConfig || !config?.proxy_runtime) {
    return (
      <Card className="rounded-2xl border-border/80 bg-surface/90 shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
        </CardContent>
      </Card>
    );
  }

  const runtime = config.proxy_runtime;
  const clearance = runtime.clearance;
  const runtimeEnabled = Boolean(runtime.enabled);
  const clearanceMode = clearance.mode;
  const hasStoredClearance = Boolean(clearance.has_cf_cookies || clearance.has_cf_clearance);

  const handleTestRuntimeProxy = async () => {
    setIsTestingProxy(true);
    setProxyResult(null);
    try {
      const saved = await saveConfig();
      if (!saved) {
        return;
      }
      const data = await testProxy();
      setProxyResult(data.result);
      if (data.result.ok) {
        toast.success(`Proxy vượt Cloudflare hoạt động (${data.result.latency_ms} ms, HTTP ${data.result.status})`);
      } else {
        toast.error(`Proxy vượt Cloudflare không hoạt động: ${data.result.error ?? "Lỗi không xác định"}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kiểm tra proxy vượt Cloudflare thất bại");
    } finally {
      setIsTestingProxy(false);
    }
  };

  const handleTestClearance = async () => {
    setIsTestingClearance(true);
    setClearanceResult(null);
    try {
      const saved = await saveConfig();
      if (!saved) {
        return;
      }
      const data = await testProxyClearance(targetUrl.trim() || "https://chatgpt.com");
      setClearanceResult(data.result);
      if (data.result.ok) {
        toast.success(`Lấy clearance thành công (${data.result.latency_ms} ms)`);
      } else {
        toast.error(`Lấy clearance thất bại: ${data.result.error ?? data.result.status}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kiểm tra clearance thất bại");
    } finally {
      setIsTestingClearance(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border/80 bg-surface/90 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-content">
              <PlugZap className="size-5 text-content-tertiary" />
              Vượt Cloudflare (FlareSolverr)
            </div>
            <p className="mt-1 text-xs leading-6 text-content-tertiary">
              Mặc định tắt. Dùng để lấy cf_clearance khi request lên upstream bị Cloudflare chặn, có thể kết hợp chuỗi proxy WARP / Privoxy để thử lại.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs ${runtimeEnabled ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300" : "bg-surface-tertiary text-content-tertiary"}`}>
            {runtimeEnabled ? "Đã bật" : "Chưa bật"}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface-secondary px-4 py-3 text-xs leading-6 text-content-secondary">
          Thứ tự ưu tiên proxy: proxy riêng của tài khoản &gt; chuỗi proxy FlareSolverr &gt; proxy chỉ định &gt; proxy chung. Cookie / cf_clearance không bao giờ được trả về dạng rõ trong phản hồi API.
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs leading-6 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-1 size-4 shrink-0" />
          <span>Trước khi bật, hãy chạy các container flaresolverr, privoxy, warp-proxy bằng Docker; trong mạng Docker, URL thường là http://flaresolverr:8191.</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content-secondary md:col-span-2">
            <Checkbox
              checked={runtimeEnabled}
              onCheckedChange={(checked) => setProxyRuntimeField("enabled", Boolean(checked))}
            />
            Bật vượt Cloudflare
          </label>

          <div className="space-y-2">
            <label className="text-sm text-content-secondary">Kiểu kết nối ra ngoài</label>
            <Select
              value={runtime.egress_mode}
              onValueChange={(value) => setProxyRuntimeField("egress_mode", value as ProxyRuntimeEgressMode)}
              disabled={!runtimeEnabled}
            >
              <SelectTrigger className="h-10 rounded-xl border-border bg-surface shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Kết nối trực tiếp</SelectItem>
                <SelectItem value="single_proxy">Proxy đơn / WARP</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-content-tertiary">Bộ compose WARP mặc định dùng chế độ Proxy đơn.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-content-secondary">URL proxy vượt Cloudflare</label>
            <Input
              value={runtime.proxy_url}
              onChange={(event) => setProxyRuntimeField("proxy_url", event.target.value)}
              placeholder="http://privoxy:8118"
              className="h-10 rounded-xl border-border bg-surface"
              disabled={!runtimeEnabled || runtime.egress_mode !== "single_proxy"}
            />
            <p className="text-xs leading-5 text-content-tertiary">
              Hỗ trợ http/https/socks5/socks5h (socks5 tự chuyển thành socks5h). Có xác thực: giao_thức://tài_khoản:mật_khẩu@máy_chủ:cổng, hoặc dán thẳng máy_chủ:cổng:tài_khoản:mật_khẩu.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-content-secondary">URL proxy tải tài nguyên</label>
            <Input
              value={runtime.resource_proxy_url}
              onChange={(event) => setProxyRuntimeField("resource_proxy_url", event.target.value)}
              placeholder="Để trống sẽ dùng chung proxy vượt Cloudflare"
              className="h-10 rounded-xl border-border bg-surface"
              disabled={!runtimeEnabled || runtime.egress_mode !== "single_proxy"}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-content-secondary">Mã HTTP để làm mới phiên</label>
            <Input
              value={runtime.reset_session_status_codes.join(",")}
              onChange={(event) => setProxyRuntimeStatusCodesText(event.target.value)}
              placeholder="403"
              className="h-10 rounded-xl border-border bg-surface"
              disabled={!runtimeEnabled}
            />
            <p className="text-xs text-content-tertiary">Mặc định 403, chỉ áp dụng cho lỗi chặn/thử thách của Cloudflare.</p>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content-secondary">
            <Checkbox
              checked={Boolean(runtime.skip_ssl_verify)}
              onCheckedChange={(checked) => setProxyRuntimeField("skip_ssl_verify", Boolean(checked))}
              disabled={!runtimeEnabled}
            />
            Bỏ qua xác minh SSL
          </label>

          <div className="flex items-end justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-border bg-surface px-4 text-content-secondary"
              onClick={() => void handleTestRuntimeProxy()}
              disabled={isTestingProxy || !runtimeEnabled}
            >
              {isTestingProxy ? <LoaderCircle className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
              Kiểm tra proxy
            </Button>
          </div>

          {proxyResult ? (
            <div className={`rounded-xl border px-3 py-2 text-xs leading-6 md:col-span-2 ${proxyResult.ok ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300" : "border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300"}`}>
              {proxyResult.ok
                ? `Proxy hoạt động: HTTP ${proxyResult.status}, thời gian ${proxyResult.latency_ms} ms, nguồn ${proxyResult.proxy_source ?? "unknown"}`
                : `Proxy không hoạt động: ${proxyResult.error ?? "Lỗi không xác định"} (thời gian ${proxyResult.latency_ms} ms)`}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-content">
              <Cookie className="size-4 text-content-tertiary" />
              Cloudflare Clearance
            </div>
            <span className={`rounded-full px-3 py-1 text-xs ${clearance.enabled ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300" : "bg-surface-tertiary text-content-tertiary"}`}>
              {clearance.enabled ? clearanceMode : "Đang tắt"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-content-secondary">Chế độ Clearance</label>
              <Select
                value={clearanceMode}
                onValueChange={(value) => {
                  const mode = value as ProxyRuntimeClearanceMode;
                  setProxyRuntimeClearanceField("mode", mode);
                  setProxyRuntimeClearanceField("enabled", mode !== "none");
                }}
                disabled={!runtimeEnabled}
              >
                <SelectTrigger className="h-10 rounded-xl border-border bg-surface shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không bật</SelectItem>
                  <SelectItem value="manual">Cookie thủ công</SelectItem>
                  <SelectItem value="flaresolverr">FlareSolverr</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-content-secondary">URL FlareSolverr</label>
              <Input
                value={clearance.flaresolverr_url}
                onChange={(event) => setProxyRuntimeClearanceField("flaresolverr_url", event.target.value)}
                placeholder="http://flaresolverr:8191"
                className="h-10 rounded-xl border-border bg-surface"
                disabled={!runtimeEnabled || clearanceMode !== "flaresolverr"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-content-secondary">User-Agent</label>
              <Input
                value={clearance.user_agent}
                onChange={(event) => setProxyRuntimeClearanceField("user_agent", event.target.value)}
                className="h-10 rounded-xl border-border bg-surface font-mono text-xs"
                disabled={!runtimeEnabled || clearanceMode === "none"}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-content-secondary">Thời gian chờ tối đa (giây)</label>
              <Input
                value={String(clearance.timeout_sec)}
                onChange={(event) => setProxyRuntimeClearanceField("timeout_sec", event.target.value)}
                placeholder="60"
                className="h-10 rounded-xl border-border bg-surface"
                disabled={!runtimeEnabled || clearanceMode === "none"}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-content-secondary">Khoảng làm mới (giây)</label>
              <Input
                value={String(clearance.refresh_interval)}
                onChange={(event) => setProxyRuntimeClearanceField("refresh_interval", event.target.value)}
                placeholder="3600"
                className="h-10 rounded-xl border-border bg-surface"
                disabled={!runtimeEnabled || clearanceMode === "none"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-content-secondary">Cookie thủ công</label>
              <Textarea
                value={clearance.cf_cookies}
                onChange={(event) => setProxyRuntimeClearanceField("cf_cookies", event.target.value)}
                placeholder="Tùy chọn: foo=bar; cf_clearance=..."
                className="min-h-24 rounded-xl border-border bg-surface font-mono text-xs shadow-none"
                disabled={!runtimeEnabled || clearanceMode !== "manual"}
              />
              <p className="text-xs text-content-tertiary">
                {hasStoredClearance ? "Máy chủ đã lưu Cookie/clearance; để trống rồi lưu sẽ không xoá giá trị cũ." : "Để trống nghĩa là không dùng Cookie thủ công."}
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-content-secondary">cf_clearance riêng</label>
              <Input
                value={clearance.cf_clearance}
                onChange={(event) => setProxyRuntimeClearanceField("cf_clearance", event.target.value)}
                placeholder="Tùy chọn: chỉ điền giá trị cf_clearance"
                className="h-10 rounded-xl border-border bg-surface font-mono text-xs"
                disabled={!runtimeEnabled || clearanceMode !== "manual"}
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-3 text-sm text-content-secondary">
              <Checkbox
                checked={Boolean(clearance.warm_up_on_start)}
                onCheckedChange={(checked) => setProxyRuntimeClearanceField("warm_up_on_start", Boolean(checked))}
                disabled={!runtimeEnabled || clearanceMode === "none"}
              />
              Lấy sẵn clearance khi khởi động
            </label>

            <div className="space-y-2">
              <label className="text-sm text-content-secondary">URL dùng để kiểm tra</label>
              <Input
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                placeholder="https://chatgpt.com"
                className="h-10 rounded-xl border-border bg-surface"
                disabled={!runtimeEnabled || clearanceMode === "none"}
              />
            </div>

            <div className="flex justify-end md:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-border bg-surface px-4 text-content-secondary"
                onClick={() => void handleTestClearance()}
                disabled={isTestingClearance || !runtimeEnabled || clearanceMode === "none"}
              >
                {isTestingClearance ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Kiểm tra Clearance
              </Button>
            </div>

            {clearanceResult ? (
              <div className={`rounded-xl border px-3 py-2 text-xs leading-6 md:col-span-2 ${clearanceResult.ok ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300" : "border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300"}`}>
                {clearanceResult.ok
                  ? `Clearance hoạt động: ${clearanceResult.has_cookies ? "Đã lấy Cookie" : "Không có Cookie"}, thời gian ${clearanceResult.latency_ms} ms`
                  : `Clearance không hoạt động: ${clearanceResult.error ?? clearanceResult.status} (thời gian ${clearanceResult.latency_ms} ms)`}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            className="h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700"
            onClick={() => void saveConfig()}
            disabled={isSavingConfig}
          >
            {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu cấu hình
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
