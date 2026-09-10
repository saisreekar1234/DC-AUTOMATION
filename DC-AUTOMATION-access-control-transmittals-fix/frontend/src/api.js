import axios from "axios";

// Production:
//   VITE_API_BASE_URL=https://your-backend-domain/api
//
// Local development:
//   http://localhost:5000/api
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

// Attach JWT to protected API requests.
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired/invalid sessions.
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
  }
);

export default api;