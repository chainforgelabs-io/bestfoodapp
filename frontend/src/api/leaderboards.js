// src/api/leaderboards.js
import axios from "axios";

export const fetchLeaderboards = async (category, sortOption) => {
  try {
    const response = await axios.get(`/leaderboards`, {
      params: { category, sort: sortOption },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching leaderboard data", error);
    throw error; // Rethrow the error for handling in the component
  }
};
