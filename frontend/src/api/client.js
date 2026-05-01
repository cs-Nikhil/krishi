import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL
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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("krishi_token");
      localStorage.removeItem("krishi_refresh_token");
      localStorage.removeItem("krishi_user");
    }

    return Promise.reject(error);
  }
);

export default api;
