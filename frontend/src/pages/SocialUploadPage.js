import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "../api/axios";
import SEO from "../components/SEO";
import PhotoPlaceholder from "../components/PhotoPlaceholder";
import "../styles/SocialUploadPage.css";

const STATUS_LABELS = {
  none: "Not started",
  draft: "Draft",
  approved: "Approved",
  published: "Published",
  failed: "Failed",
  skipped: "Skipped",
};

function formatReviewDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const DEFAULT_TRANSFORM = { rotation: 0, scale: 1, offsetX: 0, offsetY: 0 };

function renderCaptionFromTemplate(template, item) {
  if (!template || !item) return "";
  return template
    .replace(/{itemName}/g, item.itemName || "")
    .replace(/{restaurantName}/g, item.restaurantName || "")
    .replace(/{score}/g, String(item.score ?? 0))
    .replace(/{date}/g, formatReviewDate(item.reviewDate))
    .replace(/{city}/g, item.city || "");
}

function SocialUploadPage() {
  const [tab, setTab] = useState("queue");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filters, setFilters] = useState({
    hasPhoto: "",
    posted: "false",
    staged: "true",
    status: "",
  });

  const [settings, setSettings] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [selected, setSelected] = useState(null);
  const [detailCaption, setDetailCaption] = useState("");
  const [detailPlatforms, setDetailPlatforms] = useState(["instagram"]);
  const [detailPhoto, setDetailPhoto] = useState(null);
  const [detailTransform, setDetailTransform] = useState(DEFAULT_TRANSFORM);
  const [transformDirty, setTransformDirty] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadSettings = useCallback(async () => {
    const { data } = await axios.get("/social/settings");
    setSettings(data);
    setSettingsDraft(data);
  }, []);

  const buildQueueParams = useCallback(
    (cursor) => {
      const params = { limit: 50 };
      if (filters.hasPhoto) params.hasPhoto = filters.hasPhoto;
      if (filters.posted) params.posted = filters.posted;
      if (filters.staged) params.staged = filters.staged;
      if (filters.status) params.status = filters.status;
      if (cursor) params.cursor = cursor;
      return params;
    },
    [filters]
  );

  const loadQueue = useCallback(
    async (reset = true, cursor = null) => {
      try {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const { data } = await axios.get("/social/queue", {
          params: buildQueueParams(cursor),
        });

        setNextCursor(data.nextCursor || null);
        setItems((prev) =>
          reset ? data.items || [] : [...prev, ...(data.items || [])]
        );
      } catch (err) {
        console.error("Failed to load social queue", err);
        if (reset) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQueueParams]
  );

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (tab === "queue") loadQueue(true);
  }, [tab, filters, loadQueue]);

  useEffect(() => {
    if (!selected || selected.socialPost?.caption) return;
    const prefilled = renderCaptionFromTemplate(
      settings?.captionTemplate,
      selected
    );
    if (prefilled) setDetailCaption(prefilled);
  }, [settings, selected]);

  useEffect(() => {
    if (!selected) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const openDetail = (item) => {
    setSelected(item);
    const savedCaption = item.socialPost?.caption;
    const prefilled =
      savedCaption ||
      renderCaptionFromTemplate(settings?.captionTemplate, item);
    setDetailCaption(prefilled);
    setDetailPhoto(
      item.socialPost?.sourcePhotoUrl || item.photos?.[0] || null
    );
    setDetailTransform({
      ...DEFAULT_TRANSFORM,
      ...(item.socialPost?.sourceTransform || {}),
    });
    setTransformDirty(false);
    setDetailPlatforms(
      settings?.defaultPlatforms?.length
        ? [...settings.defaultPlatforms]
        : ["instagram"]
    );
    setMessage("");
  };

  const closeDetail = () => {
    setSelected(null);
    setMessage("");
  };

  const refreshItemInList = (socialPost, reviewId) => {
    setItems((prev) =>
      prev.map((it) =>
        it.reviewId === reviewId ? { ...it, socialPost } : it
      )
    );
    if (selected?.reviewId === reviewId) {
      setSelected((s) => ({ ...s, socialPost }));
      if (socialPost?.caption != null) setDetailCaption(socialPost.caption);
      if (socialPost?.sourcePhotoUrl) setDetailPhoto(socialPost.sourcePhotoUrl);
      if (socialPost?.sourceTransform) {
        setDetailTransform({
          ...DEFAULT_TRANSFORM,
          ...socialPost.sourceTransform,
        });
      }
      setTransformDirty(false);
    }
  };

  const updateTransform = (patch) => {
    setTransformDirty(true);
    setDetailTransform((t) => ({ ...t, ...patch }));
  };

  const rotateBy = (deg) =>
    updateTransform({
      rotation: ((detailTransform.rotation + deg) % 360 + 360) % 360,
    });

  const handleGenerate = async (item, e) => {
    e?.stopPropagation();
    try {
      setDetailBusy(true);
      const isSelected = selected?.reviewId === item.reviewId;
      const { data } = await axios.post("/social/generate", {
        reviewId: item.reviewId,
        ...(isSelected
          ? { transform: detailTransform, sourcePhotoUrl: detailPhoto }
          : {}),
      });
      refreshItemInList(data.socialPost, item.reviewId);
      setMessage("Card generated");
    } catch (err) {
      const msg =
        err.response?.data?.error === "missing_social_asset"
          ? "Missing badge.svg in backend/assets/social/"
          : err.response?.data?.message || "Generate failed";
      setMessage(msg);
    } finally {
      setDetailBusy(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      const { data } = await axios.put("/social/settings", {
        captionTemplate: settingsDraft.captionTemplate,
        stagingThreshold: settingsDraft.stagingThreshold,
        defaultPlatforms: settingsDraft.defaultPlatforms,
      });
      setSettings(data);
      setSettingsDraft(data);
      setMessage("Settings saved");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handlePatch = async (body) => {
    if (!selected) return;
    try {
      setDetailBusy(true);
      const { data } = await axios.patch(`/social/${selected.reviewId}`, body);
      refreshItemInList(data.socialPost, selected.reviewId);
      setMessage("Updated");
    } catch (err) {
      setMessage(err.response?.data?.message || "Update failed");
    } finally {
      setDetailBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!selected) return;
    try {
      setDetailBusy(true);
      const { data } = await axios.post("/social/publish", {
        reviewId: selected.reviewId,
        platforms: detailPlatforms,
      });
      refreshItemInList(data.socialPost, selected.reviewId);
      setMessage(
        data.socialPost.status === "published"
          ? "Published successfully"
          : "Publish completed with errors — see platform details"
      );
    } catch (err) {
      setMessage(err.response?.data?.message || "Publish failed");
    } finally {
      setDetailBusy(false);
    }
  };

  const samplePreview =
    settingsDraft?.captionTemplate
      ?.replace(/{itemName}/g, "Double Cheese Burger")
      .replace(/{restaurantName}/g, "Congress Beer House")
      .replace(/{score}/g, "91")
      .replace(/{date}/g, "Jun 18, 2026")
      .replace(/{city}/g, "Saskatoon") || "";

  // When the user is mid-adjustment, preview the source photo with the
  // transform applied live (the baked card only updates on regenerate).
  const showLivePreview = transformDirty;
  const coverBoost = detailTransform.rotation % 180 === 90 ? 1.3 : 1;
  const livePreviewStyle = {
    transform: `rotate(${detailTransform.rotation}deg) scale(${
      detailTransform.scale * coverBoost
    })`,
  };

  const canGenerate = (item) => item.hasRealPhoto;
  const canPublish =
    selected?.socialPost?.status === "approved" ||
    selected?.socialPost?.status === "failed";

  return (
    <div className="social-upload-page">
      <SEO
        title="Social Upload | Best Food App"
        description="Admin social upload portal"
      />

      <header className="social-upload-header">
        <h1>Social Upload</h1>
        <p>
          Turn admin reviews into branded social cards. Staging marks candidates
          — you approve before anything goes live.
        </p>
      </header>

      <div className="social-upload-tabs">
        <button
          type="button"
          className={`social-tab-btn ${tab === "queue" ? "active" : ""}`}
          onClick={() => setTab("queue")}
        >
          Queue
        </button>
        <button
          type="button"
          className={`social-tab-btn ${tab === "settings" ? "active" : ""}`}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
      </div>

      {message && (
        <p style={{ color: "#6b4a99", fontSize: "0.9rem", marginBottom: 12 }}>
          {message}
        </p>
      )}

      {tab === "queue" && (
        <>
          <div className="social-filter-bar">
            <label>
              Photo
              <select
                value={filters.hasPhoto}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, hasPhoto: e.target.value }))
                }
              >
                <option value="">Any</option>
                <option value="true">Has photo</option>
                <option value="false">No photo</option>
              </select>
            </label>
            <label>
              Posted
              <select
                value={filters.posted}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, posted: e.target.value }))
                }
              >
                <option value="">Any</option>
                <option value="false">Unposted</option>
                <option value="true">Posted</option>
              </select>
            </label>
            <label>
              Staged
              <select
                value={filters.staged}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, staged: e.target.value }))
                }
              >
                <option value="">Any</option>
                <option value="true">Staged (≥ threshold)</option>
                <option value="false">Below threshold</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value }))
                }
              >
                <option value="">Any</option>
                <option value="none">Not started</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </label>
          </div>

          {loading ? (
            <p className="social-empty">Loading admin reviews…</p>
          ) : items.length === 0 ? (
            <p className="social-empty">No reviews match these filters.</p>
          ) : (
            <div className="social-queue-list">
              {items.map((item) => (
                <div
                  key={item.reviewId}
                  className="social-queue-card"
                  onClick={() => openDetail(item)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && openDetail(item)
                  }
                  role="button"
                  tabIndex={0}
                >
                  {item.photos?.[0] ? (
                    <img
                      src={item.photos[0]}
                      alt=""
                      className="social-queue-thumb"
                    />
                  ) : (
                    <div className="social-queue-thumb-placeholder">
                      No photo
                    </div>
                  )}
                  <div className="social-queue-info">
                    <p className="social-queue-title">{item.itemName}</p>
                    <p className="social-queue-sub">
                      {item.restaurantName} · Score {item.score}
                    </p>
                    <div className="social-badge-row">
                      {item.isStaged && (
                        <span className="social-badge staged">Staged</span>
                      )}
                      <span
                        className={`social-badge status-${item.socialPost?.status || "none"}`}
                      >
                        {STATUS_LABELS[item.socialPost?.status || "none"]}
                      </span>
                    </div>
                  </div>
                  <div className="social-queue-actions">
                    <button
                      type="button"
                      className="social-btn primary"
                      disabled={!canGenerate(item) || detailBusy}
                      onClick={(e) => handleGenerate(item, e)}
                    >
                      Generate
                    </button>
                    {!item.hasRealPhoto && (
                      <span className="social-hint">Needs a real photo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {nextCursor && (
            <div className="social-load-more">
              <button
                type="button"
                className="social-btn secondary"
                disabled={loadingMore}
                onClick={() => loadQueue(false, nextCursor)}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {tab === "settings" && settingsDraft && (
        <div className="social-settings-panel">
          <h2>Global settings</h2>

          <div className="social-form-group">
            <label htmlFor="captionTemplate">Caption template</label>
            <textarea
              id="captionTemplate"
              value={settingsDraft.captionTemplate}
              onChange={(e) =>
                setSettingsDraft((s) => ({
                  ...s,
                  captionTemplate: e.target.value,
                }))
              }
            />
            <p className="social-placeholder-list">
              Placeholders:{" "}
              {(settingsDraft.supportedPlaceholders || []).map((p) => (
                <code key={p}>{`{${p}}`}</code>
              ))}
            </p>
            <p style={{ marginTop: 10, fontWeight: 600, fontSize: "0.85rem" }}>
              Live preview
            </p>
            <div className="social-preview-box">{samplePreview}</div>
          </div>

          <div className="social-form-group">
            <label htmlFor="stagingThreshold">Staging threshold (0–100)</label>
            <input
              id="stagingThreshold"
              type="number"
              min={0}
              max={100}
              value={settingsDraft.stagingThreshold}
              onChange={(e) =>
                setSettingsDraft((s) => ({
                  ...s,
                  stagingThreshold: Number(e.target.value),
                }))
              }
            />
          </div>

          <div className="social-form-group">
            <label>Default platforms</label>
            <div className="social-platform-toggles">
              {["instagram", "x"].map((p) => (
                <label key={p}>
                  <input
                    type="checkbox"
                    checked={settingsDraft.defaultPlatforms?.includes(p)}
                    onChange={(e) => {
                      const current = settingsDraft.defaultPlatforms || [];
                      setSettingsDraft((s) => ({
                        ...s,
                        defaultPlatforms: e.target.checked
                          ? [...current, p]
                          : current.filter((x) => x !== p),
                      }));
                    }}
                  />{" "}
                  {p === "instagram" ? "Instagram" : "X"}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="social-btn primary"
            disabled={settingsSaving}
            onClick={handleSaveSettings}
          >
            {settingsSaving ? "Saving…" : "Save settings"}
          </button>
        </div>
      )}

      {selected &&
        createPortal(
        <div
          className="social-detail-overlay"
          onClick={closeDetail}
          role="presentation"
        >
          <div
            className="social-detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="social-detail-preview-col">
              <h2>{selected.itemName}</h2>
              <p className="social-detail-sub">
                {selected.restaurantName} · Score {selected.score}
              </p>

              <div className="social-card-preview-wrap">
                {showLivePreview && detailPhoto ? (
                  <img
                    src={detailPhoto}
                    alt="Source photo preview"
                    className="social-card-preview"
                    style={livePreviewStyle}
                  />
                ) : selected.socialPost?.cardImageUrl ? (
                  <img
                    src={selected.socialPost.cardImageUrl}
                    alt="Rendered social card"
                    className="social-card-preview"
                  />
                ) : detailPhoto ? (
                  <img
                    src={detailPhoto}
                    alt="Source photo preview"
                    className="social-card-preview"
                    style={livePreviewStyle}
                  />
                ) : (
                  <div className="social-card-preview-placeholder">
                    <PhotoPlaceholder />
                  </div>
                )}
              </div>

              <div className="social-transform-controls">
                <div className="social-transform-row">
                  <span className="social-section-label">Adjust photo</span>
                  <div className="social-transform-buttons">
                    <button
                      type="button"
                      className="social-icon-btn"
                      title="Rotate left"
                      onClick={() => rotateBy(-90)}
                    >
                      ⟲
                    </button>
                    <button
                      type="button"
                      className="social-icon-btn"
                      title="Rotate right"
                      onClick={() => rotateBy(90)}
                    >
                      ⟳
                    </button>
                    <button
                      type="button"
                      className="social-icon-btn"
                      title="Reset"
                      disabled={
                        !transformDirty &&
                        detailTransform.rotation === 0 &&
                        detailTransform.scale === 1
                      }
                      onClick={() => {
                        setDetailTransform(DEFAULT_TRANSFORM);
                        setTransformDirty(true);
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <label className="social-zoom-label">
                  Zoom
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={detailTransform.scale}
                    onChange={(e) =>
                      updateTransform({ scale: Number(e.target.value) })
                    }
                  />
                  <span>{detailTransform.scale.toFixed(2)}×</span>
                </label>
                {transformDirty && selected.socialPost?.cardImageUrl && (
                  <p className="social-transform-hint">
                    Adjustments preview only — click Regenerate to bake them in.
                  </p>
                )}
              </div>

              {selected.photos?.length > 0 && (
                <>
                  <p className="social-section-label">Source photo</p>
                  <div className="social-photo-pick">
                    {selected.photos.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className={
                          detailPhoto === url ? "selected" : undefined
                        }
                        onClick={() => {
                          setDetailPhoto(url);
                          setTransformDirty(true);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="social-detail-form-col">
              <div className="social-form-group">
                <label htmlFor="detailCaption">Caption</label>
                <textarea
                  id="detailCaption"
                  value={detailCaption}
                  onChange={(e) => setDetailCaption(e.target.value)}
                />
                <p className="social-char-count">
                  {detailCaption.length} characters
                  {detailCaption.length > 2200 && " — may truncate on Instagram"}
                </p>
              </div>

              <div className="social-form-group">
                <label>Publish to</label>
                <div className="social-platform-toggles">
                  {["instagram", "x"].map((p) => (
                    <label key={p}>
                      <input
                        type="checkbox"
                        checked={detailPlatforms.includes(p)}
                        onChange={(e) => {
                          setDetailPlatforms((prev) =>
                            e.target.checked
                              ? [...prev, p]
                              : prev.filter((x) => x !== p)
                          );
                        }}
                      />{" "}
                      {p === "instagram" ? "Instagram" : "X"}
                    </label>
                  ))}
                </div>
              </div>

              {(selected.socialPost?.targets?.instagram?.error ||
                selected.socialPost?.targets?.x?.error) && (
                <div className="social-error-box">
                  {selected.socialPost.targets.instagram?.error && (
                    <p>Instagram: {selected.socialPost.targets.instagram.error}</p>
                  )}
                  {selected.socialPost.targets.x?.error && (
                    <p>X: {selected.socialPost.targets.x.error}</p>
                  )}
                </div>
              )}

              {(selected.socialPost?.targets?.instagram?.permalink ||
                selected.socialPost?.targets?.x?.permalink) && (
                <div className="social-permalink">
                  {selected.socialPost.targets.instagram?.permalink && (
                    <p>
                      <a
                        href={selected.socialPost.targets.instagram.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on Instagram
                      </a>
                    </p>
                  )}
                  {selected.socialPost.targets.x?.permalink && (
                    <p>
                      <a
                        href={selected.socialPost.targets.x.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on X
                      </a>
                    </p>
                  )}
                </div>
              )}

              <div className="social-detail-actions">
                {!selected.hasRealPhoto ? (
                  <span className="social-hint" style={{ textAlign: "left" }}>
                    Needs a real photo before generating
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="social-btn primary"
                      disabled={detailBusy}
                      onClick={() => handleGenerate(selected)}
                    >
                      {detailBusy
                        ? "Working…"
                        : selected.socialPost?.cardImageUrl
                        ? "Regenerate"
                        : "Generate"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="social-btn secondary"
                  disabled={detailBusy || !detailCaption}
                  onClick={() => handlePatch({ caption: detailCaption })}
                >
                  Save caption
                </button>
                <button
                  type="button"
                  className="social-btn secondary"
                  disabled={detailBusy || !selected.socialPost?.cardImageUrl}
                  onClick={() => handlePatch({ action: "approve" })}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="social-btn secondary"
                  disabled={detailBusy}
                  onClick={() => handlePatch({ action: "skip" })}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="social-btn primary"
                  disabled={detailBusy || !canPublish}
                  onClick={handlePublish}
                >
                  Publish
                </button>
                <button
                  type="button"
                  className="social-btn secondary"
                  onClick={closeDetail}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default SocialUploadPage;
