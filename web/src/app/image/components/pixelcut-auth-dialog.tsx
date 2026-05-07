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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSaved: (idToken: string, orgId: string) => void;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseInput(raw: string): { idToken: string; orgId: string } {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let idToken = "";
  let orgId = "";
  for (const line of lines) {
    if (!idToken && line.startsWith("eyJ")) idToken = line;
    else if (!orgId && UUID_PATTERN.test(line)) orgId = line;
  }
  return { idToken, orgId };
}

export function PixelcutAuthDialog({ open, onOpenChange, onAuthSaved }: Props) {
  const [raw, setRaw] = useState(() => {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem(PIXELCUT_TOKEN_KEY) ?? "";
    const org = localStorage.getItem(PIXELCUT_ORG_KEY) ?? "";
    return [token, org].filter(Boolean).join("\n");
  });

  const { idToken, orgId } = parseInput(raw);
  const canSave = idToken.length > 0 && orgId.length > 0;

  const handleSave = () => {
    if (!idToken || !orgId) return;
    localStorage.setItem(PIXELCUT_TOKEN_KEY, idToken);
    localStorage.setItem(PIXELCUT_ORG_KEY, orgId);
    onAuthSaved(idToken, orgId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader className="gap-1.5">
          <DialogTitle>Cấu hình Pixelcut Auth</DialogTitle>
          <DialogDescription className="text-sm leading-5">
            Mở DevTools (F12) → Console tại{" "}
            <a href={PIXELCUT_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-content">
              pixelcut.ai
            </a>
            , chạy 2 lệnh dưới rồi paste kết quả vào ô bên dưới.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <div className="rounded-lg border border-border bg-surface-secondary px-3 py-2.5 text-[11px] font-mono leading-5 text-content-secondary">
            <p className="mb-1 text-content-tertiary">{"// ID Token (~1h):"}</p>
            <p className="select-all break-all">(await (await import('/assets/index-BPx7Hk69.js')).auth.currentUser.getIdToken())</p>
            <p className="mt-2 mb-1 text-content-tertiary">{"// Org ID:"}</p>
            <p className="select-all break-all">{"Object.values(JSON.parse(localStorage.getItem('pixa-wks-store')).state.orgIdsByUser)[0]"}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-content">Paste 2 dòng token vào đây</label>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"eyJhbGciOiJSUzI1Ni...\n171ad7c6-392f-48d2-a014-27483fe677bd"}
              rows={4}
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
