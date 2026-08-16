import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "../api/axios";
import SEO from "../components/SEO";
import PhotoPlaceholder from "../components/PhotoPlaceholder";
import { FOOD_CATEGORIES, FOOD_TYPES } from "../utils/standardizedOptions";
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

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "facebook", label: "Facebook" },
];

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
  const [hasMorePages, setHasMorePages] = useState(false);
  const [queuePage, setQueuePage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [queueTotal, setQueueTotal] = useState(null);
  const [queueCities, setQueueCities] = useState([]);
  const [itemSearchInput, setItemSearchInput] = useState("");

  const [filters, setFilters] = useState({
    hasPhoto: "",
    posted: "false",
    staged: "true",
    status: "",
    itemSearch: "",
    foodCategory: "",
    foodType: "",
    city: "",
    sort: "reviewDate",
    order: "desc",
    uniqueByFoodItem: false,
  });

  const hasFoodOrCityFilters =
    filters.itemSearch ||
    filters.foodCategory ||
    filters.foodType ||
    filters.city;

  const usesPagePagination =
    filters.uniqueByFoodItem ||
    filters.sort !== "reviewDate" ||
    hasFoodOrCityFilters;

  const foodTypeOptions = useMemo(() => {
    if (!filters.foodCategory) return [];
    return (FOOD_TYPES[filters.foodCategory] || []).filter(
      (t) => t !== "Add +"
    );
  }, [filters.foodCategory]);

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
  const [exporting, setExporting] = useState(false);

  const [statsFilters, setStatsFilters] = useState({
    city: "",
    hasPhoto: "",
    staged: "",
  });
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    const { data } = await axios.get("/social/settings");
    setSettings(data);
    setSettingsDraft(data);
  }, []);

  const buildQueueParams = useCallback(
    (cursorOrPage, isLoadMore = false) => {
      const params = { limit: 50 };
      if (filters.hasPhoto) params.hasPhoto = filters.hasPhoto;
      if (filters.posted) params.posted = filters.posted;
      if (filters.staged) params.staged = filters.staged;
      if (filters.status) params.status = filters.status;
      if (filters.itemSearch) params.itemSearch = filters.itemSearch;
      if (filters.foodCategory) params.foodCategory = filters.foodCategory;
      if (filters.foodType) params.foodType = filters.foodType;
      if (filters.city) params.city = filters.city;
      if (filters.sort) params.sort = filters.sort;
      if (filters.order) params.order = filters.order;
      if (filters.uniqueByFoodItem) params.uniqueBy = "foodItem";

      if (usesPagePagination) {
        params.page = isLoadMore ? cursorOrPage : 1;
      } else if (cursorOrPage) {
        params.cursor = cursorOrPage;
      }

      return params;
    },
    [filters, usesPagePagination]
  );

  const loadQueue = useCallback(
    async (reset = true, cursorOrPage = null) => {
      try {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const pageToLoad = reset ? 1 : cursorOrPage || queuePage + 1;
        const { data } = await axios.get("/social/queue", {
          params: buildQueueParams(
            usesPagePagination ? pageToLoad : cursorOrPage,
            !reset && usesPagePagination
          ),
        });

        setNextCursor(data.nextCursor || null);
        setHasMorePages(!!data.hasMore);
        setQueuePage(data.page || pageToLoad);
        setQueueTotal(typeof data.total === "number" ? data.total : null);
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
    [buildQueueParams, queuePage, usesPagePagination]
  );

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const params = {};
      if (statsFilters.city) params.city = statsFilters.city;
      if (statsFilters.hasPhoto) params.hasPhoto = statsFilters.hasPhoto;
      if (statsFilters.staged) params.staged = statsFilters.staged;
      const { data } = await axios.get("/social/stats", { params });
      setStatsData(data);
    } catch (err) {
      console.error("Failed to load social stats", err);
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  }, [statsFilters]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    axios
      .get("/social/queue/filters")
      .then(({ data }) => setQueueCities(data.cities || []))
      .catch(() => setQueueCities([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => {
        const next = itemSearchInput.trim();
        if (f.itemSearch === next) return f;
        return { ...f, itemSearch: next };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearchInput]);

  useEffect(() => {
    if (tab === "queue") loadQueue(true);
  }, [tab, filters, loadQueue]);

  useEffect(() => {
    if (tab === "stats") loadStats();
  }, [tab, statsFilters, loadStats]);

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

  const slugify = (str) =>
    (str || "card")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

  const downloadImage = async (url, filename) => {
    if (!url) return;
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      // Fallback if a CORS/blob download is blocked — open in a new tab.
      window.open(url, "_blank", "noopener");
    }
  };

  const handleDownloadCard = () => {
    if (!selected?.socialPost?.cardImageUrl) return;
    const name = `${slugify(selected.itemName)}-${selected.score}-card.png`;
    downloadImage(selected.socialPost.cardImageUrl, name);
  };

  const handleDownloadSource = () => {
    if (!detailPhoto) return;
    const ext = (detailPhoto.split("?")[0].match(/\.(jpg|jpeg|png|webp)$/i) || [
      "",
      "jpg",
    ])[1];
    const name = `${slugify(selected?.itemName)}-source.${ext}`;
    downloadImage(detailPhoto, name);
  };

  const handleExtract = async () => {
    try {
      setExporting(true);
      const params = buildQueueParams();
      delete params.limit;
      delete params.page;
      delete params.cursor;
      const { data } = await axios.get("/social/queue/export", {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `social-reviews-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Downloaded filtered reviews");
    } catch (err) {
      console.error("Failed to extract social queue", err);
      setMessage("Could not extract reviews");
    } finally {
      setExporting(false);
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
          className={`social-tab-btn ${tab === "stats" ? "active" : ""}`}
          onClick={() => setTab("stats")}
        >
          Stats
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
            <label className="social-filter-search">
              Food search
              <input
                type="search"
                placeholder="Dish name…"
                value={itemSearchInput}
                onChange={(e) => setItemSearchInput(e.target.value)}
              />
            </label>
            <label>
              Category
              <select
                value={filters.foodCategory}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    foodCategory: e.target.value,
                    foodType: "",
                  }))
                }
              >
                <option value="">Any</option>
                {FOOD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Food type
              <select
                value={filters.foodType}
                disabled={!filters.foodCategory}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, foodType: e.target.value }))
                }
              >
                <option value="">Any</option>
                {foodTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              City
              <select
                value={filters.city}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, city: e.target.value }))
                }
              >
                <option value="">Any</option>
                {queueCities.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort by
              <select
                value={filters.sort}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sort: e.target.value }))
                }
              >
                <option value="reviewDate">Review date</option>
                <option value="score">Score</option>
                <option value="itemName">Food item</option>
                <option value="restaurantName">Restaurant</option>
              </select>
            </label>
            <label>
              Order
              <select
                value={filters.order}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, order: e.target.value }))
                }
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
            <label className="social-filter-checkbox">
              <input
                type="checkbox"
                checked={filters.uniqueByFoodItem}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    uniqueByFoodItem: e.target.checked,
                  }))
                }
              />
              Unique by food item
            </label>
            <button
              type="button"
              className="social-btn secondary"
              disabled={exporting || loading}
              onClick={handleExtract}
            >
              {exporting ? "Extracting…" : "Extract CSV"}
            </button>
          </div>

          {queueTotal !== null && (
            <p className="social-filter-count">
              <strong>{queueTotal}</strong>{" "}
              {filters.uniqueByFoodItem
                ? queueTotal === 1
                  ? "distinct food item matches"
                  : "distinct food items match"
                : queueTotal === 1
                  ? "review matches"
                  : "reviews match"}{" "}
              this filter
              {filters.hasPhoto === "true" && filters.posted === "false"
                ? " — available to post"
                : ""}
            </p>
          )}

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
                      {item.reviewDate
                        ? ` · ${formatReviewDate(item.reviewDate)}`
                        : ""}
                    </p>
                    <p className="social-queue-sub">
                      {[item.category, item.type].filter(Boolean).join(" · ") ||
                        "Uncategorized"}
                      {item.hasRealPhoto ? " · Photo" : " · No photo"}
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

          {(usesPagePagination ? hasMorePages : nextCursor) && (
            <div className="social-load-more">
              <button
                type="button"
                className="social-btn secondary"
                disabled={loadingMore}
                onClick={() =>
                  loadQueue(
                    false,
                    usesPagePagination ? queuePage + 1 : nextCursor
                  )
                }
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {tab === "stats" && (
        <>
          <div className="social-filter-bar">
            <label>
              City
              <select
                value={statsFilters.city}
                onChange={(e) =>
                  setStatsFilters((f) => ({ ...f, city: e.target.value }))
                }
              >
                <option value="">Any</option>
                {queueCities.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Photo
              <select
                value={statsFilters.hasPhoto}
                onChange={(e) =>
                  setStatsFilters((f) => ({
                    ...f,
                    hasPhoto: e.target.value,
                  }))
                }
              >
                <option value="">Any</option>
                <option value="true">Has photo</option>
                <option value="false">No photo</option>
              </select>
            </label>
            <label>
              Staged
              <select
                value={statsFilters.staged}
                onChange={(e) =>
                  setStatsFilters((f) => ({
                    ...f,
                    staged: e.target.value,
                  }))
                }
              >
                <option value="">Any</option>
                <option value="true">
                  Staged (≥{" "}
                  {statsData?.stagingThreshold ??
                    settings?.stagingThreshold ??
                    70}
                  )
                </option>
                <option value="false">Below threshold</option>
              </select>
            </label>
          </div>

          {statsLoading ? (
            <p className="social-empty">Loading stats…</p>
          ) : !statsData || statsData.categories?.length === 0 ? (
            <p className="social-empty">No reviews match these filters.</p>
          ) : (
            <>
              <p className="social-filter-count">
                <strong>{statsData.totalReviews}</strong>{" "}
                {statsData.totalReviews === 1 ? "review" : "reviews"} across{" "}
                <strong>{statsData.categories.length}</strong>{" "}
                {statsData.categories.length === 1 ? "category" : "categories"}
                {statsData.stagingThreshold != null && (
                  <>
                    {" "}
                    · staging threshold{" "}
                    <strong>{statsData.stagingThreshold}</strong>
                  </>
                )}
              </p>

              <div className="social-stats-list">
                {statsData.categories.map((cat) => (
                  <section
                    key={cat.category}
                    className="social-stats-category"
                  >
                    <header className="social-stats-category-header">
                      <h2>{cat.category}</h2>
                      <div className="social-stats-category-summary">
                        <span>{cat.reviewCount} reviews</span>
                        <span>{cat.distinctFoodItems} dishes</span>
                        <span>avg {cat.avgScore}</span>
                        <span>{cat.withPhoto} with photo</span>
                        <span>{cat.staged} staged</span>
                      </div>
                    </header>
                    <div className="social-stats-table-wrap">
                      <table className="social-stats-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Reviews</th>
                            <th>Dishes</th>
                            <th>Avg score</th>
                            <th>With photo</th>
                            <th>Staged</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.types.map((row) => (
                            <tr key={`${cat.category}-${row.type}`}>
                              <td>{row.type}</td>
                              <td>{row.reviewCount}</td>
                              <td>{row.distinctFoodItems}</td>
                              <td>{row.avgScore}</td>
                              <td>{row.withPhoto}</td>
                              <td>{row.staged}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            </>
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
                  {PLATFORMS.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={detailPlatforms.includes(p.id)}
                        onChange={(e) => {
                          setDetailPlatforms((prev) =>
                            e.target.checked
                              ? [...prev, p.id]
                              : prev.filter((x) => x !== p.id)
                          );
                        }}
                      />{" "}
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              {PLATFORMS.some(
                (p) => selected.socialPost?.targets?.[p.id]?.error
              ) && (
                <div className="social-error-box">
                  {PLATFORMS.map((p) =>
                    selected.socialPost?.targets?.[p.id]?.error ? (
                      <p key={p.id}>
                        {p.label}: {selected.socialPost.targets[p.id].error}
                      </p>
                    ) : null
                  )}
                </div>
              )}

              {PLATFORMS.some(
                (p) => selected.socialPost?.targets?.[p.id]?.permalink
              ) && (
                <div className="social-permalink">
                  {PLATFORMS.map((p) =>
                    selected.socialPost?.targets?.[p.id]?.permalink ? (
                      <p key={p.id}>
                        <a
                          href={selected.socialPost.targets[p.id].permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View on {p.label}
                        </a>
                      </p>
                    ) : null
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
                  disabled={!selected.socialPost?.cardImageUrl}
                  onClick={handleDownloadCard}
                >
                  Download card
                </button>
                {detailPhoto && (
                  <button
                    type="button"
                    className="social-btn secondary"
                    onClick={handleDownloadSource}
                  >
                    Download source
                  </button>
                )}
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
