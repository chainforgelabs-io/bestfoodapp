import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "../api/axios";
import "../styles/ReviewSuccessPage.css";
import SEO from "../components/SEO";

function ReviewSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [share, setShare] = useState(location.state?.share || null);
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const reviewId = location.state?.reviewId || share?.reviewId;

  useEffect(() => {
    if (share || !reviewId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`/reviews/${reviewId}/share`);
        if (!cancelled) setShare(data);
      } catch (err) {
        console.warn("Could not load share card", err?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewId, share]);

  const headline =
    share?.headline || "Review submitted — thanks for scoring a dish.";
  const shareText = share?.shareText || headline;
  const shareUrl = share?.shareUrl || "https://bestfoodapp.com";
  const imageUrl = share?.ogImageUrl || share?.photoUrl || null;

  const handleNativeShare = async () => {
    setShareBusy(true);
    try {
      const payload = {
        title: "Best Food App",
        text: shareText,
        url: shareUrl,
      };
      if (navigator.share) {
        if (imageUrl && navigator.canShare) {
          try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            const ext = blob.type.includes("png") ? "png" : "jpg";
            const file = new File([blob], `review-card.${ext}`, {
              type: blob.type || "image/jpeg",
            });
            const withFile = { ...payload, files: [file] };
            if (navigator.canShare(withFile)) {
              await navigator.share(withFile);
              return;
            }
          } catch (fileErr) {
            console.warn("Image share fallback to text", fileErr);
          }
        }
        await navigator.share(payload);
        return;
      }
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
    } catch (err) {
      if (err?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }
    } finally {
      setShareBusy(false);
    }
  };

  const critic = share?.critic;
  const remaining = critic?.remaining;

  return (
    <div className="success-page-container">
      <SEO title="Review submitted | Best Food App" noindex />
      <div className="success-content">
        <div className="success-icon">
          <div className="checkmark">✓</div>
        </div>

        <h1 className="success-title">{headline}</h1>

        {share?.verifiedVisit && (
          <p className="verified-visit-flag">Verified visit</p>
        )}

        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="success-share-card"
          />
        )}

        {critic && (
          <p className="success-critic-status">
            {critic.isCityCritic
              ? `You're a ${critic.title}. ${critic.points} points.`
              : `${critic.reviewCount} review${
                  critic.reviewCount === 1 ? "" : "s"
                } · ${remaining} more to reach the city critic board.`}
          </p>
        )}

        <div className="success-actions">
          <button
            onClick={handleNativeShare}
            className="success-button primary"
            disabled={shareBusy}
          >
            {copied ? "Copied link" : shareBusy ? "Sharing..." : "Share"}
          </button>

          <button
            onClick={() => navigate("/submit-review")}
            className="success-button secondary"
          >
            Submit another
          </button>

          <Link to="/" className="success-home-link">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ReviewSuccessPage;
