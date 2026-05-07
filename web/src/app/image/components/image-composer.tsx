"use client";
import { ArrowUp, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useMemo, useState, type ClipboardEvent, type RefObject } from "react";

import { ImageLightbox } from "@/components/image-lightbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { ImageSizeSelect } from "./image-size-select";

type ImageComposerProps = {
  prompt: string;
  imageCount: string;
  imageSize: string;
  availableQuota: string;
  activeTaskCount: number;
  referenceImages: Array<{ name: string; dataUrl: string }>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPromptChange: (value: string) => void;
  onImageCountChange: (value: string) => void;
  onImageSizeChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  onPickReferenceImage: () => void;
  onReferenceImageChange: (files: File[]) => void | Promise<void>;
  onRemoveReferenceImage: (index: number) => void;
};

export function ImageComposer({
  prompt,
  imageCount,
  imageSize,
  availableQuota,
  activeTaskCount,
  referenceImages,
  textareaRef,
  fileInputRef,
  onPromptChange,
  onImageCountChange,
  onImageSizeChange,
  onSubmit,
  onPickReferenceImage,
  onReferenceImageChange,
  onRemoveReferenceImage,
}: ImageComposerProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const lightboxImages = useMemo(
    () => referenceImages.map((image, index) => ({ id: `${image.name}-${index}`, src: image.dataUrl })),
    [referenceImages],
  );

  const handleTextareaPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();
    void onReferenceImageChange(imageFiles);
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void onReferenceImageChange(Array.from(event.target.files || []));
        }}
      />

      {referenceImages.length > 0 ? (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 sm:mb-3 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {referenceImages.map((image, index) => (
            <div key={`${image.name}-${index}`} className="relative size-14 shrink-0 sm:size-16">
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
                className="group size-14 overflow-hidden rounded-xl border border-border bg-surface-secondary transition hover:border-border sm:size-16"
                aria-label={`Xem trước ảnh tham chiếu ${image.name || index + 1}`}
              >
                <img
                  src={image.dataUrl}
                  alt={image.name || `Ảnh tham chiếu ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveReferenceImage(index);
                }}
                className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full border border-border bg-surface text-content-tertiary transition hover:border-border hover:text-content"
                aria-label={`Xoá ảnh tham chiếu ${image.name || index + 1}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div
          className="relative cursor-text"
          onClick={() => {
            textareaRef.current?.focus();
          }}
        >
            <ImageLightbox
              images={lightboxImages}
              currentIndex={lightboxIndex}
              open={lightboxOpen}
              onOpenChange={setLightboxOpen}
              onIndexChange={setLightboxIndex}
            />
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              onPaste={handleTextareaPaste}
              placeholder={
                referenceImages.length > 0
                  ? "Mô tả cách bạn muốn sửa đổi ảnh tham chiếu"
                  : "Nhập cảnh bạn muốn tạo, hoặc dán ảnh trực tiếp"
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void onSubmit();
                }
              }}
              className="min-h-[80px] resize-none rounded-none border-0 bg-transparent px-4 pt-3 pb-2 text-[15px] leading-6 text-content shadow-none placeholder:text-content-tertiary focus-visible:ring-0 sm:min-h-[100px] sm:px-5 sm:pt-4 sm:leading-7"
            />

            <div className="border-t border-border bg-surface-secondary/40 px-3 py-2.5 sm:px-4 sm:py-3" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-end justify-between gap-2 sm:gap-3">
                <div className="hide-scrollbar flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:pb-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 shrink-0 rounded-lg border-border bg-surface px-3 text-xs font-medium text-content shadow-none sm:text-sm"
                    onClick={onPickReferenceImage}
                  >
                    <ImagePlus className="size-3.5 sm:size-4" />
                    <span>{referenceImages.length > 0 ? "Thêm ảnh tham chiếu" : "Tải lên"}</span>
                  </Button>
                  <div className="shrink-0 rounded-md bg-surface-tertiary px-2 py-1.5 text-[11px] font-medium text-content-secondary sm:text-xs">
                    <span className="hidden sm:inline">Còn lại </span>{availableQuota}
                  </div>
                  {activeTaskCount > 0 && (
                    <div className="flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-700 sm:gap-1.5 sm:text-xs">
                      <LoaderCircle className="size-3 animate-spin" />
                      {activeTaskCount}<span className="hidden sm:inline"> đang xử lý</span>
                    </div>
                  )}
                  <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 sm:gap-2 sm:px-3">
                    <span className="text-[11px] font-medium text-content sm:text-sm">Số lượng</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="100"
                      step="1"
                      value={imageCount}
                      onChange={(event) => onImageCountChange(event.target.value)}
                      className="h-7 w-[40px] border-0 bg-transparent px-0 text-center text-xs font-medium text-content shadow-none focus-visible:ring-0 sm:w-[60px] sm:text-sm"
                    />
                  </div>
                  <ImageSizeSelect
                    value={imageSize}
                    onChange={onImageSizeChange}
                    variant="composer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void onSubmit()}
                  disabled={!prompt.trim()}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-surface-tertiary sm:size-10"
                  aria-label={referenceImages.length > 0 ? "Chỉnh sửa ảnh" : "Tạo ảnh"}
                >
                  <ArrowUp className="size-3.5 sm:size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
