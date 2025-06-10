import axios from "axios";

const instance = axios.create({
  // Use relative URL for API requests - this will automatically use the current domain
  // Works for both local development and all Vercel environments (preview URLs and custom domain)
  baseURL: process.env.NODE_ENV === 'production' ? '' : process.env.REACT_APP_API_BASE_URL
});

// Optional: Token interceptors to include token in every request
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // Always include the token in the request - let the server validate it
      // Only remove it if we get a 401 response
      config.headers.Authorization = `Bearer ${token}`;

      // Optional: Log token expiration info for debugging
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Date.now() / 1000;
        const timeUntilExpiry = payload.exp - now;

        if (timeUntilExpiry > 0) {
          console.log(
            `Token valid for ${Math.floor(
              timeUntilExpiry / 3600
            )} hours, ${Math.floor((timeUntilExpiry % 3600) / 60)} minutes`
          );
        } else {
          console.log("Token appears expired, but letting server validate");
        }
      } catch (error) {
        console.log(
          "Could not parse token expiration, letting server validate"
        );
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
      localStorage.removeItem("keepLoggedIn");
      console.log("Token was invalid/expired - removed from localStorage");

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
