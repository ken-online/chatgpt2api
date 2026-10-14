"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, History, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ImageComposer } from "@/app/image/components/image-composer";
import { ImageResults, type ImageLightboxItem } from "@/app/image/components/image-results";
import { ImageSidebar } from "@/app/image/components/image-sidebar";
import { usePageHeaderActions } from "@/components/app-shell/page-header-context";
import { ImageLightbox } from "@/components/image-lightbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createImageEditTask,
  createImageGenerationTask,
  deleteImages,
  fetchAccounts,
  fetchModels,
  fetchImageTasks,
  resumeImagePoll,
  type Account,
  type ImageModel,
  type Model,
  type ImageTask,
} from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useSettingsStore } from "@/app/settings/store";
import {
  clearImageConversations,
  deleteImageConversation,
  getImageConversationStats,
  listImageConversations,
  renameImageConversation,
  saveImageConversation,
  saveImageConversations,
  type ImageConversation,
  type ImageConversationMode,
  type ImageTurn,
  type ImageTurnStatus,
  type StoredImage,
  type StoredReferenceImage,
} from "@/store/image-conversations";

const ACTIVE_CONVERSATION_STORAGE_KEY = "chatgpt2api:image_active_conversation_id";
const IMAGE_RATIO_STORAGE_KEY = "chatgpt2api:image_last_ratio";
const IMAGE_TIER_STORAGE_KEY = "chatgpt2api:image_last_tier";
const IMAGE_QUALITY_STORAGE_KEY = "chatgpt2api:image_last_quality";
const IMAGE_MODEL_STORAGE_KEY = "chatgpt2api:image_last_model";
const IMAGE_COUNT_STORAGE_KEY = "chatgpt2api:image_last_count";
const SCROLL_POSITIONS_STORAGE_KEY = "chatgpt2api:image_scroll_positions";
const SCROLL_TO_LATEST_THRESHOLD = 160;

function loadScrollPositions(): Map<string, number> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.sessionStorage.getItem(SCROLL_POSITIONS_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, number>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

function saveScrollPositions(positions: Map<string, number>) {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, number> = {};
    positions.forEach((value, key) => { obj[key] = value; });
    window.sessionStorage.setItem(SCROLL_POSITIONS_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // sessionStorage may be full or unavailable
  }
}

function clampImageCount(value: string) {
  return String(Math.min(100, Math.max(1, Math.floor(Number(value) || 1))));
}
function parseImageSize(size: string) {
  const match = size.match(/^(\d+)x(\d+)$/);
  return match ? { width: match[1], height: match[2] } : { width: "1024", height: "1024" };
}

const activeConversationQueueIds = new Set<string>();
let pollAbortController: AbortController | null = null;

function getResultsDistanceFromBottom(element: HTMLElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight;
}

function buildConversationTitle(prompt: string) {
  return prompt.trim();
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAvailableQuota(accounts: Account[]) {
  const availableAccounts = accounts.filter((account) => account.status !== "禁用");
  return String(availableAccounts.reduce((sum, account) => sum + Math.max(0, account.quota), 0));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc ảnh tham chiếu"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, fileName: string, mimeType?: string) {
  const [header, content] = dataUrl.split(",", 2);
  const matchedMimeType = header.match(/data:(.*?);base64/)?.[1];
  const binary = atob(content || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mimeType || matchedMimeType || "image/png" });
}

function filterImageModels(items: Model[]): ImageModel[] {
  return items
    .map((item) => String(item.id || "").trim())
    .filter((id, index, list) => id.toLowerCase().includes("image") && list.indexOf(id) === index);
}

function normalizeStoredImageModel(value: string | null, availableModels: ImageModel[]): ImageModel {
  const normalized = String(value || "").trim();
  if (normalized && availableModels.includes(normalized)) {
    return normalized;
  }
  return availableModels[0] || "gpt-image-2";
}

function buildReferenceImageFromResult(image: StoredImage, fileName: string): StoredReferenceImage | null {
  if (!image.b64_json) {
    return null;
  }

  return {
    name: fileName,
    type: "image/png",
    dataUrl: `data:image/png;base64,${image.b64_json}`,
  };
}

async function fetchImageAsFile(url: string, fileName: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Không thể đọc ảnh kết quả");
  }
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/png" });
}

async function buildReferenceImageFromStoredImage(image: StoredImage, fileName: string) {
  const direct = buildReferenceImageFromResult(image, fileName);
  if (direct) {
    return {
      referenceImage: direct,
      file: dataUrlToFile(direct.dataUrl, direct.name, direct.type),
    };
  }

  if (!image.url) {
    return null;
  }
  const file = await fetchImageAsFile(image.url, fileName);
  return {
    referenceImage: {
      name: file.name,
      type: file.type || "image/png",
      dataUrl: await readFileAsDataUrl(file),
    },
    file,
  };
}

function taskDataToStoredImage(image: StoredImage, task: ImageTask): StoredImage {
  if (task.status === "success") {
    const first = task.data?.[0];
    if (!first?.b64_json && !first?.url) {
      return {
        ...image,
        taskId: task.id,
        status: "error",
        taskStatus: undefined,
        progress: undefined,
        error: "Không nhận được dữ liệu ảnh",
      };
    }
    return {
      ...image,
      taskId: task.id,
      status: "success",
      taskStatus: undefined,
      progress: undefined,
      b64_json: first.b64_json,
      url: first.url,
      revised_prompt: first.revised_prompt,
      error: undefined,
      durationMs: task.duration_ms,
    };
  }

  if (task.status === "error") {
    return {
      ...image,
      taskId: task.id,
      status: "error",
      taskStatus: undefined,
      progress: undefined,
      error: task.error || "Tạo thất bại",
      durationMs: task.duration_ms,
    };
  }

  const newTaskStatus = task.status === "queued" ? "queued" : task.status === "running" ? "running" : image.taskStatus;
  const shouldSetStartTime = newTaskStatus === "running" && !image.startTime;
  const startTime = shouldSetStartTime ? Date.now() : image.startTime;
  // elapsedSecs chỉ sử dụng giá trị trả về từ backend, đảm bảo tính thời gian từ image_stream_resolve_start
  const elapsedSecs =
    newTaskStatus === "running" && typeof task.elapsed_secs === "number"
      ? task.elapsed_secs
      : undefined;

  return {
    ...image,
    taskId: task.id,
    status: "loading",
    taskStatus: newTaskStatus,
    progress: task.progress || image.progress,
    error: undefined,
    startTime,
    elapsedSecs,
    elapsedUpdatedAt: elapsedSecs != null ? Date.now() : undefined,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pickFallbackConversationId(conversations: ImageConversation[]) {
  const activeConversation = conversations.find((conversation) =>
    conversation.turns.some((turn) => turn.status === "queued" || turn.status === "generating"),
  );
  return activeConversation?.id ?? conversations[0]?.id ?? null;
}

function sortImageConversations(conversations: ImageConversation[]) {
  return [...conversations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function toServerImagePath(raw: string): string | null {
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, window.location.origin);
    if (url.pathname.startsWith("/images/")) {
      return url.pathname;
    }
    const downloadPath = url.searchParams.get("path");
    if (downloadPath?.startsWith("/images/")) {
      return downloadPath;
    }
    return null;
  } catch {
    return raw.startsWith("/images/") ? raw : null;
  }
}

function deriveTurnStatus(turn: ImageTurn): Pick<ImageTurn, "status" | "error"> {
  const loadingCount = turn.images.filter((image) => image.status === "loading").length;
  const failedCount = turn.images.filter((image) => image.status === "error").length;
  const successCount = turn.images.filter((image) => image.status === "success").length;
  if (loadingCount > 0) {
    // Nếu bất kỳ ảnh nào có taskStatus là running, thì trạng thái là generating
    const hasRunning = turn.images.some((image) => image.taskStatus === "running");
    if (hasRunning) {
      return { status: "generating", error: undefined };
    }
    return { status: turn.status === "queued" ? "queued" : "generating", error: undefined };
  }
  if (failedCount > 0) {
    return { status: "error", error: `Trong đó ${failedCount} ảnh chưa tạo thành công` };
  }
  if (successCount > 0) {
    return { status: "success", error: undefined };
  }
  // Tất cả ảnh đều bị bỏ qua (images trống), coi là hoàn thành
  return { status: "success", error: undefined };
}

function finalizeIdleQueuedTurn(turn: ImageTurn): ImageTurn {
  if (
    (turn.status !== "queued" && turn.status !== "generating") ||
    turn.images.some((image) => image.status === "loading")
  ) {
    return turn;
  }
  const derived = deriveTurnStatus(turn);
  if (derived.status === turn.status && derived.error === turn.error) {
    return turn;
  }
  return {
    ...turn,
    ...derived,
  };
}

async function syncConversationImageTasks(items: ImageConversation[]) {
  const taskIds = Array.from(
    new Set(
      items.flatMap((conversation) =>
        conversation.turns.flatMap((turn) =>
          turn.resultsDeleted
            ? []
            : turn.images.flatMap((image) =>
                (image.status === "loading" || (image.status === "error" && image.taskId))
                  ? [image.taskId!]
                  : [],
              ),
        ),
      ),
    ),
  );
  if (taskIds.length === 0) {
    return items;
  }

  let taskList: Awaited<ReturnType<typeof fetchImageTasks>>;
  try {
    taskList = await fetchImageTasks(taskIds);
  } catch {
    return items;
  }
  const taskMap = new Map(taskList.items.map((task) => [task.id, task]));
  let changed = false;
  const normalized = items.map((conversation) => {
    const turns = conversation.turns.map((turn) => {
      let turnChanged = false;
      const images = turn.images.map((image) => {
        if (!image.taskId) {
          return image;
        }
        if (image.status !== "loading" && image.status !== "error") {
          return image;
        }
        const task = taskMap.get(image.taskId);
        if (!task) {
          return image;
        }
        const nextImage = taskDataToStoredImage(image, task);
        if (nextImage !== image) {
          turnChanged = true;
        }
        return nextImage;
      });
      if (!turnChanged) {
        return turn;
      }
      changed = true;
      const derived = deriveTurnStatus({ ...turn, images });
      return {
        ...turn,
        ...derived,
        images,
      };
    });
    if (turns === conversation.turns || !turns.some((turn, index) => turn !== conversation.turns[index])) {
      return conversation;
    }
    return {
      ...conversation,
      turns,
      updatedAt: new Date().toISOString(),
    };
  });

  if (changed) {
    await saveImageConversations(normalized);
  }
  return normalized;
}

async function recoverConversationHistory(items: ImageConversation[]) {
  let changed = false;
  const normalized = items.map((conversation) => {
    const turns = conversation.turns.map((turn) => {
      if (turn.status !== "queued" && turn.status !== "generating" && turn.status !== "error") {
        return turn;
      }

      let turnChanged = false;
      const images = turn.images.map((image) => {
        if (image.status !== "loading" || image.taskId) {
          return image;
        }
        turnChanged = true;
        return {
          ...image,
          status: "error" as const,
          error: "Trang được làm mới hoặc tác vụ bị gián đoạn, không tìm thấy ID tác vụ có thể khôi phục",
        };
      });
      const candidateTurn = turnChanged ? { ...turn, images } : turn;
      const nextTurn = finalizeIdleQueuedTurn(candidateTurn);
      const derived = turnChanged ? deriveTurnStatus(nextTurn) : { status: nextTurn.status, error: nextTurn.error };
      if (!turnChanged && nextTurn === turn && derived.status === turn.status && derived.error === turn.error) {
        return turn;
      }
      changed = true;
      return {
        ...nextTurn,
        ...derived,
      };
    });

    if (!turns.some((turn, index) => turn !== conversation.turns[index])) {
      return conversation;
    }

    return {
      ...conversation,
      turns,
      updatedAt: new Date().toISOString(),
    };
  });

  if (changed) {
    await saveImageConversations(normalized);
  }

  return syncConversationImageTasks(normalized);
}


function ImagePageContent({ isAdmin }: { isAdmin: boolean }) {
  const { setActions } = usePageHeaderActions();
  const didLoadQuotaRef = useRef(false);
  const conversationsRef = useRef<ImageConversation[]>([]);
  const loadCancelledRef = useRef(false);
  const resultsViewportRef = useRef<HTMLDivElement>(null);
  const lastConversationIdRef = useRef<string | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollPositionsRef = useRef<Map<string, number>>(loadScrollPositions());
  const isRestoringScrollRef = useRef(false);
  const scrollRestoreGenerationRef = useRef(0);

  const config = useSettingsStore((state) => state.config);
  const imageTimeoutRetrySecs = Number(config?.image_timeout_retry_secs || 30);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageCount, setImageCount] = useState("3");
  const [imageRatio, setImageRatio] = useState("auto");
  const [imageTier, setImageTier] = useState("1k");
  const [imageWidth, setImageWidth] = useState("1024");
  const [imageHeight, setImageHeight] = useState("1024");
  const [imageQuality, setImageQuality] = useState("auto");
  const [imageModel, setImageModel] = useState<ImageModel>("gpt-image-2");
  const [imageModels, setImageModels] = useState<ImageModel[]>(["gpt-image-2"]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [referenceImageFiles, setReferenceImageFiles] = useState<File[]>([]);
  const [referenceImages, setReferenceImages] = useState<StoredReferenceImage[]>([]);
  const [conversations, setConversations] = useState<ImageConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [availableQuota, setAvailableQuota] = useState("Đang tải...");
  const [lightboxImages, setLightboxImages] = useState<ImageLightboxItem[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxTurnId, setLightboxTurnId] = useState<string | null>(null);
  const [turnRevisions, setTurnRevisions] = useState<Record<string, StoredImage[][]>>({});
  const [turnViewSlot, setTurnViewSlot] = useState<Record<string, number>>({});
  const turnRevisionsRef = useRef<Record<string, StoredImage[][]>>({});
  const [removeBgResults, setRemoveBgResults] = useState<Record<string, string>>({});
  const scrollToLatestBtnRef = useRef<HTMLButtonElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<
    | { type: "one"; id: string }
    | { type: "prompt"; conversationId: string; turnId: string }
    | { type: "results"; conversationId: string; turnId: string }
    | { type: "all" }
    | null
  >(null);
  const [timeoutRetry, setTimeoutRetry] = useState<{
    conversationId: string;
    taskId: string;
    taskError: string;
  } | null>(null);

  const parsedCount = useMemo(() => Number(clampImageCount(imageCount)), [imageCount]);
  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );
  const activeTaskCount = useMemo(
    () =>
      conversations.reduce((sum, conversation) => {
        const stats = getImageConversationStats(conversation);
        return sum + stats.queued + stats.running;
      }, 0),
    [conversations],
  );
  const deleteConfirmTitle =
    deleteConfirm?.type === "all"
      ? "Xoá hết lịch sử"
      : deleteConfirm?.type === "prompt"
        ? "Xoá bản ghi Prompt"
        : deleteConfirm?.type === "results"
          ? "Xoá kết quả tạo"
          : deleteConfirm?.type === "one"
            ? "Xoá cuộc trò chuyện ảnh"
            : "";
  const deleteConfirmDescription =
    deleteConfirm?.type === "all"
      ? "Xác nhận xoá tất cả lịch sử ảnh không? Không thể khôi phục sau khi xoá."
      : deleteConfirm?.type === "prompt"
        ? "Xác nhận xoá bản ghi Prompt này không? Kết quả tạo tương ứng sẽ được giữ lại."
        : deleteConfirm?.type === "results"
          ? "Xác nhận xoá kết quả tạo này không? Bản ghi Prompt tương ứng sẽ được giữ lại."
          : deleteConfirm?.type === "one"
            ? "Chọn cách xoá cuộc trò chuyện này. Ảnh đã tạo có thể giữ lại hoặc xoá luôn khỏi máy chủ."
            : "";

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const scrollResultsToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = resultsViewportRef.current;
    if (!element) {
      return;
    }

    shouldStickToBottomRef.current = true;
    const btn = scrollToLatestBtnRef.current;
    if (btn) btn.style.display = "none";
    element.scrollTo({
      top: element.scrollHeight,
      behavior,
    });
  }, []);

  const handleResultsScroll = useCallback(() => {
    if (scrollRafRef.current !== null) {
      return;
    }

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const element = resultsViewportRef.current;
      if (!element) {
        return;
      }

      // Không xử lý sự kiện cuộn trong quá trình khôi phục vị trí cuộn
      if (isRestoringScrollRef.current) {
        return;
      }

      // Lưu vị trí cuộn phiên hiện tại (debounce 300ms ghi vào sessionStorage)
      const convId = lastConversationIdRef.current;
      if (convId) {
        scrollPositionsRef.current.set(convId, element.scrollTop);
        if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = setTimeout(() => {
          scrollSaveTimerRef.current = null;
          saveScrollPositions(scrollPositionsRef.current);
        }, 300);
      }

      const isAwayFromLatest = getResultsDistanceFromBottom(element) > SCROLL_TO_LATEST_THRESHOLD;
      shouldStickToBottomRef.current = !isAwayFromLatest;
      // Trực tiếp thao tác DOM để kiểm soát ẩn/hiển nút, tránh setState kích hoạt re-render toàn component
      const btn = scrollToLatestBtnRef.current;
      if (btn) {
        if (isAwayFromLatest) {
          btn.style.display = "";
        } else {
          btn.style.display = "none";
        }
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
      if (scrollSaveTimerRef.current !== null) {
        clearTimeout(scrollSaveTimerRef.current);
        saveScrollPositions(scrollPositionsRef.current);
      }
    };
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const storedRatio =
        typeof window !== "undefined" ? window.localStorage.getItem(IMAGE_RATIO_STORAGE_KEY) : null;
      const storedTier =
        typeof window !== "undefined" ? window.localStorage.getItem(IMAGE_TIER_STORAGE_KEY) : null;
      const storedQuality =
        typeof window !== "undefined" ? window.localStorage.getItem(IMAGE_QUALITY_STORAGE_KEY) : null;
      const storedCount =
        typeof window !== "undefined" ? window.localStorage.getItem(IMAGE_COUNT_STORAGE_KEY) : null;
      setImageRatio(storedRatio || "1:1");
      setImageTier(storedTier || "1k");
      setImageWidth("1024");
      setImageHeight("1024");
      setImageQuality(storedQuality || "auto");
      setImageCount(storedCount ? clampImageCount(storedCount) : "1");

      const items = await listImageConversations();
      const normalizedItems = await recoverConversationHistory(items);
      if (loadCancelledRef.current) {
        return;
      }

      conversationsRef.current = normalizedItems;
      setConversations(normalizedItems);
      const storedConversationId =
        typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY) : null;
      const nextSelectedConversationId =
        (storedConversationId && normalizedItems.some((conversation) => conversation.id === storedConversationId)
          ? storedConversationId
          : null) ?? pickFallbackConversationId(normalizedItems);
      setSelectedConversationId(nextSelectedConversationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đọc bản ghi phiên";
      toast.error(message);
    } finally {
      if (!loadCancelledRef.current) {
        setIsLoadingHistory(false);
      }
    }
  }, [
    setImageRatio,
    setImageTier,
    setImageWidth,
    setImageHeight,
    setImageQuality,
    setImageCount,
    setConversations,
    setSelectedConversationId,
    setIsLoadingHistory,
  ]);

  // Handle bfcache (back/forward cache) — re-sync task status on page restore
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void loadHistory();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [loadHistory]);

  useEffect(() => {
    loadCancelledRef.current = false;
    void loadHistory();
    return () => {
      loadCancelledRef.current = true;
      // Lưu vị trí cuộn hiện tại vào sessionStorage khi component unmount
      const element = resultsViewportRef.current;
      const convId = lastConversationIdRef.current;
      if (element && convId) {
        scrollPositionsRef.current.set(convId, element.scrollTop);
        saveScrollPositions(scrollPositionsRef.current);
      }
      activeConversationQueueIds.clear();
      if (pollAbortController) {
        pollAbortController.abort();
        pollAbortController = null;
      }
    };
  }, [loadHistory]);

  useEffect(() => {
    let cancelled = false;

    const loadImageModels = async () => {
      try {
        const data = await fetchModels();
        const available = filterImageModels(Array.isArray(data.data) ? data.data : []);
        if (cancelled || available.length === 0) {
          return;
        }
        setImageModels(available);
        const storedModel = typeof window !== "undefined" ? window.localStorage.getItem(IMAGE_MODEL_STORAGE_KEY) : null;
        setImageModel((current) => {
          if (available.includes(current)) {
            return current;
          }
          return normalizeStoredImageModel(storedModel, available);
        });
      } catch {
        if (!cancelled) {
          setImageModels(["gpt-image-2"]);
        }
      }
    };

    void loadImageModels();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadQuota = useCallback(async () => {
    if (!isAdmin) {
      setAvailableQuota("--");
      return;
    }
    try {
      const data = await fetchAccounts();
      setAvailableQuota(formatAvailableQuota(data.items));
    } catch {
      setAvailableQuota((prev) => (prev === "Đang tải..." ? "--" : prev));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (didLoadQuotaRef.current) {
      return;
    }
    didLoadQuotaRef.current = true;

    const handleFocus = () => {
      void loadQuota();
    };

    void loadQuota();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAdmin, loadQuota]);

  // Lưu vị trí cuộn phiên cũ khi chuyển đổi phiên, và ẩn container để tránh nhấp nháy
  useLayoutEffect(() => {
    if (!selectedConversation) {
      lastConversationIdRef.current = null;
      shouldStickToBottomRef.current = true;
      const btn = scrollToLatestBtnRef.current;
      if (btn) btn.style.display = "none";
      return;
    }

    const element = resultsViewportRef.current;
    if (!element) {
      return;
    }

    const didSwitchConversation = lastConversationIdRef.current !== selectedConversation.id;

    if (didSwitchConversation) {
      // Tăng generation để các callback rAF chưa hoàn thành trước đó bị vô hiệu hoá
      scrollRestoreGenerationRef.current += 1;

      // Trước tiên lưu vị trí cuộn phiên cũ (lastConversationIdRef vẫn là giá trị cũ)
      const oldConvId = lastConversationIdRef.current;
      if (oldConvId) {
        scrollPositionsRef.current.set(oldConvId, element.scrollTop);
        saveScrollPositions(scrollPositionsRef.current);
      }
      // Cập nhật thành ID phiên mới
      lastConversationIdRef.current = selectedConversation.id;

      // Nếu có vị trí cuộn đã lưu, ẩn container để tránh người dùng thấy scrollTop=0
      const savedScrollTop = scrollPositionsRef.current.get(selectedConversation.id);
      if (savedScrollTop != null && savedScrollTop > 0) {
        element.style.visibility = "hidden";
        isRestoringScrollRef.current = true;
      }
    }
  }, [selectedConversation?.id]);

  // Khôi phục vị trí cuộn hoặc theo dõi nội dung mới nhất
  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    const element = resultsViewportRef.current;
    if (!element) {
      return;
    }

    const savedScrollTop = scrollPositionsRef.current.get(selectedConversation.id);

    if (savedScrollTop != null && savedScrollTop > 0) {
      // Ghi lại generation hiện tại để phát hiện xem đã bị thay thế bởi chuyển đổi mới
      const generation = scrollRestoreGenerationRef.current;
      // Container đã được đặt visibility:hidden trong useLayoutEffect, người dùng không thể thấy quá trình cuộn
      requestAnimationFrame(() => {
        // Nếu generation đã thay đổi, có nghĩa người dùng lại chuyển đổi, bỏ qua khôi phục lần này
        if (scrollRestoreGenerationRef.current !== generation) return;
        element.scrollTop = savedScrollTop;
        // Chờ thêm một frame để đảm bảo scrollTop có hiệu lực, rồi hiển thị container
        requestAnimationFrame(() => {
          // Kiểm tra lại generation
          if (scrollRestoreGenerationRef.current !== generation) return;
          const isAwayFromLatest = getResultsDistanceFromBottom(element) > SCROLL_TO_LATEST_THRESHOLD;
          shouldStickToBottomRef.current = !isAwayFromLatest;
          const btn = scrollToLatestBtnRef.current;
          if (btn) btn.style.display = isAwayFromLatest ? "" : "none";
          // Hiển thị container — người dùng trực tiếp thấy nội dung đúng vị trí
          element.style.visibility = "";
          isRestoringScrollRef.current = false;
        });
      });
      // Xoá vị trí đã lưu sau khi khôi phục, lần tới khi nội dung cập nhật sẽ theo logic shouldFollowLatest bình thường
      scrollPositionsRef.current.delete(selectedConversation.id);
      return;
    }

    // Không có vị trí đã lưu, xử lý theo logic bình thường
    const shouldFollowLatest =
      shouldStickToBottomRef.current ||
      getResultsDistanceFromBottom(element) <= SCROLL_TO_LATEST_THRESHOLD;

    if (shouldFollowLatest) {
      requestAnimationFrame(() => scrollResultsToLatest("smooth"));
      return;
    }

    const btn = scrollToLatestBtnRef.current;
    if (btn) btn.style.display = "";
  }, [selectedConversation?.id, selectedConversation?.updatedAt, selectedConversation?.turns.length, scrollResultsToLatest]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (selectedConversationId) {
      window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, selectedConversationId);
    } else {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(IMAGE_RATIO_STORAGE_KEY, imageRatio);
    window.localStorage.setItem(IMAGE_TIER_STORAGE_KEY, imageTier);
    window.localStorage.setItem(IMAGE_QUALITY_STORAGE_KEY, imageQuality);
    window.localStorage.setItem(IMAGE_MODEL_STORAGE_KEY, imageModel);
  }, [imageRatio, imageTier, imageQuality, imageModel]);

  useEffect(() => {
    if (typeof window !== "undefined" && parsedCount > 0) {
      window.localStorage.setItem(IMAGE_COUNT_STORAGE_KEY, String(parsedCount));
    }
  }, [parsedCount]);

  useEffect(() => {
    if (selectedConversationId && !conversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(pickFallbackConversationId(conversations));
    }
  }, [conversations, selectedConversationId]);

  const persistConversation = async (conversation: ImageConversation) => {
    const nextConversations = sortImageConversations([
      conversation,
      ...conversationsRef.current.filter((item) => item.id !== conversation.id),
    ]);
    conversationsRef.current = nextConversations;
    setConversations(nextConversations);
    await saveImageConversation(conversation);
  };

  const updateConversation = useCallback(
    async (
      conversationId: string,
      updater: (current: ImageConversation | null) => ImageConversation,
      options: { persist?: boolean } = {},
    ) => {
      const current = conversationsRef.current.find((item) => item.id === conversationId) ?? null;
      const nextConversation = updater(current);
      const nextConversations = sortImageConversations([
        nextConversation,
        ...conversationsRef.current.filter((item) => item.id !== conversationId),
      ]);
      conversationsRef.current = nextConversations;
      setConversations(nextConversations);
      if (options.persist !== false) {
        await saveImageConversation(nextConversation);
      }
    },
    [],
  );

  const clearComposerInputs = useCallback(() => {
    setImagePrompt("");
    setReferenceImageFiles([]);
    setReferenceImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const resetComposer = useCallback(() => {
    clearComposerInputs();
  }, [clearComposerInputs]);

  const handleCreateDraft = useCallback(() => {
    shouldStickToBottomRef.current = true;
    const btn = scrollToLatestBtnRef.current;
    if (btn) btn.style.display = "none";
    setSelectedConversationId(null);
    resetComposer();
    textareaRef.current?.focus();
  }, [resetComposer]);

  const handleDeleteConversation = async (id: string, withImages = false) => {
    const conversation = withImages
      ? conversationsRef.current.find((item) => item.id === id) ?? null
      : null;

    try {
      if (withImages && conversation) {
        const allImages = conversation.turns.flatMap((turn) => [
          ...turn.images,
          ...(turn.revisions ?? []).flat(),
        ]);
        const paths = Array.from(new Set(allImages.flatMap((img) => [
          ...(img.url ? [toServerImagePath(img.url)].filter(Boolean) as string[] : []),
          ...(img.remove_bg_url ? [toServerImagePath(img.remove_bg_url)].filter(Boolean) as string[] : []),
        ])));
        if (paths.length > 0) {
          await deleteImages(paths);
        }
      }
      await deleteImageConversation(id);

      const nextConversations = conversationsRef.current.filter((item) => item.id !== id);
      conversationsRef.current = nextConversations;
      setConversations(nextConversations);
      if (selectedConversationId === id) {
        setSelectedConversationId(pickFallbackConversationId(nextConversations));
        resetComposer();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xoá phiên";
      toast.error(message);
    }
  };

  const handleDeleteTurnPart = async (conversationId: string, turnId: string, part: "prompt" | "results") => {
    const conversation = conversationsRef.current.find((item) => item.id === conversationId);
    if (!conversation) {
      return;
    }

    const turns = conversation.turns
      .map((turn) => {
        if (turn.id !== turnId) {
          return turn;
        }
        const images =
          part === "results"
            ? turn.images.map((image) => ({ id: image.id, status: "error" as const, error: "Kết quả tạo đã bị xoá" }))
            : turn.images;
        const derived =
          part === "results"
            ? deriveTurnStatus({
                ...turn,
                images,
              })
            : { status: turn.status, error: turn.error };
        const nextTurn = {
          ...turn,
          prompt: part === "prompt" ? "" : turn.prompt,
          promptDeleted: part === "prompt" ? true : turn.promptDeleted,
          resultsDeleted: part === "results" ? true : turn.resultsDeleted,
          ...derived,
          images,
        };
        return nextTurn.promptDeleted && nextTurn.resultsDeleted ? null : nextTurn;
      })
      .filter((turn): turn is ImageTurn => Boolean(turn));

    if (turns.length === 0) {
      await handleDeleteConversation(conversationId);
      return;
    }

    const nextConversation = {
      ...conversation,
      updatedAt: new Date().toISOString(),
      turns,
    };
    await persistConversation(nextConversation);
  };

  const handleClearHistory = async () => {
    try {
      await clearImageConversations();
      conversationsRef.current = [];
      setConversations([]);
      setSelectedConversationId(null);
      resetComposer();
      toast.success("Đã xoá hết lịch sử");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xoá hết lịch sử";
      toast.error(message);
    }
  };

  const handleRenameConversation = async (id: string, title: string) => {
    const nextConversations = conversations.map((item) =>
      item.id === id ? { ...item, title, updatedAt: new Date().toISOString() } : item,
    );
    conversationsRef.current = sortImageConversations(nextConversations);
    setConversations(conversationsRef.current);
    try {
      await renameImageConversation(id, title);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đổi tên thất bại";
      toast.error(message);
    }
  };

  const openDeleteConversationConfirm = (id: string) => {
    setIsHistoryOpen(false);
    setDeleteConfirm({ type: "one", id });
  };

  const openDeletePromptConfirm = (conversationId: string, turnId: string) => {
    setDeleteConfirm({ type: "prompt", conversationId, turnId });
  };

  const openDeleteResultsConfirm = (conversationId: string, turnId: string) => {
    setDeleteConfirm({ type: "results", conversationId, turnId });
  };

  const openClearHistoryConfirm = useCallback(() => {
    setIsHistoryOpen(false);
    setDeleteConfirm({ type: "all" });
  }, []);

  useEffect(() => {
    setActions(
      <Button
        className="h-10 rounded-xl bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
        onClick={handleCreateDraft}
      >
        <Plus className="size-4" />
        Tạo mới
      </Button>,
    );
    return () => setActions(null);
  }, [handleCreateDraft, setActions]);

  const handleConfirmDelete = async () => {
    const target = deleteConfirm;
    setDeleteConfirm(null);
    if (!target) {
      return;
    }
    if (target.type === "all") {
      await handleClearHistory();
      return;
    }
    if (target.type === "prompt" || target.type === "results") {
      await handleDeleteTurnPart(target.conversationId, target.turnId, target.type);
      return;
    }
    await handleDeleteConversation(target.id);
  };

  const appendReferenceImages = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    try {
      const previews = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          type: file.type || "image/png",
          dataUrl: await readFileAsDataUrl(file),
        })),
      );

      setReferenceImageFiles((prev) => [...prev, ...files]);
      setReferenceImages((prev) => [...prev, ...previews]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đọc ảnh tham chiếu";
      toast.error(message);
    }
  }, []);

  const handleReferenceImageChange = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      await appendReferenceImages(files);
    },
    [appendReferenceImages],
  );

  const handleRemoveReferenceImage = useCallback((index: number) => {
    setReferenceImageFiles((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      if (next.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return next;
    });
    setReferenceImages((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const handleContinueEdit = useCallback(
    async (conversationId: string, image: StoredImage | StoredReferenceImage) => {
      try {
        const nextReference =
          "dataUrl" in image
            ? {
                referenceImage: image,
                file: dataUrlToFile(image.dataUrl, image.name, image.type),
              }
            : await buildReferenceImageFromStoredImage(image, `conversation-${conversationId}-${Date.now()}.png`);
        if (!nextReference) {
          return;
        }

        setSelectedConversationId(conversationId);

        setReferenceImages((prev) => [...prev, nextReference.referenceImage]);
        setReferenceImageFiles((prev) => [...prev, nextReference.file]);
        setImagePrompt("");
        textareaRef.current?.focus();
        toast.success("Đã thêm ảnh tham chiếu hiện tại, tiếp tục nhập mô tả để chỉnh sửa");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể đọc ảnh kết quả";
        toast.error(message);
      }
    },
    [],
  );

  const handleReuseTurnConfig = useCallback(async (conversationId: string, turnId: string) => {
    const conversation = conversationsRef.current.find((item) => item.id === conversationId);
    const turn = conversation?.turns.find((item) => item.id === turnId);
    if (!conversation || !turn || !turn.prompt.trim()) {
      return;
    }

    setSelectedConversationId(conversationId);
    setImagePrompt(turn.prompt);
    setImageCount(String(Math.max(1, turn.count || turn.images.length || 1)));
    setImageRatio(turn.ratio);
    setImageTier(turn.tier);
    const parsedSize = parseImageSize(turn.size);
    setImageWidth(parsedSize.width);
    setImageHeight(parsedSize.height);
    setImageQuality(turn.quality);
    setImageModel(turn.model);
    setReferenceImages(turn.referenceImages);
    setReferenceImageFiles(
      turn.referenceImages.map((image) => dataUrlToFile(image.dataUrl, image.name, image.type)),
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    textareaRef.current?.focus();
    toast.success("Đã tái sử dụng cấu hình Prompt này");
  }, []);

  const handleReuseTurnConfigAsNew = useCallback(async (conversationId: string, turnId: string) => {
    const conversation = conversationsRef.current.find((item) => item.id === conversationId);
    const turn = conversation?.turns.find((item) => item.id === turnId);
    if (!conversation || !turn || !turn.prompt.trim()) {
      return;
    }

    setSelectedConversationId(null);
    setImagePrompt(turn.prompt);
    setImageCount(String(Math.max(1, turn.count || turn.images.length || 1)));
    setImageRatio(turn.ratio);
    setImageTier(turn.tier);
    const parsedSize = parseImageSize(turn.size);
    setImageWidth(parsedSize.width);
    setImageHeight(parsedSize.height);
    setImageQuality(turn.quality);
    setImageModel(turn.model);
    setReferenceImages(turn.referenceImages);
    setReferenceImageFiles(
      turn.referenceImages.map((image) => dataUrlToFile(image.dataUrl, image.name, image.type)),
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    textareaRef.current?.focus();
    toast.success("Đã tái sử dụng cấu hình cho cuộc hội thoại mới");
  }, []);

  const handleTurnViewSlotChange = useCallback((turnId: string, slot: number) => {
    setTurnViewSlot((prev) => ({ ...prev, [turnId]: slot }));
  }, []);

  const openLightbox = useCallback((images: ImageLightboxItem[], index: number, turnId?: string) => {
    if (images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(Math.max(0, Math.min(index, images.length - 1)));
    setLightboxTurnId(turnId ?? null);
    setLightboxOpen(true);
  }, []);

  const handleLightboxRevisionChange = useCallback((newSlot: number) => {
    const turnId = lightboxTurnId;
    if (!turnId) return;
    handleTurnViewSlotChange(turnId, newSlot);

    // Recompute lightbox images cho slot mới
    const conv = conversationsRef.current.find((c) => c.id === selectedConversationId);
    const turn = conv?.turns.find((t) => t.id === turnId);
    if (!turn) return;
    const revisions = turnRevisionsRef.current[turnId] || [];
    const totalSlots = revisions.length + 1;
    const displayImages = newSlot >= totalSlots - 1 ? turn.images : (revisions[newSlot] ?? turn.images);
    const newImages = displayImages.flatMap((img) => {
      if (img.status !== "success") return [];
      const src = img.b64_json ? `data:image/png;base64,${img.b64_json}` : (img.url || "");
      return src ? [{ id: img.id, src }] : [];
    });
    if (newImages.length > 0) {
      setLightboxImages(newImages);
      setLightboxIndex(0);
    }
  }, [lightboxTurnId, selectedConversationId, handleTurnViewSlotChange]);

  const createLoadingImages = (turnId: string, count: number) =>
    Array.from({ length: count }, (_, index) => {
      const imageId = `${turnId}-${index}`;
      return {
        id: imageId,
        taskId: imageId,
        status: "loading" as const,
      };
    });

  /* eslint-disable react-hooks/preserve-manual-memoization */
  const runConversationQueue = useCallback(
    async (conversationId: string) => {
      if (activeConversationQueueIds.has(conversationId)) {
        return;
      }

      const snapshot = conversationsRef.current.find((conversation) => conversation.id === conversationId);
      const activeTurn = snapshot?.turns.find(
        (turn) =>
          (turn.status === "queued" || turn.status === "generating") &&
          turn.images.some((image) => image.status === "loading"),
      );
      if (!snapshot || !activeTurn) {
        return;
      }

      activeConversationQueueIds.add(conversationId);
      const applyTasks = async (tasks: ImageTask[]) => {
        const taskMap = new Map(tasks.map((task) => [task.id, task]));
        await updateConversation(conversationId, (current) => {
          const conversation = current ?? snapshot;
          const turns = conversation.turns.map((turn) => {
            if (turn.id !== activeTurn.id) {
              return turn;
            }
            const images = turn.images.map((image) => {
              const taskId = image.taskId || image.id;
              const task = taskMap.get(taskId);
              return task ? taskDataToStoredImage({ ...image, taskId }, task) : image;
            });
            const derived = deriveTurnStatus({ ...turn, images });
            return {
              ...turn,
              ...derived,
              images,
            };
          });
          return {
            ...conversation,
            updatedAt: new Date().toISOString(),
            turns,
          };
        });
      };

      try {

        const referenceFiles = activeTurn.referenceImages.map((image, index) =>
          dataUrlToFile(image.dataUrl, image.name || `${activeTurn.id}-${index + 1}.png`, image.type),
        );
        if (activeTurn.mode === "edit" && referenceFiles.length === 0) {
          throw new Error("Không tìm thấy ảnh tham chiếu để tiếp tục chỉnh sửa");
        }

        const pendingImages = activeTurn.images.filter((image) => image.status === "loading");
        const submitted = await Promise.all(
          pendingImages.map((image) => {
            const taskId = image.taskId || image.id;
            return activeTurn.mode === "edit"
              ? createImageEditTask(taskId, referenceFiles, activeTurn.prompt, activeTurn.model, activeTurn.size, activeTurn.quality)
              : createImageGenerationTask(taskId, activeTurn.prompt, activeTurn.model, activeTurn.size, activeTurn.quality);
          }),
        );
        await applyTasks(submitted);

        let consecutiveErrors = 0;
        const retryingTaskIdsRef = new Set<string>();
        while (true) {
          const latestConversation = conversationsRef.current.find((conversation) => conversation.id === conversationId);
          const latestTurn = latestConversation?.turns.find((turn) => turn.id === activeTurn.id);
          const loadingTaskIds =
            latestTurn?.images.flatMap((image) =>
              image.status === "loading" && image.taskId ? [image.taskId] : [],
            ) || [];
          if (loadingTaskIds.length === 0) {
            break;
          }

          await sleep(2000);
          try {
            const taskList = await fetchImageTasks(loadingTaskIds);
            consecutiveErrors = 0;
            if (taskList.items.length > 0) {
              // Phát hiện xem có lỗi timeout và cần hiển thị nút thử lại
              const timeoutTask = taskList.items.find(
                (task) =>
                  task.status === "error" &&
                  task.error?.includes("timeout") &&
                  task.conversation_id &&
                  !retryingTaskIdsRef.has(task.id),
              );
              if (timeoutTask && timeoutTask.conversation_id) {
                retryingTaskIdsRef.add(timeoutTask.id);
                setTimeoutRetry({
                  conversationId: timeoutTask.conversation_id,
                  taskId: timeoutTask.id,
                  taskError: timeoutTask.error || "Tạo ảnh hết thời gian",
                });
                // Áp dụng lỗi timeout cho hình ảnh tương ứng, hiển thị nút tiếp tục chờ
                await applyTasks([timeoutTask]);
              } else {
                await applyTasks(taskList.items);
              }
            }
            if (taskList.missing_ids.length > 0 && latestTurn) {
              const missingImages = latestTurn.images.filter(
                (image) => image.status === "loading" && image.taskId && taskList.missing_ids.includes(image.taskId),
              );
              const resubmitted = await Promise.all(
                missingImages.map((image) =>
                  activeTurn.mode === "edit"
                    ? createImageEditTask(image.taskId || image.id, referenceFiles, activeTurn.prompt, activeTurn.model, activeTurn.size, activeTurn.quality)
                    : createImageGenerationTask(image.taskId || image.id, activeTurn.prompt, activeTurn.model, activeTurn.size, activeTurn.quality),
                ),
              );
              if (resubmitted.length > 0) {
                await applyTasks(resubmitted);
              }
            }
          } catch (pollError) {
            consecutiveErrors += 1;
            if (consecutiveErrors >= 10) {
              throw pollError;
            }
          }
        }

        await loadQuota();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể tạo ảnh";
        await updateConversation(conversationId, (current) => {
          const conversation = current ?? snapshot;
          return {
            ...conversation,
            updatedAt: new Date().toISOString(),
            turns: conversation.turns.map((turn) =>
              turn.id === activeTurn.id
                ? {
                    ...turn,
                    status: "error",
                    error: message,
                    images: turn.images.map((image) =>
                      image.status === "loading" ? { ...image, status: "error", error: message } : image,
                    ),
                  }
                : turn,
            ),
          };
        });
        toast.error(message);
      } finally {
        activeConversationQueueIds.delete(conversationId);
        for (const conversation of conversationsRef.current) {
          if (
            !activeConversationQueueIds.has(conversation.id) &&
            conversation.turns.some(
              (turn) =>
                (turn.status === "queued" || turn.status === "generating") &&
                turn.images.some((image) => image.status === "loading"),
            )
          ) {
            void runConversationQueue(conversation.id);
          }
        }
      }
    },
    [loadQuota, updateConversation],
  );
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const handleRegenerateTurn = useCallback(
    async (conversationId: string, turnId: string) => {
      const conversation = conversationsRef.current.find((item) => item.id === conversationId);
      const sourceTurn = conversation?.turns.find((turn) => turn.id === turnId);
      if (!conversation || !sourceTurn || !sourceTurn.prompt.trim()) {
        return;
      }

      // Lưu ảnh hiện tại vào revisions nếu có ảnh thành công
      const hasSuccess = !sourceTurn.resultsDeleted && sourceTurn.images.some((img) => img.status === "success");
      const prevRevisions = turnRevisionsRef.current[turnId] || [];
      const nextRevisions = hasSuccess ? [...prevRevisions, sourceTurn.images] : prevRevisions;
      if (hasSuccess) {
        turnRevisionsRef.current = { ...turnRevisionsRef.current, [turnId]: nextRevisions };
        setTurnRevisions({ ...turnRevisionsRef.current });
        setTurnViewSlot((prevSlot) => ({ ...prevSlot, [turnId]: nextRevisions.length }));
      }

      const now = new Date().toISOString();
      const count = Math.max(1, sourceTurn.count || sourceTurn.images.length || 1);
      const newImages = Array.from({ length: count }, () => {
        const imageId = createId();
        return { id: imageId, taskId: imageId, status: "loading" as const };
      });
      const nextConversation = {
        ...conversation,
        updatedAt: now,
        turns: conversation.turns.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                images: newImages,
                status: "queued" as const,
                error: undefined,
                revisions: nextRevisions.length > 0 ? nextRevisions : undefined,
              }
            : turn,
        ),
      };

      setSelectedConversationId(conversationId);
      await persistConversation(nextConversation);
      void runConversationQueue(conversationId);
      toast.success("Đang tạo lại ảnh");
    },
    [runConversationQueue],
  );

  const handleRetryImage = useCallback(
    async (conversationId: string, turnId: string, imageId: string) => {
      const conversation = conversationsRef.current.find((item) => item.id === conversationId);
      if (!conversation) {
        return;
      }

      const now = new Date().toISOString();
      const retryImageId = `${turnId}-${createId()}`;
      const nextConversation = {
        ...conversation,
        updatedAt: now,
        turns: conversation.turns.map((turn) => {
          if (turn.id !== turnId) {
            return turn;
          }
          if (!turn.prompt.trim()) {
            return turn;
          }

          const images = turn.images.map((image) =>
            image.id === imageId
              ? {
                  id: retryImageId,
                  taskId: retryImageId,
                  status: "loading" as const,
                }
              : image,
          );
          const derived = deriveTurnStatus({ ...turn, status: "queued", images });
          return {
            ...turn,
            ...derived,
            images,
          };
        }),
      };

      setSelectedConversationId(conversationId);
      await persistConversation(nextConversation);
      void runConversationQueue(conversationId);
    },
    [runConversationQueue],
  );

  const handleTimeoutRetryContinue = useCallback(async () => {
    if (!timeoutRetry) return;
    const { conversationId, taskId } = timeoutRetry;
    try {
      await resumeImagePoll(taskId, imageTimeoutRetrySecs);
      // Đặt lại trạng thái hình ảnh tương ứng thành loading và xoá lỗi
      void updateConversation(conversationId, (current) => {
        const conversation = current ?? conversationsRef.current.find((c) => c.id === conversationId);
        if (!conversation) return current!;
        return {
          ...conversation,
          updatedAt: new Date().toISOString(),
          turns: conversation.turns.map((turn) => {
            const hasLoading = turn.images.some((image) => image.taskId === taskId);
            if (!hasLoading) return turn;
            return {
              ...turn,
              status: "generating" as const,
              error: undefined,
              images: turn.images.map((image) =>
                image.taskId === taskId
                  ? { ...image, status: "loading" as const, error: undefined, taskStatus: "running" as const, startTime: image.startTime || Date.now() }
                  : image
              ),
            };
          }),
        };
      });
      // Xoá trạng thái thử lại
      setTimeoutRetry(null);
      toast.info(`Đã tiếp tục chờ ${imageTimeoutRetrySecs} giây`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tiếp tục polling thất bại";
      toast.error(msg);
      setTimeoutRetry(null);
    }
  }, [timeoutRetry, updateConversation, imageTimeoutRetrySecs]);

  const handleTimeoutRetryCancel = useCallback(() => {
    if (!timeoutRetry) return;
    const { conversationId: convId, taskId, taskError } = timeoutRetry;
    // Áp dụng lỗi timeout cho hình ảnh tương ứng
    void updateConversation(convId, (current) => {
      const conversation = current ?? conversationsRef.current.find((c) => c.id === convId);
      if (!conversation) return current!;
      return {
        ...conversation,
        updatedAt: new Date().toISOString(),
        turns: conversation.turns.map((turn) => {
          const hasLoading = turn.images.some((image) => image.status === "loading" && image.taskId === taskId);
          if (!hasLoading) return turn;
          const images = turn.images.map((image) =>
            image.taskId === taskId ? { ...image, status: "error" as const, error: taskError } : image,
          );
          const derived = deriveTurnStatus({ ...turn, images });
          return {
            ...turn,
            ...derived,
            images,
          };
        }),
      };
    });
    setTimeoutRetry(null);
    toast.error(taskError);
  }, [timeoutRetry, updateConversation]);

  const handleDismissErrors = useCallback(
    async (conversationId: string, turnId: string) => {
      await updateConversation(conversationId, (current) => {
        const conversation = current ?? conversationsRef.current.find((c) => c.id === conversationId);
        if (!conversation) return current!;
        return {
          ...conversation,
          updatedAt: new Date().toISOString(),
          turns: conversation.turns.map((turn) => {
            if (turn.id !== turnId) return turn;
            const successImages = turn.images.filter((image) => image.status !== "error");
            const derived = deriveTurnStatus({ ...turn, images: successImages });
            return {
              ...turn,
              ...derived,
              count: successImages.length,
              images: successImages,
            };
          }),
        };
      });
    },
    [updateConversation],
  );

  useEffect(() => {
    for (const conversation of conversations) {
      if (
        !activeConversationQueueIds.has(conversation.id) &&
        conversation.turns.some(
          (turn) =>
            !turn.resultsDeleted &&
            (turn.status === "queued" || turn.status === "generating") &&
            turn.images.some((image) => image.status === "loading"),
        )
      ) {
        void runConversationQueue(conversation.id);
      }
    }
  }, [conversations, runConversationQueue]);

  const handleSubmit = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt) {
      toast.error("Vui lòng nhập Prompt");
      return;
    }

    const effectiveImageMode: ImageConversationMode = referenceImageFiles.length > 0 ? "edit" : "generate";

    const targetConversation = selectedConversationId
      ? conversationsRef.current.find((conversation) => conversation.id === selectedConversationId) ?? null
      : null;
    const now = new Date().toISOString();
    const conversationId = targetConversation?.id ?? createId();
    const turnId = createId();
    const imageSize = `${imageWidth || 1024}x${imageHeight || 1024}`;
    const draftTurn: ImageTurn = {
      id: turnId,
      prompt,
      model: imageModel,
      mode: effectiveImageMode,
      referenceImages: effectiveImageMode === "edit" ? referenceImages : [],
      count: parsedCount,
      size: imageSize,
      ratio: imageRatio,
      tier: imageTier,
      quality: imageQuality,
      images: createLoadingImages(turnId, parsedCount),
      createdAt: now,
      status: "queued",
    };

    const baseConversation: ImageConversation = targetConversation
      ? {
          ...targetConversation,
          updatedAt: now,
          turns: [...targetConversation.turns, draftTurn],
        }
      : {
          id: conversationId,
          title: buildConversationTitle(prompt),
          createdAt: now,
          updatedAt: now,
          turns: [draftTurn],
      };

    shouldStickToBottomRef.current = true;
    const btn = scrollToLatestBtnRef.current;
    if (btn) btn.style.display = "none";
    setSelectedConversationId(conversationId);
    clearComposerInputs();

    await persistConversation(baseConversation);
    void runConversationQueue(conversationId);

    const targetStats = getImageConversationStats(baseConversation);
    if (targetStats.running > 0 || targetStats.queued > 1) {
      toast.success("Đã thêm vào hàng đợi cuộc trò chuyện hiện tại");
    } else if (!targetConversation) {
      toast.success("Đã tạo cuộc trò chuyện mới và bắt đầu xử lý");
    } else {
      toast.success("Đã gửi đến cuộc trò chuyện hiện tại");
    }
  };

  return (
    <>
      <section className="grid h-[calc(100dvh-6.5rem)] min-h-0 w-full grid-cols-1 gap-2 overflow-hidden px-0 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:h-[calc(100dvh-5.25rem)] sm:gap-3 sm:px-3 sm:pb-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="hidden h-full min-h-0 border-r border-border pr-3 lg:block">
          <ImageSidebar
            conversations={conversations}
            isLoadingHistory={isLoadingHistory}
            selectedConversationId={selectedConversationId}
            onCreateDraft={handleCreateDraft}
            onClearHistory={openClearHistoryConfirm}
            onSelectConversation={setSelectedConversationId}
            onDeleteConversation={openDeleteConversationConfirm}
            onRenameConversation={handleRenameConversation}
            formatConversationTime={formatConversationTime}
          />
        </div>

        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="flex h-[min(82dvh,760px)] w-[92vw] max-w-[460px] flex-col overflow-hidden rounded-[32px] border-border/80 bg-surface p-0 shadow-[0_32px_110px_-38px_rgba(15,23,42,0.45)] sm:rounded-[36px]">
            <DialogHeader className="px-6 pt-7 pb-4 sm:px-8">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <History className="size-5" />
                Lịch sử
              </DialogTitle>
              <DialogDescription className="sr-only">
                Danh sách các cuộc hội thoại tạo ảnh trước đây.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 sm:px-8">
              <ImageSidebar
                conversations={conversations}
                isLoadingHistory={isLoadingHistory}
                selectedConversationId={selectedConversationId}
                onCreateDraft={() => {
                  handleCreateDraft();
                  setIsHistoryOpen(false);
                }}
                onClearHistory={openClearHistoryConfirm}
                onSelectConversation={(id) => {
                  setSelectedConversationId(id);
                  setIsHistoryOpen(false);
                }}
                onDeleteConversation={openDeleteConversationConfirm}
                onRenameConversation={handleRenameConversation}
                formatConversationTime={formatConversationTime}
                hideActionButtons
              />
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex min-h-0 flex-col gap-3">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-border/80 bg-surface shadow-sm p-0">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-secondary/40 px-3 py-2 lg:hidden">
            <Button
              variant="outline"
              className="h-9 flex-1 rounded-lg border-border bg-surface text-sm text-content"
              onClick={() => setIsHistoryOpen(true)}
            >
              <History className="mr-2 size-4" />
              Lịch sử ({conversations.length})
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-lg border-border bg-surface px-3 text-content-secondary"
              onClick={openClearHistoryConfirm}
              disabled={conversations.length === 0}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              ref={resultsViewportRef}
              onScroll={handleResultsScroll}
              className="hide-scrollbar h-full overscroll-contain overflow-y-auto px-1 py-2 sm:px-4 sm:py-4"
              style={{ contain: "layout style paint" }}
            >
              <ImageResults
                selectedConversation={selectedConversation}
                onOpenLightbox={openLightbox}
                onContinueEdit={handleContinueEdit}
                onDeletePrompt={openDeletePromptConfirm}
                onDeleteResults={openDeleteResultsConfirm}
                onReuseTurnConfig={handleReuseTurnConfig}
                onReuseTurnConfigAsNew={handleReuseTurnConfigAsNew}
                onRegenerateTurn={handleRegenerateTurn}
                onRetryImage={handleRetryImage}
                onTimeoutRetryContinue={handleTimeoutRetryContinue}
                onDismissErrors={handleDismissErrors}
                formatConversationTime={formatConversationTime}
                turnRevisions={turnRevisions}
                turnViewSlot={turnViewSlot}
                onTurnViewSlotChange={handleTurnViewSlotChange}
                removeBgResults={removeBgResults}
                onRemoveBgResult={(imageId, dataUrl, persistUrl, conversationId, turnId) => {
                  setRemoveBgResults((prev) => ({ ...prev, [imageId]: dataUrl }));
                  const conv = conversationsRef.current.find((c) => c.id === conversationId);
                  if (!conv) return;
                  const nextConv = {
                    ...conv,
                    turns: conv.turns.map((t) =>
                      t.id === turnId
                        ? { ...t, images: t.images.map((img) => img.id === imageId ? { ...img, remove_bg_url: persistUrl } : img) }
                        : t,
                    ),
                  };
                  void persistConversation(nextConv);
                }}
              />
            </div>

            <button
              ref={scrollToLatestBtnRef}
              type="button"
              aria-label="Cuộn đến tin nhắn mới nhất"
              title="Cuộn đến tin nhắn mới nhất"
              onClick={() => scrollResultsToLatest("smooth")}
              className="absolute bottom-4 left-1/2 z-20 inline-flex size-11 -translate-x-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-lg shadow-stone-200/60 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:border-white/10 dark:bg-stone-800/95 dark:text-stone-100 dark:shadow-black/40 dark:hover:bg-stone-700"
              style={{ display: "none" }}
            >
              <ArrowDown className="size-5" />
            </button>
          </div>
        </Card>

          <ImageComposer
            prompt={imagePrompt}
            imageCount={imageCount}
            imageRatio={imageRatio}
            imageTier={imageTier}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            imageQuality={imageQuality}
            imageModel={imageModel}
            imageModels={imageModels}
            availableQuota={availableQuota}
            activeTaskCount={activeTaskCount}
            referenceImages={referenceImages}
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
            onPromptChange={setImagePrompt}
            onImageCountChange={(value) => setImageCount(value ? clampImageCount(value) : "")}
            onImageRatioChange={setImageRatio}
            onImageTierChange={setImageTier}
            onImageWidthChange={setImageWidth}
            onImageHeightChange={setImageHeight}
            onImageQualityChange={setImageQuality}
            onImageModelChange={setImageModel}
            onSubmit={handleSubmit}
            onPickReferenceImage={() => fileInputRef.current?.click()}
            onReferenceImageChange={handleReferenceImageChange}
            onRemoveReferenceImage={handleRemoveReferenceImage}
          />
        </div>
      </section>

      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onIndexChange={setLightboxIndex}
        revisionNav={(() => {
          if (!lightboxTurnId) return undefined;
          const revisions = turnRevisionsRef.current[lightboxTurnId] || [];
          const total = revisions.length + 1;
          if (total <= 1) return undefined;
          const slot = turnViewSlot[lightboxTurnId] ?? total - 1;
          return {
            slot,
            total,
            onPrev: () => handleLightboxRevisionChange(slot - 1),
            onNext: () => handleLightboxRevisionChange(slot + 1),
          };
        })()}
      />

      {deleteConfirm ? (
        <Dialog open onOpenChange={(open) => (!open ? setDeleteConfirm(null) : null)}>
          <DialogContent showCloseButton={false} className="rounded-2xl p-6">
            <DialogHeader className="gap-2">
              <DialogTitle>{deleteConfirmTitle}</DialogTitle>
              <DialogDescription className="text-sm leading-6">
                {deleteConfirmDescription}
              </DialogDescription>
            </DialogHeader>
            {deleteConfirm?.type === "one" ? (
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="sm:mr-auto" onClick={() => setDeleteConfirm(null)}>
                  Hủy
                </Button>
                <Button
                  variant="outline"
                  className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
                  onClick={() => {
                    const id = deleteConfirm.id;
                    setDeleteConfirm(null);
                    void handleDeleteConversation(id, false);
                  }}
                >
                  Chỉ xóa lịch sử
                </Button>
                <Button
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => {
                    const id = deleteConfirm.id;
                    setDeleteConfirm(null);
                    void handleDeleteConversation(id, true);
                  }}
                >
                  Xóa cả ảnh
                </Button>
              </DialogFooter>
            ) : (
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  Hủy
                </Button>
                <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => void handleConfirmDelete()}>
                  Xác nhận xoá
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      ) : null}


    </>
  );
}

export default function ImagePage() {
  const { isCheckingAuth, session } = useAuthGuard();

  if (isCheckingAuth || !session) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-content-tertiary" />
      </div>
    );
  }

  return <ImagePageContent isAdmin={session.role === "admin"} />;
}
