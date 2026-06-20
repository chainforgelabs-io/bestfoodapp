/**
 * Tunable layout for social card composition (1080×1350).
 * Adjust badge size/margins and score fontSize against the real badge asset.
 */
module.exports = {
  width: 1080,
  height: 1350,
  badge: {
    size: 300,
    marginRight: 48,
    marginTop: 48,
  },
  score: {
    fontFamily: "Pacifico",
    // Ratio of badge diameter. Pacifico has large side bearings, so it renders
    // smaller than its em — keep these high so the score fills the circle.
    fontSizeRatio: 0.62,
    fontSizeRatioThreeDigit: 0.46,
    fontWeight: "normal",
    color: "#000000",
    aberrationRatio: 0.04,
    aberrationCyan: "#00e5ff",
    aberrationRed: "#ff1744",
  },
};
