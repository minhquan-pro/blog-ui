/**
 * Base URL của Blog API (không có dấu / cuối).
 * Để trống khi dev với Vite proxy (request cùng origin → `/api`, `/uploads`).
 * Production: đặt URL tuyệt đối (vd. `https://api.example.com`) lúc build hoặc qua biến môi trường.
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
}
