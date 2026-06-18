import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../styles/ImageCropModal.css";

const OUTPUT_SIZE = 1080; // square output edge in px
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Lets the user pan and zoom a photo within a square viewport, then exports a
 * square JPEG matching exactly what they framed. Works with mouse, touch
 * (drag + pinch), wheel, and a zoom slider.
 *
 * Props:
 *  - file: File to crop (image)
 *  - isOpen: boolean
 *  - index, total: optional for "Photo X of Y" label
 *  - onConfirm(croppedFile): called with the resulting square JPEG File
 *  - onSkip(): skip this photo
 *  - onClose(): cancel the remaining queue
 */
function ImageCropModal({
  file,
  isOpen,
  index = 0,
  total = 1,
  onConfirm,
  onSkip,
  onClose,
}) {
  const viewportRef = useRef(null);
  const imgRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);

  const [objectUrl, setObjectUrl] = useState(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  // Create / revoke the preview object URL for the incoming file.
  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    // Reset framing for each new photo.
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural({ w: 0, h: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Measure the square viewport (and keep it correct on resize).
  useEffect(() => {
    if (!isOpen) return undefined;
    const measure = () => {
      if (viewportRef.current) {
        setViewport(viewportRef.current.clientWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isOpen, objectUrl]);

  const coverScale =
    viewport && natural.w && natural.h
      ? viewport / Math.min(natural.w, natural.h)
      : 1;
  const displayW = natural.w * coverScale * zoom;
  const displayH = natural.h * coverScale * zoom;
  const left = viewport / 2 - displayW / 2 + offset.x;
  const top = viewport / 2 - displayH / 2 + offset.y;

  // Keep the image covering the viewport (no empty gaps) for a given zoom.
  const clampOffset = useCallback(
    (next, zoomValue) => {
      if (!viewport || !natural.w || !natural.h) return next;
      const cover = viewport / Math.min(natural.w, natural.h);
      const dw = natural.w * cover * zoomValue;
      const dh = natural.h * cover * zoomValue;
      const maxX = Math.max(0, (dw - viewport) / 2);
      const maxY = Math.max(0, (dh - viewport) / 2);
      return {
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      };
    },
    [viewport, natural]
  );

  const applyZoom = useCallback(
    (nextZoom) => {
      const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      setZoom(z);
      setOffset((prev) => clampOffset(prev, z));
    },
    [clampOffset]
  );

  const onImgLoad = (e) => {
    setNatural({
      w: e.target.naturalWidth,
      h: e.target.naturalHeight,
    });
  };

  // ---- Pointer (mouse + touch) pan & pinch ----
  const getPoint = (e) => ({ x: e.clientX, y: e.clientY });

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, getPoint(e));
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchRef.current = { dist: distance(pts[0], pts[1]), zoom };
    }
  };

  const handlePointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const prev = pointersRef.current.get(e.pointerId);
    const current = getPoint(e);
    pointersRef.current.set(e.pointerId, current);

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const newDist = distance(pts[0], pts[1]);
      const ratio = newDist / (pinchRef.current.dist || newDist);
      applyZoom(pinchRef.current.zoom * ratio);
      return;
    }

    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    setOffset((o) => clampOffset({ x: o.x + dx, y: o.y + dy }, zoom));
  };

  const handlePointerUp = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.06 : 0.94;
    applyZoom(zoom * factor);
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !viewport || !natural.w) return;
    setSaving(true);
    try {
      const scale = coverScale * zoom; // natural px -> displayed px
      const sx = (0 - left) / scale;
      const sy = (0 - top) / scale;
      const sSize = viewport / scale;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        sx,
        sy,
        sSize,
        sSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!blob) {
        setSaving(false);
        return;
      }
      const base = (file?.name || "photo").replace(/\.[^.]+$/, "") || "photo";
      const cropped = new File([blob], `${base}.jpg`, { type: "image/jpeg" });
      onConfirm(cropped);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !file) return null;

  return ReactDOM.createPortal(
    <div className="crop-modal-overlay" onClick={onClose}>
      <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crop-modal-header">
          <h3>
            Position photo
            {total > 1 ? ` (${index + 1} of ${total})` : ""}
          </h3>
          <button
            type="button"
            className="crop-modal-close"
            onClick={onClose}
            aria-label="Cancel"
          >
            ×
          </button>
        </div>

        <p className="crop-modal-hint">Drag to move · pinch, scroll, or use the slider to zoom</p>

        <div
          className="crop-viewport"
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          {objectUrl && (
            <img
              ref={imgRef}
              src={objectUrl}
              alt="Crop preview"
              className="crop-image"
              onLoad={onImgLoad}
              draggable={false}
              style={{
                width: displayW ? `${displayW}px` : "100%",
                height: displayH ? `${displayH}px` : "100%",
                left: `${left}px`,
                top: `${top}px`,
              }}
            />
          )}
          <div className="crop-grid" aria-hidden="true" />
        </div>

        <div className="crop-zoom-row">
          <span aria-hidden="true">−</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(parseFloat(e.target.value))}
            className="crop-zoom-slider"
            aria-label="Zoom"
          />
          <span aria-hidden="true">+</span>
        </div>

        <div className="crop-modal-actions">
          {total > 1 && (
            <button
              type="button"
              className="crop-btn crop-btn-skip"
              onClick={onSkip}
              disabled={saving}
            >
              Skip
            </button>
          )}
          <button
            type="button"
            className="crop-btn crop-btn-confirm"
            onClick={handleConfirm}
            disabled={saving || !natural.w}
          >
            {saving ? "Saving…" : "Use this photo"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ImageCropModal;
