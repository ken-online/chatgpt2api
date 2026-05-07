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

export function PixelcutAuthDialog({ open, onOpenChange, onAuthSaved }: Props) {
  const [idToken, setIdToken] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(PIXELCUT_TOKEN_KEY) ?? "") : "",
  );
  const [orgId, setOrgId] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(PIXELCUT_ORG_KEY) ?? "") : "",
  );

  const canSave = idToken.trim().length > 0 && orgId.trim().length > 0;

  const handleSave = () => {
    const trimmedToken = idToken.trim();
    const trimmedOrg = orgId.trim();
    if (!trimmedToken || !trimmedOrg) return;
    localStorage.setItem(PIXELCUT_TOKEN_KEY, trimmedToken);
    localStorage.setItem(PIXELCUT_ORG_KEY, trimmedOrg);
    onAuthSaved(trimmedToken, trimmedOrg);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader className="gap-1.5">
          <DialogTitle>Cấu hình Pixelcut Auth</DialogTitle>
          <DialogDescription className="text-sm leading-5">
            Lấy token từ{" "}
            <a
              href={PIXELCUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-content"
            >
              pixelcut.ai
            </a>
            , sau đó paste vào đây. Token hết hạn sau ~1 giờ.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <div className="rounded-lg border border-border bg-surface-secondary px-3 py-2.5 text-[11px] font-mono leading-5 text-content-secondary">
            <p className="mb-1 text-content-tertiary">// 1. Mở DevTools (F12) → Console tại pixelcut.ai</p>
            <p className="mb-2 text-content-tertiary">// 2. Chạy từng lệnh và copy kết quả:</p>
            <p className="mb-1 text-content-tertiary">{"// ID Token (hết hạn sau ~1h):"}</p>
            <p className="select-all break-all">(await (await import('/assets/index-BPx7Hk69.js')).auth.currentUser.getIdToken())</p>
            <p className="mt-2 mb-1 text-content-tertiary">{"// Org ID:"}</p>
            <p className="select-all break-all">{"Object.values(JSON.parse(localStorage.getItem('pixa-wks-store')).state.orgIdsByUser)[0]"}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-content">ID Token</label>
            <textarea
              value={idToken}
              onChange={(e) => setIdToken(e.target.value)}
              placeholder="eyJhbGciOiJSUzI1NiIs..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-content placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-primary-600/30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-content">Org ID</label>
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="171ad7c6-392f-48d2-a014-27483fe677bd"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-content placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-primary-600/30"
            />
          </div>
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
