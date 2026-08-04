import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import SEO from "../components/SEO";
import "../styles/AdminTools.css";

function PlacesAdminPage() {
  const [batches, setBatches] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [places, setPlaces] = useState([]);
  const [batch, setBatch] = useState(null);
  const [queue, setQueue] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadBatches = useCallback(async () => {
    const { data } = await axios.get("/places/batches");
    setBatches(data.batches || []);
    setSettings(data.settings || null);
  }, []);

  const loadQueue = useCallback(async () => {
    const { data } = await axios.get("/places/queue");
    setQueue(data.items || []);
  }, []);

  useEffect(() => {
    Promise.all([loadBatches(), loadQueue()])
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [loadBatches, loadQueue]);

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
    setMessage("Batch approved — places are now active for autocomplete");
    await loadBatches();
    await openBatch(selectedBatchId);
  };

  const dismissPlace = async (placeId) => {
    await axios.post(
      `/places/batches/${selectedBatchId}/dismiss/${placeId}`
    );
    setPlaces((prev) => prev.filter((p) => p._id !== placeId));
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
          Confirm each batch before places enter autocomplete. Edits become
          learned rules for future imports.
        </p>
        <div className="admin-tools-nav">
          <Link to="/admin/social">Social</Link>
          <Link to="/admin/seo">SEO dashboard</Link>
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
                    <td>
                      <button
                        type="button"
                        className="admin-btn danger"
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
