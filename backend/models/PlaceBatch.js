const mongoose = require("mongoose");

const placeBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  label: { type: String, required: true },
  citySlug: { type: String, default: null },
  province: { type: String, default: null },
  status: {
    type: String,
    enum: ["pending_review", "approved", "autopilot", "rejected"],
    default: "pending_review",
    index: true,
  },
  totalRows: { type: Number, default: 0 },
  editedRows: { type: Number, default: 0 },
  dismissedRows: { type: Number, default: 0 },
  editRate: { type: Number, default: 0 },
  sourceRelease: { type: String, default: null },
  notes: { type: String, default: "" },
  approvedAt: { type: Date, default: null },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PlaceBatch", placeBatchSchema);
