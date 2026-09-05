import axios from "axios";

// Use VITE_API_BASE_URL in production.
// During local development this falls back to the backend on port 5000.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

function getStoredToken() {
  return (
    localStorage.getItem("dc_token") ||
    sessionStorage.getItem("dc_token")
  );
}

// Attach the JWT to every protected API request.
api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// If the backend rejects the token, clear the client session and
// notify AuthContext so React immediately returns to the login screen.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("dc_token");
      localStorage.removeItem("dc_user");
      sessionStorage.removeItem("dc_token");
      sessionStorage.removeItem("dc_user");

      window.dispatchEvent(new Event("dc-auth-expired"));
    }

    return Promise.reject(error);
  },
);

export default api;
