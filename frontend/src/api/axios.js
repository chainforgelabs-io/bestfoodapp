import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:5000", // This will ensure all requests go to localhost:5000
});

// Optional: Token interceptors to include token in every request
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // Check if token is expired before sending it
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Date.now() / 1000;

        if (payload.exp < now) {
          // Token is expired, remove it and don't send it
          localStorage.removeItem("token");
          console.log("Removed expired token from localStorage");
        } else {
          // Token is still valid, include it in the request
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        // Invalid token format, remove it
        localStorage.removeItem("token");
        console.log("Removed invalid token from localStorage");
      }
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
      // Token is expired or invalid, remove it from storage
      localStorage.removeItem("token");

      // Only redirect to login if this was a protected route (not a public search)
      // We can tell this by checking if the request had an Authorization header
      if (error.config?.headers?.Authorization) {
        console.log(
          "Unauthorized access to protected route, redirecting to login"
        );
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
