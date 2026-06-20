const sharp = require("sharp");
const fs = require("fs");
const cardLayout = require("./cardLayout");
const { assertRequiredAssets, getAssetPath, hasOptionalBorder } = require("./assets");

/**
 * Composite a branded social card PNG.
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

  const badgeBuffer = fs.readFileSync(badgePath);
  const badgeSize = badge.size;
  const badgeResized = await sharp(badgeBuffer)
    .resize(badgeSize, badgeSize)
    .png()
    .toBuffer();

  const badgeLeft = width - badge.marginRight - badgeSize;
  const badgeTop = badge.marginTop;
  const cx = badgeLeft + badgeSize / 2;
  const cy = badgeTop + badgeSize / 2;

  const fontBase64 = fs.readFileSync(fontPath).toString("base64");
  const scoreText = String(Math.round(score));

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: '${scoreCfg.fontFamily}';
        src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    </style>
  </defs>
  <text
    x="${cx}"
    y="${cy}"
    font-family="${scoreCfg.fontFamily}"
    font-size="${scoreCfg.fontSize}"
    fill="${scoreCfg.color}"
    text-anchor="middle"
    dominant-baseline="central"
  >${scoreText}</text>
</svg>`;

  const composites = [
    { input: badgeResized, left: badgeLeft, top: badgeTop },
    { input: Buffer.from(svg), left: 0, top: 0 },
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
