const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const StockMovement = require("../models/StockMovement");

const getPaymentStatus = (subTotal, paidAmount) => {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= subTotal) return "paid";
  return "partial";
};

const createOrder = async (req, res) => {
  try {
    const {
      customerId,
      items,
      paidAmount = 0,
      deliveryAddress = "",
      deliveryCharge = 0,
      notes = "",

      orderType = "sale",
      rentalStartDate = null,
      rentalEndDate = null,
      rentalPeriodType = "day",
      rentalPeriodValue = 0,
      lateChargePerDay = 0,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: "Customer is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }

    if (!["sale", "rental"].includes(orderType)) {
      return res.status(400).json({ message: "Invalid order type" });
    }

    if (orderType === "rental") {
      if (!rentalStartDate || !rentalEndDate) {
        return res.status(400).json({
          message: "Rental start date and return date are required",
        });
      }
    }

    const customer = await Customer.findOne({
      _id: customerId,
      createdBy: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const orderItems = [];
    const stockUpdates = [];
    let itemsTotal = 0;

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        createdBy: req.user._id,
      });

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.productId}`,
        });
      }

      const quantity = Number(item.quantity);
      const pricePerUnit =
        item.pricePerUnit !== undefined
          ? Number(item.pricePerUnit)
          : Number(product.pricePerUnit);

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          message: `Invalid quantity for ${product.name}`,
        });
      }

      if (pricePerUnit < 0) {
        return res.status(400).json({
          message: `Invalid price for ${product.name}`,
        });
      }

      if (quantity > product.currentStock) {
        return res.status(400).json({
          message: `${product.name} stock not enough. Available: ${product.currentStock} ${product.unit}`,
        });
      }

      const total = quantity * pricePerUnit;
      itemsTotal += total;

      orderItems.push({
        product: product._id,
        productName: product.name,
        unit: product.unit,
        quantity,
        pricePerUnit,
        total,
      });

      stockUpdates.push({
        product,
        quantity,
        previousStock: product.currentStock,
        newStock: product.currentStock - quantity,
      });
    }

    const finalDeliveryCharge = Number(deliveryCharge || 0);
    const finalPaidAmount = Number(paidAmount || 0);

    const subTotal = itemsTotal + finalDeliveryCharge;

    if (finalPaidAmount < 0) {
      return res.status(400).json({
        message: "Paid amount cannot be negative",
      });
    }

    const dueAmount = Math.max(subTotal - finalPaidAmount, 0);
    const paymentStatus = getPaymentStatus(subTotal, finalPaidAmount);

    const order = await Order.create({
      customer: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: orderItems,

      subTotal,
      paidAmount: finalPaidAmount,
      dueAmount,
      paymentStatus,

      deliveryAddress: deliveryAddress || customer.address || "",
      deliveryCharge: finalDeliveryCharge,
      notes,

      orderType,
      rentalStartDate: orderType === "rental" ? rentalStartDate : null,
      rentalEndDate: orderType === "rental" ? rentalEndDate : null,
      rentalPeriodType: orderType === "rental" ? rentalPeriodType : "day",
      rentalPeriodValue:
        orderType === "rental" ? Number(rentalPeriodValue || 0) : 0,
      returnStatus: orderType === "rental" ? "pending" : "not_required",
      lateChargePerDay:
        orderType === "rental" ? Number(lateChargePerDay || 0) : 0,

      createdBy: req.user._id,
    });

    for (const update of stockUpdates) {
      update.product.currentStock = update.newStock;
      await update.product.save();

      await StockMovement.create({
        product: update.product._id,
        productName: update.product.name,
        type: "stock_out",
        quantity: update.quantity,
        previousStock: update.previousStock,
        newStock: update.newStock,
        reason:
          orderType === "rental"
            ? `Rental order created for ${customer.name}`
            : `Sale order created for ${customer.name}`,
        referenceType: "order",
        referenceId: order._id,
        createdBy: req.user._id,
      });
    }

    return res.status(201).json({
      message:
        orderType === "rental"
          ? "Rental order created and stock moved out"
          : "Sale order created and stock updated",
      order,
    });
  } catch (error) {
    console.log("Create order error:", error);

    return res.status(500).json({
      message: "Order creation failed",
      error: error.message,
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ createdBy: req.user._id })
      .populate("customer", "name phone address")
      .populate("items.product", "name category unit pricePerUnit")
      .sort({ createdAt: -1 });

    return res.json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    })
      .populate("customer", "name phone address")
      .populate("items.product", "name category unit pricePerUnit");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.json({ order });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

const updateOrder = async (req, res) => {
  try {
    const {
      paidAmount,
      deliveryAddress,
      returnDate,
      notes,
    } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (paidAmount !== undefined) {
      const finalPaidAmount = Number(paidAmount);

      if (finalPaidAmount < 0) {
        return res.status(400).json({
          message: "Paid amount cannot be negative",
        });
      }

      order.paidAmount = finalPaidAmount;
      order.dueAmount = Math.max(order.subTotal - finalPaidAmount, 0);
      order.paymentStatus = getPaymentStatus(order.subTotal, finalPaidAmount);
    }

    if (deliveryAddress !== undefined) {
      order.deliveryAddress = deliveryAddress;
    }

    if (returnDate !== undefined) {
      order.returnDate = returnDate || null;
    }

    if (notes !== undefined) {
      order.notes = notes;
    }

    await order.save();

    return res.json({
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Order update failed",
      error: error.message,
    });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.json({
      message: "Order deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Order delete failed",
      error: error.message,
    });
  }
};

const getOrdersByCustomer = async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.params.customerId,
      createdBy: req.user._id,
    })
      .populate("customer", "name phone address")
      .populate("items.product", "name category unit pricePerUnit")
      .sort({ createdAt: -1 });

    return res.json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customer orders",
      error: error.message,
    });
  }
};

const getReturnReminders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdBy: req.user._id,
      orderType: "rental",
      returnStatus: { $in: ["pending", "late"] },
    })
      .populate("customer", "name phone address")
      .sort({ rentalEndDate: 1 });

    const reminders = orders.map((order) => {
      const returnDate = new Date(order.rentalEndDate);
      returnDate.setHours(23, 59, 59, 999);

      const diffMs = today - returnDate;
      const overdueDays = Math.max(
        0,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      );

      const isOverdue = overdueDays > 0;

      const runningLateCharge =
        isOverdue && order.lateChargePerDay
          ? overdueDays * order.lateChargePerDay
          : 0;

      return {
        _id: order._id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items,
        rentalEndDate: order.rentalEndDate,
        returnStatus: isOverdue ? "late" : order.returnStatus,
        overdueDays,
        runningLateCharge,
        dueAmount: order.dueAmount,
        subTotal: order.subTotal,
      };
    });

    const dueToday = reminders.filter((item) => {
      const d = new Date(item.rentalEndDate).toDateString();
      const t = new Date().toDateString();
      return d === t;
    });

    const overdue = reminders.filter((item) => item.overdueDays > 0);
    const upcoming = reminders.filter((item) => item.overdueDays === 0);

    return res.json({
      totalPendingReturns: reminders.length,
      dueTodayCount: dueToday.length,
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
      reminders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch return reminders",
      error: error.message,
    });
  }
};

const markOrderReturned = async (req, res) => {
  try {
    const { returnedDate = new Date(), addLateCharge = true } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      orderType: "rental",
    });

    if (!order) {
      return res.status(404).json({
        message: "Rental order not found",
      });
    }

    if (order.returnStatus === "returned") {
      return res.status(400).json({
        message: "Order already returned",
      });
    }

    const finalReturnedDate = new Date(returnedDate);
    const expectedDate = new Date(order.rentalEndDate);

    finalReturnedDate.setHours(23, 59, 59, 999);
    expectedDate.setHours(23, 59, 59, 999);

    const overdueDays = Math.max(
      0,
      Math.ceil((finalReturnedDate - expectedDate) / (1000 * 60 * 60 * 24))
    );

    const lateCharge =
      addLateCharge && overdueDays > 0
        ? overdueDays * Number(order.lateChargePerDay || 0)
        : 0;

    order.returnedDate = finalReturnedDate;
    order.returnStatus = "returned";
    order.lateCharge = lateCharge;

    if (lateCharge > 0) {
      order.subTotal = order.subTotal + lateCharge;
      order.dueAmount = Math.max(order.subTotal - order.paidAmount, 0);
      order.paymentStatus = getPaymentStatus(order.subTotal, order.paidAmount);
    }

    await order.save();

    for (const item of order.items) {
      const product = await Product.findOne({
        _id: item.product,
        createdBy: req.user._id,
      });

      if (product) {
        const previousStock = product.currentStock;
        const newStock = previousStock + item.quantity;

        product.currentStock = newStock;
        await product.save();

        await StockMovement.create({
          product: product._id,
          productName: product.name,
          type: "stock_in",
          quantity: item.quantity,
          previousStock,
          newStock,
          reason: `Rental item returned by ${order.customerName}`,
          referenceType: "order",
          referenceId: order._id,
          createdBy: req.user._id,
        });
      }
    }

    return res.json({
      message: "Rental order marked as returned and stock restored",
      order,
      overdueDays,
      lateCharge,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Mark returned failed",
      error: error.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "dispatched",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      { orderStatus },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Order status update failed",
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  getOrdersByCustomer,
  getReturnReminders,
  markOrderReturned,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
};