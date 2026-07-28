const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    seq: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Counter", counterSchema);
