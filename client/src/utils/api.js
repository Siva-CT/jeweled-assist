// Simple wrapper to determine base URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''; // Allow relative path (proxy) if not set

export const getBaseUrl = () => {
    // If in dev, empty string uses proxy in vite.config
    // If prod, VITE_API_BASE_URL should be set in .env.production
    return BASE_URL.replace(/\/$/, ''); // Remove trailing slash
};
