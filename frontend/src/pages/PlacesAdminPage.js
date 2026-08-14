import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import SEO from "../components/SEO";
import StandardizedDropdown from "../components/StandardizedDropdown";
import useFoodTaxonomy from "../hooks/useFoodTaxonomy";
import { RESTAURANT_TYPES, CUISINE_TYPES } from "../utils/standardizedOptions";
import "../styles/AdminTools.css";
import "../styles/StandardizedDropdown.css";

function emptyDraft() {
  return {
    name: "",
    type: RESTAURANT_TYPES[0] || "Casual Dining",
    cuisine: [],
    website: "",
    address: {
      street: "",
      city: "",
      province: "",
      country: "Canada",
      postalCode: "",
    },
  };
}

function coerceCuisines(list, allowedList = CUISINE_TYPES) {
  const raw = Array.isArray(list) ? list : list ? [list] : [];
  const allowedByKey = new Map(
    (allowedList || []).map((c) => [String(c).toLowerCase(), c])
  );
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const trimmed = String(item || "").trim();
    if (!trimmed || trimmed === "Add +") continue;
    const canonical = allowedByKey.get(trimmed.toLowerCase());
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }
  if (out.length) return out;
  const hadOther = raw.some(
    (c) => String(c || "").trim().toLowerCase() === "other"
  );
  if (hadOther) return ["American"];
  return [];
}

function draftFromPreview(place, preview = {}, allowedCuisines = CUISINE_TYPES) {
  return {
    name: preview.name || place.name || "",
    type: RESTAURANT_TYPES.includes(preview.type)
      ? preview.type
      : RESTAURANT_TYPES[0],
    cuisine: coerceCuisines(preview.cuisine, allowedCuisines),
    website: preview.website || "",
    address: {
      street: preview.address?.street || "",
      city: preview.address?.city || "",
      province: preview.address?.province || "",
      country: preview.address?.country || "Canada",
      postalCode: preview.address?.postalCode || "",
    },
  };
}

function PlacesAdminPage() {
  const { cuisines, addOption } = useFoodTaxonomy();
  const [batches, setBatches] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [places, setPlaces] = useState([]);
  const [batch, setBatch] = useState(null);
  const [queue, setQueue] = useState([]);
  const [staged, setStaged] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [siblingSelections, setSiblingSelections] = useState({});
  const [keepGersByQueue, setKeepGersByQueue] = useState({});
  const [cardErrors, setCardErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const cardRefs = useRef({});

  const loadBatches = useCallback(async () => {
    const { data } = await axios.get("/places/batches");
    setBatches(data.batches || []);
    setSettings(data.settings || null);
  }, []);

  const loadStaged = useCallback(async () => {
    const { data } = await axios.get("/places/staged");
    const items = data.items || [];
    setStaged(items);
    setDrafts((prev) => {
      const next = { ...prev };
      const ids = new Set(items.map((i) => String(i.place._id)));
      for (const item of items) {
        const id = String(item.place._id);
        const fromPreview = draftFromPreview(item.place, item.preview || {}, cuisines);
        if (!next[id]) {
          next[id] = fromPreview;
        } else {
          // Keep admin edits, but always ensure cuisine is a valid non-empty set
          const cuisine = coerceCuisines(next[id].cuisine, cuisines);
          next[id] = {
            ...fromPreview,
            ...next[id],
            cuisine:
              cuisine.length > 0 ? cuisine : fromPreview.cuisine,
            address: {
              ...fromPreview.address,
              ...(next[id].address || {}),
            },
          };
        }
      }
      for (const key of Object.keys(next)) {
        if (!ids.has(key)) delete next[key];
      }
      return next;
    });
    // Default: apply categories to all same-name siblings
    setSiblingSelections((prev) => {
      const next = { ...prev };
      const ids = new Set(items.map((i) => String(i.place._id)));
      for (const item of items) {
        const id = String(item.place._id);
        if (!next[id]) {
          next[id] = (item.siblings || []).map((s) => String(s._id));
        }
      }
      for (const key of Object.keys(next)) {
        if (!ids.has(key)) delete next[key];
      }
      return next;
    });
    setCardErrors((prev) => {
      const next = { ...prev };
      const ids = new Set(items.map((i) => String(i.place._id)));
      for (const key of Object.keys(next)) {
        if (!ids.has(key)) delete next[key];
      }
      return next;
    });
  }, [cuisines]);

  const loadQueue = useCallback(async () => {
    const { data } = await axios.get("/places/queue");
    const items = data.items || [];
    setQueue(items);
    setKeepGersByQueue((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (item.type !== "duplicate") continue;
        const id = String(item._id);
        if (!next[id]) {
          next[id] =
            item.places?.a?.gersId ||
            item.payload?.placeGersId ||
            "";
        }
      }
      const ids = new Set(items.map((i) => String(i._id)));
      for (const key of Object.keys(next)) {
        if (!ids.has(key)) delete next[key];
      }
      return next;
    });
  }, []);

  useEffect(() => {
    Promise.all([loadBatches(), loadQueue(), loadStaged()])
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [loadBatches, loadQueue, loadStaged]);

  const openBatch = async (batchId) => {
    setSelectedBatchId(batchId);
    const { data } = await axios.get(`/places/batches/${batchId}`);
    setBatch(data.batch);
    setPlaces(data.places || []);
  };

  const savePlace = async (placeId, patch) => {
    const { data } = await axios.patch(
      `/places/batches/${selectedBatchId}/places/${placeId}`,
      patch
    );
    setPlaces((prev) =>
      prev.map((p) => (p._id === placeId ? data.place : p))
    );
    if (data.batch) setBatch(data.batch);
    setMessage("Saved — correction rule recorded");
  };

  const approveBatch = async () => {
    await axios.post(`/places/batches/${selectedBatchId}/approve`);
    setMessage("Batch approved — remaining places are active for autocomplete");
    await loadBatches();
    await openBatch(selectedBatchId);
  };

  const dismissPlace = async (placeId) => {
    await axios.post(
      `/places/batches/${selectedBatchId}/dismiss/${placeId}`
    );
    setPlaces((prev) => prev.filter((p) => p._id !== placeId));
    setMessage("Dismissed — removed from batch");
  };

  const stagePlace = async (placeId) => {
    setBusyId(placeId);
    try {
      await axios.post(
        `/places/batches/${selectedBatchId}/stage/${placeId}`
      );
      setPlaces((prev) => prev.filter((p) => p._id !== placeId));
      setMessage("Staged for verification");
      await loadStaged();
    } catch (err) {
      setMessage(err.response?.data?.message || "Stage failed");
    } finally {
      setBusyId(null);
    }
  };

  const updateDraft = (placeId, patch) => {
    const key = String(placeId);
    setCardErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || emptyDraft()),
        ...patch,
        address: {
          ...(prev[key]?.address || emptyDraft().address),
          ...(patch.address || {}),
        },
      },
    }));
  };

  const toggleSibling = (placeId, siblingId) => {
    const key = String(placeId);
    const sid = String(siblingId);
    setSiblingSelections((prev) => {
      const current = prev[key] || [];
      const next = current.includes(sid)
        ? current.filter((id) => id !== sid)
        : [...current, sid];
      return { ...prev, [key]: next };
    });
  };

  const toggleAllSiblings = (placeId, siblings) => {
    const key = String(placeId);
    setSiblingSelections((prev) => {
      const current = prev[key] || [];
      const allIds = siblings.map((s) => String(s._id));
      const allSelected =
        allIds.length > 0 && allIds.every((id) => current.includes(id));
      return {
        ...prev,
        [key]: allSelected ? [] : allIds,
      };
    });
  };

  const focusStagedCard = (placeId, errorMsg) => {
    const key = String(placeId);
    setCardErrors((prev) => ({ ...prev, [key]: errorMsg }));
    setMessage(errorMsg);
    const el = cardRefs.current[key];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const verifyStaged = async (placeId) => {
    const key = String(placeId);
    setBusyId(key);
    setCardErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      const draft = drafts[key] || emptyDraft();
      const cuisine = coerceCuisines(draft.cuisine, cuisines);
      if (!draft.name?.trim()) {
        focusStagedCard(key, "Name is required");
        return;
      }
      if (!cuisine.length) {
        focusStagedCard(key, "Select at least one cuisine");
        return;
      }
      if (cuisine.join("|") !== (draft.cuisine || []).join("|")) {
        setDrafts((prev) => ({
          ...prev,
          [key]: { ...(prev[key] || emptyDraft()), ...draft, cuisine },
        }));
      }
      const alsoPlaceIds = siblingSelections[key] || [];
      const { data } = await axios.post(`/places/staged/${key}/verify`, {
        ...draft,
        cuisine,
        alsoPlaceIds,
      });
      const siblingOk = (data.siblings || []).filter((s) => s.restaurantId)
        .length;
      const siblingErr = (data.siblings || []).filter((s) => s.error).length;
      setMessage(
        `Verified — restaurant added` +
          (siblingOk
            ? ` (+${siblingOk} same-name location${siblingOk === 1 ? "" : "s"})`
            : "") +
          (siblingErr ? `; ${siblingErr} sibling error(s)` : "")
      );
      await loadStaged();
      if (selectedBatchId) await openBatch(selectedBatchId);
    } catch (err) {
      focusStagedCard(
        key,
        err.response?.data?.message || "Verify failed"
      );
    } finally {
      setBusyId(null);
    }
  };

  const resolveDuplicate = async (queueId, resolution) => {
    setBusyId(queueId);
    try {
      const body = { resolution };
      if (resolution === "merge") {
        const keepGersId = keepGersByQueue[String(queueId)];
        if (!keepGersId) {
          setMessage("Select which place to keep before merging");
          return;
        }
        body.keepGersId = keepGersId;
      }
      await axios.post(`/places/queue/${queueId}/resolve`, body);
      setMessage(
        resolution === "merge"
          ? "Merged — duplicate dismissed"
          : "Kept separate — both restored for review"
      );
      await loadQueue();
      if (selectedBatchId) await openBatch(selectedBatchId);
    } catch (err) {
      setMessage(err.response?.data?.message || "Resolve failed");
    } finally {
      setBusyId(null);
    }
  };

  const unstagePlace = async (placeId) => {
    setBusyId(placeId);
    try {
      await axios.post(`/places/staged/${placeId}/unstage`);
      setMessage("Returned to pending review");
      await loadStaged();
      if (selectedBatchId) await openBatch(selectedBatchId);
    } catch (err) {
      setMessage(err.response?.data?.message || "Unstage failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleAutopilot = async () => {
    const { data } = await axios.put("/places/settings", {
      autopilotEnabled: !settings?.autopilotEnabled,
    });
    setSettings(data);
  };

  const runReconcile = async () => {
    const { data } = await axios.post("/places/reconcile", { limit: 500 });
    setMessage(
      `Reconcile: linked=${data.linked}, queued=${data.queued}`
    );
    await loadQueue();
  };

  if (loading) {
    return (
      <div className="admin-tools-page">
        <SEO title="Places Admin" noindex />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="admin-tools-page">
      <SEO title="Places Admin | Best Food App" noindex />
      <header className="admin-tools-header">
        <h1>Places import</h1>
        <p>
          Stage places from a batch, edit system categories, then verify to
          create restaurants. Edits and dismissals become learned rules.
        </p>
        <div className="admin-tools-nav">
          <Link to="/admin/social">Social</Link>
          <Link to="/admin/seo">SEO dashboard</Link>
          <Link to="/admin/menus">Menus</Link>
        </div>
      </header>

      {message && <p className="admin-tools-message">{message}</p>}

      <section className="admin-tools-card">
        <h2>Autopilot</h2>
        <p>
          When enabled, new batches auto-activate (exceptions still go to the
          review queue). Recommended after edit rate &lt; 2% across 3 batches.
        </p>
        <button type="button" className="admin-btn" onClick={toggleAutopilot}>
          Autopilot: {settings?.autopilotEnabled ? "ON" : "OFF"}
        </button>
        <button type="button" className="admin-btn secondary" onClick={runReconcile}>
          Run reconcile vs restaurants
        </button>
      </section>

      <section className="admin-tools-card">
        <h2>Staged restaurants ({staged.length})</h2>
        <p style={{ color: "#666", marginTop: 0 }}>
          Review mapped categories, edit as needed, then verify to add the
          restaurant to the system.
        </p>
        {staged.length === 0 ? (
          <p>No staged places. Approve a place from a batch to stage it.</p>
        ) : (
          <ul className="admin-staged-list">
            {staged.map(({ place, preview, siblings = [] }) => {
              const placeKey = String(place._id);
              const draft = drafts[placeKey] || emptyDraft();
              const selectedSiblings = siblingSelections[placeKey] || [];
              const allSiblingsSelected =
                siblings.length > 0 &&
                siblings.every((s) =>
                  selectedSiblings.includes(String(s._id))
                );
              const cardError = cardErrors[placeKey];
              return (
                <li
                  key={placeKey}
                  ref={(el) => {
                    if (el) cardRefs.current[placeKey] = el;
                    else delete cardRefs.current[placeKey];
                  }}
                  className={`admin-staged-card${
                    cardError ? " admin-staged-card--error" : ""
                  }`}
                >
                  <div className="admin-staged-meta">
                    <strong>{place.nameRaw || place.name}</strong>
                    {preview?.sourceCategory && (
                      <span className="admin-staged-source">
                        Overture: {preview.sourceCategory}
                      </span>
                    )}
                  </div>
                  {cardError && (
                    <p className="admin-staged-card-error" role="alert">
                      {cardError}
                    </p>
                  )}
                  <div className="admin-staged-fields">
                    <label>
                      Name
                      <input
                        value={draft.name}
                        onChange={(e) =>
                          updateDraft(placeKey, { name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Type
                      <select
                        value={draft.type}
                        onChange={(e) =>
                          updateDraft(placeKey, { type: e.target.value })
                        }
                      >
                        {RESTAURANT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Website
                      <input
                        value={draft.website}
                        onChange={(e) =>
                          updateDraft(placeKey, { website: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Street
                      <input
                        value={draft.address.street}
                        onChange={(e) =>
                          updateDraft(placeKey, {
                            address: { street: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label>
                      City
                      <input
                        value={draft.address.city}
                        onChange={(e) =>
                          updateDraft(placeKey, {
                            address: { city: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label>
                      Province
                      <input
                        value={draft.address.province}
                        onChange={(e) =>
                          updateDraft(placeKey, {
                            address: { province: e.target.value },
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="admin-staged-cuisine">
                    <StandardizedDropdown
                      label="Cuisine Types"
                      placeholder="Select one or more cuisines"
                      options={cuisines}
                      value={draft.cuisine || []}
                      onChange={(value) =>
                        updateDraft(placeKey, {
                          cuisine: Array.isArray(value) ? value : [],
                        })
                      }
                      onAddCustom={async (value) =>
                        addOption({ kind: "cuisine", value })
                      }
                      allowMultiple
                      required
                    />
                  </div>
                  {siblings.length > 0 && (
                    <div className="admin-place-siblings">
                      <p className="admin-place-siblings-title">
                        Found {siblings.length} other{" "}
                        <strong>{place.name}</strong> location
                        {siblings.length === 1 ? "" : "s"} in this city. Apply
                        these categories to them as well?
                      </p>
                      <button
                        type="button"
                        className="admin-btn secondary"
                        disabled={busyId === placeKey}
                        onClick={() => toggleAllSiblings(placeKey, siblings)}
                      >
                        {allSiblingsSelected ? "Uncheck all" : "Check all"}
                      </button>
                      <ul className="admin-place-siblings-list">
                        {siblings.map((s) => (
                          <li key={s._id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={selectedSiblings.includes(
                                  String(s._id)
                                )}
                                disabled={busyId === placeKey}
                                onChange={() =>
                                  toggleSibling(placeKey, s._id)
                                }
                              />
                              <span>
                                {s.name}
                                {s.street ? ` — ${s.street}` : ""}
                                {s.city ? `, ${s.city}` : ""}
                                <em> ({s.status})</em>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                      <p className="admin-place-siblings-hint">
                        {selectedSiblings.length} additional location
                        {selectedSiblings.length === 1 ? "" : "s"} selected
                        (checked by default).
                      </p>
                    </div>
                  )}
                  <div className="admin-staged-actions">
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={busyId === placeKey}
                      onClick={() => verifyStaged(placeKey)}
                    >
                      Verify &amp; add
                    </button>
                    <button
                      type="button"
                      className="admin-btn secondary"
                      disabled={busyId === placeKey}
                      onClick={() => unstagePlace(placeKey)}
                    >
                      Unstage
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-tools-card">
        <h2>Batches</h2>
        {batches.length === 0 ? (
          <p>
            No batches yet. Run{" "}
            <code>node backend/lib/places/scripts/importPlaces.js</code> locally
            (see data/README.md).
          </p>
        ) : (
          <ul className="admin-batch-list">
            {batches.map((b) => (
              <li key={b.batchId}>
                <button
                  type="button"
                  className={
                    selectedBatchId === b.batchId ? "active" : ""
                  }
                  onClick={() => openBatch(b.batchId)}
                >
                  <strong>{b.label}</strong> — {b.status} — {b.totalRows} rows
                  {b.editRate != null && (
                    <> — edit rate {(b.editRate * 100).toFixed(1)}%</>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedBatchId && (
        <section className="admin-tools-card">
          <div className="admin-batch-actions">
            <h2>Batch: {batch?.label}</h2>
            {batch?.status === "pending_review" && (
              <button type="button" className="admin-btn" onClick={approveBatch}>
                Approve batch
              </button>
            )}
          </div>
          <div className="admin-places-table-wrap">
            <table className="admin-places-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Street</th>
                  <th>City</th>
                  <th>Cuisine hint</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {places.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <input
                        defaultValue={p.name}
                        onBlur={(e) => {
                          if (e.target.value !== p.name) {
                            savePlace(p._id, { name: e.target.value });
                          }
                        }}
                      />
                    </td>
                    <td>
                      <input
                        defaultValue={p.address?.street || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (p.address?.street || "")) {
                            savePlace(p._id, {
                              address: { street: e.target.value },
                            });
                          }
                        }}
                      />
                    </td>
                    <td>{p.address?.locality}</td>
                    <td>
                      <input
                        defaultValue={p.cuisineHint || ""}
                        placeholder={p.sourceCategory || "cuisine"}
                        title={
                          p.sourceCategory
                            ? `Overture: ${p.sourceCategory} → mapped on promote`
                            : "Mapped to app cuisine on promote"
                        }
                        onBlur={(e) => {
                          if (e.target.value !== (p.cuisineHint || "")) {
                            savePlace(p._id, { cuisineHint: e.target.value });
                          }
                        }}
                      />
                      {p.sourceCategory && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                            marginTop: 2,
                          }}
                        >
                          {p.sourceCategory}
                        </div>
                      )}
                    </td>
                    <td>{p.status}</td>
                    <td className="admin-places-row-actions">
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={busyId === p._id}
                        onClick={() => stagePlace(p._id)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="admin-btn danger"
                        disabled={busyId === p._id}
                        onClick={() => dismissPlace(p._id)}
                      >
                        Dismiss
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="admin-tools-card">
        <h2>Exception queue ({queue.length})</h2>
        {queue.length === 0 ? (
          <p>No open exceptions.</p>
        ) : (
          <ul className="admin-queue-resolve-list">
            {queue.map((item) => {
              if (item.type === "duplicate") {
                const a = item.places?.a;
                const b = item.places?.b;
                const keepGers =
                  keepGersByQueue[String(item._id)] ||
                  a?.gersId ||
                  item.payload?.placeGersId ||
                  "";
                const dist =
                  item.places?.distanceM != null
                    ? `${Number(item.places.distanceM).toFixed(1)} m`
                    : "—";
                return (
                  <li key={item._id} className="admin-dup-card">
                    <div className="admin-dup-header">
                      <strong>duplicate</strong> — {item.reason || "different_names_within_25m"}{" "}
                      <span className="admin-dup-dist">({dist})</span>
                    </div>
                    <div className="admin-dup-pair">
                      {[a, b].filter(Boolean).map((p) => (
                        <label key={p.gersId} className="admin-dup-option">
                          <input
                            type="radio"
                            name={`keep-${item._id}`}
                            checked={keepGers === p.gersId}
                            disabled={busyId === item._id}
                            onChange={() =>
                              setKeepGersByQueue((prev) => ({
                                ...prev,
                                [String(item._id)]: p.gersId,
                              }))
                            }
                          />
                          <span>
                            <strong>{p.name}</strong>
                            <br />
                            {p.street || "(no street)"}
                            {p.city ? `, ${p.city}` : ""}
                            <br />
                            <em>{p.status}</em>
                          </span>
                        </label>
                      ))}
                      {(!a || !b) && (
                        <p className="admin-dup-missing">
                          One or both places could not be loaded (may already be
                          dismissed).
                        </p>
                      )}
                    </div>
                    <div className="admin-dup-actions">
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={busyId === item._id || !a || !b}
                        onClick={() => resolveDuplicate(item._id, "merge")}
                      >
                        Merge (keep selected)
                      </button>
                      <button
                        type="button"
                        className="admin-btn secondary"
                        disabled={busyId === item._id}
                        onClick={() =>
                          resolveDuplicate(item._id, "keep_separate")
                        }
                      >
                        Keep separate
                      </button>
                    </div>
                  </li>
                );
              }
              return (
                <li key={item._id} className="admin-queue-other">
                  <strong>{item.type}</strong> — {item.reason}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-tools-card">
        <h2>Monthly Overture resync</h2>
        {!settings?.lastResyncReport ? (
          <p>
            No report yet. Run locally:{" "}
            <code>npm run places:resync -- --file=... --release=...</code>
            . Reports never auto-apply.
          </p>
        ) : (
          <>
            <p>
              Release {settings.lastResyncReport.release} —{" "}
              {settings.lastResyncAt
                ? new Date(settings.lastResyncAt).toLocaleString()
                : ""}
            </p>
            <p>
              new={settings.lastResyncReport.counts?.new ?? "—"}, changed=
              {settings.lastResyncReport.counts?.changed ?? "—"}, disappeared=
              {settings.lastResyncReport.counts?.disappeared ?? "—"}
            </p>
            <p style={{ fontSize: "0.9rem", color: "#666" }}>
              {settings.lastResyncReport.notes}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

export default PlacesAdminPage;
