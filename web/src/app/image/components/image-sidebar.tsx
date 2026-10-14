"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, MessageSquarePlus, Pencil, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getImageConversationStats, type ImageConversation } from "@/store/image-conversations";

type ImageSidebarProps = {
  conversations: ImageConversation[];
  isLoadingHistory: boolean;
  selectedConversationId: string | null;
  onCreateDraft: () => void;
  onClearHistory: () => void | Promise<void>;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void | Promise<void>;
  onRenameConversation: (id: string, title: string) => void | Promise<void>;
  formatConversationTime: (value: string) => string;
  hideActionButtons?: boolean;
};

export function ImageSidebar({
  conversations,
  isLoadingHistory,
  selectedConversationId,
  onCreateDraft,
  onClearHistory,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  formatConversationTime,
  hideActionButtons = false,
}: ImageSidebarProps) {
  // Search state (from local)
  const [query, setQuery] = useState("");

  // Rename state (from upstream)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : conversations;

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startRename = useCallback((conversation: ImageConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  }, []);

  const commitRename = useCallback(() => {
    const trimmed = editingTitle.trim();
    if (editingId && trimmed) {
      void onRenameConversation(editingId, trimmed);
    }
    setEditingId(null);
    setEditingTitle("");
  }, [editingId, editingTitle, onRenameConversation]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditingTitle("");
  }, []);

  return (
    <aside className="h-full min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col gap-2 py-1 sm:gap-3 sm:py-2">
        {!hideActionButtons && (
          <div className="flex items-center gap-2">
            <Button className="h-10 flex-1 rounded-xl bg-primary-600 text-white hover:bg-primary-700" onClick={onCreateDraft}>
              <MessageSquarePlus className="size-4" />
              Cuộc trò chuyện mới
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-xl border-border bg-surface/85 px-3 text-content-secondary hover:bg-surface"
              onClick={() => void onClearHistory()}
              disabled={conversations.length === 0}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}

        {/* Ô tìm kiếm */}
        {!isLoadingHistory && conversations.length > 0 && (
          <div className="relative px-0.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-content-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="h-8 w-full rounded-lg border border-border bg-surface/70 pl-8 pr-7 text-xs text-content placeholder:text-content-tertiary focus:outline-none focus:ring-1 focus:ring-primary-500/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content"
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto flex flex-col gap-1 px-0.5 [scrollbar-color:rgba(120,113,108,.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-400/45 [&::-webkit-scrollbar-track]:bg-transparent",
            hideActionButtons ? "pr-0.5" : "pr-1",
          )}
        >
          {isLoadingHistory ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-content-tertiary">
              <LoaderCircle className="size-4 animate-spin" />
              Đang tải bản ghi cuộc trò chuyện
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-2 py-3 text-sm leading-6 text-content-tertiary">Chưa có bản ghi ảnh nào, sẽ hiển thị ở đây sau khi nhập dấu nhắc.</div>
          ) : filtered.length === 0 ? (
            <div className="px-2 py-3 text-sm leading-6 text-content-tertiary">
              Không tìm thấy cuộc trò chuyện nào khớp với &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((conversation) => {
              const active = conversation.id === selectedConversationId;
              const stats = getImageConversationStats(conversation);
              const isRunning = stats.running > 0;
              const isQueued = !isRunning && stats.queued > 0;
              const isProcessing = isRunning || isQueued;

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative w-full rounded-xl text-left transition-colors",
                    hideActionButtons ? "px-4 py-3.5" : "px-3 py-2.5",
                    // background + ring
                    isRunning
                      ? "bg-blue-500/[0.10] ring-1 ring-blue-500/30 hover:bg-blue-500/[0.15]"
                      : isQueued
                      ? "bg-amber-500/[0.09] ring-1 ring-amber-500/30 hover:bg-amber-500/[0.13]"
                      : active
                      ? "bg-primary-600/[0.13] ring-1 ring-primary-500/40 hover:bg-primary-600/[0.17]"
                      : "bg-surface-secondary/30 ring-1 ring-border/20 hover:bg-surface-secondary/55",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className="block w-full pr-8 text-left"
                  >
                    <div className={cn("line-clamp-2 break-words font-semibold", hideActionButtons ? "text-base" : "text-sm")}>
                      {editingId === conversation.id ? (
                        <input
                          ref={editInputRef}
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded border border-border-secondary bg-surface px-1 py-0.5 text-sm outline-none focus:border-primary-500"
                        />
                      ) : (
                        <span className="truncate">{conversation.title}</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-content-tertiary">
                      <span>{conversation.turns.length} lần · {formatConversationTime(conversation.updatedAt)}</span>
                      {isRunning ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] text-blue-400">
                          <LoaderCircle className="size-3 animate-spin" />
                          Đang xử lý {stats.running}
                        </span>
                      ) : stats.queued > 0 ? (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-400">
                          Chờ {stats.queued}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  <div className="absolute top-2.5 right-1.5 flex items-center gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => startRename(conversation, e)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-content-tertiary hover:bg-surface-secondary hover:text-content"
                      aria-label="Đổi tên cuộc trò chuyện"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteConversation(conversation.id)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-content-tertiary hover:bg-surface-secondary hover:text-rose-500"
                      aria-label="Xoá cuộc trò chuyện"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
