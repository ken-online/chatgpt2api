"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Download, EyeOff, LoaderCircle, Pencil, Plus, RotateCcw, Scissors, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { removeBackground } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ImageConversation, ImageTurnStatus, StoredImage, StoredReferenceImage } from "@/store/image-conversations";
import { PixelcutAuthDialog, PIXELCUT_ORG_KEY, PIXELCUT_REFRESH_KEY, PIXELCUT_TOKEN_KEY } from "./pixelcut-auth-dialog";

export type ImageLightboxItem = {
  id: string;
  src: string;
  sizeLabel?: string;
  dimensions?: string;
};

type ImageResultsProps = {
  selectedConversation: ImageConversation | null;
  onOpenLightbox: (images: ImageLightboxItem[], index: number, turnId?: string) => void;
  onContinueEdit: (conversationId: string, image: StoredImage | StoredReferenceImage) => void;
  onDeletePrompt: (conversationId: string, turnId: string) => void;
  onDeleteResults: (conversationId: string, turnId: string) => void;
  onReuseTurnConfig: (conversationId: string, turnId: string) => void | Promise<void>;
  onReuseTurnConfigAsNew: (conversationId: string, turnId: string) => void | Promise<void>;
  onRegenerateTurn: (conversationId: string, turnId: string, newPrompt?: string) => void | Promise<void>;
  onRetryImage: (conversationId: string, turnId: string, imageId: string) => void | Promise<void>;
  onTimeoutRetryContinue: (taskId: string) => void | Promise<void>;
  onDismissErrors: (conversationId: string, turnId: string) => void | Promise<void>;
  formatConversationTime: (value: string) => string;
  turnRevisions: Record<string, StoredImage[][]>;
  turnViewSlot: Record<string, number>;
  onTurnViewSlotChange: (turnId: string, slot: number) => void;
  removeBgResults: Record<string, string>;
  onRemoveBgResult: (imageId: string, dataUrl: string, persistUrl: string, conversationId: string, turnId: string) => void;
};

// Blob URL bộ nhớ đệm: tránh chuỗi base64 siêu dài trong DOM, dùng blob: URL ngắn gọn
const b64BlobUrlCache = new Map<string, string>();

function getStoredImageSrc(image: StoredImage) {
  if (image.b64_json) {
    let url = b64BlobUrlCache.get(image.b64_json);
    if (!url) {
      const binary = atob(image.b64_json);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      url = URL.createObjectURL(blob);
      b64BlobUrlCache.set(image.b64_json, url);
    }
    return url;
  }
  return image.url || "";
}

function getStatusDotColor(status: ImageTurnStatus) {
  if (status === "success") return "bg-emerald-500";
  if (status === "error") return "bg-rose-500";
  if (status === "generating") return "bg-blue-500 animate-pulse";
  return "bg-amber-500";
}

function getAspectClass(size: string) {
  if (size === "16:9") return "aspect-[16/9]";
  if (size === "9:16") return "aspect-[9/16]";
  if (size === "4:3") return "aspect-[4/3]";
  if (size === "3:4") return "aspect-[3/4]";
  return "aspect-square";
}

const META_DOT = "•";

const PROGRESS_LABELS: Record<string, string> = {
  getting_account: "Xác nhận tài khoản khả dụng",
  uploading: "Đang tải lên ảnh",
  bootstrapping: "Khởi động trang chủ",
  getting_token: "Lấy token",
  preparing_conversation: "Chuẩn bị cuộc hội thoại",
  starting_generation: "Bắt đầu tạo",
  generating: "Đang tạo",
  receiving_image: "Đang nhận ảnh",
};

function getProgressLabel(progress?: string) {
  if (!progress) {
    return "Đang tạo";
  }
  return PROGRESS_LABELS[progress] || "Đang tạo";
}

function formatElapsed(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

const base64SizeCache = new Map<string, string>();
function formatBase64ImageSize(base64: string) {
  let cached = base64SizeCache.get(base64);
  if (cached !== undefined) return cached;
  const normalized = base64.replace(/\s/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  const bytes = Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);

  if (bytes >= 1024 * 1024) {
    cached = `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    cached = `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    cached = `${bytes} B`;
  }
  base64SizeCache.set(base64, cached);
  return cached;
}

function formatImageDimensions(width: number, height: number) {
  return `${width} x ${height}`;
}

export function ImageResults({
  selectedConversation,
  onOpenLightbox,
  onContinueEdit,
  onDeletePrompt,
  onDeleteResults,
  onReuseTurnConfig,
  onReuseTurnConfigAsNew,
  onRegenerateTurn,
  onRetryImage,
  onTimeoutRetryContinue,
  onDismissErrors,
  formatConversationTime,
  turnRevisions,
  turnViewSlot,
  onTurnViewSlotChange,
  removeBgResults,
  onRemoveBgResult: onRemoveBgResultProp,
}: ImageResultsProps) {
  const imageDimensionsRef = useRef<Record<string, string>>({});
  const [removingBgIds, setRemovingBgIds] = useState<Set<string>>(new Set());
  const [showPixelcutAuth, setShowPixelcutAuth] = useState(false);
  const [pendingRemoveBg, setPendingRemoveBg] = useState<{ id: string; src: string; conversationId: string; turnId: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [editingPrompt, setEditingPrompt] = useState<{ turnId: string; text: string } | null>(null);

  // Chỉ khởi động bộ định thời khi có ảnh đang tải, tránh re-render vô ích khi chờ
  const hasLoadingImages = selectedConversation?.turns.some(
    (turn) => !turn.resultsDeleted && turn.images.some((image) => image.status === "loading"),
  );
  useEffect(() => {
    if (!hasLoadingImages) return;
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, [hasLoadingImages]);

  const doRemoveBg = async (imageId: string, imageSrc: string, idToken: string, orgId: string, conversationId: string, turnId: string) => {
    setRemovingBgIds((prev) => new Set(prev).add(imageId));
    try {
      let source: Parameters<typeof removeBackground>[0];
      if (imageSrc.startsWith("data:")) {
        const commaIndex = imageSrc.indexOf(",");
        const mime = imageSrc.slice(0, commaIndex).match(/data:(.*?);/)?.[1] || "image/png";
        source = { type: "b64", b64: imageSrc.slice(commaIndex + 1), mime };
      } else {
        source = { type: "url", url: imageSrc };
      }
      const refreshToken = localStorage.getItem(PIXELCUT_REFRESH_KEY) ?? undefined;
      const result = await removeBackground(source, idToken, orgId, refreshToken);

      // Lưu token mới nếu backend đã tự làm mới
      if (result.new_id_token) {
        localStorage.setItem(PIXELCUT_TOKEN_KEY, result.new_id_token);
      }
      if (result.new_refresh_token) {
        localStorage.setItem(PIXELCUT_REFRESH_KEY, result.new_refresh_token);
      }

      const dataUrl = `data:image/png;base64,${result.b64_json}`;
      onRemoveBgResultProp(imageId, dataUrl, result.image_url, conversationId, turnId);
    } catch (error) {
      if (error instanceof Error && error.message === "PIXELCUT_AUTH_EXPIRED") {
        localStorage.removeItem(PIXELCUT_TOKEN_KEY);
        localStorage.removeItem(PIXELCUT_ORG_KEY);
        localStorage.removeItem(PIXELCUT_REFRESH_KEY);
        toast.error("Token Pixelcut hết hạn, vui lòng lấy token mới");
        setPendingRemoveBg({ id: imageId, src: imageSrc, conversationId, turnId });
        setShowPixelcutAuth(true);
      } else {
        toast.error(error instanceof Error ? error.message : "Xóa nền thất bại");
      }
    } finally {
      setRemovingBgIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  };

  const handleRemoveBg = async (imageId: string, imageSrc: string, conversationId: string, turnId: string) => {
    const idToken = localStorage.getItem(PIXELCUT_TOKEN_KEY);
    const orgId = localStorage.getItem(PIXELCUT_ORG_KEY);
    if (!idToken || !orgId) {
      setPendingRemoveBg({ id: imageId, src: imageSrc, conversationId, turnId });
      setShowPixelcutAuth(true);
      return;
    }
    await doRemoveBg(imageId, imageSrc, idToken, orgId, conversationId, turnId);
  };

  const handlePixelcutAuthSaved = async (idToken: string, orgId: string, refreshToken: string) => {
    const pending = pendingRemoveBg;
    setPendingRemoveBg(null);
    if (pending) {
      await doRemoveBg(pending.id, pending.src, idToken, orgId, pending.conversationId, pending.turnId);
    }
  };

  const updateImageDimensions = (id: string, width: number, height: number) => {
    const dimensions = formatImageDimensions(width, height);
    // Dùng ref để lưu, không kích hoạt re-render React, loại bỏ re-render xếp tầng
    if (imageDimensionsRef.current[id] !== dimensions) {
      imageDimensionsRef.current[id] = dimensions;
    }
  };

  if (!selectedConversation) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center text-center sm:min-h-[420px]">
        <div className="w-full max-w-md">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-secondary">
            <Sparkles className="size-5 text-content-secondary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">
            Biến ý tưởng thành hình ảnh
          </h2>
          <p className="mt-2 text-sm text-content-tertiary">
            Nhập mô tả phía dưới để tạo ảnh, hoặc chọn cuộc trò chuyện cũ ở thanh bên.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {selectedConversation.turns.map((turn, turnIndex) => {
        const revisions = turnRevisions[turn.id] || [];
        const totalSlots = revisions.length + 1;
        const isLive = turn.status === "queued" || turn.status === "generating";
        const viewSlot = turnViewSlot[turn.id] ?? totalSlots - 1;
        const isViewingCurrent = viewSlot >= totalSlots - 1;
        const displayImages = isViewingCurrent ? turn.images : (revisions[viewSlot] ?? turn.images);

        const referenceLightboxImages = turn.referenceImages.map((image, index) => ({
          id: `${turn.id}-reference-${index}`,
          src: image.dataUrl,
        }));
        const successfulTurnImages = displayImages.flatMap((image) => {
          const src = image.status === "success" ? getStoredImageSrc(image) : "";
          return src
            ? [
                {
                  id: image.id,
                  src,
                  sizeLabel: image.b64_json ? formatBase64ImageSize(image.b64_json) : undefined,
                  dimensions: imageDimensionsRef.current[image.id],
                },
              ]
            : [];
        });

        return (
          <div key={turn.id} className="flex flex-col gap-3">
            {/* Prompt bubble — bên phải */}
            {!turn.promptDeleted ? (
              <div className="flex justify-end">
                <div className="group/prompt max-w-[80%]">
                  {/* Card chứa prompt + ảnh tham chiếu */}
                  <div className="overflow-hidden rounded-2xl bg-surface-secondary">
                    {editingPrompt?.turnId === turn.id ? (
                      <div className="w-[min(640px,70vw)] p-3">
                        <textarea
                          autoFocus
                          value={editingPrompt.text}
                          onChange={(event) => setEditingPrompt({ turnId: turn.id, text: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setEditingPrompt(null);
                            if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && editingPrompt.text.trim()) {
                              setEditingPrompt(null);
                              void onRegenerateTurn(selectedConversation.id, turn.id, editingPrompt.text);
                            }
                          }}
                          rows={Math.min(10, Math.max(3, editingPrompt.text.split("\n").length + 1))}
                          className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-[14px] leading-6 text-content outline-none focus:border-primary-500 sm:text-[15px]"
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <span className="mr-auto text-[11px] text-content-tertiary">Ctrl+Enter để lưu · Esc để huỷ</span>
                          <Button variant="ghost" size="sm" className="h-8 rounded-lg text-content-secondary" onClick={() => setEditingPrompt(null)}>
                            Huỷ
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                            disabled={!editingPrompt.text.trim()}
                            onClick={() => {
                              setEditingPrompt(null);
                              void onRegenerateTurn(selectedConversation.id, turn.id, editingPrompt.text);
                            }}
                          >
                            Lưu & tạo lại
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-[14px] leading-6 text-content whitespace-pre-wrap break-words sm:text-[15px] sm:leading-7">
                        {turn.prompt}
                      </div>
                    )}
                    {turn.referenceImages.length > 0 ? (
                      <div className="border-t border-border/20 px-4 pb-3 pt-2.5">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">
                          Tham chiếu
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {turn.referenceImages.map((image, index) => (
                            <div key={`${turn.id}-${image.name}-${index}`} className="group/ref relative">
                              <div className="pointer-events-none absolute inset-0 rounded-lg bg-black/0 transition group-hover/ref:bg-black/25" />
                              <button
                                type="button"
                                onClick={() => onOpenLightbox(referenceLightboxImages, index)}
                                className="block max-h-24 max-w-[120px] cursor-zoom-in overflow-hidden rounded-lg bg-surface/50 ring-1 ring-border/40"
                                aria-label={`Xem ảnh tham chiếu ${index + 1}`}
                              >
                                <img
                                  src={image.dataUrl}
                                  alt={image.name || `Ảnh tham chiếu ${index + 1}`}
                                  className="block h-auto max-h-24 w-auto max-w-[120px] object-contain"
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => onContinueEdit(selectedConversation.id, image)}
                                className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] text-white opacity-0 backdrop-blur-sm transition hover:bg-primary-600 group-hover/ref:opacity-100"
                                title="Sửa từ ảnh này"
                              >
                                <Sparkles className="size-2.5" />
                                Sửa
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Metadata */}
                  <div className="mt-1.5 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 px-1 text-[11px] text-content-tertiary">
                    <span>Lần {turnIndex + 1}</span>
                    <span className="text-content-tertiary/50">{META_DOT}</span>
                    <span>{turn.mode === "edit" ? "Chỉnh sửa" : "Tạo từ văn bản"}</span>
                    <span className="text-content-tertiary/50">{META_DOT}</span>
                    <span>{formatConversationTime(turn.createdAt)}</span>
                  </div>

                  {/* Buttons hành động — dòng riêng */}
                  <div className="mt-1 flex items-center justify-end gap-1 px-1">
                    <button
                      type="button"
                      onClick={() => setEditingPrompt({ turnId: turn.id, text: turn.prompt })}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-content-tertiary transition hover:bg-surface-secondary hover:text-content"
                      title="Sửa prompt rồi tạo lại ảnh cho lượt này"
                    >
                      <Pencil className="size-3" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => void onReuseTurnConfig(selectedConversation.id, turn.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-content-tertiary transition hover:bg-surface-secondary hover:text-content"
                      title="Dùng lại trong cuộc hội thoại này"
                    >
                      <Sparkles className="size-3" />
                      Dùng lại
                    </button>
                    <button
                      type="button"
                      onClick={() => void onReuseTurnConfigAsNew(selectedConversation.id, turn.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-content-tertiary transition hover:bg-surface-secondary hover:text-content"
                      title="Dùng lại cho cuộc hội thoại mới"
                    >
                      <Plus className="size-3" />
                      Tạo mới
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePrompt(selectedConversation.id, turn.id)}
                      className="inline-flex size-6 items-center justify-center rounded-md text-content-tertiary transition hover:bg-rose-500/10 hover:text-rose-500"
                      aria-label="Xoá Prompt"
                      title="Xoá Prompt"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Results — flat layout bên trái */}
            {!turn.resultsDeleted ? (
              <div className="image-no-select flex flex-col gap-2.5">
                <div
                  className={cn(
                    "relative select-none",
                    displayImages.length + displayImages.filter((img) => removeBgResults[img.id] || img.remove_bg_url).length === 1
                      ? "max-w-lg"
                      : "",
                  )}
                >
                  {totalSlots > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onTurnViewSlotChange(turn.id, viewSlot - 1)}
                        disabled={viewSlot === 0}
                        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 inline-flex size-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/75 disabled:opacity-20"
                        title="Phiên bản cũ hơn"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onTurnViewSlotChange(turn.id, viewSlot + 1)}
                        disabled={isViewingCurrent}
                        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 inline-flex size-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/75 disabled:opacity-20"
                        title="Phiên bản mới hơn"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </>
                  ) : null}

                  {isLive && !isViewingCurrent ? (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                      <div className="rounded-full bg-black/60 p-3 shadow-lg backdrop-blur-sm">
                        <LoaderCircle className="size-5 animate-spin text-white" />
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      "gap-2 sm:gap-3 [&>*]:mb-2 sm:[&>*]:mb-3 [&>*]:break-inside-avoid",
                      displayImages.length + displayImages.filter((img) => removeBgResults[img.id] || img.remove_bg_url).length === 1
                        ? "columns-1"
                        : "columns-2 sm:columns-3",
                    )}
                  >
                    {displayImages.flatMap((image, index) => {
                      const imageSrc = image.status === "success" ? getStoredImageSrc(image) : "";
                      const placeholderAspect = getAspectClass(turn.size);
                      const removeBgSrc = removeBgResults[image.id] || image.remove_bg_url;

                      if (image.status === "success" && imageSrc) {
                        const currentIndex = successfulTurnImages.findIndex((item) => item.id === image.id);
                        const originalCard = (
                          <div
                            key={image.id}
                            className="group/img relative inline-block w-full overflow-hidden rounded-xl bg-surface-secondary"
                          >
                            <button
                              type="button"
                              onClick={() => onOpenLightbox(successfulTurnImages, currentIndex, totalSlots > 1 ? turn.id : undefined)}
                              className="block w-full cursor-zoom-in"
                              aria-label={`Xem ảnh ${index + 1}`}
                            >
                              <img
                                src={imageSrc}
                                alt={`Generated result ${index + 1}`}
                                className="block h-auto w-full select-none transition duration-300 group-hover/img:scale-[1.02]"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                onMouseDown={(e) => e.preventDefault()}
                                onLoad={(event) => {
                                  updateImageDimensions(
                                    image.id,
                                    event.currentTarget.naturalWidth,
                                    event.currentTarget.naturalHeight,
                                  );
                                }}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => onContinueEdit(selectedConversation.id, image)}
                              className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md bg-black/55 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/70 group-hover/img:opacity-100"
                              title="Tiếp tục chỉnh sửa"
                              aria-label="Tiếp tục chỉnh sửa"
                            >
                              <Sparkles className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRemoveBg(image.id, imageSrc, selectedConversation.id, turn.id);
                              }}
                              disabled={removingBgIds.has(image.id)}
                              className="absolute right-2 top-10 inline-flex size-7 items-center justify-center rounded-md bg-black/55 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/70 group-hover/img:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Xóa nền ảnh (Pixelcut)"
                              aria-label="Xóa nền ảnh"
                            >
                              {removingBgIds.has(image.id) ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                              ) : (
                                <Scissors className="size-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(imageSrc, `image-${image.id}.png`);
                              }}
                              className="absolute right-2 top-[4.5rem] inline-flex size-7 items-center justify-center rounded-md bg-black/55 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/70 group-hover/img:opacity-100"
                              title="Tải xuống ảnh"
                              aria-label="Tải xuống ảnh"
                            >
                              <Download className="size-3.5" />
                            </button>
                          </div>
                        );

                        if (removeBgSrc) {
                          const removeBgCard = (
                            <div
                              key={`removebg-${image.id}`}
                              className="group/removebg relative inline-block w-full overflow-hidden rounded-xl"
                              style={{
                                backgroundImage:
                                  "linear-gradient(45deg,#d0d0d0 25%,transparent 25%),linear-gradient(-45deg,#d0d0d0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d0d0d0 75%),linear-gradient(-45deg,transparent 75%,#d0d0d0 75%)",
                                backgroundSize: "16px 16px",
                                backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
                                backgroundColor: "#f5f5f5",
                              }}
                            >
                              <img
                                src={removeBgSrc}
                                alt="Đã xóa nền"
                                className="block h-auto w-full select-none"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                onMouseDown={(e) => e.preventDefault()}
                              />
                              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 transition group-hover/removebg:opacity-100">
                                <span className="rounded-md bg-black/50 px-2 py-1 text-[11px] text-white/90 backdrop-blur-sm">
                                  Đã xóa nền
                                </span>
                                <button
                                  type="button"
                                  onClick={() => downloadFile(removeBgSrc, `nobg-${image.id}.png`)}
                                  className="inline-flex size-7 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70"
                                  title="Tải xuống ảnh đã xóa nền"
                                  aria-label="Tải xuống"
                                >
                                  <Download className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                          return [originalCard, removeBgCard];
                        }

                        return [originalCard];
                      }

                      if (image.status === "error") {
                        const isTimeoutError = image.error?.includes("超时") && image.taskId;
                        return [
                          <div
                            key={image.id}
                            className={cn(
                              "flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-rose-50/70 px-3 text-center",
                              placeholderAspect,
                            )}
                          >
                            <span className="line-clamp-3 text-[11px] leading-4 text-rose-700">
                              {image.error || "Tạo thất bại"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isTimeoutError && (
                                <button
                                  type="button"
                                  onClick={() => void onTimeoutRetryContinue(image.taskId!)}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-200"
                                >
                                  Tiếp tục chờ
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void onRetryImage(selectedConversation.id, turn.id, image.id)}
                                className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-rose-600 shadow-sm transition hover:bg-surface-secondary"
                              >
                                <RotateCcw className="size-3" />
                                Thử lại
                              </button>
                            </div>
                          </div>,
                        ];
                      }

                      const prevRevImages = revisions.length > 0 ? revisions[revisions.length - 1] : null;
                      const prevImg = prevRevImages?.[index];
                      const prevSrc = prevImg ? getStoredImageSrc(prevImg) : "";

                      if (turn.status === "generating" && prevSrc) {
                        return [
                          <div key={image.id} className="relative inline-block w-full overflow-hidden rounded-xl">
                            <img src={prevSrc} alt="" className="block h-auto w-full select-none" draggable={false} />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <img src="/loading-snail.png" alt="Đang tạo ảnh..." className="w-32 drop-shadow-lg" draggable={false} />
                            </div>
                          </div>,
                        ];
                      }

                      const imageTaskStatus = image.taskStatus || (turn.status === "queued" ? "queued" : "running");
                      const imageStatusLabel = imageTaskStatus === "queued" ? "Chờ xử lý" : getProgressLabel(image.progress);
                      const showElapsed = imageTaskStatus === "running" && image.elapsedSecs != null;
                      const elapsedDisplay = showElapsed
                        ? formatElapsed(
                            image.elapsedUpdatedAt != null
                              ? image.elapsedSecs! + (currentTime - image.elapsedUpdatedAt!) / 1000
                              : image.elapsedSecs!,
                          )
                        : null;
                      return [
                        <div key={image.id} className={cn("flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-surface-secondary text-content-tertiary", placeholderAspect)}>
                          {imageTaskStatus === "queued" ? (
                            <Clock3 className="size-5" />
                          ) : (
                            <LoaderCircle className="size-5 animate-spin" />
                          )}
                          <p className="text-[11px] font-medium leading-4">Ảnh {index + 1}/{turn.images.length}</p>
                          <p className="text-[10px] leading-4 text-content-tertiary/80">{imageStatusLabel}</p>
                          {elapsedDisplay != null && (
                            <p className="text-[10px] text-content-tertiary/60">{elapsedDisplay}</p>
                          )}
                        </div>,
                      ];
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-[11px] text-content-tertiary">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("size-1.5 shrink-0 rounded-full", getStatusDotColor(isViewingCurrent ? turn.status : "success"))} />
                    <span>{getTurnStatusLabel(isViewingCurrent ? turn.status : "success")}</span>
                  </span>
                  <span className="text-content-tertiary/50">{META_DOT}</span>
                  <span>{turn.count} ảnh</span>
                  {turn.size ? (
                    <>
                      <span className="text-content-tertiary/50">{META_DOT}</span>
                      <span>{turn.size}</span>
                    </>
                  ) : null}
                  {turn.status === "queued" && isViewingCurrent ? (
                    <span className="ml-2 italic text-content-tertiary/80">chờ các công việc trước</span>
                  ) : null}
                </div>

                {totalSlots > 1 ? (
                  <div className="text-center text-[11px] tabular-nums text-content-tertiary">
                    Phiên bản {viewSlot + 1} / {totalSlots}
                    {isLive && isViewingCurrent ? <span className="ml-1 animate-pulse">• đang tạo…</span> : null}
                  </div>
                ) : null}

                {turn.status === "error" && turn.error ? (
                  <div className="rounded-lg bg-rose-50/70 px-3 py-2 text-xs leading-5 text-rose-700">
                    {turn.error}
                  </div>
                ) : null}

                <div className="flex items-center gap-1.5 px-1 text-[11px] text-content-tertiary">
                  <button
                    type="button"
                    onClick={() => void onRegenerateTurn(selectedConversation.id, turn.id)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition hover:bg-surface-secondary hover:text-content"
                  >
                    <RotateCcw className="size-3" />
                    <span>Tạo lại</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteResults(selectedConversation.id, turn.id)}
                    className="inline-flex size-5 items-center justify-center rounded-md transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Xoá kết quả"
                    title="Xoá kết quả"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      <PixelcutAuthDialog
        open={showPixelcutAuth}
        onOpenChange={setShowPixelcutAuth}
        onAuthSaved={(idToken, orgId, refreshToken) => void handlePixelcutAuthSaved(idToken, orgId, refreshToken)}
      />
    </div>
  );
}

function downloadFile(src: string, filename: string) {
  let href: string;
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    // data URL / blob URL — tải xuống trực tiếp
    href = src;
  } else {
    // URL file trên server — dùng endpoint /api/download-image để browser tải xuống thay vì mở tab
    const path = src.startsWith("http") ? new URL(src).pathname : src;
    href = `/api/download-image?path=${encodeURIComponent(path)}&filename=${encodeURIComponent(filename)}`;
  }
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 1000);
}

function getTurnStatusLabel(status: ImageTurnStatus) {
  if (status === "queued") {
    return "Chờ xử lý";
  }
  if (status === "generating") {
    return "Đang xử lý";
  }
  if (status === "success") {
    return "Hoàn thành";
  }
  return "Thất bại";
}

const LazyImage = memo(function LazyImage({ src, alt, className, onLoad, onOpen }: {
  src: string;
  alt: string;
  className: string;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onOpen?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="relative">
      {isVisible ? (
        <button
          type="button"
          onClick={onOpen}
          className={className}
        >
          <img
            src={src}
            alt={alt}
            className="block h-full w-full object-cover transition duration-200 group-hover:brightness-90 sm:h-auto sm:object-contain"
            onLoad={onLoad}
          />
        </button>
      ) : (
        <div className={`animate-pulse rounded-xl bg-stone-100 min-h-[200px] sm:min-h-[280px] ${className}`} />
      )}
    </div>
  );
});
