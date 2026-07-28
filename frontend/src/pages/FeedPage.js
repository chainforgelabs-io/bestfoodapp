import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Images } from "lucide-react";
import axios from "../api/axios";
import tokenUtils from "../utils/auth";
import PhotoPlaceholder from "../components/PhotoPlaceholder";
import SEO from "../components/SEO";
import "../styles/FeedPage.css";

const PAGE_SIZE = 50;

function FeedPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selfId, setSelfId] = useState(null);
  const [filterMode, setFilterMode] = useState("photos"); // "photos" | "all"

  useEffect(() => {
    if (!tokenUtils.isAuthenticated()) return;
    try {
      const token = tokenUtils.getToken();
      const payload = JSON.parse(atob(token.split(".")[1]));
      setSelfId(payload.id);
    } catch {
      setSelfId(null);
    }
  }, []);

  const loadFeed = useCallback(async (pageToLoad = 1, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const { data } = await axios.get("/reviews/feed", {
        params: { page: pageToLoad, limit: PAGE_SIZE, filter: filterMode },
      });

      setPage(data.page || pageToLoad);
      setTotalPages(data.totalPages || 1);
      setItems((prev) =>
        reset ? data.items || [] : [...prev, ...(data.items || [])]
      );
    } catch (err) {
      console.error("Failed to load feed", err);
      if (reset) setItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterMode]);

  useEffect(() => {
    if (!tokenUtils.isAuthenticated()) return;
    loadFeed(1, true);
  }, [loadFeed]);

  const handleLike = async (review) => {
    const liked = review.likedByMe;
    const endpoint = liked ? `/reviews/${review._id}/unlike` : `/reviews/${review._id}/like`;
    try {
      const { data } = await axios.post(endpoint);
      setItems((prev) =>
        prev.map((r) =>
          r._id === review._id
            ? {
                ...r,
                likedByMe: data.liked,
                likeCount: data.likeCount,
              }
            : r
        )
      );
    } catch (err) {
      console.error("Like failed", err);
    }
  };

  const handleFollow = async (authorId, currentlyFollowing) => {
    const endpoint = currentlyFollowing
      ? `/users/${authorId}/unfollow`
      : `/users/${authorId}/follow`;
    try {
      await axios.post(endpoint);
      setItems((prev) =>
        prev.map((r) => {
          const aid = r.author?._id || r.userId?._id;
          if (aid !== authorId) return r;
          return { ...r, authorFollowedByMe: !currentlyFollowing };
        })
      );
    } catch (err) {
      console.error("Follow failed", err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#28a745";
    if (score >= 60) return "#c9a227";
    if (score >= 40) return "#fd7e14";
    return "#dc3545";
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!tokenUtils.isAuthenticated()) {
    return (
      <div className="feed-page">
        <SEO title="Feed | Best Food App" description="Community food reviews" />
        <p className="feed-login-prompt">
          Please <Link to="/login">log in</Link> to see the community feed.
        </p>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <SEO
        title="Feed | Best Food App"
        description="Explore recent reviews from the community."
      />
      <header className="feed-header">
        <h1>Community Feed</h1>
        <p>Recent reviews from everyone on Best Food App</p>
      </header>

      <div className="feed-filter-toggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filterMode === "photos"}
          className={`feed-filter-btn ${
            filterMode === "photos" ? "active" : ""
          }`}
          onClick={() => filterMode !== "photos" && setFilterMode("photos")}
        >
          With photos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterMode === "all"}
          className={`feed-filter-btn ${filterMode === "all" ? "active" : ""}`}
          onClick={() => filterMode !== "all" && setFilterMode("all")}
        >
          All reviews
        </button>
      </div>

      {loading ? (
        <p className="feed-loading">Loading reviews…</p>
      ) : items.length === 0 ? (
        <p className="feed-empty">No reviews yet. Be the first to submit one!</p>
      ) : (
        <div className="feed-list">
          {items.map((review) => {
            const author = review.author || review.userId;
            const authorId = author?._id;
            const foodName = review.foodItem?.name || "Food item";
            const restaurantName = review.restaurantId?.name || "Restaurant";
            const score = Math.round(review.score || 0);
            const photo = review.photos?.[0];
            const photoCount = review.photos?.length || 0;
            const isOwn = authorId && selfId && authorId === selfId;

            return (
              <article key={review._id} className="feed-card">
                <div className="feed-card-media">
                  {photo ? (
                    <img src={photo} alt={foodName} className="feed-card-img" />
                  ) : (
                    <div className="feed-card-placeholder">
                      <PhotoPlaceholder />
                    </div>
                  )}
                  <span
                    className="feed-card-score"
                    style={{ color: getScoreColor(score) }}
                  >
                    {score}
                  </span>
                  {photoCount > 1 && (
                    <span className="feed-card-photo-count" aria-label={`${photoCount} photos`}>
                      <Images size={14} strokeWidth={2} aria-hidden />
                      {photoCount}
                    </span>
                  )}
                </div>

                <div className="feed-card-body">
                  <div className="feed-card-titles">
                    <h2>{foodName}</h2>
                    <p className="feed-card-restaurant">{restaurantName}</p>
                    <p className="feed-card-date">
                      {formatDate(review.reviewDate)}
                    </p>
                  </div>

                  <div className="feed-card-author-row">
                    {author && (
                      <Link
                        to={`/users/${authorId}`}
                        className="feed-author-link"
                      >
                        {author.profilePicture ? (
                          <img
                            src={author.profilePicture}
                            alt=""
                            className="feed-author-avatar"
                          />
                        ) : (
                          <span className="feed-author-avatar-fallback">
                            {author.username?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                        <span className="feed-author-name">
                          {author.username}
                        </span>
                      </Link>
                    )}

                    <div className="feed-card-actions">
                      {isOwn ? (
                        <span
                          className="feed-like-btn feed-like-count"
                          title="You can't like your own post"
                        >
                          ♥ {review.likeCount || 0}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={`feed-like-btn ${review.likedByMe ? "liked" : ""}`}
                          onClick={() => handleLike(review)}
                        >
                          {review.likedByMe ? "♥" : "♡"} {review.likeCount || 0}
                        </button>
                      )}
                      {authorId && !isOwn && (
                        <button
                          type="button"
                          className={`feed-follow-btn ${
                            review.authorFollowedByMe ? "following" : ""
                          }`}
                          onClick={() =>
                            handleFollow(authorId, review.authorFollowedByMe)
                          }
                        >
                          {review.authorFollowedByMe ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {page < totalPages && (
        <div className="feed-load-more-wrap">
          <button
            type="button"
            className="feed-load-more-btn"
            onClick={() => loadFeed(page + 1, false)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

export default FeedPage;
