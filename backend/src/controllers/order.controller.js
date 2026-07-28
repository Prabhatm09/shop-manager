const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const StockMovement = require("../models/StockMovement");
const Payment = require("../models/Payment");
const Counter = require("../models/Counter");

const getPaymentStatus = (subTotal, paidAmount) => {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= subTotal) return "paid";
  return "partial";
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const adjustmentDirectionByType = {
  return: "credit",
  discount: "credit",
  vaivhaar: "credit",
  damage: "credit",
  extra_charge: "debit",
};

const getBillYear = (date = new Date()) => new Date(date).getFullYear();

const nextBillNumber = async (userId, date = new Date()) => {
  const year = getBillYear(date);
  const counter = await Counter.findOneAndUpdate(
    { scope: `bill:${userId}:${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `RM-${year}-${String(counter.seq).padStart(4, "0")}`;
};

const ensureBillNumber = async (order, userId) => {
  if (order.billNumber) return order;

  order.billNumber = await nextBillNumber(userId, order.createdAt || new Date());
  await order.save();

  return order;
};

const ensureBillNumbers = async (orders, userId) => {
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  for (const order of sortedOrders) {
    await ensureBillNumber(order, userId);
  }

  return orders;
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
        isActive: true,
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
      const conversionToBase = Number(item.conversionToBase || 1);
      const selectedUnit = item.selectedUnit || product.unit;

      if (!isFiniteNumber(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: `Invalid quantity for ${product.name}`,
        });
      }

      if (!isFiniteNumber(pricePerUnit) || pricePerUnit < 0) {
        return res.status(400).json({
          message: `Invalid price for ${product.name}`,
        });
      }

      if (!isFiniteNumber(conversionToBase) || conversionToBase <= 0) {
        return res.status(400).json({
          message: `Invalid unit conversion for ${product.name}`,
        });
      }

      const stockDeduct = quantity * conversionToBase;

      if (stockDeduct > product.currentStock) {
        return res.status(400).json({
          message: `${product.name} stock not enough. Available: ${product.currentStock} ${product.unit}`,
        });
      }

      const total = quantity * pricePerUnit;
      itemsTotal += total;

      orderItems.push({
        product: product._id,
        productName: product.name,
        unit: selectedUnit,
        selectedUnit,
        quantity,
        conversionToBase,
        baseQuantity: stockDeduct,
        pricePerUnit,
        total,
      });

      stockUpdates.push({
        product,
        quantity: stockDeduct,
        previousStock: product.currentStock,
        newStock: product.currentStock - stockDeduct,
      });
    }

    const finalDeliveryCharge = Number(deliveryCharge || 0);
    const finalPaidAmount = Number(paidAmount || 0);

    if (!isFiniteNumber(finalDeliveryCharge) || finalDeliveryCharge < 0) {
      return res.status(400).json({
        message: "Delivery charge cannot be negative",
      });
    }

    const subTotal = itemsTotal + finalDeliveryCharge;

    if (!isFiniteNumber(finalPaidAmount) || finalPaidAmount < 0) {
      return res.status(400).json({
        message: "Paid amount cannot be negative",
      });
    }

    if (finalPaidAmount > subTotal) {
      return res.status(400).json({
        message: "Paid amount cannot be greater than bill total",
      });
    }

    const dueAmount = Math.max(subTotal - finalPaidAmount, 0);
    const paymentStatus = getPaymentStatus(subTotal, finalPaidAmount);

    const order = await Order.create({
      customer: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      billNumber: await nextBillNumber(req.user._id),
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

    if (finalPaidAmount > 0) {
      await Payment.create({
        order: order._id,
        customer: customer._id,
        customerName: customer.name,
        amount: finalPaidAmount,
        paymentMode: req.body.paymentMode || "cash",
        paymentDate: req.body.paymentDate || new Date(),
        notes: "Initial payment received while creating order",
        createdBy: req.user._id,
      });
    }

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
      .populate("items.product", "name category unit pricePerUnit saleUnits")
      .sort({ createdAt: -1 });

    await ensureBillNumbers(orders, req.user._id);

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
      .populate("items.product", "name category unit pricePerUnit saleUnits");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    await ensureBillNumber(order, req.user._id);

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
      .populate("items.product", "name category unit pricePerUnit saleUnits")
      .sort({ createdAt: -1 });

    await ensureBillNumbers(orders, req.user._id);

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
        const restoreQuantity = Number(item.baseQuantity || item.quantity || 0);
        const newStock = previousStock + restoreQuantity;

        product.currentStock = newStock;
        await product.save();

        await StockMovement.create({
          product: product._id,
          productName: product.name,
          type: "stock_in",
          quantity: restoreQuantity,
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

const createOrderAdjustment = async (req, res) => {
  try {
    const {
      type,
      productId = null,
      productName = "",
      quantity = 0,
      unit = "",
      conversionToBase = 1,
      amount,
      returnRate,
      labourCharge = 0,
      stockImpact = "no_stock_change",
      condition = "not_applicable",
      note = "",
    } = req.body;

    if (!adjustmentDirectionByType[type]) {
      return res.status(400).json({
        message: "Invalid adjustment type",
      });
    }

    if (!isFiniteNumber(quantity) || Number(quantity) < 0) {
      return res.status(400).json({
        message: "Adjustment quantity cannot be negative",
      });
    }

    if (!isFiniteNumber(conversionToBase) || Number(conversionToBase) <= 0) {
      return res.status(400).json({
        message: "Invalid unit conversion",
      });
    }

    if (!isFiniteNumber(labourCharge) || Number(labourCharge) < 0) {
      return res.status(400).json({
        message: "Labour charge cannot be negative",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    let product = null;
    let finalProductName = productName;
    let finalUnit = unit;
    let finalConversionToBase = Number(conversionToBase || 1);
    let finalReturnRate =
      returnRate !== undefined ? Number(returnRate) : Number(amount || 0);
    let adjustmentAmount = Number(amount || 0);

    if (productId) {
      product = await Product.findOne({
        _id: productId,
        createdBy: req.user._id,
        isActive: true,
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      finalProductName = product.name;
    }

    if (type === "return") {
      if (!productId || !product) {
        return res.status(400).json({
          message: "Returned item is required",
        });
      }

      if (!isFiniteNumber(quantity) || Number(quantity) <= 0) {
        return res.status(400).json({
          message: "Return quantity must be greater than 0",
        });
      }

      const orderItems = order.items.filter((item) => {
        const itemProductId =
          typeof item.product === "object"
            ? item.product?._id?.toString()
            : item.product?.toString();
        return itemProductId === productId.toString();
      });

      if (orderItems.length === 0) {
        return res.status(400).json({
          message: "Returned item was not purchased in this bill",
        });
      }

      const matchedItem =
        orderItems.find(
          (item) => (item.selectedUnit || item.unit) === unit
        ) || orderItems[0];

      finalUnit = unit || matchedItem.selectedUnit || matchedItem.unit;
      finalConversionToBase = Number(
        conversionToBase || matchedItem.conversionToBase || 1
      );

      if (!isFiniteNumber(finalReturnRate) || finalReturnRate <= 0) {
        finalReturnRate = Number(matchedItem.pricePerUnit || 0);
      }

      if (!isFiniteNumber(finalReturnRate) || finalReturnRate <= 0) {
        return res.status(400).json({
          message: "Return rate must be greater than 0",
        });
      }

      const purchasedBaseQuantity = orderItems.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) * Number(item.conversionToBase || 1),
        0
      );
      const alreadyReturnedBaseQuantity = (order.adjustments || [])
        .filter((entry) => {
          const entryProductId =
            typeof entry.product === "object"
              ? entry.product?._id?.toString()
              : entry.product?.toString();
          return entry.type === "return" && entryProductId === productId.toString();
        })
        .reduce(
          (sum, entry) =>
            sum +
            Number(entry.quantity || 0) *
              Number(entry.conversionToBase || 1),
          0
        );
      const returnBaseQuantity =
        Number(quantity || 0) * Number(finalConversionToBase || 1);

      if (
        returnBaseQuantity >
        purchasedBaseQuantity - alreadyReturnedBaseQuantity + 0.0001
      ) {
        return res.status(400).json({
          message: "Return quantity cannot be more than remaining purchased quantity",
        });
      }

      const grossReturnAmount = Number(quantity) * finalReturnRate;
      adjustmentAmount = grossReturnAmount - Number(labourCharge || 0);

      if (!isFiniteNumber(adjustmentAmount) || adjustmentAmount <= 0) {
        return res.status(400).json({
          message: "Return credit must be greater than 0 after labour charge",
        });
      }
    } else if (!isFiniteNumber(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Adjustment amount must be greater than 0",
      });
    }

    if (stockImpact === "add_to_stock" && !product) {
      return res.status(400).json({
        message: "Product is required when adding returned stock",
      });
    }

    const direction = adjustmentDirectionByType[type];

    if (direction === "credit" && adjustmentAmount > Number(order.subTotal || 0)) {
      return res.status(400).json({
        message: "Credit amount cannot be greater than bill total",
      });
    }

    const adjustment = {
      type,
      product: product ? product._id : null,
      productName: finalProductName || "",
      quantity: Number(quantity || 0),
      unit: finalUnit,
      conversionToBase: finalConversionToBase,
      amount: adjustmentAmount,
      returnRate: type === "return" ? finalReturnRate : 0,
      labourCharge: Number(labourCharge || 0),
      direction,
      stockImpact,
      condition,
      note,
      createdAt: new Date(),
    };

    order.adjustments.push(adjustment);

    if (direction === "credit") {
      order.subTotal = Math.max(Number(order.subTotal || 0) - adjustmentAmount, 0);
    } else {
      order.subTotal = Number(order.subTotal || 0) + adjustmentAmount;
    }

    order.dueAmount = Math.max(
      Number(order.subTotal || 0) - Number(order.paidAmount || 0),
      0
    );
    order.paymentStatus = getPaymentStatus(order.subTotal, order.paidAmount);

    await order.save();

    if (stockImpact === "add_to_stock" && product) {
      const previousStock = Number(product.currentStock || 0);
      const returnedStock =
        Number(quantity || 0) * Number(finalConversionToBase || 1);
      const newStock = previousStock + returnedStock;

      product.currentStock = newStock;
      await product.save();

      await StockMovement.create({
        product: product._id,
        productName: product.name,
        type: "stock_in",
        quantity: returnedStock,
        previousStock,
        newStock,
        reason: `Order adjustment: ${type} for ${order.customerName}`,
        referenceType: "order",
        referenceId: order._id,
        createdBy: req.user._id,
      });
    }

    return res.status(201).json({
      message: "Order adjustment added successfully",
      order,
      adjustment: order.adjustments[order.adjustments.length - 1],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Order adjustment failed",
      error: error.message,
    });
  }
};

const quickSale = async (req, res) => {
  try {
    const { items, paymentMode = "cash" } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "No items provided",
      });
    }

    let customer = await Customer.findOne({
      phone: "0000000000",
      createdBy: req.user._id,
    });

    if (!customer) {
      customer = await Customer.create({
        name: "Walk-in Customer",
        phone: "0000000000",
        address: "Counter Sale",
        openingDue: 0,
        createdBy: req.user._id,
      });
    }

    const orderItems = [];
    const stockUpdates = [];
    let subTotal = 0;

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        createdBy: req.user._id,
        isActive: true,
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      const quantity = Number(item.quantity || 0);
      const pricePerUnit = Number(item.pricePerUnit || product.pricePerUnit || 0);
      const conversionToBase = Number(item.conversionToBase || 1);
      const selectedUnit = item.selectedUnit || product.unit;

      if (!isFiniteNumber(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: "Quantity must be greater than 0",
        });
      }

      if (!isFiniteNumber(pricePerUnit) || pricePerUnit <= 0) {
        return res.status(400).json({
          message: `Invalid price for ${product.name}`,
        });
      }

      if (!isFiniteNumber(conversionToBase) || conversionToBase <= 0) {
        return res.status(400).json({
          message: `Invalid unit conversion for ${product.name}`,
        });
      }

      const stockDeduct = quantity * conversionToBase;

      if (stockDeduct > product.currentStock) {
        return res.status(400).json({
          message: `${product.name} stock not enough. Available: ${product.currentStock}`,
        });
      }

      const total = quantity * pricePerUnit;
      subTotal += total;

      orderItems.push({
        product: product._id,
        productName: product.name,
        unit: selectedUnit,
        selectedUnit,
        quantity,
        conversionToBase,
        baseQuantity: stockDeduct,
        pricePerUnit,
        total,
      });

      stockUpdates.push({
        product,
        quantity: stockDeduct,
        previousStock: product.currentStock,
        newStock: product.currentStock - stockDeduct,
      });
    }

    const order = await Order.create({
      orderType: "sale",
      customer: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      billNumber: await nextBillNumber(req.user._id),
      items: orderItems,
      subTotal,
      paidAmount: subTotal,
      dueAmount: 0,
      paymentStatus: "paid",
      orderStatus: "delivered",
      deliveryAddress: "Counter Sale",
      deliveryCharge: 0,
      returnStatus: "not_required",
      notes: `Quick sale payment mode: ${paymentMode}`,
      createdBy: req.user._id,
    });

    await Payment.create({
      order: order._id,
      customer: customer._id,
      customerName: customer.name,
      amount: subTotal,
      paymentMode,
      paymentDate: new Date(),
      notes: "Quick sale payment",
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
        reason: "Quick sale",
        referenceType: "order",
        referenceId: order._id,
        createdBy: req.user._id,
      });
    }

    return res.status(201).json({
      message: "Quick sale completed successfully",
      order,
    });
  } catch (error) {
    console.log("Quick sale error:", error);

    return res.status(500).json({
      message: "Quick sale failed",
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  quickSale,
  getOrderById,
  getOrdersByCustomer,
  getReturnReminders,
  markOrderReturned,
  updateOrder,
  updateOrderStatus,
  createOrderAdjustment,
  deleteOrder,
};
