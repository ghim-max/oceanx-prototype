const raw =
  (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ||
  (typeof window !== 'undefined' ? window.location.origin : '');
export const APP_URL = raw.replace(/\/+$/, '');
export const appLink = (path: string) => `${APP_URL}/${path.replace(/^\/+/, '')}`;