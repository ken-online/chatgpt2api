"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";
import { useRedirectIfAuthenticated } from "@/lib/use-auth-guard";
import { getDefaultRouteForRole, setStoredAuthSession } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const [authKey, setAuthKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isCheckingAuth } = useRedirectIfAuthenticated();

  const handleLogin = async () => {
    const normalizedAuthKey = authKey.trim();
    if (!normalizedAuthKey) {
      toast.error("Vui lòng nhập khóa bí mật");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await login(normalizedAuthKey);
      await setStoredAuthSession({
        key: normalizedAuthKey,
        role: data.role,
        subjectId: data.subject_id,
        name: data.name,
      });
      router.replace(getDefaultRouteForRole(data.role));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đăng nhập thất bại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-bg-app px-4">
        <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full place-items-center bg-bg-app px-4">
      <Card className="w-full max-w-[460px]">
        <CardContent className="space-y-7 p-8">
          <div className="space-y-4 text-center">
            <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md">
              <LockKeyhole className="size-5" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-content">Chào mừng trở lại</h1>
              <p className="text-sm leading-6 text-content-tertiary">
                Nhập khóa bí mật để tiếp tục sử dụng quản lý tài khoản và tính năng tạo ảnh.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="auth-key" className="block text-sm font-medium text-content">
              Khóa bí mật
            </label>
            <Input
              id="auth-key"
              type="password"
              value={authKey}
              onChange={(event) => setAuthKey(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleLogin();
                }
              }}
              placeholder="Nhập khóa bí mật"
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => void handleLogin()}
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Đăng nhập
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
