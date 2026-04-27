import React, { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import Notification from "../components/Notification";
import SEO from "../components/SEO";
import "../styles/ReceiptScan.css";

const MAX_EDGE = 1600;

const isMobile = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * @param {File} file
 * @param {number} maxEdge
 * @returns {Promise<File>}
 */
function compressImageFile(file, maxEdge = MAX_EDGE) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const scale = Math.max(w, h) > maxEdge ? maxEdge / Math.max(w, h) : 1;
      const outW = Math.round(w * scale);
      const outH = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, outW, outH);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image compression failed"));
            return;
          }
          const base = file.name.replace(/\.[^.]+$/, "") || "receipt";
          resolve(
            new File([blob], `${base}.jpg`, {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        0.88
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
async function sha256HexOfFile(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ReceiptScanLanding() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mobile] = useState(() => isMobile());
  const [errorDetail, setErrorDetail] = useState(null);
  const [notification, setNotification] = useState({
    isVisible: false,
    message: "",
    type: "error",
  });

  const clearSelection = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  const onFileChosen = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f || !f.type.startsWith("image/")) {
      setNotification({
        isVisible: true,
        message: "Please choose an image file.",
        type: "error",
      });
      return;
    }
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    setFile(f);
  };

  const goManual = () => {
    clearSelection();
    navigate("/submit-review");
  };

  const openPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const recordError = (stage, err) => {
    const status = err?.response?.status;
    const body = err?.response?.data;
    const msg =
      (body && (body.message || body.error)) ||
      err?.message ||
      "Unknown error";
    const detail = {
      stage,
      status: status || null,
      message: msg,
      raw: body || null,
    };
    console.error("[receipt-upload]", detail, err);
    setErrorDetail(detail);
    setNotification({
      isVisible: true,
      message: `${stage} failed: ${msg}`,
      type: "error",
    });
  };

  const usePhoto = async () => {
    if (!file) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setNotification({
        isVisible: true,
        message: "You must be logged in to upload a receipt.",
        type: "error",
      });
      navigate("/login");
      return;
    }

    setBusy(true);
    setErrorDetail(null);
    let stage = "Preparing image";
    try {
      const compressed = await compressImageFile(file, MAX_EDGE);
      const imageHash = await sha256HexOfFile(compressed);

      stage = "Requesting upload URL";
      let presign;
      try {
        const res = await axios.post("/uploads/photos/presign", {
          files: [
            {
              fileName: compressed.name,
              contentType: compressed.type || "image/jpeg",
            },
          ],
          prefix: "receipts",
        });
        presign = res.data;
      } catch (e) {
        recordError(stage, e);
        return;
      }

      const up = presign.uploads && presign.uploads[0];
      if (!up || !up.uploadUrl || !up.key) {
        recordError(stage, new Error("Presign response invalid"));
        return;
      }

      stage = "Uploading to storage";
      let putRes;
      try {
        putRes = await fetch(up.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": up.contentType || compressed.type || "image/jpeg",
          },
          body: compressed,
        });
      } catch (e) {
        recordError(stage, e);
        return;
      }
      if (!putRes.ok) {
        let detail = "";
        try {
          detail = await putRes.text();
        } catch (_) {}
        recordError(
          stage,
          new Error(
            `S3 PUT ${putRes.status} ${putRes.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`
          )
        );
        return;
      }

      const imageBucket = up.imageBucket;
      if (!imageBucket) {
        recordError(stage, new Error("Missing imageBucket in presign response"));
        return;
      }

      stage = "Saving receipt record";
      let receipt;
      try {
        const res = await axios.post("/receipts", {
          imageKey: up.key,
          imageBucket,
          imageHash,
        });
        receipt = res.data;
      } catch (e) {
        recordError(stage, e);
        return;
      }

      const thumb = URL.createObjectURL(compressed);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      navigate("/submit-review", {
        state: {
          receiptId: receipt._id,
          receiptThumbUrl: thumb,
        },
      });
    } catch (err) {
      recordError(stage, err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="receipt-scan-page">
      <SEO
        title="Scan a Receipt | Best Food App"
        description="Add a photo of your receipt to attach to your private records."
        noindex={true}
      />
      <h1 className="receipt-scan-title">Add a receipt (optional)</h1>
      <p className="receipt-scan-subtitle">
        Take a clear photo of your meal receipt, or choose an image. Your
        receipt is stored privately and is not shown on your public review.
        You can skip and enter everything manually.
      </p>

      {errorDetail && (
        <div className="receipt-scan-error" role="alert">
          <strong>
            {errorDetail.stage} failed
            {errorDetail.status ? ` (HTTP ${errorDetail.status})` : ""}
          </strong>
          {errorDetail.message}
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setErrorDetail(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#5a1010",
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
                fontSize: "0.85rem",
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={mobile ? "environment" : undefined}
        className="receipt-scan-hidden-input"
        onChange={onFileChosen}
        aria-label="Choose receipt image"
      />

      <div className="receipt-scan-preview-wrap">
        {previewUrl ? (
          <img src={previewUrl} alt="Receipt preview" />
        ) : (
          <div className="receipt-scan-placeholder">
            No image selected yet
          </div>
        )}
      </div>

      <div className="receipt-scan-actions">
        {!file ? (
          <button
            type="button"
            className="receipt-scan-btn receipt-scan-btn-primary"
            onClick={openPicker}
            disabled={busy}
          >
            {mobile ? "Scan or choose photo" : "Choose photo"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="receipt-scan-btn receipt-scan-btn-primary"
              onClick={usePhoto}
              disabled={busy}
            >
              {busy ? "Uploading…" : "Use this photo"}
            </button>
            <button
              type="button"
              className="receipt-scan-btn receipt-scan-btn-secondary"
              onClick={clearSelection}
              disabled={busy}
            >
              Retake / choose different
            </button>
          </>
        )}

        <button
          type="button"
          className="receipt-scan-btn receipt-scan-btn-tertiary"
          onClick={goManual}
          disabled={busy}
        >
          Enter manually (skip receipt)
        </button>
      </div>

      {busy && <p className="receipt-scan-loading">Preparing your receipt…</p>}

      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() =>
          setNotification({ ...notification, isVisible: false })
        }
      />
    </div>
  );
}

export default ReceiptScanLanding;
