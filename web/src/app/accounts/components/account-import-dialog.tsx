"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  FileJson,
  FileText,
  Files,
  KeyRound,
  LoaderCircle,
  LogIn,
  ServerCog,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  createAccounts,
  finishOAuthLogin,
  startOAuthLogin,
  type Account,
  type AccountImportPayload,
  type OAuthLoginStartResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type ImportMethod = "menu" | "token" | "session" | "codex-auth" | "account-json" | "oauth";

type AccountImportDialogProps = {
  disabled?: boolean;
  onImported: (items: Account[]) => void;
};

type PendingAccountJsonImport = {
  tokens: string[];
  accounts: AccountImportPayload[];
  parsedAccountCount: number;
  errorCount: number;
};

const sessionUrl = "https://chatgpt.com/api/auth/session";

function splitTokens(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSessionAccessToken(value: unknown) {
  const token = (value as { accessToken?: unknown })?.accessToken;
  return typeof token === "string" ? token.trim() : "";
}

function getAccountJsonAccount(value: unknown): AccountImportPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const tokenValue = raw.access_token ?? raw.accessToken;
  const token = typeof tokenValue === "string" ? tokenValue.trim() : "";
  if (!token) {
    return null;
  }

  const payload: AccountImportPayload = {
    ...raw,
    access_token: token,
    source_type: "codex",
  };
  delete payload.accessToken;
  if (payload.type === "codex") {
    payload.export_type = "codex";
    delete payload.type;
  }
  return payload;
}

function getAccountJsonAccounts(value: unknown): AccountImportPayload[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => getAccountJsonAccount(item))
      .filter((item): item is AccountImportPayload => Boolean(item));
  }

  const singleAccount = getAccountJsonAccount(value);
  if (singleAccount) {
    return [singleAccount];
  }

  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;
    const nested = raw.accounts ?? raw.items;
    if (Array.isArray(nested)) {
      return nested
        .map((item) => getAccountJsonAccount(item))
        .filter((item): item is AccountImportPayload => Boolean(item));
    }
  }

  return [];
}

function getCodexAuthAccount(value: unknown): AccountImportPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const tokenValue = raw.access_token ?? raw.accessToken;
  const token = typeof tokenValue === "string" ? tokenValue.trim() : "";
  if (!token) {
    return null;
  }

  const payload: AccountImportPayload = {
    ...raw,
    access_token: token,
    export_type: "codex",
    source_type: "codex",
  };
  delete payload.accessToken;
  if (payload.type === "codex") {
    delete payload.type;
  }
  return payload;
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error(`Không thể đọc file: ${file.name}`));
    reader.readAsText(file);
  });
}

function MethodCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: typeof KeyRound;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-border bg-surface p-0 text-left transition hover:border-border hover:bg-surface-secondary"
    >
      <Card className="rounded-2xl border-0 bg-transparent shadow-none">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="rounded-xl bg-surface-secondary p-3 text-content">
            <Icon className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-content">{title}</div>
            <div className="text-sm leading-6 text-content-tertiary">{description}</div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

export function AccountImportDialog({ disabled, onImported }: AccountImportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<ImportMethod>("menu");
  const [tokenInput, setTokenInput] = useState("");
  const [sessionInput, setSessionInput] = useState("");
  const [codexAuthInput, setCodexAuthInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAccountJsonImport, setPendingAccountJsonImport] = useState<PendingAccountJsonImport | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [oauthEmailHint, setOauthEmailHint] = useState("");
  const [oauthSession, setOauthSession] = useState<OAuthLoginStartResponse | null>(null);
  const [oauthCallbackInput, setOauthCallbackInput] = useState("");
  const [oauthStarting, setOauthStarting] = useState(false);

  const txtInputRef = useRef<HTMLInputElement | null>(null);
  const accountJsonInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setMethod("menu");
    setTokenInput("");
    setSessionInput("");
    setCodexAuthInput("");
    setPendingAccountJsonImport(null);
    setConfirmOpen(false);
    setOauthEmailHint("");
    setOauthSession(null);
    setOauthCallbackInput("");
    setOauthStarting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const submitTokens = async (tokens: string[], successText?: string, accountPayloads: AccountImportPayload[] = []) => {
    const normalizedTokens = tokens.map((item) => item.trim()).filter(Boolean);

    if (normalizedTokens.length === 0) {
      toast.error("Vui lòng cung cấp ít nhất một Token hợp lệ");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await createAccounts(normalizedTokens, accountPayloads);
      onImported(data.items);
      setOpen(false);
      resetState();

      if ((data.errors?.length ?? 0) > 0) {
        const firstError = data.errors?.[0]?.error;
        toast.error(
          `${successText ?? "Nhập hoàn tất"}，đã thêm ${data.added ?? 0} cái，đã làm mới ${data.refreshed ?? 0} cái，thất bại ${data.errors?.length ?? 0} cái${firstError ? `，lỗi đầu tiên：${firstError}` : ""}`,
        );
      } else {
        toast.success(
          `${successText ?? "Nhập hoàn tất"}，đã thêm ${data.added ?? 0} cái，bỏ qua ${data.skipped ?? 0} mục trùng lặp，đã tự động làm mới thông tin tài khoản`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể nhập tài khoản";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportTokenText = async () => {
    await submitTokens(splitTokens(tokenInput), "Nhập Access Token hoàn tất");
  };

  // Bắt đầu ủy quyền: lấy URL ủy quyền, mở ngay trong cửa sổ mới, thuận tiện cho người dùng đăng nhập
  const handleStartOAuth = async () => {
    setOauthStarting(true);
    try {
      const data = await startOAuthLogin(oauthEmailHint.trim());
      setOauthSession(data);
      setOauthCallbackInput("");
      if (typeof window !== "undefined") {
        window.open(data.authorize_url, "_blank", "noopener,noreferrer");
      }
      toast.success("Đã mở trang ủy quyền OpenAI，vui lòng đăng nhập rồi sao chép callback URL");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi bắt đầu OAuth";
      toast.error(message);
    } finally {
      setOauthStarting(false);
    }
  };

  // Sử dụng callback URL dán lại để hoàn thành đổi token + lưu
  const handleFinishOAuth = async () => {
    if (!oauthSession) {
      toast.error("Vui lòng trước tiên nhấp vào \"Mở trang ủy quyền\" để lấy session");
      return;
    }
    const trimmed = oauthCallbackInput.trim();
    if (!trimmed) {
      toast.error("Vui lòng dán URL callback hoặc code");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await finishOAuthLogin(oauthSession.session_id, trimmed);
      onImported(data.items);
      setOpen(false);
      resetState();

      if ((data.errors?.length ?? 0) > 0) {
        const firstError = data.errors?.[0]?.error;
        toast.error(
          `Hoàn thành đăng nhập OAuth，thêm ${data.added ?? 0} cái，đã làm mới ${data.refreshed ?? 0} cái，thất bại ${data.errors?.length ?? 0} cái${firstError ? `，lỗi đầu tiên：${firstError}` : ""}`,
        );
      } else {
        toast.success(
          `Hoàn thành đăng nhập OAuth，thêm ${data.added ?? 0} cái，bỏ qua ${data.skipped ?? 0} mục trùng lặp，đã tự động làm mới thông tin tài khoản`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi đổi token OAuth";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sao chép URL ủy quyền vào clipboard（hỗ trợ trình duyệt và fallback）
  const handleCopyAuthorizeUrl = async () => {
    if (!oauthSession) {
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(oauthSession.authorize_url);
        toast.success("URL ủy quyền đã sao chép vào clipboard");
      } else {
        toast.error("Môi trường hiện tại không hỗ trợ tự động sao chép，vui lòng chọn và sao chép thủ công");
      }
    } catch {
      toast.error("Sao chép thất bại，vui lòng chọn và sao chép thủ công");
    }
  };

  const handleTxtSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const content = await readFileAsText(file);
      const tokens = splitTokens(content);

      if (tokens.length === 0) {
        toast.error("Không tìm thấy Token hợp lệ trong file TXT");
        return;
      }

      setTokenInput((prev) => {
        const next = [...splitTokens(prev), ...tokens];
        return next.join("\n");
      });
      toast.success(`Đã đọc ${tokens.length} Token từ ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đọc file TXT";
      toast.error(message);
    }
  };

  const handleImportSessionJson = async () => {
    if (!sessionInput.trim()) {
      toast.error("Vui lòng dán Session JSON hoàn chỉnh");
      return;
    }

    try {
      const payload = JSON.parse(sessionInput) as unknown;
      const token = getSessionAccessToken(payload);

      if (!token) {
        toast.error("Không thể trích xuất accessToken từ Session JSON");
        return;
      }

      await submitTokens([token], "Nhập Session JSON hoàn tất");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi phân tích cú pháp Session JSON";
      toast.error(message);
    }
  };

  const handleImportCodexAuthJson = async () => {
    if (!codexAuthInput.trim()) {
      toast.error("Vui lòng dán Codex xác thực JSON");
      return;
    }

    try {
      const payload = JSON.parse(codexAuthInput) as unknown;
      const account = getCodexAuthAccount(payload);

      if (!account) {
        toast.error("Không thể trích xuất access_token từ Codex xác thực JSON");
        return;
      }

      await submitTokens([account.access_token], "Hoàn tất nhập Codex xác thực JSON", [account]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi phân tích cú pháp Codex xác thực JSON";
      toast.error(message);
    }
  };

  const handleAccountJsonSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const raw = await readFileAsText(file);
          const parsed = JSON.parse(raw) as unknown;
          const accounts = getAccountJsonAccounts(parsed);
          return {
            accounts,
          };
        }),
      );

      const accounts = results.flatMap((item) => item.accounts);
      const tokens = accounts.map((item) => item.access_token);
      const parsedAccountCount = accounts.length;
      const errorCount = results.filter((item) => item.accounts.length === 0).length;

      if (parsedAccountCount === 0) {
        toast.error("Không tìm thấy access_token hợp lệ trong các file JSON tài khoản");
        return;
      }

      setPendingAccountJsonImport({
        tokens,
        accounts,
        parsedAccountCount,
        errorCount,
      });
      setConfirmOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đọc file JSON tài khoản";
      toast.error(message);
    }
  };

  const renderMethodBody = () => {
    if (method === "token") {
      const tokenCount = splitTokens(tokenInput).length;

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMethod("menu")}
              className="inline-flex items-center gap-1 text-sm text-content-tertiary transition hover:text-content"
            >
              <ArrowLeft className="size-4" />
              Quay lại cách nhập
            </button>
            <span className="text-xs text-content-tertiary">Hiện tại nhận dạng được {tokenCount} Token</span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-content">Danh sách Access Token</label>
            <Textarea
              placeholder="Mỗi dòng một Access Token..."
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className="min-h-56 resize-none rounded-xl border-border"
            />
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-surface-secondary p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-content">Nhập từ file TXT</div>
                <div className="text-sm leading-6 text-content-tertiary">Hỗ trợ `.txt`，nội dung file cũng là mỗi dòng một Token。</div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-border bg-surface"
                onClick={() => txtInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <FileText className="size-4" />
                Chọn TXT
              </Button>
            </div>
          </div>
          <input
            ref={txtInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(event) => void handleTxtSelected(event)}
          />
        </div>
      );
    }

    if (method === "session") {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMethod("menu")}
            className="inline-flex items-center gap-1 text-sm text-content-tertiary transition hover:text-content"
          >
            <ArrowLeft className="size-4" />
            Quay lại cách nhập
          </button>
          <div className="rounded-2xl border border-border bg-surface-secondary p-4 text-sm leading-6 text-content-secondary">
            Mở
            {" "}
            <a
              href={sessionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-content underline underline-offset-4"
            >
              {sessionUrl}
              <ExternalLink className="size-3.5" />
            </a>
            ，sao chép JSON hoàn chỉnh được trả về từ trang，hệ thống sẽ tự động trích xuất `accessToken` để nhập。
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="font-medium">Cảnh báo rủi ro</div>
            <div>
              Không sử dụng tài khoản chính của bạn，hãy cố gắng sử dụng tài khoản phụ hiếm khi sử dụng để nhập，tránh rủi ro bị khóa tài khoản。Dự án này không chịu trách nhiệm cho bất kỳ rủi ro khóa tài khoản nào。
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-content">Session JSON</label>
            <Textarea
              placeholder='Dán JSON hoàn chỉnh，ví dụ đối tượng chứa "accessToken"...'
              value={sessionInput}
              onChange={(event) => setSessionInput(event.target.value)}
              className="min-h-56 resize-none rounded-xl border-border font-mono text-xs"
            />
          </div>
        </div>
      );
    }

    if (method === "oauth") {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMethod("menu")}
            className="inline-flex items-center gap-1 text-sm text-content-tertiary transition hover:text-content"
          >
            <ArrowLeft className="size-4" />
            Quay lại cách nhập
          </button>
          <div className="rounded-2xl border border-border bg-surface-secondary p-4 text-sm leading-6 text-content-secondary space-y-2">
            <div className="font-medium text-content">Các bước thực hiện</div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>（Tuỳ chọn）Nhập email của tài khoản ChatGPT của bạn，trang đăng nhập sẽ điền sẵn。</li>
              <li>Nhấp vào \"Mở trang ủy quyền\" bên dưới，đăng nhập tài khoản ChatGPT của riêng bạn trong tab mới。</li>
              <li>Sau khi đăng nhập hoàn tất，trình duyệt sẽ nhảy tới <code className="rounded bg-surface px-1">platform.openai.com/auth/callback?code=...</code>。Ngay lập tức sao chép toàn bộ URL từ thanh địa chỉ（hoặc mở F12 trong Network，nhấp chuột phải trên callback → Copy → Copy URL）。</li>
              <li>Dán URL callback vào khung nhập bên dưới，nhấp \"Hoàn thành nhập\"。</li>
            </ol>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-content">Email（Tuỳ chọn điền sẵn）</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={oauthEmailHint}
              onChange={(event) => setOauthEmailHint(event.target.value)}
              disabled={Boolean(oauthSession) || oauthStarting}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-border"
            />
          </div>
          {!oauthSession ? (
            <Button
              type="button"
              className="h-10 rounded-xl bg-primary-600 text-white hover:bg-primary-700"
              onClick={() => void handleStartOAuth()}
              disabled={oauthStarting}
            >
              {oauthStarting ? <LoaderCircle className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
              Mở trang ủy quyền
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-surface p-3 text-xs leading-6 text-content-secondary break-all font-mono">
                {oauthSession.authorize_url}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-border bg-surface"
                  onClick={() => void handleCopyAuthorizeUrl()}
                >
                  <Copy className="size-4" />
                  Sao chép URL ủy quyền
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-border bg-surface"
                  onClick={() => window.open(oauthSession.authorize_url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="size-4" />
                  Mở lại
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-border bg-surface"
                  onClick={() => {
                    setOauthSession(null);
                    setOauthCallbackInput("");
                  }}
                >
                  Tạo lại
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-content">Dán URL callback（hoặc chỉ code）</label>
                <Textarea
                  placeholder={"https://platform.openai.com/auth/callback?code=...&state=..."}
                  value={oauthCallbackInput}
                  onChange={(event) => setOauthCallbackInput(event.target.value)}
                  className="min-h-24 resize-none rounded-xl border-border font-mono text-xs"
                />
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="font-medium">Lưu ý</div>
            <div>
              Mã ủy quyền（code）chỉ có thể sử dụng một lần。Nếu trang callback của trình duyệt tải xong、hiển thị trang lỗi của OpenAI，code có khả năng đã bị sử dụng，
              vui lòng nhấp \"Tạo lại\" và thực hiện lại。Toàn bộ quy trình có thể hoàn thành trong 10 phút。
            </div>
          </div>
        </div>
      );
    }

    if (method === "account-json") {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMethod("menu")}
            className="inline-flex items-center gap-1 text-sm text-content-tertiary transition hover:text-content"
          >
            <ArrowLeft className="size-4" />
            Quay lại cách nhập
          </button>
          <div className="rounded-2xl border border-dashed border-border bg-surface-secondary p-5">
            <div className="space-y-2">
              <div className="text-sm font-medium text-content">Chọn nhiều file JSON tài khoản cục bộ</div>
              <div className="text-sm leading-6 text-content-tertiary">
                Hỗ trợ dự án này xuất ra tài khoản đơn JSON hoặc mảng tất cả tài khoản，cũng tương thích file CPA JSON với một tài khoản cho mỗi file。
                Hệ thống sẽ tự động trích xuất `access_token` hoặc `accessToken`。
              </div>
            </div>
            <Button
              type="button"
              className="mt-4 rounded-xl bg-primary-600 text-white hover:bg-primary-700"
              onClick={() => accountJsonInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Files className="size-4" />
              Chọn nhiều file JSON
            </Button>
          </div>
          <input
            ref={accountJsonInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            className="hidden"
            onChange={(event) => void handleAccountJsonSelected(event)}
          />
          {pendingAccountJsonImport ? (
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm leading-6 text-content-secondary">
              Lần gần nhất đọc được {pendingAccountJsonImport.parsedAccountCount} Token
              {pendingAccountJsonImport.errorCount > 0 ? `，ngoài ra còn ${pendingAccountJsonImport.errorCount} file không trích xuất được` : ""}。
            </div>
          ) : null}
        </div>
      );
    }

    if (method === "codex-auth") {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMethod("menu")}
            className="inline-flex items-center gap-1 text-sm text-content-tertiary transition hover:text-content"
          >
            <ArrowLeft className="size-4" />
            Quay lại cách nhập
          </button>
          <div className="space-y-2">
            <label className="text-sm font-medium text-content">Codex xác thực JSON</label>
            <Textarea
              placeholder='Dán Codex xác thực JSON chứa "access_token"、"refresh_token"、"id_token"...'
              value={codexAuthInput}
              onChange={(event) => setCodexAuthInput(event.target.value)}
              className="min-h-64 resize-none rounded-xl border-border font-mono text-xs"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <MethodCard
          title="OAuth đăng nhập tài khoản đã có（kèm tự động làm mới）"
          description="Đăng nhập tài khoản ChatGPT của riêng bạn bằng trình duyệt，dán URL callback để nhận refresh_token，hệ thống sẽ tự động gia hạn。"
          icon={LogIn}
          onClick={() => setMethod("oauth")}
        />
        <MethodCard
          title="Nhập Access Token"
          description="Hỗ trợ dán trực tiếp，mỗi Token một dòng；hoặc đọc từ file TXT，mỗi Token một dòng。"
          icon={KeyRound}
          onClick={() => setMethod("token")}
        />
        <MethodCard
          title="Nhập Session JSON"
          description="Sao chép JSON đầy đủ từ endpoint session của chatgpt.com，hệ thống tự động trích accessToken。"
          icon={FileJson}
          onClick={() => setMethod("session")}
        />
        <MethodCard
          title="Nhập Codex xác thực JSON"
          description="Dán Codex xác thực JSON，sau khi nhập tài khoản sẽ được đánh dấu nguồn gốc codex。"
          icon={FileJson}
          onClick={() => setMethod("codex-auth")}
        />
        <MethodCard
          title="Nhập file JSON tài khoản"
          description="Hỗ trợ dự án này xuất ra JSON tài khoản đơn hoặc mảng tất cả tài khoản，cũng tương thích file JSON CPA。"
          icon={Files}
          onClick={() => setMethod("account-json")}
        />
        <MethodCard
          title="Nhập từ server CPA từ xa"
          description="Vào trang Cài đặt cấu hình server CPA từ xa trước khi nhập。"
          icon={Files}
          onClick={() => {
            setOpen(false);
            resetState();
            router.push("/settings");
          }}
        />
        <MethodCard
          title="Nhập từ server Sub2API"
          description="Vào trang Cài đặt cấu hình server Sub2API，sau đó chọn tài khoản OpenAI để nhập。"
          icon={ServerCog}
          onClick={() => {
            setOpen(false);
            resetState();
            router.push("/settings");
          }}
        />
      </div>
    );
  };

  const footerDisabled = disabled || isSubmitting;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <Button
          className="h-10 rounded-xl bg-primary-600 px-4 text-white hover:bg-primary-700"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <Upload className="size-4" />
          Nhập
        </Button>
        <DialogContent showCloseButton={false} className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>
              {method === "menu"
                ? "Nhập tài khoản"
                : method === "token"
                  ? "Nhập Access Token"
                  : method === "session"
                    ? "Nhập Session JSON"
                    : method === "oauth"
                      ? "OAuth đăng nhập tài khoản đã có"
                      : method === "codex-auth"
                        ? "Nhập Codex xác thực JSON"
                        : "Nhập file JSON tài khoản"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {method === "menu"
                ? "Chọn một cách nhập。Sau khi nhập thành công sẽ tự động lấy email，loại và hạn ngạch。"
                : method === "token"
                  ? "Hỗ trợ dán thủ công hoặc nhập từ file TXT，mỗi Token một dòng。"
                  : method === "session"
                    ? "Dán Session JSON đầy đủ，hệ thống tự động trích accessToken。"
                    : method === "oauth"
                      ? "Chạy một lần OAuth tiêu chuẩn của OpenAI qua trình duyệt，nhận refresh_token rồi hệ thống tự động gia hạn。"
                      : method === "codex-auth"
                        ? "Dán Codex xác thực JSON，hệ thống sẽ nhập theo nguồn codex。"
                        : "Hỗ trợ đọc JSON tài khoản đơn hoặc mảng tất cả tài khoản từ dự án này，và xác nhận số lượng trước khi gửi。"}
            </DialogDescription>
          </DialogHeader>

          {renderMethodBody()}

          <DialogFooter className="pt-2">
            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-surface-secondary px-5 text-content hover:bg-surface-tertiary"
              onClick={() => setOpen(false)}
              disabled={footerDisabled}
            >
              Huỷ
            </Button>
            {method === "token" ? (
              <Button
                className="h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700"
                onClick={() => void handleImportTokenText()}
                disabled={footerDisabled}
              >
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Nhập Token
              </Button>
            ) : null}
            {method === "session" ? (
              <Button
                className="h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700"
                onClick={() => void handleImportSessionJson()}
                disabled={footerDisabled}
              >
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Nhập JSON
              </Button>
            ) : null}
            {method === "oauth" ? (
              <Button
                className={cn(
                  "h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700",
                  !oauthSession ? "hidden" : "",
                )}
                onClick={() => void handleFinishOAuth()}
                disabled={footerDisabled || !oauthSession || !oauthCallbackInput.trim()}
              >
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Hoàn thành nhập
              </Button>
            ) : null}
            {method === "codex-auth" ? (
              <Button
                className="h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700"
                onClick={() => void handleImportCodexAuthJson()}
                disabled={footerDisabled}
              >
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Nhập JSON
              </Button>
            ) : null}
            {method === "account-json" ? (
              <Button
                className={cn(
                  "h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700",
                  !pendingAccountJsonImport ? "hidden" : "",
                )}
                onClick={() => setConfirmOpen(true)}
                disabled={footerDisabled || !pendingAccountJsonImport}
              >
                Xem xác nhận nhập
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>Xác nhận nhập Token tài khoản</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {pendingAccountJsonImport
                ? `Đã nhận diện ${pendingAccountJsonImport.parsedAccountCount} Token，xác nhận nhập？`
                : "Chưa đọc được Token nào để nhập。"}
              {pendingAccountJsonImport?.errorCount
                ? `，ngoài ra còn ${pendingAccountJsonImport.errorCount} file không trích xuất được。`
                : "。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-surface-secondary px-5 text-content hover:bg-surface-tertiary"
              onClick={() => setConfirmOpen(false)}
              disabled={isSubmitting}
            >
              Quay lại
            </Button>
            <Button
              className="h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700"
              onClick={() =>
                void submitTokens(
                  pendingAccountJsonImport?.tokens ?? [],
                  "Hoàn tất nhập JSON tài khoản",
                  pendingAccountJsonImport?.accounts ?? [],
                )
              }
              disabled={isSubmitting || !pendingAccountJsonImport}
            >
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Xác nhận nhập
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
