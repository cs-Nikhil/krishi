import axios from "axios";

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : "https://krishicre.onrender.com/api";

const AUTH_CLEARED_EVENT = "krishi_auth_cleared";
const AUTH_UPDATED_EVENT = "krishi_auth_updated";

const normalizeApiBaseUrl = (value) => {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");

  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }

  if (trimmed === "/api" || trimmed.endsWith("/api")) {
    return trimmed;
  }

  return `${trimmed}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL
);

let refreshRequest = null;

const getStoredRefreshToken = () =>
  localStorage.getItem("krishi_refresh_token");

const clearStoredAuth = () => {
  localStorage.removeItem("krishi_token");
  localStorage.removeItem("krishi_refresh_token");
  localStorage.removeItem("krishi_user");
};

const dispatchAuthEvent = (name, detail = {}) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
};

const isAuthEndpoint = (url = "") => {
  return [
    "/auth/login",
    "/auth/logout",
    "/auth/refresh-token"
  ].some((path) => String(url).includes(path));
};

const refreshAccessToken = async () => {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  if (!refreshRequest) {
    refreshRequest = axios
      .post(
        `${API_BASE_URL}/auth/refresh-token`,
        { refreshToken },
        { withCredentials: true }
      )
      .then((response) => {
        const data = response.data?.data || response.data || {};
        const token = data.token || data.accessToken;

        if (!token) {
          throw new Error(
            "Refresh response did not include an access token"
          );
        }

        localStorage.setItem("krishi_token", token);

        if (data.refreshToken) {
          localStorage.setItem(
            "krishi_refresh_token",
            data.refreshToken
          );
        }

        if (data.user) {
          localStorage.setItem(
            "krishi_user",
            JSON.stringify(data.user)
          );
        }

        dispatchAuthEvent(AUTH_UPDATED_EVENT, {
          token,
          user: data.user
        });

        return token;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("krishi_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response.data;

    if (
      payload &&
      typeof payload === "object" &&
      Object.prototype.hasOwnProperty.call(payload, "success") &&
      Object.prototype.hasOwnProperty.call(payload, "data")
    ) {
      response.apiEnvelope = payload;
      response.data = payload.data || {};
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const token = await refreshAccessToken();

        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${token}`
        };

        return api(originalRequest);
      } catch (refreshError) {
        clearStoredAuth();
        dispatchAuthEvent(AUTH_CLEARED_EVENT);
      }
    } else if (error.response?.status === 401) {
      clearStoredAuth();
      dispatchAuthEvent(AUTH_CLEARED_EVENT);
    }

    return Promise.reject(error);
  }
);

export default api;
