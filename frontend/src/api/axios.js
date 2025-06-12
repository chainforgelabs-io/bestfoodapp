import axios from "axios";

const instance = axios.create({
  // Use relative URL for API requests - this will automatically use the current domain
  // Works for both local development and all Vercel environments (preview URLs and custom domain)
  baseURL:
    process.env.NODE_ENV === "production"
      ? "/api"
      : process.env.REACT_APP_API_BASE_URL,
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
      console.log("🚫 Received 401 Unauthorized response");

      // Log current auth state before clearing
      try {
        const token = localStorage.getItem("token");
        const keepLoggedIn = localStorage.getItem("keepLoggedIn");
        console.log("📊 Auth state before clearing:", {
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          keepLoggedIn: keepLoggedIn === "true",
          url: error.config?.url,
          hasAuthHeader: !!error.config?.headers?.Authorization,
        });
      } catch (e) {
        console.error("Error logging auth state:", e);
      }

      // Clear authentication data
      try {
        const items = [
          "token",
          "keepLoggedIn",
          "tokenSetAt",
          "tokenExpectedExp",
        ];
        items.forEach((item) => localStorage.removeItem(item));
        console.log("🧹 Authentication data cleared due to 401");
      } catch (e) {
        console.error("Error clearing auth data:", e);
      }

      // Only redirect to login if this was a protected route (not a public search)
      // We can tell this by checking if the request had an Authorization header
      if (error.config?.headers?.Authorization) {
        console.log(
          "🔄 Redirecting to login - protected route accessed with invalid token"
        );

        // Add a small delay to ensure logging is complete
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      } else {
        console.log("ℹ️ 401 on public route - no redirect needed");
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
