"use client";

import { Globe, LoaderCircle, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useSettingsStore } from "../store";

export function BaseUrlCard() {
  const config = useSettingsStore((state) => state.config);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const setBaseUrl = useSettingsStore((state) => state.setBaseUrl);
  const saveConfig = useSettingsStore((state) => state.saveConfig);

  const baseUrl = String(config?.base_url || "");

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface-secondary">
              <Globe className="size-5 text-content-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Địa chỉ cơ sở</h2>
              <p className="text-sm text-content-tertiary">Đặt giá trị cấu hình cục bộ của `CHATGPT2API_BASE_URL`, có hiệu lực ngay sau khi lưu.</p>
            </div>
          </div>
          <Badge variant={baseUrl.trim() ? "success" : "secondary"} className="w-fit rounded-md px-2.5 py-1">
            {baseUrl.trim() ? "Đã cấu hình" : "Chưa cấu hình"}
          </Badge>
        </div>

        {isLoadingConfig ? (
          <div className="flex items-center justify-center py-10">
            <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-content">Base URL</label>
              <Input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://example.com"
                className="h-11 rounded-xl border-border bg-surface"
              />
              <p className="text-sm text-content-tertiary">Để trống sẽ sử dụng biến môi trường hoặc giá trị mặc định. Khoảng trắng ở đầu và cuối sẽ được xóa tự động khi lưu.</p>
            </div>

            <div className="flex justify-end">
              <Button
                className="h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700"
                onClick={() => void saveConfig()}
                disabled={isSavingConfig}
              >
                {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                Lưu cấu hình
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
