"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PIXELCUT_URL = "https://www.pixelcut.ai/ai-image-editor?tool=removeBackground";

export const PIXELCUT_TOKEN_KEY = "chatgpt2api:pixelcut_id_token";
export const PIXELCUT_ORG_KEY = "chatgpt2api:pixelcut_org_id";
export const PIXELCUT_REFRESH_KEY = "chatgpt2api:pixelcut_refresh_token";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSaved: (idToken: string, orgId: string, refreshToken: string) => void;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseInput(raw: string): { idToken: string; orgId: string; refreshToken: string } {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let idToken = "";
  let orgId = "";
  let refreshToken = "";
  for (const line of lines) {
    if (!idToken && line.startsWith("eyJ")) idToken = line;
    else if (!orgId && UUID_PATTERN.test(line)) orgId = line;
    else if (!refreshToken && line.length > 10) refreshToken = line;
  }
  return { idToken, orgId, refreshToken };
}

export function PixelcutAuthDialog({ open, onOpenChange, onAuthSaved }: Props) {
  const [raw, setRaw] = useState(() => {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem(PIXELCUT_TOKEN_KEY) ?? "";
    const org = localStorage.getItem(PIXELCUT_ORG_KEY) ?? "";
    const refresh = localStorage.getItem(PIXELCUT_REFRESH_KEY) ?? "";
    return [token, org, refresh].filter(Boolean).join("\n");
  });

  const { idToken, orgId, refreshToken } = parseInput(raw);
  const canSave = idToken.length > 0 && orgId.length > 0;

  const handleSave = () => {
    if (!idToken || !orgId) return;
    localStorage.setItem(PIXELCUT_TOKEN_KEY, idToken);
    localStorage.setItem(PIXELCUT_ORG_KEY, orgId);
    if (refreshToken) localStorage.setItem(PIXELCUT_REFRESH_KEY, refreshToken);
    onAuthSaved(idToken, orgId, refreshToken);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader className="gap-1.5">
          <DialogTitle>Cấu hình Pixelcut Auth</DialogTitle>
          <DialogDescription className="text-sm leading-5">
            Dùng userscript{" "}
            <strong className="text-content">Pixelcut Auth Copier</strong>
            {" "}→ click nút <strong>Copy Auth</strong> tại{" "}
            <a href={PIXELCUT_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-content">
              pixelcut.ai
            </a>
            {" "}rồi paste vào ô bên dưới (3 dòng: token, org ID, refresh token).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <div className="rounded-lg border border-border bg-surface-secondary px-3 py-2.5 text-[11px] font-mono leading-5 text-content-secondary">
            <p className="mb-1 text-content-tertiary">{"// Nếu chưa có userscript, chạy lệnh trong DevTools Console:"}</p>
            <p className="select-all break-all">{"Object.values(JSON.parse(localStorage.getItem('pixa-wks-store')).state.orgIdsByUser)[0]"}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-content">Paste token vào đây (3 dòng từ userscript)</label>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"eyJhbGciOiJSUzI1Ni...\n171ad7c6-392f-48d2-a014-27483fe677bd\nAMf-vBy..."}
              rows={5}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-content placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-primary-600/30"
            />
          </div>

          {raw.trim().length > 0 && (
            <div className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-[11px] font-mono space-y-1">
              <div className="flex gap-2">
                <span className={idToken ? "text-emerald-500" : "text-rose-500"}>
                  {idToken ? "✓" : "✗"}
                </span>
                <span className="text-content-tertiary truncate">
                  {idToken ? `Token: ${idToken.slice(0, 30)}…` : "Chưa tìm thấy ID Token (bắt đầu bằng eyJ)"}
                </span>
              </div>
              <div className="flex gap-2">
                <span className={orgId ? "text-emerald-500" : "text-rose-500"}>
                  {orgId ? "✓" : "✗"}
                </span>
                <span className="text-content-tertiary">
                  {orgId ? `Org ID: ${orgId}` : "Chưa tìm thấy Org ID (dạng UUID)"}
                </span>
              </div>
              <div className="flex gap-2">
                <span className={refreshToken ? "text-emerald-500" : "text-amber-500"}>
                  {refreshToken ? "✓" : "○"}
                </span>
                <span className="text-content-tertiary truncate">
                  {refreshToken ? `Refresh Token: ${refreshToken.slice(0, 20)}…` : "Không có Refresh Token (tùy chọn, khuyến nghị)"}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => window.open(PIXELCUT_URL, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="size-3.5" />
            Mở Pixelcut
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="bg-primary-600 text-white hover:bg-primary-700"
          >
            Lưu và xóa nền
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
