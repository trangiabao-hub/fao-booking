import axios from "axios";

// Lấy URL từ biến môi trường
// Nếu chưa có, fallback về localhost
const baseUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: baseUrl,
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
