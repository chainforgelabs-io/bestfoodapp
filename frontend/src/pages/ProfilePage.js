import React, { useEffect, useState } from "react";
import axios from "../api/axios"; // Correct import of axios
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import tokenUtils from "../utils/auth";
import "../styles/ProfilePage.css";
import SEO from "../components/SEO";

function ProfilePage() {
  const [user, setUser] = useState({});
  const [reviews, setReviews] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [sort, setSort] = useState("date"); // date|score|photos
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState("grid"); // grid | list
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptLightbox, setReceiptLightbox] = useState({
    open: false,
    url: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!tokenUtils.isAuthenticated()) {
        navigate("/login");
        return;
      }
      const token = tokenUtils.getToken();
      try {
        const decodedToken = jwtDecode(token);
        const userId = decodedToken.id;
        const userResponse = await axios.get(`/users/${userId}`);
        const userData = userResponse.data.user;
        const userReviews = userResponse.data.reviews || [];
        setUser(userData);
        setFollowerCount(userData.followers.length || 0);
        setFollowingCount(userData.following.length || 0);
        setReviewCount(userReviews.length);
        // Seed initial reviews to avoid empty UI if paginated fetch fails
        setReviews(userReviews);
        setTotalPages(Math.max(1, Math.ceil(userReviews.length / limit)));
      } catch (error) {
        tokenUtils.clearToken();
        navigate("/login");
      }
    };
    fetchUserData();
  }, [navigate]);

  const loadReviews = async (pageToLoad = 1, reset = false) => {
    try {
      setLoading(true);
      const token = tokenUtils.getToken();
      const decodedToken = jwtDecode(token);
      const userId = decodedToken.id;
      const { data } = await axios.get(`/users/${userId}/reviews-paginated`, {
        params: { page: pageToLoad, limit, sort, order },
      });
      setTotalPages(data.totalPages || 1);
      setPage(data.page || pageToLoad);
      setReviews((prev) => (reset ? data.items : [...prev, ...data.items]));
    } catch (e) {
      console.error("Failed to load reviews", e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // reload when sort/order changes
    loadReviews(1, true);
  }, [sort, order]);

  useEffect(() => {
    const loadReceipts = async () => {
      if (!tokenUtils.isAuthenticated()) return;
      try {
        setReceiptsLoading(true);
        const { data } = await axios.get("/receipts", {
          params: { page: 1, limit: 50 },
        });
        setReceipts(data.items || []);
      } catch (e) {
        console.error("Failed to load receipts", e?.message);
        setReceipts([]);
      } finally {
        setReceiptsLoading(false);
      }
    };
    loadReceipts();
  }, []);

  const handleLogout = () => {
    tokenUtils.clearToken();
    navigate("/login");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const openReceiptImage = async (receiptId) => {
    try {
      const { data } = await axios.get(`/receipts/${receiptId}/image`);
      if (data?.url) {
        setReceiptLightbox({ open: true, url: data.url });
      }
    } catch (e) {
      console.error("Could not open receipt", e);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#28a745";
    if (score >= 60) return "#ffc107";
    if (score >= 40) return "#fd7e14";
    return "#dc3545";
  };

  const hasPhotos = (r) => Array.isArray(r.photos) && r.photos.length > 0;

  const ReviewGridCard = ({ r }) => (
    <div
      className="review-card clickable"
      onClick={() =>
        navigate(`/restaurant/${r.restaurant?._id || r.restaurantId}`)
      }
    >
      {hasPhotos(r) ? (
        <div
          className="grid-photo"
          style={{
            position: "relative",
            paddingTop: "100%",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <img
            src={r.photos[0]}
            alt="post"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            className="grid-overlay"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 8,
              background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                textShadow: "0 2px 6px rgba(0,0,0,0.4)",
              }}
            >
              {r.foodItem?.name || "Food Item"}
            </div>
            <div
              className="score-badge"
              style={{
                background: "#fff",
                color: "#333",
                borderRadius: 999,
                padding: "4px 8px",
                fontWeight: 800,
              }}
            >
              {Math.round(r.score)}
            </div>
          </div>
        </div>
      ) : (
        <div className="tweet-card" style={{ padding: 16 }}>
          <div
            className="tweet-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {r.foodItem?.name || "Food Item"}
            </div>
            <div style={{ color: getScoreColor(r.score), fontWeight: 800 }}>
              {Math.round(r.score)}
            </div>
          </div>
          {r.comment && (
            <div style={{ marginTop: 8, color: "#555" }}>{r.comment}</div>
          )}
          <div
            className="tweet-meta"
            style={{ marginTop: 8, fontSize: 12, color: "#888" }}
          >
            {r.restaurant?.name || r.restaurantId?.name || "Restaurant"} ·{" "}
            {formatDate(r.reviewDate)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="profile-page">
      <SEO
        title="Your Profile | Best Food App"
        description="Manage your account and review history."
        noindex={true}
      />
      <div className="profile-container">
        {/* Header */}
        <div className="user-info" style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>{user.username}</h2>
            {user.role === "admin" && (
              <span title="Verified" style={{ color: "#1d9bf0", fontSize: 18 }}>
                ✔︎
              </span>
            )}
          </div>
          {user.bio && <p style={{ marginTop: 6 }}>{user.bio}</p>}
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            <span className="semi small">{reviewCount} posts</span>
            <span className="semi small">{followerCount} followers</span>
            <span className="semi small">{followingCount} following</span>
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="filter-select"
          >
            <option value="date">Newest</option>
            <option value="score">Score</option>
            <option value="photos">With Photos</option>
          </select>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="filter-select"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <div className="view-toggle" style={{ display: "flex", gap: 8 }}>
            <button
              className="search-button"
              style={{ padding: "8px 12px" }}
              onClick={() => setView("grid")}
            >
              Grid
            </button>
            <button
              className="search-button"
              style={{ padding: "8px 12px" }}
              onClick={() => setView("list")}
            >
              List
            </button>
          </div>
        </div>

        {/* Reviews */}
        {view === "grid" ? (
          <div
            className="reviews-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {reviews && reviews.length > 0 ? (
              reviews.map((r) => <ReviewGridCard key={r._id || r.id} r={r} />)
            ) : (
              <div className="text-muted">No posts yet.</div>
            )}
          </div>
        ) : (
          <div
            className="reviews-list"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            {reviews && reviews.length > 0 ? (
              reviews.map((r) => <ReviewGridCard key={r._id || r.id} r={r} />)
            ) : (
              <div className="text-muted">No posts yet.</div>
            )}
          </div>
        )}

        {/* Pagination */}
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 16 }}
        >
          {page < totalPages && (
            <button
              className="search-button"
              onClick={() => loadReviews(page + 1)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>

        {/* Private receipts (tax / records) */}
        <div
          style={{
            marginTop: 32,
            maxWidth: 720,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <h3 style={{ marginBottom: 12, fontSize: "1.1rem" }}>My receipts</h3>
          <p
            className="small text-muted"
            style={{ color: "#666", fontSize: 13, marginBottom: 12 }}
          >
            Private — not shown on your public reviews. Open to view the image.
          </p>
          {receiptsLoading ? (
            <p className="text-muted" style={{ color: "#888" }}>
              Loading receipts…
            </p>
          ) : receipts.length === 0 ? (
            <p className="text-muted" style={{ color: "#888" }}>
              No receipts yet. Use Submit → scan a receipt when you write a
              review.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {receipts.map((rc) => (
                <li
                  key={rc._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    border: "1px solid #e8e8e8",
                    borderRadius: 10,
                    background: "#fafafa",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      Receipt
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {formatDate(rc.createdAt || rc.updatedAt)} ·{" "}
                      {rc.status || "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="search-button"
                    style={{ padding: "6px 14px" }}
                    onClick={() => openReceiptImage(rc._id)}
                  >
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {receiptLightbox.open && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setReceiptLightbox({ open: false, url: "" })}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={() => setReceiptLightbox({ open: false, url: "" })}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  border: "none",
                  background: "#fff",
                  fontSize: 20,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
                aria-label="Close"
              >
                ×
              </button>
              {receiptLightbox.url && (
                <img
                  src={receiptLightbox.url}
                  alt="Receipt"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "90vh",
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="logout-button"
          style={{ position: "static", marginTop: 20 }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;
