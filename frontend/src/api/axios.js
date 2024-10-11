import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:5000", // This will ensure all requests go to localhost:5000
});

// Optional: Token interceptors to include token in every request
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle expired tokens
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is expired or invalid, log the user out
      localStorage.removeItem("token");
      window.location.href = "/login"; // Redirect to login
    }
    return Promise.reject(error);
  }
);

export default instance;
