const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "../../assets/social");

function getAssetPath(filename) {
  return path.join(ASSETS_DIR, filename);
}

function assertRequiredAssets() {
  const badgePath = getAssetPath("badge.png");
  const fontPath = getAssetPath("score-font.ttf");
  const missing = [];
  if (!fs.existsSync(badgePath)) missing.push("badge.png");
  if (!fs.existsSync(fontPath)) missing.push("score-font.ttf");
  if (missing.length > 0) {
    const err = new Error(
      `missing_social_asset: place ${missing.join(", ")} in backend/assets/social/`
    );
    err.code = "missing_social_asset";
    throw err;
  }
  return { badgePath, fontPath };
}

function hasOptionalBorder() {
  return fs.existsSync(getAssetPath("border.png"));
}

module.exports = {
  ASSETS_DIR,
  getAssetPath,
  assertRequiredAssets,
  hasOptionalBorder,
};
