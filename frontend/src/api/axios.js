// src/api/axios.js
import axios from "axios";

export default axios.create({
  baseURL: "http://your-backend-url/api",
});
