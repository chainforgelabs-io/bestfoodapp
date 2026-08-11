/**
 * Normalize admin menu uploads for the Grok vision pipeline:
 * JPEG/PNG/WebP pass through; HEIC → JPEG; PDF pages → JPEG.
 */

const MAX_PDF_PAGES = 20;
const PDF_RENDER_SCALE = 2;
const JPEG_QUALITY = 0.9;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function extOf(name = "") {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export function menuFileKind(file) {
  if (!file) return "unsupported";
  const type = (file.type || "").toLowerCase();
  const ext = extOf(file.name);

  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (
    type === "image/heic" ||
    type === "image/heif" ||
    ext === "heic" ||
    ext === "heif"
  ) {
    return "heic";
  }
  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp" ||
    ["jpg", "jpeg", "png", "webp"].includes(ext)
  ) {
    return "image";
  }
  if (IMAGE_TYPES.has(type)) return "image";
  return "unsupported";
}

export function isAllowedMenuFile(file) {
  return menuFileKind(file) !== "unsupported";
}

function baseName(file) {
  return (file.name || "menu").replace(/\.[^.]+$/, "") || "menu";
}

function canvasToJpegFile(canvas, name) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode menu page as JPEG"));
          return;
        }
        resolve(new File([blob], name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

async function convertHeicToJpeg(file) {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: JPEG_QUALITY,
  });
  const blobs = Array.isArray(result) ? result : [result];
  const stem = baseName(file);
  return blobs.map(
    (blob, i) =>
      new File([blob], blobs.length > 1 ? `${stem}-${i + 1}.jpg` : `${stem}.jpg`, {
        type: "image/jpeg",
      })
  );
}

async function getPdfJs() {
  // Legacy build plays nicer with CRA/webpack 5 than the default .mjs entry.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

async function convertPdfToJpegPages(file) {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.min(pdf.numPages || 0, MAX_PDF_PAGES);
  if (!pageCount) {
    throw new Error("PDF has no pages to scan");
  }

  const stem = baseName(file);
  const out = [];
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas for PDF page");
    await page.render({ canvasContext: ctx, viewport }).promise;
    out.push(
      await canvasToJpegFile(
        canvas,
        pageCount > 1 ? `${stem}-p${pageNum}.jpg` : `${stem}.jpg`
      )
    );
  }

  if ((pdf.numPages || 0) > MAX_PDF_PAGES) {
    const err = new Error(
      `PDF has ${pdf.numPages} pages; only the first ${MAX_PDF_PAGES} were used.`
    );
    err.code = "PDF_TRUNCATED";
    err.files = out;
    throw err;
  }

  return out;
}

/**
 * @param {File[]} selected
 * @returns {Promise<{ files: File[], warning?: string, rejected: string[] }>}
 */
export async function normalizeMenuUploadFiles(selected) {
  const list = Array.from(selected || []);
  const rejected = [];
  const files = [];
  let warning;

  for (const file of list) {
    const kind = menuFileKind(file);
    if (kind === "unsupported") {
      rejected.push(file.name || "unnamed file");
      continue;
    }
    try {
      if (kind === "heic") {
        files.push(...(await convertHeicToJpeg(file)));
      } else if (kind === "pdf") {
        try {
          files.push(...(await convertPdfToJpegPages(file)));
        } catch (err) {
          if (err?.code === "PDF_TRUNCATED" && Array.isArray(err.files)) {
            files.push(...err.files);
            warning = err.message;
          } else {
            throw err;
          }
        }
      } else {
        // Ensure empty MIME still uploads as a known image type when possible
        if (!file.type && ["jpg", "jpeg"].includes(extOf(file.name))) {
          files.push(
            new File([file], file.name, { type: "image/jpeg" })
          );
        } else if (!file.type && extOf(file.name) === "png") {
          files.push(new File([file], file.name, { type: "image/png" }));
        } else if (!file.type && extOf(file.name) === "webp") {
          files.push(new File([file], file.name, { type: "image/webp" }));
        } else {
          files.push(file);
        }
      }
    } catch (err) {
      const msg = err?.message || "Conversion failed";
      throw new Error(`Could not process ${file.name || "file"}: ${msg}`);
    }
  }

  return { files, warning, rejected };
}

export const MENU_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf";
