const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
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
    orderType: {
  type: String,
  enum: ["sale", "rental"],
  default: "sale",
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
},

deliveryCharge: {
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

  },
  { _id: false }
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