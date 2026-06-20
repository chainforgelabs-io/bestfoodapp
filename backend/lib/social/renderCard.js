const sharp = require("sharp");
const fs = require("fs");
const cardLayout = require("./cardLayout");
const { assertRequiredAssets, getAssetPath, hasOptionalBorder } = require("./assets");

function buildScoreSvg({ badgeSize, scoreText, scoreCfg, fontBase64 }) {
  const cx = badgeSize / 2;
  const cy = badgeSize / 2;
  const fontSize =
    scoreText.length >= 3
      ? Math.round(badgeSize * scoreCfg.fontSizeRatioThreeDigit)
      : Math.round(badgeSize * scoreCfg.fontSizeRatio);
  const offset = Math.max(2, Math.round(fontSize * scoreCfg.aberrationRatio));

  const fontFace = fontBase64
    ? `@font-face {
        font-family: '${scoreCfg.fontFamily}';
        src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }`
    : "";
  const fontFamily = fontBase64
    ? scoreCfg.fontFamily
    : "Impact, Haettenschweiler, 'Arial Narrow Bold', Arial Black, sans-serif";

  // Render at badge dimensions — librsvg draws tiny text on full-canvas SVGs.
  return `
<svg width="${badgeSize}" height="${badgeSize}" xmlns="http://www.w3.org/2000/svg">
  <defs><style>${fontFace}</style></defs>
  <text
    x="${cx - offset}"
    y="${cy}"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    font-weight="${scoreCfg.fontWeight || "900"}"
    fill="${scoreCfg.aberrationCyan}"
    text-anchor="middle"
    dominant-baseline="middle"
    opacity="0.9"
  >${scoreText}</text>
  <text
    x="${cx + offset}"
    y="${cy}"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    font-weight="${scoreCfg.fontWeight || "900"}"
    fill="${scoreCfg.aberrationRed}"
    text-anchor="middle"
    dominant-baseline="middle"
    opacity="0.9"
  >${scoreText}</text>
  <text
    x="${cx}"
    y="${cy}"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    font-weight="${scoreCfg.fontWeight || "900"}"
    fill="${scoreCfg.color}"
    text-anchor="middle"
    dominant-baseline="middle"
  >${scoreText}</text>
</svg>`;
}

async function renderScoreOverlay({ badgeSize, scoreText, scoreCfg, fontPath }) {
  const fontBase64 = fontPath
    ? fs.readFileSync(fontPath).toString("base64")
    : null;
  const scoreSvg = buildScoreSvg({
    badgeSize,
    scoreText,
    scoreCfg,
    fontBase64,
  });
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

/**
 * Composite a branded social card PNG (1080×1350, 4:5).
 * @param {{ photoUrl: string, score: number }} input
 * @returns {Promise<Buffer>}
 */
async function renderCard({ photoUrl, score }) {
  const { badgePath, fontPath } = assertRequiredAssets();
  const { width, height, badge, score: scoreCfg } = cardLayout;

  const photoRes = await fetch(photoUrl);
  if (!photoRes.ok) {
    throw new Error(`Failed to fetch source photo: ${photoRes.status}`);
  }
  const photoBuffer = Buffer.from(await photoRes.arrayBuffer());

  const bg = await sharp(photoBuffer)
    .resize(width, height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

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
