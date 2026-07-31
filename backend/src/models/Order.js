const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    productName: {
      type: String,
      required: true,
    },

    unit: {
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },
    selectedUnit: {
      type: String,
      default: "",
      trim: true,
    },

    conversionToBase: {
      type: Number,
      default: 1,
      min: 0,
    },

    baseQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    source: {
      type: String,
      enum: ["shop_stock", "outsourced"],
      default: "shop_stock",
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    supplierName: {
      type: String,
      default: "",
      trim: true,
    },

    supplierRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    supplierAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

  },
  { _id: false }
);

const orderAdjustmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["return", "discount", "extra_charge", "damage", "vaivhaar"],
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    productName: {
      type: String,
      default: "",
      trim: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    unit: {
      type: String,
      default: "",
      trim: true,
    },

    conversionToBase: {
      type: Number,
      default: 1,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    returnRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    labourCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    direction: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    stockImpact: {
      type: String,
      enum: ["add_to_stock", "no_stock_change"],
      default: "no_stock_change",
    },

    condition: {
      type: String,
      enum: ["sealed", "loose", "damaged", "not_applicable"],
      default: "not_applicable",
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
      required: true,
    },

    billNumber: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: "At least one order item is required",
      },
    },

    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    dueAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },

    orderType: {
      type: String,
      enum: ["sale", "rental"],
      default: "sale",
    },

    orderStatus: {
        type: String,
        enum: ["pending", "confirmed", "dispatched", "delivered", "cancelled"],
        default: "pending",
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },

    deliveryAddress: {
      type: String,
      default: "",
      trim: true,
    },

    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    adjustments: {
      type: [orderAdjustmentSchema],
      default: [],
    },

    rentalStartDate: {
      type: Date,
      default: null,
    },

    rentalEndDate: {
      type: Date,
      default: null,
    },

    rentalPeriodType: {
      type: String,
      enum: ["day", "week", "month"],
      default: "day",
    },

    rentalPeriodValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    returnStatus: {
      type: String,
      enum: ["not_required", "pending", "returned", "late"],
      default: "not_required",
    },

    returnedDate: {
      type: Date,
      default: null,
    },

    lateChargePerDay: {
      type: Number,
      default: 0,
      min: 0,
    },

    lateCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    returnDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
