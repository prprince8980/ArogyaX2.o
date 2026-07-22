import axios from 'axios';

// Default backend URL set to Render production URL, overridable via environment variable VITE_API_URL
export const BASE_URL = import.meta.env.VITE_API_URL || 'https://arogyax2-o.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Axios response interceptor for unified error handling & fallbacks
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn('[API Service Warning]: API call failed or server sleeping:', error.message);
    return Promise.reject(error);
  }
);

// Self-ping helper to keep Render backend awake every minute
let pingInterval = null;
export const startSelfPing = () => {
  if (pingInterval) return;
  const ping = async () => {
    try {
      await axios.get(`${BASE_URL}/api/auth/health`);
    } catch (e) {
      // Ignore ping errors silently
    }
  };
  ping();
  pingInterval = setInterval(ping, 60000); // 1 minute keep-alive ping
};

startSelfPing();

export default api;
