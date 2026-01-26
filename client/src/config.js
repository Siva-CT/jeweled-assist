// Helper to get API URL
// In production, if served by same backend, this can be empty string (relative path)
// But for separate deployment, use VITE_API_URL
export const API_URL = import.meta.env.VITE_API_URL || '';
