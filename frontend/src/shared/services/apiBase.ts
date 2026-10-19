// Single source of truth for the FastAPI backend URL.
// Set VITE_INSIGHTS_API_URL in your .env.local for dev, and in Vercel for production.
export const API_BASE = import.meta.env.VITE_INSIGHTS_API_URL || 'http://localhost:8000';
