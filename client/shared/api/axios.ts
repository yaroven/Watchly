import axios from "axios";
import { toApiError } from "./api-error";

const isServer = typeof window === "undefined";
const baseURL = isServer
  ? process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL
  : process.env.NEXT_PUBLIC_BACKEND_API_URL;

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    console.error("[API Error]", apiError.details || apiError.message);
    return Promise.reject(apiError);
  },
);

export default api;
