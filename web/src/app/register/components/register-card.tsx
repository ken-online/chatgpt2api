"use client";

import { AlertTriangle, LoaderCircle, Mail, Play, Plus, RotateCcw, Save, Square, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useSettingsStore } from "../../settings/store";

function LoadingCard() {
  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <CardContent className="flex items-center justify-center p-10">
        <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
      </CardContent>
    </Card>
  );
}

export function RegisterConfigCard() {
  const config = useSettingsStore((state) => state.registerConfig);
  const isLoading = useSettingsStore((state) => state.isLoadingRegister);
  const isSaving = useSettingsStore((state) => state.isSavingRegister);
  const setProxy = useSettingsStore((state) => state.setRegisterProxy);
  const setTotal = useSettingsStore((state) => state.setRegisterTotal);
  const setThreads = useSettingsStore((state) => state.setRegisterThreads);
  const setMode = useSettingsStore((state) => state.setRegisterMode);
  const setTargetQuota = useSettingsStore((state) => state.setRegisterTargetQuota);
  const setTargetAvailable = useSettingsStore((state) => state.setRegisterTargetAvailable);
  const setCheckInterval = useSettingsStore((state) => state.setRegisterCheckInterval);
  const save = useSettingsStore((state) => state.saveRegister);

  if (isLoading) return <LoadingCard />;
  if (!config) return null;

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-surface-secondary">
            <UserPlus className="size-4 text-content-secondary" />
          </div>
          <h2 className="font-semibold text-content">Cấu hình đăng ký</h2>
        </div>
        <Button
          className="h-8 rounded-xl bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
          onClick={() => void save()}
          disabled={isSaving || config.enabled}
        >
          {isSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Lưu
        </Button>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-content">Chế độ đăng ký</label>
            <Select
              value={config.mode || "total"}
              onValueChange={(value) => setMode(value as "total" | "quota" | "available")}
              disabled={config.enabled}
            >
              <SelectTrigger className="h-10 rounded-xl border-border bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Tổng số đăng ký</SelectItem>
                <SelectItem value="quota">Hạn mức còn lại</SelectItem>
                <SelectItem value="available">Số tài khoản có sẵn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Tổng số đăng ký</label>
            <Input
              value={String(config.total)}
              onChange={(e) => setTotal(e.target.value)}
              className="h-10 rounded-xl border-border bg-surface"
              disabled={config.enabled || config.mode !== "total"}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Số lượng luồng</label>
            <Input
              value={String(config.threads)}
              onChange={(e) => setThreads(e.target.value)}
              className="h-10 rounded-xl border-border bg-surface"
              disabled={config.enabled}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Proxy đăng ký</label>
            <Input
              value={config.proxy}
              onChange={(e) => setProxy(e.target.value)}
              placeholder="http://127.0.0.1:7890"
              className="h-10 rounded-xl border-border bg-surface"
              disabled={config.enabled}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Hạn mức mục tiêu</label>
            <Input
              value={String(config.target_quota || "")}
              onChange={(e) => setTargetQuota(e.target.value)}
              className="h-10 rounded-xl border-border bg-surface"
              disabled={config.enabled || config.mode !== "quota"}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Tài khoản mục tiêu có sẵn</label>
            <Input
              value={String(config.target_available || "")}
              onChange={(e) => setTargetAvailable(e.target.value)}
              className="h-10 rounded-xl border-border bg-surface"
              disabled={config.enabled || config.mode !== "available"}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-content">Khoảng thời gian kiểm tra (giây)</label>
            <Input
              value={String(config.check_interval || "")}
              onChange={(e) => setCheckInterval(e.target.value)}
              className="h-10 rounded-xl border-border bg-surface"
              disabled={config.enabled || config.mode === "total"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RegisterEmailCard() {
  const config = useSettingsStore((state) => state.registerConfig);
  const isLoading = useSettingsStore((state) => state.isLoadingRegister);
  const setMailField = useSettingsStore((state) => state.setRegisterMailField);
  const addProvider = useSettingsStore((state) => state.addRegisterProvider);
  const updateProvider = useSettingsStore((state) => state.updateRegisterProvider);
  const deleteProvider = useSettingsStore((state) => state.deleteRegisterProvider);

  if (isLoading) return <LoadingCard />;
  if (!config) return null;

  const providers = config.mail.providers || [];

  const updateProviderType = (index: number, type: string) => {
    updateProvider(index, {
      type,
      enable: true,
      ...(type === "cloudflare_temp_email" ? { api_base: "", admin_password: "", domain: [] } : {}),
      ...(type === "tempmail_lol" ? { api_key: "", domain: [] } : {}),
      ...(type === "moemail" ? { api_base: "", api_key: "", domain: [] } : {}),
      ...(type === "inbucket" ? { api_base: "", domain: [], random_subdomain: true } : {}),
      ...(type === "duckmail" ? { api_key: "", default_domain: "duckmail.sbs" } : {}),
      ...(type === "gptmail" ? { api_key: "", default_domain: "" } : {}),
      ...(type === "yyds_mail" ? { api_base: "https://maliapi.215.im/v1", api_key: "", domain: [], subdomain: "", wildcard: false } : {}),
    });
  };

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-surface-secondary">
            <Mail className="size-4 text-content-secondary" />
          </div>
          <div>
            <h2 className="font-semibold text-content">Cấu hình Email</h2>
            <p className="text-xs text-content-tertiary">Nhiều provider, xen kẽ theo thứ tự bật.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-xl border-border bg-surface px-3 text-sm text-content"
          onClick={addProvider}
          disabled={config.enabled}
        >
          <Plus className="size-3.5" />
          Thêm
        </Button>
      </div>
      <CardContent className="space-y-4 p-6">
        {/* Timeout fields */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-content">Timeout yêu cầu (s)</label>
            <Input
              value={String(config.mail.request_timeout || "")}
              onChange={(e) => setMailField("request_timeout", e.target.value)}
              className="h-10 rounded-xl border-border bg-surface"
              disabled={config.enabled}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Timeout mã xác minh (s)</label>
            <Input
              value={String(config.mail.wait_timeout || "")}
              onChange={(e) => setMailField("wait_timeout", e.target.value)}
              className="h-10 rounded-xl border-border bg-surface"
              disabled={config.enabled}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Khoảng thời gian bỏ phiếu (s)</label>
            <Input
              value={String(config.mail.wait_interval || "")}
              onChange={(e) => setMailField("wait_interval", e.target.value)}
              className="h-10 rounded-xl border-border bg-surface"
              disabled={config.enabled}
            />
          </div>
        </div>

        {/* Providers */}
        <div className="space-y-4">
          {providers.map((provider, index) => {
            const type = String(provider.type || "tempmail_lol");
            const domains = Array.isArray(provider.domain) ? provider.domain.map(String).join("\n") : "";
            return (
              <div key={index} className="rounded-xl border border-border bg-surface/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-content">
                    <Checkbox
                      checked={Boolean(provider.enable)}
                      onCheckedChange={(checked) => updateProvider(index, { enable: Boolean(checked) })}
                      disabled={config.enabled}
                    />
                    Provider #{index + 1}
                  </label>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-content-tertiary transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                    onClick={() => deleteProvider(index)}
                    disabled={config.enabled || providers.length <= 1}
                    title="Xóa provider"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-content">Loại</label>
                    <Select value={type} onValueChange={(value) => updateProviderType(index, value)} disabled={config.enabled}>
                      <SelectTrigger className="h-10 rounded-xl border-border bg-surface">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cloudflare_temp_email">cloudflare_temp_email</SelectItem>
                        <SelectItem value="tempmail_lol">tempmail_lol</SelectItem>
                        <SelectItem value="moemail">moemail</SelectItem>
                        <SelectItem value="inbucket">inbucket_mail</SelectItem>
                        <SelectItem value="duckmail">duckmail</SelectItem>
                        <SelectItem value="gptmail">gptmail</SelectItem>
                        <SelectItem value="yyds_mail">yyds_mail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(type === "cloudflare_temp_email" || type === "moemail" || type === "inbucket" || type === "yyds_mail") && (
                    <div className="space-y-2">
                      <label className="text-sm text-content">API Base URL</label>
                      <Input value={String(provider.api_base || "")} onChange={(e) => updateProvider(index, { api_base: e.target.value })} className="h-10 rounded-xl border-border bg-surface" disabled={config.enabled} />
                    </div>
                  )}
                  {type === "cloudflare_temp_email" && (
                    <div className="space-y-2">
                      <label className="text-sm text-content">Mật khẩu Admin</label>
                      <Input value={String(provider.admin_password || "")} onChange={(e) => updateProvider(index, { admin_password: e.target.value })} className="h-10 rounded-xl border-border bg-surface" disabled={config.enabled} />
                    </div>
                  )}
                  {(type === "tempmail_lol" || type === "moemail" || type === "duckmail" || type === "gptmail" || type === "yyds_mail") && (
                    <div className="space-y-2">
                      <label className="text-sm text-content">Khóa API</label>
                      <Input value={String(provider.api_key || "")} onChange={(e) => updateProvider(index, { api_key: e.target.value })} className="h-10 rounded-xl border-border bg-surface" disabled={config.enabled} />
                    </div>
                  )}
                  {(type === "duckmail" || type === "gptmail") && (
                    <div className="space-y-2">
                      <label className="text-sm text-content">Tên miền mặc định</label>
                      <Input value={String(provider.default_domain || "")} onChange={(e) => updateProvider(index, { default_domain: e.target.value })} placeholder={type === "duckmail" ? "duckmail.sbs" : ""} className="h-10 rounded-xl border-border bg-surface" disabled={config.enabled} />
                    </div>
                  )}
                  {type === "yyds_mail" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm text-content">Tên miền phụ</label>
                        <Input value={String(provider.subdomain || "")} onChange={(e) => updateProvider(index, { subdomain: e.target.value })} className="h-10 rounded-xl border-border bg-surface" disabled={config.enabled} />
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-content">
                        <Checkbox checked={Boolean(provider.wildcard)} onCheckedChange={(checked) => updateProvider(index, { wildcard: Boolean(checked) })} disabled={config.enabled} />
                        Wildcard
                      </label>
                    </>
                  )}
                  {type === "inbucket" && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-content">
                      <Checkbox checked={Boolean(provider.random_subdomain ?? true)} onCheckedChange={(checked) => updateProvider(index, { random_subdomain: Boolean(checked) })} disabled={config.enabled} />
                      Tên miền phụ ngẫu nhiên
                    </label>
                  )}
                </div>

                {(type === "tempmail_lol" || type === "cloudflare_temp_email" || type === "moemail" || type === "inbucket" || type === "yyds_mail") && (
                  <div className="space-y-2">
                    <label className="text-sm text-content">{type === "inbucket" ? "Danh sách tên miền cơ sở" : "Tên miền"}</label>
                    <Textarea
                      value={domains}
                      onChange={(e) => updateProvider(index, { domain: e.target.value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean) })}
                      placeholder={
                        type === "inbucket"
                          ? "Một tên miền cơ sở trên mỗi dòng"
                          : "Một tên miền trên mỗi dòng, để trống dùng mặc định của dịch vụ"
                      }
                      className="min-h-20 rounded-xl border-border bg-surface font-mono text-xs"
                      disabled={config.enabled}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function RegisterStatsCard() {
  const config = useSettingsStore((state) => state.registerConfig);
  const isLoading = useSettingsStore((state) => state.isLoadingRegister);
  const isSaving = useSettingsStore((state) => state.isSavingRegister);
  const save = useSettingsStore((state) => state.saveRegister);
  const toggle = useSettingsStore((state) => state.toggleRegister);
  const reset = useSettingsStore((state) => state.resetRegister);

  if (isLoading) return <LoadingCard />;
  if (!config) return null;

  const stats = config.stats || { success: 0, fail: 0, done: 0, running: 0, threads: config.threads };

  const statItems: [string, string | number][] = [
    ["Thành công", stats.success],
    ["Tỷ lệ thành công", `${stats.success_rate || 0}%`],
    ["Thất bại", stats.fail],
    ["Hoàn thành", stats.done],
    ["Đang chạy / Luồng", `${stats.running} / ${stats.threads}`],
    ["Thời gian chạy", `${stats.elapsed_seconds || 0}s`],
    ["TB / lần đăng ký", `${stats.avg_seconds || 0}s`],
    ["Hạn mức hiện tại", stats.current_quota || 0],
    ["Tài khoản bình thường", stats.current_available || 0],
  ];

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="font-semibold text-content">Kết quả chạy</h2>
        <Badge variant={config.enabled ? "success" : "secondary"} className="rounded-md">
          {config.enabled ? "Đang chạy" : "Đã dừng"}
        </Badge>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="grid grid-cols-3 gap-2">
          {statItems.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-surface/70 px-3 py-2.5">
              <div className="text-[11px] text-content-tertiary">{label}</div>
              <div className="mt-1 text-sm font-semibold text-content">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            className="h-10 rounded-xl bg-primary-600 px-3 text-white hover:bg-primary-700"
            onClick={() => void toggle()}
            disabled={isSaving}
          >
            {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : config.enabled ? <Square className="size-4" /> : <Play className="size-4" />}
            {config.enabled ? "Dừng" : "Bắt đầu"}
          </Button>
          <Button variant="outline" className="h-10 rounded-xl border-border bg-surface px-3 text-content" onClick={() => void reset()} disabled={isSaving || config.enabled}>
            <RotateCcw className="size-4" />
            Đặt lại
          </Button>
          <Button variant="outline" className="h-10 rounded-xl border-border bg-surface px-3 text-content" onClick={() => void save()} disabled={isSaving || config.enabled}>
            <Save className="size-4" />
            Lưu
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-secondary px-3 py-2.5 text-xs text-amber-600">
          <AlertTriangle className="size-4 shrink-0" />
          Hãy nhớ lưu cấu hình trước khi bắt đầu.
        </div>
      </CardContent>
    </Card>
  );
}

export function RegisterLogsCard() {
  const config = useSettingsStore((state) => state.registerConfig);
  const isLoading = useSettingsStore((state) => state.isLoadingRegister);

  if (isLoading) return <LoadingCard />;
  if (!config) return null;

  const logs = config.logs || [];

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="font-semibold text-content">Nhật ký thời gian thực</h2>
          <p className="mt-0.5 text-xs text-amber-700">Lỗi HTTP 400: email bị khóa vì lạm dụng, cần đổi tên miền mới.</p>
        </div>
        <Badge variant="secondary" className="rounded-md">{logs.length}</Badge>
      </div>
      <CardContent className="p-4">
        <div className="h-80 overflow-y-auto rounded-xl border border-border bg-surface/70 p-3 font-mono text-xs leading-6">
          {logs.length === 0 ? (
            <div className="text-content-tertiary">Chưa có nhật ký</div>
          ) : (
            logs.slice().reverse().map((item, index) => (
              <div
                key={`${item.time}-${index}`}
                className={
                  item.level === "red" ? "text-rose-600"
                  : item.level === "green" ? "text-emerald-700"
                  : item.level === "yellow" ? "text-amber-700"
                  : "text-content"
                }
              >
                <span className="text-content-tertiary">{new Date(item.time).toLocaleTimeString()}</span>
                <span className="pl-2">{item.text}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
