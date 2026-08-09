import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import SEO from "../components/SEO";
import CitySearch from "../components/CitySearch";
import {
  FOOD_CATEGORIES,
  FOOD_TYPES,
  SIZE_OPTIONS,
} from "../utils/standardizedOptions";
import "../styles/AdminTools.css";
import "../styles/MenuImportAdminPage.css";

const emptyLocation = { city: "", province: "", country: "" };

function formatPrice(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function MenuImportAdminPage() {
  const [location, setLocation] = useState(emptyLocation);
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [files, setFiles] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [edits, setEdits] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [todoItems, setTodoItems] = useState([]);
  const [loadingTodo, setLoadingTodo] = useState(true);
  const [siblings, setSiblings] = useState([]);
  const [selectedSiblingIds, setSelectedSiblingIds] = useState([]);
  const [loadingSiblings, setLoadingSiblings] = useState(false);
  const newImportRef = React.useRef(null);

  const loadQueue = useCallback(async () => {
    const { data } = await axios.get("/menu-imports/queue");
    setQueue(data.items || []);
  }, []);

  const loadTodo = useCallback(async () => {
    const { data } = await axios.get("/menu-imports/todo");
    setTodoItems(data.items || []);
  }, []);

  useEffect(() => {
    Promise.all([loadQueue(), loadTodo()])
      .catch((err) => console.error(err))
      .finally(() => {
        setLoadingQueue(false);
        setLoadingTodo(false);
      });
  }, [loadQueue, loadTodo]);

  const refreshLists = useCallback(async () => {
    await Promise.all([loadQueue(), loadTodo()]);
  }, [loadQueue, loadTodo]);

  const loadSiblings = useCallback(async (restaurantId) => {
    if (!restaurantId) {
      setSiblings([]);
      setSelectedSiblingIds([]);
      return;
    }
    setLoadingSiblings(true);
    try {
      const { data } = await axios.get(
        `/menu-imports/siblings/${restaurantId}`
      );
      const list = data.siblings || [];
      setSiblings(list);
      // Default: apply menu to all same-name locations in the city
      setSelectedSiblingIds(list.map((s) => s._id));
    } catch (err) {
      console.error(err);
      setSiblings([]);
      setSelectedSiblingIds([]);
    } finally {
      setLoadingSiblings(false);
    }
  }, []);

  const selectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setRestaurantQuery(restaurant.name);
    setSuggestions([]);
    loadSiblings(restaurant._id);
  };

  const selectTodoRestaurant = (item) => {
    selectRestaurant({
      _id: item.restaurantId,
      name: item.name,
    });
    setMessage(`Selected ${item.name} for menu upload`);
    newImportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleSibling = (id) => {
    setSelectedSiblingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllSiblings = () => {
    if (selectedSiblingIds.length === siblings.length) {
      setSelectedSiblingIds([]);
    } else {
      setSelectedSiblingIds(siblings.map((s) => s._id));
    }
  };

  const todoStateLabel = (state) => {
    if (state === "awaiting_verification") return "Menu changes awaiting verification";
    if (state === "has_items_no_import") return "Has food items — no menu import yet";
    return "No menu uploaded";
  };

  useEffect(() => {
    if (!location.city || !restaurantQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const { data } = await axios.get("/restaurants/search", {
          params: {
            city: location.city,
            province: location.province,
            country: location.country,
          },
        });
        const q = restaurantQuery.toLowerCase();
        setSuggestions(
          (data || []).filter((r) => r.name?.toLowerCase().includes(q)).slice(0, 12)
        );
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [location, restaurantQuery]);

  const proposedFor = (item) => edits[item._id] || item.proposed;

  const updateEdit = (id, patch) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || queue.find((q) => q._id === id)?.proposed || {}), ...patch },
    }));
  };

  const onFilesChange = (e) => {
    const list = Array.from(e.target.files || []).filter((f) =>
      /^image\/(jpeg|jpg|png)$/i.test(f.type)
    );
    setFiles(list);
  };

  const uploadImages = async (fileList) => {
    const { data } = await axios.post("/uploads/photos/presign", {
      files: fileList.map((f) => ({ fileName: f.name, contentType: f.type })),
      prefix: "menus",
    });
    const uploads = data.uploads || [];
    const images = [];
    for (let i = 0; i < fileList.length; i++) {
      const presigned = uploads[i];
      await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": presigned.contentType || fileList[i].type || "image/jpeg",
        },
        body: fileList[i],
      });
      images.push({
        key: presigned.key,
        imageBucket: presigned.imageBucket,
        contentType: presigned.contentType || fileList[i].type || "image/jpeg",
      });
    }
    return images;
  };

  const handleScan = async () => {
    setMessage("");
    setError("");
    if (!selectedRestaurant?._id) {
      setError("Select a restaurant first.");
      return;
    }
    if (!files.length) {
      setError("Add at least one menu photo (JPEG or PNG).");
      return;
    }

    setScanning(true);
    try {
      const images = await uploadImages(files);
      const { data: created } = await axios.post("/menu-imports", {
        restaurantId: selectedRestaurant._id,
        images,
      });
      const importId = created.import?._id;
      const { data: scanned } = await axios.post(
        `/menu-imports/${importId}/scan`,
        { alsoRestaurantIds: selectedSiblingIds }
      );
      const summary = scanned.summary || {};
      const siblingCount = (scanned.siblings || []).filter((s) => s.importId)
        .length;
      setMessage(
        `Scan complete: ${summary.extracted || 0} extracted across ${
          summary.locations || 1
        } location${(summary.locations || 1) === 1 ? "" : "s"}; ${
          summary.queued || 0
        } changes queued` +
          (siblingCount
            ? ` (including ${siblingCount} additional location${
                siblingCount === 1 ? "" : "s"
              })`
            : "") +
          "."
      );
      setFiles([]);
      setEdits({});
      setSelectedIds([]);
      await refreshLists();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Upload or scan failed";
      setError(msg);
    } finally {
      setScanning(false);
    }
  };

  const saveChange = async (item) => {
    setBusyId(item._id);
    setError("");
    try {
      const proposed = proposedFor(item);
      await axios.patch(`/menu-imports/changes/${item._id}`, { proposed });
      setMessage("Saved edits");
      await refreshLists();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setBusyId(null);
    }
  };

  const approveChange = async (item) => {
    setBusyId(item._id);
    setError("");
    try {
      const proposed = proposedFor(item);
      await axios.post(`/menu-imports/changes/${item._id}/approve`, { proposed });
      setMessage("Approved — written to menu");
      setSelectedIds((prev) => prev.filter((id) => id !== item._id));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[item._id];
        return next;
      });
      await refreshLists();
    } catch (err) {
      setError(err.response?.data?.message || "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const rejectChange = async (item) => {
    setBusyId(item._id);
    setError("");
    try {
      await axios.post(`/menu-imports/changes/${item._id}/reject`);
      setMessage("Rejected");
      setSelectedIds((prev) => prev.filter((id) => id !== item._id));
      await refreshLists();
    } catch (err) {
      setError(err.response?.data?.message || "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  const approveSelected = async () => {
    if (!selectedIds.length) return;
    setBusyId("batch");
    setError("");
    try {
      // Persist any local edits before batch approve
      await Promise.all(
        selectedIds.map(async (id) => {
          const item = queue.find((q) => q._id === id);
          if (!item) return;
          if (edits[id]) {
            await axios.patch(`/menu-imports/changes/${id}`, {
              proposed: edits[id],
            });
          }
        })
      );
      const { data } = await axios.post("/menu-imports/changes/approve-batch", {
        ids: selectedIds,
      });
      setMessage(
        `Batch approve: ${data.approved?.length || 0} approved${
          data.errors?.length ? `, ${data.errors.length} errors` : ""
        }`
      );
      setSelectedIds([]);
      setEdits({});
      await refreshLists();
    } catch (err) {
      setError(err.response?.data?.message || "Batch approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelected = useMemo(
    () => queue.length > 0 && selectedIds.length === queue.length,
    [queue, selectedIds]
  );

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(queue.map((q) => q._id));
  };

  return (
    <div className="admin-tools-page menu-import-page">
      <SEO
        title="Menu import"
        description="Admin menu photo import and verification queue"
        noindex
      />

      <header className="admin-tools-header">
        <h1>Menu import</h1>
        <p>
          Upload menu photos, assign a restaurant, then verify AI-extracted
          adds and price updates before they go live.
        </p>
        <div className="admin-tools-nav">
          <Link to="/admin/places">Places</Link>
          <Link to="/admin/social">Social</Link>
          <Link to="/admin/seo">SEO</Link>
        </div>
      </header>

      {message && <p className="admin-tools-message">{message}</p>}
      {error && <p className="menu-import-error">{error}</p>}

      <section className="admin-tools-card">
        <h2>Menu to-do ({todoItems.length})</h2>
        <p style={{ color: "#666", marginTop: 0 }}>
          Restaurants verified from places batches, plus restaurants that already
          have food items or reviews, until a menu is uploaded and all changes
          are verified.
        </p>
        {loadingTodo ? (
          <p>Loading to-do list…</p>
        ) : todoItems.length === 0 ? (
          <p>All tracked restaurants have complete verified menus.</p>
        ) : (
          <ul className="menu-import-todo-list">
            {todoItems.map((item) => (
              <li key={item.restaurantId}>
                <div className="menu-import-todo-main">
                  <strong>{item.name}</strong>
                  <span className="menu-import-todo-state">
                    {todoStateLabel(item.state)}
                  </span>
                  <span className="menu-import-todo-meta">
                    {item.foodItemCount} food item
                    {item.foodItemCount === 1 ? "" : "s"}
                    {item.pendingChangeCount > 0
                      ? ` · ${item.pendingChangeCount} pending`
                      : ""}
                    {item.sources?.includes("places_verified")
                      ? " · from places"
                      : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => selectTodoRestaurant(item)}
                >
                  Upload menu
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-tools-card" ref={newImportRef}>
        <h2>New import</h2>

        <label className="menu-import-label">City</label>
        <CitySearch
          onSelectCity={(loc) => {
            setLocation(loc);
            setSelectedRestaurant(null);
            setRestaurantQuery("");
            setSiblings([]);
            setSelectedSiblingIds([]);
          }}
        />

        <label className="menu-import-label">Restaurant</label>
        <input
          type="text"
          className="menu-import-input"
          placeholder={
            location.city
              ? "Search restaurant name…"
              : "Select a city first"
          }
          value={
            selectedRestaurant
              ? selectedRestaurant.name
              : restaurantQuery
          }
          disabled={!location.city || scanning}
          onChange={(e) => {
            setSelectedRestaurant(null);
            setSiblings([]);
            setSelectedSiblingIds([]);
            setRestaurantQuery(e.target.value);
          }}
        />
        {!selectedRestaurant && suggestions.length > 0 && (
          <ul className="menu-import-suggestions">
            {suggestions.map((r) => (
              <li key={r._id}>
                <button type="button" onClick={() => selectRestaurant(r)}>
                  {r.name}
                  {r.address?.street ? ` — ${r.address.street}` : ""}
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedRestaurant && loadingSiblings && (
          <p className="menu-import-file-hint">Checking other locations…</p>
        )}

        {selectedRestaurant && siblings.length > 0 && (
          <div className="menu-import-siblings">
            <p className="menu-import-siblings-title">
              Found {siblings.length} other{" "}
              <strong>{selectedRestaurant.name}</strong> location
              {siblings.length === 1 ? "" : "s"} in this city. Apply this menu
              to them as well?
            </p>
            <button
              type="button"
              className="admin-btn secondary"
              onClick={toggleAllSiblings}
              disabled={scanning}
            >
              {selectedSiblingIds.length === siblings.length
                ? "Uncheck all"
                : "Check all"}
            </button>
            <ul className="menu-import-siblings-list">
              {siblings.map((s) => (
                <li key={s._id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedSiblingIds.includes(s._id)}
                      disabled={scanning}
                      onChange={() => toggleSibling(s._id)}
                    />
                    <span>
                      {s.name}
                      {s.address?.street ? ` — ${s.address.street}` : ""}
                      {s.address?.city ? `, ${s.address.city}` : ""}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="menu-import-file-hint">
              {selectedSiblingIds.length} additional location
              {selectedSiblingIds.length === 1 ? "" : "s"} selected (checked by
              default).
            </p>
          </div>
        )}

        <label className="menu-import-label">Menu photos (JPEG/PNG)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          multiple
          disabled={scanning}
          onChange={onFilesChange}
        />
        {files.length > 0 && (
          <p className="menu-import-file-hint">
            {files.length} file{files.length === 1 ? "" : "s"} selected
          </p>
        )}

        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="admin-btn"
            disabled={scanning}
            onClick={handleScan}
          >
            {scanning ? "Uploading & scanning…" : "Upload & scan"}
          </button>
        </div>
      </section>

      <section className="admin-tools-card">
        <div className="menu-import-queue-header">
          <h2>Verification queue</h2>
          <div>
            <button
              type="button"
              className="admin-btn secondary"
              onClick={toggleSelectAll}
              disabled={!queue.length}
            >
              {allSelected ? "Clear selection" : "Select all"}
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={!selectedIds.length || busyId === "batch"}
              onClick={approveSelected}
            >
              Approve selected ({selectedIds.length})
            </button>
          </div>
        </div>

        {loadingQueue ? (
          <p>Loading queue…</p>
        ) : queue.length === 0 ? (
          <p>No pending changes. Run a scan to queue items for review.</p>
        ) : (
          <ul className="menu-import-queue">
            {queue.map((item) => {
              const proposed = proposedFor(item);
              const types = FOOD_TYPES[proposed.category] || ["Add +"];
              const priceChanged =
                item.action === "update" &&
                Number(item.existing?.price) !== Number(proposed.price);
              return (
                <li key={item._id} className="menu-import-change">
                  <div className="menu-import-change-top">
                    <label className="menu-import-check">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item._id)}
                        onChange={() => toggleSelect(item._id)}
                      />
                      <span
                        className={`menu-import-badge menu-import-badge--${item.action}`}
                      >
                        {item.action === "add" ? "Add" : "Update"}
                      </span>
                      <strong>
                        {item.restaurant?.name || "Restaurant"}
                      </strong>
                    </label>
                  </div>

                  {item.action === "update" && item.existing && (
                    <p className="menu-import-existing">
                      Existing: {item.existing.name} · {item.existing.category} /{" "}
                      {item.existing.type} · {formatPrice(item.existing.price)}
                      {priceChanged ? " → price change" : ""}
                    </p>
                  )}

                  <div className="menu-import-fields">
                    <label>
                      Name
                      <input
                        className="menu-import-input"
                        value={proposed.name || ""}
                        onChange={(e) =>
                          updateEdit(item._id, { name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Category
                      <select
                        className="menu-import-input"
                        value={proposed.category || ""}
                        onChange={(e) => {
                          const category = e.target.value;
                          const nextTypes = FOOD_TYPES[category] || ["Add +"];
                          updateEdit(item._id, {
                            category,
                            type: nextTypes.includes(proposed.type)
                              ? proposed.type
                              : nextTypes[0],
                          });
                        }}
                      >
                        {FOOD_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Type
                      <select
                        className="menu-import-input"
                        value={proposed.type || ""}
                        onChange={(e) =>
                          updateEdit(item._id, { type: e.target.value })
                        }
                      >
                        {types.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Subtype
                      <input
                        className="menu-import-input"
                        value={proposed.subType || ""}
                        onChange={(e) =>
                          updateEdit(item._id, { subType: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Price
                      <input
                        className={`menu-import-input${
                          priceChanged ? " menu-import-price-changed" : ""
                        }`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={proposed.price ?? ""}
                        onChange={(e) =>
                          updateEdit(item._id, {
                            price:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Size
                      <select
                        className="menu-import-input"
                        value={proposed.sizeOptions || ""}
                        onChange={(e) =>
                          updateEdit(item._id, {
                            sizeOptions: e.target.value,
                          })
                        }
                      >
                        <option value="">(none)</option>
                        {SIZE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="menu-import-actions">
                    <button
                      type="button"
                      className="admin-btn secondary"
                      disabled={busyId === item._id}
                      onClick={() => saveChange(item)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={busyId === item._id}
                      onClick={() => approveChange(item)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="admin-btn danger"
                      disabled={busyId === item._id}
                      onClick={() => rejectChange(item)}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default MenuImportAdminPage;
