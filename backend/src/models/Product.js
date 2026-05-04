const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    category: {
    type: String,
    required: [true, "Category is required"],
    enum: ["building_material", "timber", "other"],
    },

    subCategory: {
    type: String,
    required: [true, "Sub category is required"],
    trim: true,
    },

    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: ["bag", "feet", "piece", "tractor", "trolley", "kg"],
    },

    pricePerUnit: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },

    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    lowStockAlert: {
      type: Number,
      default: 10,
      min: 0,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);