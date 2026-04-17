import { getApiBaseUrl } from "@/config/env";

/** Chuẩn hóa URL ảnh (path `/uploads/...` trên API → URL tuyệt đối khi UI khác origin). */
export function resolveMediaUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = getApiBaseUrl();
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}
