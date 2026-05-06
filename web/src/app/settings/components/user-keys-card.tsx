"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, CheckCircle2, Copy, KeyRound, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { createUserKey, deleteUserKey, fetchUserKeys, updateUserKey, type UserKey } from "@/lib/api";

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

export function UserKeysCard() {
  const didLoadRef = useRef(false);
  const [items, setItems] = useState<UserKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [revealedKey, setRevealedKey] = useState("");
  const [deletingItem, setDeletingItem] = useState<UserKey | null>(null);
  const [editingItem, setEditingItem] = useState<UserKey | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUserKeys();
      setItems(data.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải các khoá người dùng");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (didLoadRef.current) {
      return;
    }
    didLoadRef.current = true;
    void load();
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const data = await createUserKey(name.trim());
      setItems(data.items);
      setRevealedKey(data.key);
      setName("");
      setIsDialogOpen(false);
      toast.success("Khoá người dùng đã được tạo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo khoá người dùng");
    } finally {
      setIsCreating(false);
    }
  };

  const setItemPending = (id: string, isPending: boolean) => {
    setPendingIds((current) => {
      const next = new Set(current);
      if (isPending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleToggle = async (item: UserKey) => {
    setItemPending(item.id, true);
    try {
      const data = await updateUserKey(item.id, { enabled: !item.enabled });
      setItems(data.items);
      toast.success(item.enabled ? "Khoá người dùng đã bị vô hiệu hoá" : "Khoá người dùng đã được bật");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật khoá người dùng");
    } finally {
      setItemPending(item.id, false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) {
      return;
    }
    const item = deletingItem;
    setItemPending(item.id, true);
    try {
      const data = await deleteUserKey(item.id);
      setItems(data.items);
      setDeletingItem(null);
      toast.success("Khoá người dùng đã được xoá");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xoá khoá người dùng");
    } finally {
      setItemPending(item.id, false);
    }
  };

  const openEditDialog = (item: UserKey) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditKey("");
  };

  const handleEdit = async () => {
    if (!editingItem) {
      return;
    }
    const item = editingItem;
    const trimmedName = editName.trim();
    const trimmedKey = editKey.trim();
    if (trimmedName === item.name && !trimmedKey) {
      setEditingItem(null);
      return;
    }
    setItemPending(item.id, true);
    try {
      const data = await updateUserKey(item.id, {
        ...(trimmedName !== item.name ? { name: trimmedName } : {}),
        ...(trimmedKey ? { key: trimmedKey } : {}),
      });
      setItems(data.items);
      setEditingItem(null);
      setEditKey("");
      toast.success(trimmedKey ? "Khoá người dùng đã được cập nhật" : "Tên người dùng đã được cập nhật");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật khoá người dùng");
    } finally {
      setItemPending(item.id, false);
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Đã sao chép vào bộ nhớ tạm");
    } catch {
      toast.error("Không thể sao chép, vui lòng sao chép thủ công");
    }
  };

  return (
    <>
      <Card className="rounded-2xl border-white/80 bg-surface shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-surface-secondary">
                <KeyRound className="size-5 text-content-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Quản lý khoá người dùng</h2>
                <p className="text-sm text-content-tertiary">Tạo các khoá chuyên dụng cho người dùng thông thường; người dùng thông thường chỉ có thể truy cập trang vẽ, không thể xem cài đặt và nhóm tài khoản.</p>
              </div>
            </div>
            <Button className="h-9 rounded-xl bg-primary-600 px-4 text-white hover:bg-primary-700" onClick={() => setIsDialogOpen(true)}>
              <Plus className="size-4" />
              Tạo khoá người dùng
            </Button>
          </div>

          {revealedKey ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              <div className="font-medium">Khoá mới chỉ được hiển thị một lần, vui lòng lưu ngay:</div>
              <div className="mt-3 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-surface p-3 md:flex-row md:items-center md:justify-between">
                <code className="break-all font-mono text-[13px]">{revealedKey}</code>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl border-emerald-200 bg-white px-4 text-emerald-700"
                  onClick={() => void handleCopy(revealedKey)}
                >
                  <Copy className="size-4" />
                  Sao chép
                </Button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl bg-surface-secondary px-6 py-10 text-center text-sm text-content-tertiary">
              Không có khoá người dùng thường xuyên nào. Bạn có thể tạo và phân phối cho người khác bằng cách nhấp vào nút ở góc trên cùng bên phải.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const isPending = pendingIds.has(item.id);
                return (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium text-content">{item.name}</div>
                        <Badge variant={item.enabled ? "success" : "secondary"} className="rounded-md">
                          {item.enabled ? "Đã bật" : "Đã tắt"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-tertiary">
                        <span>Thời gian tạo {formatDateTime(item.created_at)}</span>
                        <span>Lần sử dụng gần nhất {formatDateTime(item.last_used_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl border-border bg-white px-4 text-content"
                        onClick={() => openEditDialog(item)}
                        disabled={isPending}
                      >
                        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Pencil className="size-4" />}
                        Chỉnh sửa
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl border-border bg-white px-4 text-content"
                        onClick={() => void handleToggle(item)}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : item.enabled ? (
                          <Ban className="size-4" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        {item.enabled ? "Vô hiệu hoá" : "Bật"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl border-rose-200 bg-white px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setDeletingItem(item)}
                        disabled={isPending}
                      >
                        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        Xoá
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>Tạo khoá người dùng</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Tùy chọn ghi chú tên để phân biệt các người dùng khác nhau; khi tạo, nó sẽ tạo ra một khoá thô chỉ có thể xem một lần.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-content">Tên (tuỳ chọn)</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: bạn thiết kế A, tài khoản tạm thời vận hành"
              className="h-11 rounded-xl border-border bg-white"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl bg-surface-secondary px-5 text-content hover:bg-surface-tertiary"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCreating}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700"
              onClick={() => void handleCreate()}
              disabled={isCreating}
            >
              {isCreating ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingItem)} onOpenChange={(open) => (!open ? setDeletingItem(null) : null)}>
        <DialogContent className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>Xoá khoá người dùng</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Xác nhận xoá khoá người dùng "{deletingItem?.name}"? Sau khi xoá, khoá này sẽ không thể tiếp tục gọi API.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl bg-surface-secondary px-5 text-content hover:bg-surface-tertiary"
              onClick={() => setDeletingItem(null)}
              disabled={deletingItem ? pendingIds.has(deletingItem.id) : false}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-rose-600 px-5 text-white hover:bg-rose-700"
              onClick={() => void handleDelete()}
              disabled={deletingItem ? pendingIds.has(deletingItem.id) : false}
            >
              {deletingItem && pendingIds.has(deletingItem.id) ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
            setEditKey("");
          }
        }}
      >
        <DialogContent className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>Chỉnh sửa khoá người dùng</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Bạn có thể sửa tên ghi chú; nếu muốn thay đổi khoá chuyên dụng, chỉ cần nhập khoá thô mới. Để trống sẽ giữ nguyên khoá hiện tại.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-content">Tên</label>
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Ví dụ: bạn thiết kế A, tài khoản tạm thời vận hành"
                className="h-11 rounded-xl border-border bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-content">Khoá chuyên dụng mới (tuỳ chọn)</label>
              <Input
                value={editKey}
                onChange={(event) => setEditKey(event.target.value)}
                placeholder="Ví dụ: sk-your-custom-user-key"
                className="h-11 rounded-xl border-border bg-white font-mono"
              />
              <p className="text-xs leading-5 text-content-tertiary">
                Sau khi lưu, khoá cũ sẽ lập tức vô hiệu hóa và khoá mới có hiệu lực. Hệ thống vẫn chỉ lưu trữ hàm băm và sẽ không hiển thị lại khoá hiện tại.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl bg-surface-secondary px-5 text-content hover:bg-surface-tertiary"
              onClick={() => {
                setEditingItem(null);
                setEditKey("");
              }}
              disabled={editingItem ? pendingIds.has(editingItem.id) : false}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-primary-600 px-5 text-white hover:bg-primary-700"
              onClick={() => void handleEdit()}
              disabled={editingItem ? pendingIds.has(editingItem.id) : false}
            >
              {editingItem && pendingIds.has(editingItem.id) ? <LoaderCircle className="size-4 animate-spin" /> : <Pencil className="size-4" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
