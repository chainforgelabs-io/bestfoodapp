import React, { useEffect, useState, useCallback } from "react";
import axios from "../api/axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate, useParams, Link } from "react-router-dom";
import tokenUtils from "../utils/auth";
import { getFoodEmoji } from "../utils/foodEmoji";
import ReviewDetailModal from "../components/ReviewDetailModal";
import SEO from "../components/SEO";
import "../styles/ProfilePage.css";

function ProfilePage() {
  const { id: routeId } = useParams();
  const [selfId, setSelfId] = useState(null);
  const profileId = routeId || selfId;
  const isOwnProfile = !routeId || (selfId && routeId === selfId);

  const [user, setUser] = useState({});
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    reviewCount: 0,
    restaurantCount: 0,
    cityCount: 0,
    avgScore: 0,
  });
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [sort, setSort] = useState("date");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptLightbox, setReceiptLightbox] = useState({
    open: false,
    url: "",
  });
  const [socialList, setSocialList] = useState({
    open: false,
    type: "",
    users: [],
    loading: false,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: "",
    firstName: "",
    lastName: "",
    profilePicture: "",
    city: "",
    province: "",
    country: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!tokenUtils.isAuthenticated()) {
      navigate("/login");
      return;
    }
    const token = tokenUtils.getToken();
    try {
      const decoded = jwtDecode(token);
      setSelfId(decoded.id);
    } catch {
      tokenUtils.clearToken();
      navigate("/login");
    }
  }, [navigate]);

  const loadUserProfile = useCallback(
    async (id) => {
      if (!id) return;
      try {
        const userResponse = await axios.get(`/users/${id}`);
        const userData = userResponse.data.user;
        setUser(userData);
        setFollowerCount(userData.followers?.length || 0);
        setFollowingCount(userData.following?.length || 0);

        if (selfId && id !== selfId) {
          const meResponse = await axios.get(`/users/${selfId}`);
          const myFollowing = meResponse.data.user?.following || [];
          setIsFollowing(
            myFollowing.some((f) => (f._id || f).toString() === id)
          );
        }
      } catch {
        if (!routeId) {
          tokenUtils.clearToken();
          navigate("/login");
        }
      }
    },
    [navigate, routeId, selfId]
  );

  const loadStats = useCallback(async (id) => {
    if (!id) return;
    try {
      const { data } = await axios.get(`/users/${id}/stats`);
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats", e?.message);
    }
  }, []);

  const loadReviews = useCallback(
    async (id, pageToLoad = 1, reset = false) => {
      if (!id) return;
      try {
        setLoading(true);
        const { data } = await axios.get(`/users/${id}/reviews-paginated`, {
          params: { page: pageToLoad, limit, sort, order },
        });
        setTotalPages(data.totalPages || 1);
        setPage(data.page || pageToLoad);
        setReviews((prev) =>
          reset ? data.items || [] : [...prev, ...(data.items || [])]
        );
      } catch (e) {
        console.error("Failed to load reviews", e?.message);
        if (reset) setReviews([]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [limit, sort, order]
  );

  useEffect(() => {
    if (!profileId) return;
    loadUserProfile(profileId);
    loadStats(profileId);
  }, [profileId, loadUserProfile, loadStats]);

  useEffect(() => {
    if (!profileId) return;
    loadReviews(profileId, 1, true);
  }, [profileId, sort, order, loadReviews]);

  useEffect(() => {
    if (!isOwnProfile) return;
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
  }, [isOwnProfile]);

  const handleLogout = () => {
    tokenUtils.clearToken();
    navigate("/login");
  };

  const handleFollowToggle = async () => {
    if (!profileId || isOwnProfile) return;
    try {
      if (isFollowing) {
        await axios.post(`/users/${profileId}/unfollow`);
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await axios.post(`/users/${profileId}/follow`);
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch (e) {
      console.error("Follow toggle failed", e);
    }
  };

  const openSocialList = async (type) => {
    if (!profileId) return;
    setSocialList({ open: true, type, users: [], loading: true });
    try {
      const endpoint =
        type === "followers"
          ? `/users/${profileId}/followers`
          : `/users/${profileId}/following`;
      const { data } = await axios.get(endpoint);
      setSocialList({ open: true, type, users: data || [], loading: false });
    } catch (e) {
      console.error("Failed to load social list", e);
      setSocialList((prev) => ({ ...prev, loading: false }));
    }
  };

  const openEditProfile = () => {
    setEditForm({
      bio: user.bio || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      profilePicture: user.profilePicture || "",
      city: user.location?.city || "",
      province: user.location?.province || "",
      country: user.location?.country || "",
    });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setEditSaving(true);
    try {
      const payload = {
        bio: editForm.bio,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        profilePicture: editForm.profilePicture,
        location: {
          city: editForm.city,
          province: editForm.province,
          country: editForm.country,
        },
      };
      const { data } = await axios.put("/users/profile", payload);
      setUser(data);
      setEditOpen(false);
    } catch (e) {
      console.error("Profile save failed", e);
    } finally {
      setEditSaving(false);
    }
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
    if (score >= 60) return "#c9a227";
    if (score >= 40) return "#fd7e14";
    return "#dc3545";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "#d4edda";
    if (score >= 60) return "#fff3cd";
    if (score >= 40) return "#ffe5d0";
    return "#f8d7da";
  };

  const hasPhotos = (r) => Array.isArray(r.photos) && r.photos.length > 0;

  const handleReviewUpdated = (updated) => {
    setReviews((prev) =>
      prev.map((r) => (r._id === updated._id ? { ...r, ...updated } : r))
    );
    setSelectedReview((prev) =>
      prev && prev._id === updated._id ? { ...prev, ...updated } : prev
    );
    if (profileId) loadStats(profileId);
  };

  const handleReviewDeleted = (reviewId) => {
    setReviews((prev) => prev.filter((r) => r._id !== reviewId));
    setSelectedReview(null);
    if (profileId) {
      loadStats(profileId);
      loadReviews(profileId, 1, true);
    }
  };

  const toggleOrder = () => {
    setOrder((o) => (o === "desc" ? "asc" : "desc"));
  };

  const avatarUrl = user.profilePicture;
  const locationLine = [
    user.location?.city,
    user.bio || (user.role === "admin" ? "comfort-food specialist" : null),
  ]
    .filter(Boolean)
    .join(" · ");

  const ReviewTile = ({ r }) => {
    const foodType = r.foodItem?.type || "";
    const foodCategory = r.foodItem?.category || "";
    const foodName = r.foodItem?.name || "Food Item";
    const restaurantName =
      r.restaurant?.name || r.restaurantId?.name || "Restaurant";
    const score = Math.round(r.score || 0);

    return (
      <article
        className={`profile-review-tile ${view === "list" ? "list-view" : ""}`}
        onClick={() => setSelectedReview(r)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedReview(r);
          }
        }}
      >
        <div className="profile-tile-media">
          {foodType && (
            <span className="profile-tile-type-tag">{foodType}</span>
          )}
          {hasPhotos(r) ? (
            <img
              src={r.photos[0]}
              alt={foodName}
              className="profile-tile-img"
            />
          ) : (
            <div className="profile-tile-placeholder">
              <span aria-hidden="true">
                {getFoodEmoji(foodType, foodCategory)}
              </span>
            </div>
          )}
        </div>
        <div className="profile-tile-footer">
          <div className="profile-tile-title-row">
            <span className="profile-tile-name">{foodName}</span>
            <span
              className="profile-tile-score"
              style={{
                backgroundColor: getScoreBg(score),
                color: getScoreColor(score),
              }}
            >
              {score}
            </span>
          </div>
          <span className="profile-tile-restaurant">{restaurantName}</span>
          {view === "list" && (
            <span className="profile-tile-date">
              {formatDate(r.reviewDate || r.createdAt)}
            </span>
          )}
        </div>
        {view === "grid" && (
          <span className="profile-tile-date-grid">
            {formatDate(r.reviewDate || r.createdAt)}
          </span>
        )}
      </article>
    );
  };

  return (
    <div className="profile-page">
      <SEO
        title={
          isOwnProfile
            ? "Your Profile | Best Food App"
            : `${user.username || "User"} | Best Food App`
        }
        description="View profile and review history."
        noindex={true}
      />
      <div className="profile-layout">
        <div className="profile-header-card">
          <div className="profile-header-top">
            <div className="profile-avatar-wrap">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-fallback" aria-hidden="true">
                  🍴
                </div>
              )}
            </div>
            <div className="profile-header-text">
              <div className="profile-name-row">
                <h1 className="profile-username">{user.username || "…"}</h1>
                {user.role === "admin" && (
                  <span className="profile-verified-badge">
                    <span className="verified-check">✓</span>
                    Verified critic
                  </span>
                )}
              </div>
              {locationLine && (
                <p className="profile-meta-line">{locationLine}</p>
              )}
              <p className="profile-social-line">
                <button
                  type="button"
                  className="profile-social-link"
                  onClick={() => openSocialList("followers")}
                >
                  {followerCount} followers
                </button>
                {" · "}
                <button
                  type="button"
                  className="profile-social-link"
                  onClick={() => openSocialList("following")}
                >
                  {followingCount} following
                </button>
              </p>
              {isOwnProfile ? (
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={openEditProfile}
                >
                  Edit profile
                </button>
              ) : (
                <button
                  type="button"
                  className={`profile-follow-btn ${isFollowing ? "following" : ""}`}
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          <div className="profile-stats-row">
            <div className="profile-stat-card">
              <span className="profile-stat-label">Reviews</span>
              <span className="profile-stat-value">{stats.reviewCount}</span>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-label">Restaurants</span>
              <span className="profile-stat-value">{stats.restaurantCount}</span>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-label">Cities</span>
              <span className="profile-stat-value">{stats.cityCount}</span>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-label">Avg score</span>
              <span className="profile-stat-value">{stats.avgScore}</span>
            </div>
          </div>
        </div>

        <div className="profile-controls">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="profile-sort-select"
            aria-label="Sort reviews"
          >
            <option value="date">Newest</option>
            <option value="score">Score</option>
            <option value="photos">With Photos</option>
          </select>
          <button
            type="button"
            className="profile-order-btn"
            onClick={toggleOrder}
            aria-label={`Order ${order}`}
          >
            {order === "desc" ? "↓ Desc" : "↑ Asc"}
          </button>
          <div className="profile-view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${view === "grid" ? "active" : ""}`}
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
            >
              ⊞ Grid
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${view === "list" ? "active" : ""}`}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              ☰ List
            </button>
          </div>
        </div>

        {initialLoading ? (
          <p className="profile-loading">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <div
            className={`profile-reviews-grid ${view === "list" ? "is-list" : ""}`}
          >
            {reviews.map((r) => (
              <ReviewTile key={r._id || r.id} r={r} />
            ))}
          </div>
        ) : (
          <p className="profile-empty">No posts yet.</p>
        )}

        {page < totalPages && (
          <div className="profile-load-more-wrap">
            <button
              type="button"
              className="profile-load-more-btn"
              onClick={() => loadReviews(profileId, page + 1, false)}
              disabled={loading}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        {isOwnProfile && (
          <section className="profile-receipts-section">
            <h3 className="profile-receipts-title">My receipts</h3>
            <p className="profile-receipts-hint">
              Private — not shown on your public reviews. Open to view the image.
            </p>
            {receiptsLoading ? (
              <p className="profile-empty">Loading receipts…</p>
            ) : receipts.length === 0 ? (
              <p className="profile-empty">
                No receipts yet. Use Submit → scan a receipt when you write a
                review.
              </p>
            ) : (
              <ul className="profile-receipts-list">
                {receipts.map((rc) => (
                  <li key={rc._id} className="profile-receipt-item">
                    <div>
                      <div className="profile-receipt-label">Receipt</div>
                      <div className="profile-receipt-meta">
                        {formatDate(rc.createdAt || rc.updatedAt)} ·{" "}
                        {rc.status || "—"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="profile-receipt-view-btn"
                      onClick={() => openReceiptImage(rc._id)}
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isOwnProfile && (
          <button
            type="button"
            onClick={handleLogout}
            className="profile-logout-btn"
          >
            Logout
          </button>
        )}
      </div>

      <ReviewDetailModal
        review={selectedReview}
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        currentUserId={selfId}
        allowModify={isOwnProfile}
        onUpdated={handleReviewUpdated}
        onDeleted={handleReviewDeleted}
      />

      {socialList.open && (
        <div
          className="profile-social-modal-overlay"
          onClick={() =>
            setSocialList({ open: false, type: "", users: [], loading: false })
          }
        >
          <div
            className="profile-social-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-social-modal-header">
              <h3>
                {socialList.type === "followers" ? "Followers" : "Following"}
              </h3>
              <button
                type="button"
                className="profile-social-modal-close"
                onClick={() =>
                  setSocialList({
                    open: false,
                    type: "",
                    users: [],
                    loading: false,
                  })
                }
              >
                ×
              </button>
            </div>
            {socialList.loading ? (
              <p className="profile-empty">Loading…</p>
            ) : socialList.users.length === 0 ? (
              <p className="profile-empty">No users yet.</p>
            ) : (
              <ul className="profile-social-list">
                {socialList.users.map((u) => (
                  <li key={u._id}>
                    <Link
                      to={`/users/${u._id}`}
                      className="profile-social-list-item"
                      onClick={() =>
                        setSocialList({
                          open: false,
                          type: "",
                          users: [],
                          loading: false,
                        })
                      }
                    >
                      {u.username}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {editOpen && (
        <div
          className="profile-social-modal-overlay"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="profile-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-social-modal-header">
              <h3>Edit profile</h3>
              <button
                type="button"
                className="profile-social-modal-close"
                onClick={() => setEditOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="profile-edit-form">
              <label>
                Bio
                <textarea
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, bio: e.target.value })
                  }
                  rows={3}
                  placeholder="Tell people about your food journey…"
                />
              </label>
              <label>
                First name
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                />
              </label>
              <label>
                Last name
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                />
              </label>
              <label>
                Profile picture URL
                <input
                  type="url"
                  value={editForm.profilePicture}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      profilePicture: e.target.value,
                    })
                  }
                  placeholder="https://…"
                />
              </label>
              <label>
                City
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm({ ...editForm, city: e.target.value })
                  }
                />
              </label>
              <label>
                Province
                <input
                  type="text"
                  value={editForm.province}
                  onChange={(e) =>
                    setEditForm({ ...editForm, province: e.target.value })
                  }
                />
              </label>
              <label>
                Country
                <input
                  type="text"
                  value={editForm.country}
                  onChange={(e) =>
                    setEditForm({ ...editForm, country: e.target.value })
                  }
                />
              </label>
              <button
                type="button"
                className="profile-edit-save-btn"
                onClick={saveProfile}
                disabled={editSaving}
              >
                {editSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptLightbox.open && (
        <div
          role="dialog"
          aria-modal="true"
          className="profile-receipt-lightbox"
          onClick={() => setReceiptLightbox({ open: false, url: "" })}
        >
          <div
            className="profile-receipt-lightbox-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="profile-receipt-lightbox-close"
              onClick={() => setReceiptLightbox({ open: false, url: "" })}
              aria-label="Close"
            >
              ×
            </button>
            {receiptLightbox.url && (
              <img
                src={receiptLightbox.url}
                alt="Receipt"
                className="profile-receipt-lightbox-img"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
