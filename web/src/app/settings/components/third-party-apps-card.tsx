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
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-stone-400" />
        </CardContent>
      </Card>
    );
  }

  const canvas = config.third_party_apps.infinite_canvas;

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-stone-900">
              <ExternalLink className="size-5 text-stone-500" />
              Cổng vào khung vẽ vô hạn
            </div>
            <p className="mt-1 text-xs leading-6 text-stone-500">Khi bật, sẽ hiển thị cổng vào trong điều hướng trên cùng, tự động đính kèm địa chỉ dự án này và khóa hiện tại khi chuyển đổi.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs ${canvas.enabled ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
            {canvas.enabled ? "Đã bật" : "Chưa bật"}
          </span>
        </div>

        <div className="space-y-4 rounded-xl border border-stone-200 bg-white px-4 py-3">
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <Checkbox
              checked={Boolean(canvas.enabled)}
              onCheckedChange={(checked) => setInfiniteCanvasField("enabled", Boolean(checked))}
            />
            Bật khung vẽ vô hạn
          </label>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Địa chỉ khung vẽ vô hạn</label>
            <Input
              value={canvas.url}
              onChange={(event) => setInfiniteCanvasField("url", event.target.value)}
              placeholder="https://canvas.best"
              className="h-10 rounded-xl border-stone-200 bg-white"
            />
            <p className="text-xs leading-5 text-stone-500">
              Khi chuyển đổi từ cổng vào trên cùng sẽ thêm các tham số apiKey và baseUrl; sau khi tắt khung vẽ vô hạn sẽ không hiển thị trong điều hướng trên cùng.
            </p>
            <p className="text-xs leading-5 text-amber-700">
              Cổng vào này chỉ dành cho kiểm tra cá nhân; để sử dụng lâu dài, nên triển khai khung vẽ vô hạn trên máy của riêng bạn.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800" onClick={() => void saveConfig()} disabled={isSavingConfig}>
            {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
