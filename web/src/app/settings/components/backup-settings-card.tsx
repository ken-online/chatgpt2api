"use client";

import { CloudUpload, Download, Eye, LoaderCircle, Play, RefreshCcw, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import webConfig from "@/constants/common-env";
import { fetchBackupDetail, getBackupDownloadUrl, type BackupDetail, type BackupInclude } from "@/lib/api";
import { getStoredAuthKey } from "@/store/auth";
import { useSettingsStore } from "../store";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function getFilenameFromContentDisposition(value: string | null) {
  const header = String(value || "").trim();
  if (!header) {
    return "";
  }
  const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plainMatch?.[1] || "";
}

const includeLabels: Array<{ key: keyof BackupInclude; label: string }> = [
  { key: "config", label: "Cấu hình hệ thống" },
  { key: "register", label: "Cấu hình đăng ký" },
  { key: "cpa", label: "Cấu hình CPA" },
  { key: "sub2api", label: "Cấu hình Sub2API" },
  { key: "logs", label: "Nhật ký lập lịch và gọi" },
  { key: "image_tasks", label: "Bản ghi tác vụ ảnh" },
  { key: "accounts_snapshot", label: "Ảnh chụp tài khoản" },
  { key: "auth_keys_snapshot", label: "Ảnh chụp User Key" },
  { key: "images", label: "Thư mục tập tin ảnh" },
  { key: "image_index", label: "Chỉ mục ảnh" },
];

export function BackupSettingsCard() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<BackupDetail | null>(null);
  const config = useSettingsStore((state) => state.config);
  const backups = useSettingsStore((state) => state.backups);
  const backupState = useSettingsStore((state) => state.backupState);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const isLoadingBackups = useSettingsStore((state) => state.isLoadingBackups);
  const isRunningBackup = useSettingsStore((state) => state.isRunningBackup);
  const deletingBackupKey = useSettingsStore((state) => state.deletingBackupKey);
  const isTestingBackup = useSettingsStore((state) => state.isTestingBackup);
  const saveConfig = useSettingsStore((state) => state.saveConfig);
  const loadBackups = useSettingsStore((state) => state.loadBackups);
  const runBackup = useSettingsStore((state) => state.runBackup);
  const removeBackup = useSettingsStore((state) => state.removeBackup);
  const testBackup = useSettingsStore((state) => state.testBackup);
  const setBackupField = useSettingsStore((state) => state.setBackupField);
  const setBackupInclude = useSettingsStore((state) => state.setBackupInclude);

  if (isLoadingConfig) {
    return (
      <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
        </CardContent>
      </Card>
    );
  }

  const backup = config?.backup;
  if (!backup) {
    return null;
  }

  const handleOpenDetail = async (key: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await fetchBackupDetail(key);
      setDetail(data.item);
    } catch (error) {
      setDetail(null);
      toast.error(error instanceof Error ? error.message : "Không thể đọc chi tiết sao lưu");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownload = async (key: string, name: string) => {
    try {
      const authKey = await getStoredAuthKey();
      if (!authKey) {
        toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại trước khi tải xuống");
        return;
      }
      const response = await fetch(`${webConfig.apiUrl.replace(/\/$/, "")}${getBackupDownloadUrl(key)}`, {
        headers: {
          Authorization: `Bearer ${authKey}`,
        },
      });
      if (!response.ok) {
        let message = "Tải xuống sao lưu thất bại";
        try {
          const data = await response.json() as { detail?: { error?: string }; error?: string; message?: string };
          message = data.detail?.error || data.error || data.message || message;
        } catch {
          message = response.status === 401 ? "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" : message;
        }
        throw new Error(message);
      }
      const downloadName = getFilenameFromContentDisposition(response.headers.get("Content-Disposition")) || name || "backup.bin";
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Tải xuống sao lưu đã bắt đầu");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tải xuống sao lưu thất bại");
    }
  };

  return (
    <>
      <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-surface-secondary">
                <CloudUpload className="size-5 text-content-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Quản lý Sao lưu R2</h2>
                <p className="text-sm text-content-tertiary">Sao lưu dữ liệu quan trọng định kỳ đến Cloudflare R2, hỗ trợ mã hoá tùy chọn, xoay vòng, thực hiện thủ công và dọn sạch lịch sử.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={backupState?.running ? "warning" : backupState?.last_status === "success" ? "success" : "secondary"} className="rounded-md">
                {backupState?.running ? "Đang sao lưu" : backupState?.last_status === "success" ? "Gần đây thành công" : backupState?.last_status === "error" ? "Gần đây thất bại" : "Chưa thực hiện"}
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-secondary px-4 py-3 text-sm leading-6 text-content-secondary">
            Tài khoản và User Key sẽ xuất ảnh chụp logic từ backend lưu trữ hiện tại, không phụ thuộc vào `json`, `sqlite`, `postgres` hoặc `git`. Thư mục ảnh mặc định không sao lưu để tránh kích thước sao lưu quá lớn.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content">
              <Checkbox
                checked={Boolean(backup.enabled)}
                onCheckedChange={(checked) => setBackupField("enabled", Boolean(checked))}
              />
              Bật Sao lưu định kỳ
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-content">
              <Checkbox
                checked={Boolean(backup.encrypt)}
                onCheckedChange={(checked) => setBackupField("encrypt", Boolean(checked))}
              />
              Bật Mã hoá sao lưu
            </label>

          <div className="space-y-2">
            <label className="text-sm text-content">Cloudflare Account ID</label>
            <Input value={String(backup.account_id || "")} onChange={(event) => setBackupField("account_id", event.target.value)} className="h-10 rounded-xl border-border bg-surface" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Tên Bucket</label>
            <Input value={String(backup.bucket || "")} onChange={(event) => setBackupField("bucket", event.target.value)} className="h-10 rounded-xl border-border bg-surface" />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-content">Access Key ID</label>
            <Input value={String(backup.access_key_id || "")} onChange={(event) => setBackupField("access_key_id", event.target.value)} className="h-10 rounded-xl border-border bg-surface" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Secret Access Key</label>
            <Input type="password" value={String(backup.secret_access_key || "")} onChange={(event) => setBackupField("secret_access_key", event.target.value)} className="h-10 rounded-xl border-border bg-surface" />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-content">Tiền tố Sao lưu</label>
            <Input value={String(backup.prefix || "")} onChange={(event) => setBackupField("prefix", event.target.value)} placeholder="backups" className="h-10 rounded-xl border-border bg-surface" />
            <p className="text-xs text-content-tertiary">Tiền tố đối tượng trong R2, ví dụ `backups/prod`.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Khoảng thời gian Sao lưu định kỳ</label>
            <Input value={String(backup.interval_minutes || "")} onChange={(event) => setBackupField("interval_minutes", event.target.value)} placeholder="360" className="h-10 rounded-xl border-border bg-surface" />
            <p className="text-xs text-content-tertiary">Đơn vị phút, dịch vụ sẽ tự động thực hiện theo khoảng này sau khi khởi động.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-content">Số lượng Sao lưu giữ lại</label>
            <Input value={String(backup.rotation_keep || "")} onChange={(event) => setBackupField("rotation_keep", event.target.value)} placeholder="10" className="h-10 rounded-xl border-border bg-surface" />
            <p className="text-xs text-content-tertiary">Tự động xoá các bản sao lưu cũ hơn sau khi tải lên thành công. Điền `0` nghĩa là không xoay vòng tự động.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-content">Cụm mật khẩu mã hoá</label>
            <Input type="password" value={String(backup.passphrase || "")} onChange={(event) => setBackupField("passphrase", event.target.value)} placeholder={backup.encrypt ? "Bắt buộc khi bật mã hoá" : "Để trống"} className="h-10 rounded-xl border-border bg-surface" />
            <p className="text-xs text-content-tertiary">Chỉ sử dụng khi bật mã hoá. Vui lòng giữ kỹ, nếu không không thể giải mã nội dung sao lưu.</p>
          </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-surface px-4 py-4">
          <div>
            <div className="text-sm font-medium text-content">Nội dung sao lưu</div>
            <p className="mt-1 text-xs text-content-tertiary">Chọn dữ liệu cần vào gói sao lưu theo thành phần.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {includeLabels.map((item) => (
              <label key={item.key} className="flex items-center gap-3 text-sm text-content">
                <Checkbox
                  checked={Boolean(backup.include[item.key])}
                  onCheckedChange={(checked) => setBackupInclude(item.key, Boolean(checked))}
                />
                {item.label}
              </label>
            ))}
          </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-4 text-sm text-content-secondary md:grid-cols-3">
          <div>
            <div className="text-xs text-content-tertiary">Lần cuối bắt đầu</div>
            <div className="mt-1 font-medium text-content">{formatDateTime(backupState?.last_started_at)}</div>
          </div>
          <div>
            <div className="text-xs text-content-tertiary">Lần cuối hoàn thành</div>
            <div className="mt-1 font-medium text-content">{formatDateTime(backupState?.last_finished_at)}</div>
          </div>
          <div>
            <div className="text-xs text-content-tertiary">Đối tượng gần đây</div>
            <div className="mt-1 break-all font-medium text-content">{backupState?.last_object_key || "—"}</div>
          </div>
          {backupState?.last_error ? (
            <div className="md:col-span-3">
              <div className="text-xs text-rose-500">Lỗi gần đây</div>
              <div className="mt-1 break-all rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{backupState.last_error}</div>
            </div>
          ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-xl border-border bg-surface px-4 text-content" onClick={() => void testBackup()} disabled={isTestingBackup}>
            {isTestingBackup ? <LoaderCircle className="size-4 animate-spin" /> : <Shield className="size-4" />}
            Kiểm tra kết nối
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-border bg-surface px-4 text-content" onClick={() => void loadBackups()} disabled={isLoadingBackups}>
            {isLoadingBackups ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            Làm tươi danh sách
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-border bg-surface px-4 text-content" onClick={() => void runBackup()} disabled={isRunningBackup || Boolean(backupState?.running)}>
            {isRunningBackup || backupState?.running ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
            Sao lưu ngay
          </Button>
          <Button className="h-9 rounded-xl bg-primary-600 px-4 text-white hover:bg-primary-700" onClick={() => void saveConfig()} disabled={isSavingConfig}>
            {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
            Lưu cấu hình
          </Button>
          </div>

          <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-content">Sao lưu lịch sử</h3>
              <p className="text-xs text-content-tertiary">Hỗ trợ xem thông tin đối tượng và xoá trực tiếp sao lưu từ xa.</p>
            </div>
          </div>

          {isLoadingBackups ? (
            <div className="flex items-center justify-center py-10">
              <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
            </div>
          ) : backups.length === 0 ? (
            <div className="rounded-xl bg-surface-secondary px-6 py-10 text-center text-sm text-content-tertiary">
              Không có bản ghi sao lưu từ xa. Nó sẽ xuất hiện ở đây sau khi lưu cấu hình và thực hiện sao lưu thủ công.
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((item) => {
                const isDeleting = deletingBackupKey === item.key;
                return (
                  <div key={item.key} className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="break-all text-sm font-medium text-content">{item.name}</div>
                        {item.encrypted ? <Badge variant="secondary" className="rounded-md">Đã mã hoá</Badge> : null}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-tertiary">
                        <span>Kích thước {formatBytes(item.size)}</span>
                        <span>Thời gian cập nhật {formatDateTime(item.updated_at)}</span>
                        <span className="break-all">Khoá đối tượng {item.key}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl border-border bg-surface px-4 text-content"
                        onClick={() => void handleDownload(item.key, item.name)}
                      >
                        <Download className="size-4" />
                        Tải xuống
                      </Button>
                      <Button type="button" variant="outline" className="h-9 rounded-xl border-border bg-surface px-4 text-content" onClick={() => void handleOpenDetail(item.key)}>
                        <Eye className="size-4" />
                        Xem chi tiết
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl border-rose-200 bg-surface px-4 text-rose-700"
                        onClick={() => void removeBackup(item.key)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        Xoá
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden rounded-2xl border-border/80 bg-surface">
          <DialogHeader className="shrink-0 border-b border-border pb-3">
            <DialogTitle>Chi tiết sao lưu</DialogTitle>
            <DialogDescription className="sr-only">
              Xem thông tin chi tiết của bản sao lưu đã chọn.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
              </div>
            ) : !detail ? (
              <div className="rounded-xl bg-surface-secondary px-6 py-10 text-center text-sm text-content-tertiary">
                Hiện tại không thể đọc chi tiết sao lưu; nếu đây là sao lưu được mã hoá, vui lòng xác nhận rằng bạn đã nhập đúng cụm mật khẩu mã hoá và lưu cấu hình trước.
              </div>
            ) : (
              <>
                <div className="grid gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-4 text-sm text-content-secondary md:grid-cols-2">
                  <div>
                    <div className="text-xs text-content-tertiary">Tên đối tượng</div>
                    <div className="mt-1 break-all font-medium text-content">{detail.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-content-tertiary">Thời gian tạo</div>
                    <div className="mt-1 font-medium text-content">{formatDateTime(detail.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-content-tertiary">Cách kích hoạt</div>
                    <div className="mt-1 font-medium text-content">{detail.trigger || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-content-tertiary">Phiên bản ứng dụng</div>
                    <div className="mt-1 font-medium text-content">{detail.app_version || "—"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-content-tertiary">Backend lưu trữ</div>
                    <pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-surface px-3 py-2 text-xs text-content">{JSON.stringify(detail.storage_backend || {}, null, 2)}</pre>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-content">Nội dung tệp</h4>
                  <div className="space-y-2">
                    {detail.files.map((item) => (
                      <div key={item.name} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
                        <div className="break-all font-medium text-content">{item.name}</div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-tertiary">
                          <span>{item.exists ? "Đã bao gồm" : "Thiếu"}</span>
                          <span>Kích thước {formatBytes(item.size)}</span>
                          <span>{item.content_type || "application/octet-stream"}</span>
                          <span className="break-all">SHA256 {item.sha256 || "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-content">Nội dung ảnh chụp</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {detail.snapshots.map((item) => (
                      <div key={item.name} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
                        <div className="font-medium text-content">{item.name}</div>
                        <div className="mt-2 text-xs text-content-tertiary">Số bản ghi {item.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
