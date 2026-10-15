"use client";

import { Cloud, FileText, LoaderCircle, PlugZap, RefreshCw, Save, Settings2, Shield, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ImageStorageMode } from "@/lib/api";
import { testProxy, type ProxyTestResult } from "@/lib/api";

import { useSettingsStore } from "../store";

export function SystemSettingsCard() {
  const config = useSettingsStore((state) => state.config);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const setRefreshAccountIntervalMinute = useSettingsStore((state) => state.setRefreshAccountIntervalMinute);
  const setImageRetentionDays = useSettingsStore((state) => state.setImageRetentionDays);
  const setImagePollTimeoutSecs = useSettingsStore((state) => state.setImagePollTimeoutSecs);
  const setImageAccountConcurrency = useSettingsStore((state) => state.setImageAccountConcurrency);
  const setBaseUrl = useSettingsStore((state) => state.setBaseUrl);
  const setDefaultUpstreamModelName = useSettingsStore((state) => state.setDefaultUpstreamModelName);
  const setDefaultThinkingEffort = useSettingsStore((state) => state.setDefaultThinkingEffort);

  if (isLoadingConfig) {
    return (
      <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-surface-secondary">
            <Settings2 className="size-4 text-content-secondary" />
          </div>
          <h2 className="font-semibold text-content">Cài đặt hệ thống</h2>
        </div>
        <span className="hidden text-sm text-content-tertiary sm:block">Cấu hình vận hành chung</span>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="rounded-xl border border-border bg-surface-secondary px-4 py-3 text-sm leading-6 text-content-secondary">
          Admin key tiếp tục được đọc từ cấu hình triển khai và không còn được hiển thị trên trang này. Để phân phát cho người khác, vui lòng tạo khóa người dùng thông thường bên dưới.
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-content">Khoảng thời gian làm mới tài khoản</label>
            <Input
              value={String(config?.refresh_account_interval_minute || "")}
              onChange={(e) => setRefreshAccountIntervalMinute(e.target.value)}
              placeholder="phút"
              className="h-10 rounded-xl border-border bg-surface"
            />
            <p className="text-xs text-content-tertiary">Đơn vị: phút, kiểm soát tần suất làm mới tài khoản tự động.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Địa chỉ truy cập hình ảnh</label>
            <Input
              value={String(config?.base_url || "")}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-10 rounded-xl border-border bg-surface"
            />
            <p className="text-xs text-content-tertiary">Địa chỉ tiền tố truy cập dùng để tạo kết quả hình ảnh.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Tên model upstream mặc định</label>
            <Input
              value={String(config?.default_upstream_model_name || "")}
              onChange={(e) => setDefaultUpstreamModelName(e.target.value)}
              placeholder="gpt-image-2"
              className="h-10 rounded-xl border-border bg-surface"
            />
            <p className="text-xs text-content-tertiary">Tên model gửi lên upstream khi gpt-image-2 tạo ảnh, mặc định gpt-image-2.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Mức độ suy nghĩ mặc định</label>
            <Select
              value={String(config?.default_thinking_effort || "auto")}
              onValueChange={(value) => setDefaultThinkingEffort(value as "auto" | "standard" | "extended" | "max")}
            >
              <SelectTrigger className="h-10 rounded-xl border-border bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (không gửi)</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="extended">Extended</SelectItem>
                <SelectItem value="max">Max</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-content-tertiary">Tên model kết thúc bằng -standard, -extended hoặc -max sẽ được ưu tiên hơn cài đặt này.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Tự động xóa hình ảnh (ngày)</label>
            <Input
              value={String(config?.image_retention_days || "")}
              onChange={(e) => setImageRetentionDays(e.target.value)}
              placeholder="30"
              className="h-10 rounded-xl border-border bg-surface"
            />
            <p className="text-xs text-content-tertiary">Tự động xóa các hình ảnh cục bộ từ bao nhiêu ngày trước.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Hết thời gian chờ hình ảnh (giây)</label>
            <Input
              value={String(config?.image_poll_timeout_secs || "")}
              onChange={(e) => setImagePollTimeoutSecs(e.target.value)}
              placeholder="120"
              className="h-10 rounded-xl border-border bg-surface"
            />
            <p className="text-xs text-content-tertiary">Thời gian chờ tối đa cho kết quả hình ảnh từ ngược dòng.</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-content">Xử lý song song hình ảnh / tài khoản</label>
            <Input
              value={String(config?.image_account_concurrency || "")}
              onChange={(e) => setImageAccountConcurrency(e.target.value)}
              placeholder="1"
              className="h-10 rounded-xl border-border bg-surface"
            />
            <p className="text-xs text-content-tertiary">Giới hạn số yêu cầu hình ảnh đồng thời cho mỗi tài khoản, mặc định 3.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProxyCard() {
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<ProxyTestResult | null>(null);
  const config = useSettingsStore((state) => state.config);
  const setProxy = useSettingsStore((state) => state.setProxy);

  const handleTestProxy = async () => {
    const candidate = String(config?.proxy || "").trim();
    if (!candidate) {
      toast.error("Vui lòng điền địa chỉ Proxy trước");
      return;
    }
    setIsTestingProxy(true);
    setProxyTestResult(null);
    try {
      const data = await testProxy(candidate);
      setProxyTestResult(data.result);
      if (data.result.ok) {
        toast.success(`Proxy khả dụng (${data.result.latency_ms} ms, HTTP ${data.result.status})`);
      } else {
        toast.error(`Proxy không khả dụng: ${data.result.error ?? "Lỗi không xác định"}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kiểm tra Proxy thất bại");
    } finally {
      setIsTestingProxy(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-surface-secondary">
            <PlugZap className="size-4 text-content-secondary" />
          </div>
          <h2 className="font-semibold text-content">Proxy toàn cục</h2>
        </div>
        <span className="hidden text-sm text-content-tertiary sm:block">Kết nối mạng</span>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <label className="text-sm text-content">Địa chỉ Proxy</label>
          <Input
            value={String(config?.proxy || "")}
            onChange={(e) => {
              setProxy(e.target.value);
              setProxyTestResult(null);
            }}
            placeholder="http://127.0.0.1:7890"
            className="h-10 rounded-xl border-border bg-surface"
          />
          <p className="text-xs text-content-tertiary">Để trống có nghĩa không sử dụng Proxy.</p>
        </div>
        {proxyTestResult ? (
          <div className={`rounded-xl border px-3 py-2 text-xs leading-6 ${proxyTestResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {proxyTestResult.ok
              ? `Khả dụng: HTTP ${proxyTestResult.status}, ${proxyTestResult.latency_ms} ms`
              : `Không khả dụng: ${proxyTestResult.error ?? "Lỗi không xác định"}`}
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-xl border-border bg-surface px-4 text-content"
          onClick={() => void handleTestProxy()}
          disabled={isTestingProxy}
        >
          {isTestingProxy ? <LoaderCircle className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
          Kiểm tra Proxy
        </Button>
      </CardContent>
    </Card>
  );
}

export function AccountLogsCard() {
  const logLevelOptions = ["debug", "info", "warning", "error"];
  const config = useSettingsStore((state) => state.config);
  const setAutoRemoveInvalidAccounts = useSettingsStore((state) => state.setAutoRemoveInvalidAccounts);
  const setAutoRemoveRateLimitedAccounts = useSettingsStore((state) => state.setAutoRemoveRateLimitedAccounts);
  const setImageSettleEnabled = useSettingsStore((state) => state.setImageSettleEnabled);
  const setImageRemoveConversationAfterResult = useSettingsStore((state) => state.setImageRemoveConversationAfterResult);
  const setImageRemoveConversationAlways = useSettingsStore((state) => state.setImageRemoveConversationAlways);
  const setImageSettleSecs = useSettingsStore((state) => state.setImageSettleSecs);
  const setImageTimeoutRetrySecs = useSettingsStore((state) => state.setImageTimeoutRetrySecs);
  const setAutoReloginAfterRefresh = useSettingsStore((state) => state.setAutoReloginAfterRefresh);
  const setLogLevel = useSettingsStore((state) => state.setLogLevel);

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-surface-secondary">
            <Shield className="size-4 text-content-secondary" />
          </div>
          <h2 className="font-semibold text-content">Tài khoản & Logs</h2>
        </div>
        <span className="hidden text-sm text-content-tertiary sm:block">Quản lý tự động & mức log</span>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content transition hover:bg-surface-secondary/50">
            <Checkbox
              checked={Boolean(config?.auto_remove_invalid_accounts)}
              onCheckedChange={(checked) => setAutoRemoveInvalidAccounts(Boolean(checked))}
            />
            Tự động xóa tài khoản bất thường
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content transition hover:bg-surface-secondary/50">
            <Checkbox
              checked={Boolean(config?.auto_remove_rate_limited_accounts)}
              onCheckedChange={(checked) => setAutoRemoveRateLimitedAccounts(Boolean(checked))}
            />
            Tự động xóa tài khoản bị giới hạn tốc độ
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content transition hover:bg-surface-secondary/50">
            <Checkbox
              checked={Boolean(config?.auto_relogin_after_refresh)}
              onCheckedChange={(checked) => setAutoReloginAfterRefresh(Boolean(checked))}
            />
            Tự động thử gỡ bỏ trạng thái bất thường sau khi làm mới
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content transition hover:bg-surface-secondary/50">
            <Checkbox
              checked={Boolean(config?.image_settle_enabled !== false)}
              onCheckedChange={(checked) => setImageSettleEnabled(Boolean(checked))}
            />
            Cơ chế xác nhận lần thứ hai hình ảnh
          </label>
          <p className="text-xs text-content-tertiary">Khi bật sẽ cải thiện nhẹ tỉ lệ thành công nhận hình ảnh.</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content transition hover:bg-surface-secondary/50">
            <Checkbox
              checked={Boolean(config?.image_remove_conversation_after_result)}
              onCheckedChange={(checked) => setImageRemoveConversationAfterResult(Boolean(checked))}
            />
            Xóa cuộc trò chuyện cục bộ sau khi có hình ảnh
          </label>
          <p className="text-xs text-content-tertiary">Sau khi nhận được hình ảnh, ẩn bất đồng bộ bản ghi cuộc trò chuyện cục bộ tương ứng trên phía ChatGPT.</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content transition hover:bg-surface-secondary/50">
            <Checkbox
              checked={Boolean(config?.image_remove_conversation_always)}
              onCheckedChange={(checked) => setImageRemoveConversationAlways(Boolean(checked))}
            />
            Xóa cuộc trò chuyện cục bộ kể cả khi không ra ảnh
          </label>
          <p className="text-xs text-content-tertiary">Ẩn luôn bản ghi khi thất bại, timeout hoặc chỉ trả về văn bản (bật lên cũng bao gồm trường hợp ra ảnh thành công).</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-content">Thời gian chờ thêm hình ảnh timeout (giây)</label>
          <Input
            value={String(config?.image_timeout_retry_secs || "30")}
            onChange={(e) => setImageTimeoutRetrySecs(e.target.value)}
            placeholder="30"
            className="h-10 rounded-xl border-border bg-surface"
          />
          <p className="text-xs text-content-tertiary">Đơn vị: giây, thời gian chờ bổ sung sau khi timeout khi nhấp vào "Tiếp tục chờ".</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-content">Thời gian chờ xác nhận lần thứ hai hình ảnh (giây)</label>
          <Input
            value={String(config?.image_settle_secs || "2.0")}
            onChange={(e) => setImageSettleSecs(e.target.value)}
            placeholder="2.0"
            className="h-10 rounded-xl border-border bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!config?.image_settle_enabled}
          />
          <p className="text-xs text-content-tertiary">Đơn vị: giây, chờ bao lâu sau khi tìm thấy hình ảnh để xác nhận lần nữa. Cần sử dụng cùng với cơ chế xác nhận lần thứ hai hình ảnh.</p>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium text-content">Mức độ nhật ký</p>
            <p className="mt-0.5 text-xs text-content-tertiary">Mặc định: info / warning / error.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {logLevelOptions.map((level) => (
              <label key={level} className="flex cursor-pointer items-center gap-2 text-sm capitalize text-content">
                <Checkbox
                  checked={Boolean(config?.log_levels?.includes(level))}
                  onCheckedChange={(checked) => setLogLevel(level, Boolean(checked))}
                />
                {level}
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ContentCard() {
  const config = useSettingsStore((state) => state.config);
  const setGlobalSystemPrompt = useSettingsStore((state) => state.setGlobalSystemPrompt);
  const setSensitiveWordsText = useSettingsStore((state) => state.setSensitiveWordsText);

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-surface-secondary">
            <FileText className="size-4 text-content-secondary" />
          </div>
          <h2 className="font-semibold text-content">Nội dung</h2>
        </div>
        <span className="hidden text-sm text-content-tertiary sm:block">System prompt & từ khoá nhạy cảm</span>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <label className="text-sm text-content">System prompt toàn cục</label>
          <Textarea
            value={String(config?.global_system_prompt || "")}
            onChange={(e) => setGlobalSystemPrompt(e.target.value)}
            placeholder="Ví dụ: Từ chối trả lời các yêu cầu bất hợp pháp, khiêu dâm, bạo lực..."
            className="min-h-28 rounded-xl border-border bg-surface font-mono text-xs shadow-none"
          />
          <p className="text-xs text-content-tertiary">Được tiêm vào dưới dạng thông báo system trong mỗi yêu cầu.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-content">Từ khoá nhạy cảm</label>
          <Textarea
            value={(config?.sensitive_words || []).join("\n")}
            onChange={(e) => setSensitiveWordsText(e.target.value)}
            placeholder="Một từ mỗi hàng, từ chối ngay khi gặp"
            className="min-h-28 rounded-xl border-border bg-surface font-mono text-xs shadow-none"
          />
          <p className="text-xs text-content-tertiary">Từ chối trực tiếp khi yêu cầu chứa bất kỳ từ khoá nhạy cảm nào.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AIReviewCard() {
  const config = useSettingsStore((state) => state.config);
  const setAIReviewField = useSettingsStore((state) => state.setAIReviewField);

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-surface-secondary">
            <Sparkles className="size-4 text-content-secondary" />
          </div>
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-content">Kiểm duyệt AI</h2>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-content-tertiary">
              <Checkbox
                checked={Boolean(config?.ai_review?.enabled)}
                onCheckedChange={(checked) => setAIReviewField("enabled", Boolean(checked))}
              />
              Bật
            </label>
          </div>
        </div>
        <span className="hidden text-sm text-content-tertiary sm:block">Lọc prompt trước khi xử lý</span>
      </div>
      <CardContent className="space-y-4 p-6">
        <p className="text-sm leading-6 text-content-tertiary">
          Sau khi bật, mô hình kiểm duyệt sẽ được gọi trước khi yêu cầu được gửi đến tài khoản tạo ảnh. Không vượt qua sẽ bị từ chối trực tiếp.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-content">Base URL</label>
            <Input value={String(config?.ai_review?.base_url || "")} onChange={(e) => setAIReviewField("base_url", e.target.value)} placeholder="https://api.openai.com" className="h-10 rounded-xl border-border bg-surface" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">API Key</label>
            <Input value={String(config?.ai_review?.api_key || "")} onChange={(e) => setAIReviewField("api_key", e.target.value)} placeholder="sk-..." className="h-10 rounded-xl border-border bg-surface" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Model</label>
            <Input value={String(config?.ai_review?.model || "")} onChange={(e) => setAIReviewField("model", e.target.value)} placeholder="gpt-4o-mini" className="h-10 rounded-xl border-border bg-surface" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-content">Prompt kiểm duyệt</label>
          <Textarea value={String(config?.ai_review?.prompt || "")} onChange={(e) => setAIReviewField("prompt", e.target.value)} placeholder="Xác định xem yêu cầu có được phép không. Chỉ trả lời ALLOW hoặc REJECT." className="min-h-24 rounded-xl border-border bg-surface text-xs shadow-none" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ConfigSaveButton() {
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const saveConfig = useSettingsStore((state) => state.saveConfig);

  return (
    <div className="flex justify-end">
      <Button
        className="h-10 rounded-xl bg-primary-600 px-6 text-white hover:bg-primary-700"
        onClick={() => void saveConfig()}
        disabled={isSavingConfig}
      >
        {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        Lưu cài đặt
      </Button>
    </div>
  );
}

export function ConfigCard() {
  return (
    <div className="space-y-4">
      <SystemSettingsCard />
      <ProxyCard />
      <AccountLogsCard />
      <ContentCard />
      <AIReviewCard />
      <ConfigSaveButton />
    </div>
  );
}
