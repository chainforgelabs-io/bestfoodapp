const express = require("express");
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getMergedTaxonomy,
  createTaxonomyOption,
} = require("../lib/menu/foodTaxonomyStore");

const router = express.Router();

// GET /api/food-taxonomy — merged static + DB options for dropdowns
router.get("/", async (_req, res) => {
  try {
    const taxonomy = await getMergedTaxonomy();
    res.json(taxonomy);
  } catch (err) {
    console.error("food-taxonomy get", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/food-taxonomy — admin creates a new category/type/subType option
router.post("/", protect, admin, async (req, res) => {
  try {
    const { kind, value, parent } = req.body || {};
    const result = await createTaxonomyOption({
      kind,
      value,
      parent,
      userId: req.user._id,
    });
    const taxonomy = await getMergedTaxonomy();
    res.status(result.created ? 201 : 200).json({
      ...result,
      taxonomy,
    });
  } catch (err) {
    if (err.code === "VALIDATION") {
      return res.status(400).json({ message: err.message });
    }
    console.error("food-taxonomy create", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
