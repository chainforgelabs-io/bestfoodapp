const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  firstName: {
    type: String,
    required: false,
  },
  lastName: {
    type: String,
    required: false,
  },
  profilePicture: { type: String, default: "" },
  bio: { type: String, default: "" },
  dateOfBirth: { type: Date, required: true },
  sex: { type: String, enum: ["male", "female", "other"] }, // Gender options
  location: {
    city: { type: String },
    province: { type: String },
    country: { type: String },
  },
  incomeRange: {
    type: String,
    enum: ["<25k", "25k-50k", "50k-75k", "75k-100k", "100k-150k", ">150k"],
  }, // Income brackets
  maritalStatus: {
    type: String,
    enum: ["single", "married", "divorced", "widowed"],
  },
  occupation: { type: String },
  role: { type: String, enum: ["user", "admin"], default: "user" }, // Add role field
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  points: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hash the password before saving the user model
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password in the database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
