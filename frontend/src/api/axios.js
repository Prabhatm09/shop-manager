import axios from "axios";

const defaultApiUrl = import.meta.env.PROD
  ? "https://shop-manager-n320.onrender.com/api"
  : "http://localhost:5000/api";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("shop_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("shop_token");
      localStorage.removeItem("shop_user");
    }

    return Promise.reject(error);
  }
);

export default API;
