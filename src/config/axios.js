import axios from "axios";
import { resolveApiBaseUrl } from "./apiBase";

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
});

// Thêm token trước khi gửi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")?.replaceAll('"', "");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

export default api;
