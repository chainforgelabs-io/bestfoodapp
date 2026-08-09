import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import SEO from "../components/SEO";
import {
  RESTAURANT_TYPES,
  CUISINE_TYPES,
} from "../utils/standardizedOptions";
import "../styles/AdminTools.css";

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

function PlacesAdminPage() {
  const [batches, setBatches] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [places, setPlaces] = useState([]);
  const [batch, setBatch] = useState(null);
  const [queue, setQueue] = useState([]);
  const [staged, setStaged] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadBatches = useCallback(async () => {
    const { data } = await axios.get("/places/batches");
    setBatches(data.batches || []);
    setSettings(data.settings || null);
  }, []);

  const loadQueue = useCallback(async () => {
    const { data } = await axios.get("/places/queue");
    setQueue(data.items || []);
  }, []);

  const loadStaged = useCallback(async () => {
    const { data } = await axios.get("/places/staged");
    const items = data.items || [];
    setStaged(items);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const item of items) {
        const id = item.place._id;
        if (!next[id]) {
          const p = item.preview || {};
          next[id] = {
            name: p.name || item.place.name || "",
            type: p.type || RESTAURANT_TYPES[0],
            cuisine: Array.isArray(p.cuisine) ? [...p.cuisine] : [],
            website: p.website || "",
            address: {
              street: p.address?.street || "",
              city: p.address?.city || "",
              province: p.address?.province || "",
              country: p.address?.country || "Canada",
              postalCode: p.address?.postalCode || "",
            },
          };
        }
      }
      // Drop drafts for places no longer staged
      const ids = new Set(items.map((i) => String(i.place._id)));
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
    setDrafts((prev) => ({
      ...prev,
      [placeId]: {
        ...(prev[placeId] || emptyDraft()),
        ...patch,
        address: {
          ...(prev[placeId]?.address || emptyDraft().address),
          ...(patch.address || {}),
        },
      },
    }));
  };

  const toggleCuisine = (placeId, cuisine) => {
    const draft = drafts[placeId] || emptyDraft();
    const current = draft.cuisine || [];
    const next = current.includes(cuisine)
      ? current.filter((c) => c !== cuisine)
      : [...current, cuisine];
    updateDraft(placeId, { cuisine: next });
  };

  const verifyStaged = async (placeId) => {
    setBusyId(placeId);
    try {
      const draft = drafts[placeId] || emptyDraft();
      if (!draft.name?.trim()) {
        setMessage("Name is required");
        return;
      }
      if (!draft.cuisine?.length) {
        setMessage("Select at least one cuisine");
        return;
      }
      await axios.post(`/places/staged/${placeId}/verify`, draft);
      setMessage("Verified — restaurant added to the system");
      await loadStaged();
    } catch (err) {
      setMessage(err.response?.data?.message || "Verify failed");
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
            {staged.map(({ place, preview }) => {
              const draft = drafts[place._id] || emptyDraft();
              return (
                <li key={place._id} className="admin-staged-card">
                  <div className="admin-staged-meta">
                    <strong>{place.nameRaw || place.name}</strong>
                    {preview?.sourceCategory && (
                      <span className="admin-staged-source">
                        Overture: {preview.sourceCategory}
                      </span>
                    )}
                  </div>
                  <div className="admin-staged-fields">
                    <label>
                      Name
                      <input
                        value={draft.name}
                        onChange={(e) =>
                          updateDraft(place._id, { name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Type
                      <select
                        value={draft.type}
                        onChange={(e) =>
                          updateDraft(place._id, { type: e.target.value })
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
                          updateDraft(place._id, { website: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Street
                      <input
                        value={draft.address.street}
                        onChange={(e) =>
                          updateDraft(place._id, {
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
                          updateDraft(place._id, {
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
                          updateDraft(place._id, {
                            address: { province: e.target.value },
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="admin-staged-cuisine">
                    <span className="admin-staged-cuisine-label">Cuisine</span>
                    <div className="admin-staged-cuisine-chips">
                      {CUISINE_TYPES.map((c) => (
                        <label key={c} className="admin-cuisine-chip">
                          <input
                            type="checkbox"
                            checked={(draft.cuisine || []).includes(c)}
                            onChange={() => toggleCuisine(place._id, c)}
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="admin-staged-actions">
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={busyId === place._id}
                      onClick={() => verifyStaged(place._id)}
                    >
                      Verify &amp; add
                    </button>
                    <button
                      type="button"
                      className="admin-btn secondary"
                      disabled={busyId === place._id}
                      onClick={() => unstagePlace(place._id)}
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
        <ul className="admin-queue-list">
          {queue.map((item) => (
            <li key={item._id}>
              <strong>{item.type}</strong> — {item.reason}
            </li>
          ))}
        </ul>
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
