const sharp = require("sharp");
const fs = require("fs");
const opentype = require("opentype.js");
const cardLayout = require("./cardLayout");
const { assertRequiredAssets, getAssetPath, hasOptionalBorder } = require("./assets");

// Cache the parsed font across invocations (warm serverless containers).
let cachedFont;
function loadScoreFont(fontPath) {
  if (cachedFont !== undefined) return cachedFont;
  cachedFont = null;
  try {
    if (fontPath && fs.existsSync(fontPath)) {
      cachedFont = opentype.parse(fs.readFileSync(fontPath).buffer);
    }
  } catch (err) {
    console.error("score font parse failed, using block fallback", err.message);
    cachedFont = null;
  }
  return cachedFont;
}

// Minimal 5x7 block-digit glyphs — a font-free fallback so the score ALWAYS
// renders even if the TTF is missing/unparseable (serverless has no fonts).
const BLOCK_DIGITS = {
  0: ["111", "101", "101", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "010", "010", "111"],
  2: ["111", "001", "001", "111", "100", "100", "111"],
  3: ["111", "001", "001", "111", "001", "001", "111"],
  4: ["101", "101", "101", "111", "001", "001", "001"],
  5: ["111", "100", "100", "111", "001", "001", "111"],
  6: ["111", "100", "100", "111", "101", "101", "111"],
  7: ["111", "001", "001", "010", "010", "100", "100"],
  8: ["111", "101", "101", "111", "101", "101", "111"],
  9: ["111", "101", "101", "111", "001", "001", "111"],
};

function buildBlockDigitsPath(scoreText, targetHeight, originX, originY) {
  const rows = 7;
  const cell = targetHeight / rows;
  const digitCols = 3;
  const gap = cell; // one-cell gap between digits
  let x = originX;
  let d = "";
  for (const ch of scoreText) {
    const glyph = BLOCK_DIGITS[ch];
    if (!glyph) {
      x += digitCols * cell + gap;
      continue;
    }
    for (let r = 0; r < glyph.length; r += 1) {
      for (let c = 0; c < glyph[r].length; c += 1) {
        if (glyph[r][c] === "1") {
          const px = x + c * cell;
          const py = originY + r * cell;
          d += `M${px} ${py}h${cell}v${cell}h${-cell}z`;
        }
      }
    }
    x += digitCols * cell + gap;
  }
  const totalWidth = scoreText.length * digitCols * cell + (scoreText.length - 1) * gap;
  return { d, totalWidth };
}

/**
 * Build the score overlay SVG using vector PATHS (never <text>), so it renders
 * regardless of system fonts/fontconfig (the cause of blank scores on Vercel).
 */
function buildScoreSvg({ badgeSize, scoreText, scoreCfg, font }) {
  const maxWidth = badgeSize * 0.72;
  const offsetBase =
    scoreText.length >= 3
      ? scoreCfg.fontSizeRatioThreeDigit
      : scoreCfg.fontSizeRatio;

  let pathD;
  let tx;
  let ty;
  let glyphSize;

  if (font) {
    glyphSize = badgeSize * offsetBase;
    let path = font.getPath(scoreText, 0, 0, glyphSize);
    let bb = path.getBoundingBox();
    let tw = bb.x2 - bb.x1;
    if (tw > maxWidth) {
      glyphSize *= maxWidth / tw;
      path = font.getPath(scoreText, 0, 0, glyphSize);
      bb = path.getBoundingBox();
      tw = bb.x2 - bb.x1;
    }
    const th = bb.y2 - bb.y1;
    tx = (badgeSize - tw) / 2 - bb.x1;
    ty = (badgeSize - th) / 2 - bb.y1;
    pathD = path.toPathData(2);
  } else {
    // Font-free block-digit fallback.
    const targetHeight = badgeSize * 0.5;
    const { d, totalWidth } = buildBlockDigitsPath(scoreText, targetHeight, 0, 0);
    glyphSize = targetHeight;
    tx = (badgeSize - totalWidth) / 2;
    ty = (badgeSize - targetHeight) / 2;
    pathD = d;
  }

  const offset = Math.max(2, Math.round(glyphSize * scoreCfg.aberrationRatio));

  return `
<svg width="${badgeSize}" height="${badgeSize}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${tx - offset},${ty})"><path d="${pathD}" fill="${scoreCfg.aberrationCyan}" opacity="0.9"/></g>
  <g transform="translate(${tx + offset},${ty})"><path d="${pathD}" fill="${scoreCfg.aberrationRed}" opacity="0.9"/></g>
  <g transform="translate(${tx},${ty})"><path d="${pathD}" fill="${scoreCfg.color}"/></g>
</svg>`;
}

async function renderScoreOverlay({ badgeSize, scoreText, scoreCfg, fontPath }) {
  const font = loadScoreFont(fontPath);
  const scoreSvg = buildScoreSvg({ badgeSize, scoreText, scoreCfg, font });
  return sharp(Buffer.from(scoreSvg)).png().toBuffer();
}

/** Strip the Canva black matte while preserving inner black ring strokes. */
async function loadBadgeWithTransparentBackground(badgePath, badgeSize) {
  const { data, info } = await sharp(badgePath, { density: 300 })
    .resize(badgeSize, badgeSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const isNearBlack = (idx) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return r < 35 && g < 35 && b < 35;
  };
  const visited = new Uint8Array(width * height);
  const queue = [];

  const seed = (x, y) => {
    const px = y * width + x;
    if (visited[px] || !isNearBlack(px * 4)) return;
    visited[px] = 1;
    queue.push(px);
  };

  for (let x = 0; x < width; x += 1) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    seed(0, y);
    seed(width - 1, y);
  }

  while (queue.length > 0) {
    const px = queue.pop();
    const idx = px * 4;
    data[idx + 3] = 0;
    const x = px % width;
    const y = (px - x) / width;
    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }

  return sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Orient and frame the source photo for the 4:5 card.
 * - Honors EXIF orientation (phones store rotated pixels + an orientation tag;
 *   browsers respect it but sharp does not unless we call .rotate()).
 * - Applies an optional manual transform (rotation in 90° steps, zoom, pan).
 */
async function prepareBackground(photoBuffer, width, height, transform) {
  const rotation = ((Math.round((transform?.rotation || 0) / 90) * 90) % 360 + 360) % 360;
  const scale = clamp(Number(transform?.scale) || 1, 1, 4);
  const offsetX = clamp(Number(transform?.offsetX) || 0, -1, 1);
  const offsetY = clamp(Number(transform?.offsetY) || 0, -1, 1);

  // 1. Auto-orient from EXIF and bake it into the pixels.
  let oriented = await sharp(photoBuffer).rotate().png().toBuffer();

  // 2. Apply manual 90° rotation if requested.
  if (rotation) {
    oriented = await sharp(oriented).rotate(rotation).png().toBuffer();
  }

  // 3. Scale (zoom) then crop the 4:5 window, positioned by the pan offset.
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);
  const resized = await sharp(oriented)
    .resize(targetW, targetH, { fit: "cover", position: "centre" })
    .toBuffer();

  const maxLeft = targetW - width;
  const maxTop = targetH - height;
  const left = clamp(Math.round((maxLeft / 2) * (1 + offsetX)), 0, maxLeft);
  const top = clamp(Math.round((maxTop / 2) * (1 + offsetY)), 0, maxTop);

  return sharp(resized)
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
}

/**
 * Composite a branded social card PNG (1080×1350, 4:5).
 * @param {{ photoUrl: string, score: number, transform?: object }} input
 * @returns {Promise<Buffer>}
 */
async function renderCard({ photoUrl, score, transform }) {
  const { badgePath, fontPath } = assertRequiredAssets();
  const { width, height, badge, score: scoreCfg } = cardLayout;

  const photoRes = await fetch(photoUrl);
  if (!photoRes.ok) {
    throw new Error(`Failed to fetch source photo: ${photoRes.status}`);
  }
  const photoBuffer = Buffer.from(await photoRes.arrayBuffer());

  const bg = await prepareBackground(photoBuffer, width, height, transform);

  const badgeSize = badge.size;
  const badgeResized = await loadBadgeWithTransparentBackground(
    badgePath,
    badgeSize
  );

  const badgeLeft = width - badge.marginRight - badgeSize;
  const badgeTop = badge.marginTop;
  const scoreText = String(Math.round(score));

  const scoreOverlay = await renderScoreOverlay({
    badgeSize,
    scoreText,
    scoreCfg,
    fontPath,
  });

  const composites = [
    { input: badgeResized, left: badgeLeft, top: badgeTop },
    { input: scoreOverlay, left: badgeLeft, top: badgeTop },
  ];

  if (hasOptionalBorder()) {
    composites.push({
      input: fs.readFileSync(getAssetPath("border.png")),
      left: 0,
      top: 0,
    });
  }

  return sharp(bg).composite(composites).png().toBuffer();
}

module.exports = { renderCard };
