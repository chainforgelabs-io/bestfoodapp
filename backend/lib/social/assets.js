const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "../../assets/social");

// Primary badge overlay — Carson's whatsthebest.svg (circular rating badge).
const BADGE_FILENAME = "badge.svg";

function getAssetPath(filename) {
  return path.join(ASSETS_DIR, filename);
}

function assertRequiredAssets() {
  const badgePath = getAssetPath(BADGE_FILENAME);
  const fontPath = getAssetPath("score-font.ttf");
  const missing = [];
  if (!fs.existsSync(badgePath)) missing.push(BADGE_FILENAME);
  if (missing.length > 0) {
    const err = new Error(
      `missing_social_asset: place ${missing.join(", ")} in backend/assets/social/`
    );
    err.code = "missing_social_asset";
    throw err;
  }
  return {
    badgePath,
    fontPath: fs.existsSync(fontPath) ? fontPath : null,
  };
}

function hasOptionalBorder() {
  return fs.existsSync(getAssetPath("border.png"));
}

module.exports = {
  ASSETS_DIR,
  BADGE_FILENAME,
  getAssetPath,
  assertRequiredAssets,
  hasOptionalBorder,
};
