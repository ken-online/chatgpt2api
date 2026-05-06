export type RouteMeta = {
  title: string;
  description: string;
  /** Whether this route appears in admin sidebar */
  adminSidebar: boolean;
  /** Whether non-admin users can access */
  userAccessible: boolean;
};

export const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "Dashboard",
    description: "Tổng quan hệ thống ChatGPT2API",
    adminSidebar: true,
    userAccessible: false,
  },
  "/accounts": {
    title: "Accounts",
    description: "Quản lý nhóm tài khoản OpenAI",
    adminSidebar: true,
    userAccessible: false,
  },
  "/image": {
    title: "Image",
    description: "Tạo ảnh với gpt-image-2",
    adminSidebar: true,
    userAccessible: true,
  },
  "/image-manager": {
    title: "Image History",
    description: "Lịch sử các tác vụ ảnh đã tạo",
    adminSidebar: true,
    userAccessible: false,
  },
  "/logs": {
    title: "Logs",
    description: "Nhật ký hoạt động hệ thống",
    adminSidebar: true,
    userAccessible: false,
  },
  "/register": {
    title: "Auto Register",
    description: "Đăng ký tài khoản OpenAI tự động",
    adminSidebar: true,
    userAccessible: false,
  },
  "/settings": {
    title: "Settings",
    description: "Cấu hình hệ thống và tích hợp",
    adminSidebar: true,
    userAccessible: false,
  },
  "/login": {
    title: "Login",
    description: "",
    adminSidebar: false,
    userAccessible: true,
  },
};

export const SIDEBAR_ORDER = [
  "/",
  "/accounts",
  "/image",
  "/image-manager",
  "/logs",
  "/register",
  "/settings",
] as const;

export function getRouteMeta(pathname: string): RouteMeta | null {
  return ROUTE_META[pathname] ?? null;
}
