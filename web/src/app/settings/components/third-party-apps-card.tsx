"use client";

import { ExternalLink, LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { useSettingsStore } from "../store";

export function ThirdPartyAppsCard() {
  const config = useSettingsStore((state) => state.config);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const setInfiniteCanvasField = useSettingsStore((state) => state.setInfiniteCanvasField);
  const saveConfig = useSettingsStore((state) => state.saveConfig);

  if (isLoadingConfig || !config?.third_party_apps) {
    return (
      <Card className="rounded-2xl border-border/80 bg-surface/90 shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
        </CardContent>
      </Card>
    );
  }

  const canvas = config.third_party_apps.infinite_canvas;

  return (
    <Card className="rounded-2xl border-border/80 bg-surface/90 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-content">
              <ExternalLink className="size-5 text-content-tertiary" />
              Infinite Canvas (ứng dụng ngoài)
            </div>
            <p className="mt-1 text-xs leading-6 text-content-tertiary">Khi bật, thêm lối tắt mở Infinite Canvas trên thanh điều hướng; khi mở sẽ tự gửi kèm địa chỉ API của trang này và key hiện tại.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs ${canvas.enabled ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300" : "bg-surface-tertiary text-content-tertiary"}`}>
            {canvas.enabled ? "Đã bật" : "Chưa bật"}
          </span>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-surface px-4 py-3">
          <label className="flex items-center gap-3 text-sm text-content-secondary">
            <Checkbox
              checked={Boolean(canvas.enabled)}
              onCheckedChange={(checked) => setInfiniteCanvasField("enabled", Boolean(checked))}
            />
            Bật lối tắt Infinite Canvas
          </label>
          <div className="space-y-2">
            <label className="text-sm text-content-secondary">URL Infinite Canvas</label>
            <Input
              value={canvas.url}
              onChange={(event) => setInfiniteCanvasField("url", event.target.value)}
              placeholder="https://canvas.best"
              className="h-10 rounded-xl border-border bg-surface"
            />
            <p className="text-xs leading-5 text-content-tertiary">
              Khi mở từ lối tắt, URL được thêm tham số apiKey và baseUrl. Tắt thì lối tắt bị ẩn khỏi thanh điều hướng.
            </p>
            <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
              Lối tắt này gửi key hiện tại sang trang bên thứ ba, chỉ nên dùng để thử. Dùng lâu dài nên tự triển khai Infinite Canvas.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700" onClick={() => void saveConfig()} disabled={isSavingConfig}>
            {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
