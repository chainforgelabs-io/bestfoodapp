import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import Notification from "./Notification";
import PhotoPlaceholder from "./PhotoPlaceholder";
import { restaurantPath } from "../utils/restaurantUrls";
import "../styles/ReviewDetailModal.css";

function getScoreColor(score) {
  if (score >= 80) return "#28a745";
  if (score >= 60) return "#c9a227";
  if (score >= 40) return "#fd7e14";
  return "#dc3545";
}

function getScoreBg(score) {
  if (score >= 80) return "#d4edda";
  if (score >= 60) return "#fff3cd";
  if (score >= 40) return "#ffe5d0";
  return "#f8d7da";
}

async function requestPresignedUrls(files) {
  const body = {
    files: files.map((f) => ({ fileName: f.name, contentType: f.type })),
    prefix: "reviews",
  };
  const { data } = await axios.post("/uploads/photos/presign", body);
  return data.uploads;
}

async function uploadToS3(presigned, file) {
  await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": presigned.contentType,
    },
    body: file,
  });
  return presigned.url;
}

function ReviewDetailModal({
  review,
  isOpen,
  onClose,
  currentUserId,
  onUpdated,
  onDeleted,
  allowModify = false,
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editScore, setEditScore] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editPhotos, setEditPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notification, setNotification] = useState({
    isVisible: false,
    message: "",
    type: "error",
  });

  const photos = Array.isArray(review?.photos) ? review.photos : [];
  const restaurantId =
    review?.restaurant?._id || review?.restaurantId?._id || review?.restaurantId;
  const restaurantSlug =
    review?.restaurant?.slug || review?.restaurantId?.slug || null;
  const restaurantName =
    review?.restaurant?.name || review?.restaurantId?.name || "Restaurant";
  const foodName = review?.foodItem?.name || "Food Item";
  const foodType = review?.foodItem?.type || "";
  const score = Math.round(review?.score || 0);

  // Only the review's author may edit/delete it. `allowModify` lets the host
  // page further restrict this (e.g. disable editing on someone else's profile).
  const isAuthor =
    review &&
    currentUserId &&
    String(review.userId?._id || review.userId) === String(currentUserId);
  const canModify = allowModify && isAuthor;

  useEffect(() => {
    if (!isOpen || !review) return;
    setPhotoIndex(0);
    setIsEditing(false);
    setEditScore(String(review.score ?? ""));
    setEditComment(review.comment || "");
    setEditPhotos(Array.isArray(review.photos) ? [...review.photos] : []);
  }, [isOpen, review]);

  if (!isOpen || !review) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const prevPhoto = () => {
    if (photos.length <= 1) return;
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  };

  const nextPhoto = () => {
    if (photos.length <= 1) return;
    setPhotoIndex((i) => (i + 1) % photos.length);
  };

  const handleSave = async () => {
    const num = parseInt(editScore, 10);
    if (Number.isNaN(num) || num < 0 || num > 100) {
      setNotification({
        isVisible: true,
        message: "Score must be between 0 and 100",
        type: "error",
      });
      return;
    }
    setBusy(true);
    try {
      const { data } = await axios.patch(`/reviews/${review._id}`, {
        score: num,
        comment: editComment,
        photos: editPhotos,
      });
      setNotification({
        isVisible: true,
        message: "Review updated",
        type: "success",
      });
      setIsEditing(false);
      onUpdated?.(data);
    } catch (err) {
      setNotification({
        isVisible: true,
        message: err.response?.data?.message || "Update failed",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    setBusy(true);
    try {
      await axios.delete(`/reviews/${review._id}`);
      onDeleted?.(review._id);
      onClose();
    } catch (err) {
      setNotification({
        isVisible: true,
        message: err.response?.data?.message || "Delete failed",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const presigned = await requestPresignedUrls(files);
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToS3(presigned[i], files[i]);
        if (url) urls.push(url);
      }
      setEditPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      setNotification({
        isVisible: true,
        message: "Photo upload failed",
        type: "error",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeEditPhoto = (idx) => {
    setEditPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const displayPhotos = isEditing ? editPhotos : photos;

  return ReactDOM.createPortal(
    <div
      className="review-detail-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="review-detail-modal">
        <button
          type="button"
          className="review-detail-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="review-detail-body">
          {displayPhotos.length > 0 ? (
            <div className="review-detail-carousel">
              <img
                src={displayPhotos[isEditing ? 0 : photoIndex]}
                alt={foodName}
                className="review-detail-carousel-img"
              />
              {!isEditing && displayPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    className="carousel-btn carousel-prev"
                    onClick={prevPhoto}
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="carousel-btn carousel-next"
                    onClick={nextPhoto}
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                  <div className="carousel-dots">
                    {displayPhotos.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`carousel-dot ${i === photoIndex ? "active" : ""}`}
                        onClick={() => setPhotoIndex(i)}
                        aria-label={`Photo ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="review-detail-no-photo">
              <PhotoPlaceholder />
            </div>
          )}

          <div className="review-detail-content">
            {foodType && (
              <span className="review-detail-type-tag">{foodType}</span>
            )}
            <div className="review-detail-title-row">
              <h2 className="review-detail-food-name">{foodName}</h2>
              <span
                className="review-detail-score-pill"
                style={{
                  backgroundColor: getScoreBg(score),
                  color: getScoreColor(score),
                }}
              >
                {score}
              </span>
            </div>
            <p className="review-detail-restaurant">{restaurantName}</p>
            <p className="review-detail-date">
              {formatDate(review.reviewDate || review.createdAt)}
            </p>

            {!isEditing && review.comment && (
              <p className="review-detail-comment">{review.comment}</p>
            )}

            {isEditing && (
              <div className="review-detail-edit-form">
                <label className="review-detail-label">Score (0–100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="review-detail-input"
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                />
                <label className="review-detail-label">Comment</label>
                <textarea
                  className="review-detail-textarea"
                  rows={3}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                />
                <label className="review-detail-label">Photos</label>
                <div className="review-detail-edit-photos">
                  {editPhotos.map((url, i) => (
                    <div key={i} className="edit-photo-thumb-wrap">
                      <img src={url} alt="" className="edit-photo-thumb" />
                      <button
                        type="button"
                        className="edit-photo-remove"
                        onClick={() => removeEditPhoto(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoFiles}
                  disabled={uploading}
                />
                {uploading && (
                  <p className="review-detail-uploading">Uploading…</p>
                )}
                <div className="review-detail-edit-actions">
                  <button
                    type="button"
                    className="review-detail-btn secondary"
                    onClick={() => setIsEditing(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="review-detail-btn primary"
                    onClick={handleSave}
                    disabled={busy || uploading}
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}

            <div className="review-detail-actions">
              {(restaurantSlug || restaurantId) && (
                <Link
                  to={restaurantPath({
                    slug: restaurantSlug,
                    _id: restaurantId,
                  })}
                  className="review-detail-link"
                  onClick={onClose}
                >
                  View restaurant →
                </Link>
              )}
              {canModify && !isEditing && (
                <>
                  <button
                    type="button"
                    className="review-detail-btn secondary"
                    onClick={() => setIsEditing(true)}
                    disabled={busy}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="review-detail-btn danger"
                    onClick={handleDelete}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <Notification
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={() =>
            setNotification({ ...notification, isVisible: false })
          }
        />
      </div>
    </div>,
    document.body
  );
}

export default ReviewDetailModal;
