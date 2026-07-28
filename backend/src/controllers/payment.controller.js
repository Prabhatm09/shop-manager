const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Customer = require("../models/Customer");

const getPaymentStatus = (subTotal, paidAmount) => {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= subTotal) return "paid";
  return "partial";
};

const createPayment = async (req, res) => {
  try {
    const {
      orderId,
      amount,
      paymentMode = "cash",
      paymentDate = new Date(),
      notes = "",
    } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        message: "Order and payment amount are required",
      });
    }

    const paymentAmount = Number(amount);

    if (paymentAmount <= 0) {
      return res.status(400).json({
        message: "Payment amount must be greater than 0",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      createdBy: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.dueAmount <= 0) {
      return res.status(400).json({
        message: "This order is already fully paid",
      });
    }

    if (paymentAmount > order.dueAmount) {
      return res.status(400).json({
        message: `Payment cannot be greater than due amount ₹${order.dueAmount}`,
      });
    }

    const payment = await Payment.create({
      order: order._id,
      customer: order.customer,
      customerName: order.customerName,
      amount: paymentAmount,
      paymentMode,
      paymentDate,
      notes,
      createdBy: req.user._id,
    });

    order.paidAmount = order.paidAmount + paymentAmount;
    order.dueAmount = Math.max(order.subTotal - order.paidAmount, 0);
    order.paymentStatus = getPaymentStatus(order.subTotal, order.paidAmount);

    await order.save();

    return res.status(201).json({
      message: "Payment added successfully",
      payment,
      order,
    });
  } catch (error) {
    console.log("Create payment error:", error);
    return res.status(500).json({
      message: "Payment creation failed",
      error: error.message,
    });
  }
};

const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ createdBy: req.user._id })
      .populate("order", "subTotal paidAmount dueAmount paymentStatus")
      .populate("customer", "name phone address")
      .sort({ createdAt: -1 });

    return res.json({
      count: payments.length,
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

const getPaymentsByOrder = async (req, res) => {
  try {
    const payments = await Payment.find({
      order: req.params.orderId,
      createdBy: req.user._id,
    }).sort({ createdAt: -1 });

    return res.json({
      count: payments.length,
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch order payments",
      error: error.message,
    });
  }
};

const getPaymentsByCustomer = async (req, res) => {
  try {
    const payments = await Payment.find({
      customer: req.params.customerId,
      createdBy: req.user._id,
    })
      .populate("order", "subTotal paidAmount dueAmount paymentStatus")
      .sort({ createdAt: -1 });

    return res.json({
      count: payments.length,
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customer payments",
      error: error.message,
    });
  }
};

const collectCustomerPayment = async (req, res) => {
  try {
    const { amount, paymentMode = "cash", paymentDate, notes } = req.body;

    let remainingAmount = Number(amount || 0);

    if (remainingAmount <= 0) {
      return res.status(400).json({
        message: "Payment amount must be greater than 0",
      });
    }

    const customer = await Customer.findOne({
      _id: req.params.customerId,
      createdBy: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const openingDueOutstanding = Math.max(
      Number(customer.openingDue || 0) - Number(customer.openingDuePaid || 0),
      0
    );

    const dueOrders = await Order.find({
      customer: customer._id,
      createdBy: req.user._id,
      dueAmount: { $gt: 0 },
    }).sort({ createdAt: 1 });

    if (openingDueOutstanding <= 0 && dueOrders.length === 0) {
      return res.status(400).json({
        message: "No due orders found for this customer",
      });
    }

    const totalDue =
      openingDueOutstanding +
      dueOrders.reduce((sum, order) => sum + Number(order.dueAmount || 0), 0);

    if (remainingAmount > totalDue) {
      return res.status(400).json({
        message: `Payment cannot be greater than total due ₹${totalDue}`,
      });
    }

    const paymentRecords = [];

    if (openingDueOutstanding > 0 && remainingAmount > 0) {
      const appliedAmount = Math.min(remainingAmount, openingDueOutstanding);

      customer.openingDuePaid =
        Number(customer.openingDuePaid || 0) + appliedAmount;
      await customer.save();

      const payment = await Payment.create({
        customer: customer._id,
        customerName: customer.name,
        order: null,
        amount: appliedAmount,
        paymentMode,
        paymentDate: paymentDate || new Date(),
        notes: notes || "Customer payment adjusted against opening due",
        createdBy: req.user._id,
      });

      paymentRecords.push(payment);
      remainingAmount -= appliedAmount;
    }

    for (const order of dueOrders) {
      if (remainingAmount <= 0) break;

      const orderDue = Number(order.dueAmount || 0);
      const appliedAmount = Math.min(remainingAmount, orderDue);

      order.paidAmount = Number(order.paidAmount || 0) + appliedAmount;
      order.dueAmount = Math.max(orderDue - appliedAmount, 0);

      if (order.dueAmount === 0) {
        order.paymentStatus = "paid";
      } else {
        order.paymentStatus = "partial";
      }

      await order.save();

      const payment = await Payment.create({
        customer: customer._id,
        customerName: customer.name,
        order: order._id,
        amount: appliedAmount,
        paymentMode,
        paymentDate: paymentDate || new Date(),
        notes:
          notes ||
          `Customer ledger payment adjusted against order #${order._id
            .toString()
            .slice(-6)
            .toUpperCase()}`,
        createdBy: req.user._id,
      });

      paymentRecords.push(payment);
      remainingAmount -= appliedAmount;
    }

    return res.status(201).json({
      message: "Customer payment collected successfully",
      payments: paymentRecords,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Customer payment collection failed",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentsByOrder,
  getPaymentsByCustomer,
  collectCustomerPayment,
};
