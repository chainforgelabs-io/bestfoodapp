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
    fontSize: 108,
    fontWeight: "normal",
    color: "#000000",
    aberrationOffset: 4,
    aberrationCyan: "#00e5ff",
    aberrationRed: "#ff1744",
  },
};
