const Customer = require("../models/Customer");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const createCustomer = async (req, res) => {
  try {
    const { name, phone, address, openingDue, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        message: "Customer name and phone are required",
      });
    }

    const customer = await Customer.create({
      name,
      phone,
      address: address || "",
      openingDue: Number(openingDue || 0),
      openingDuePaid: 0,
      notes: notes || "",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Customer creation failed",
      error: error.message,
    });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ createdBy: req.user._id }).sort({
      createdAt: -1,
    });

    return res.json({
      count: customers.length,
      customers,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const orders = await Order.find({
      customer: customer._id,
      createdBy: req.user._id,
    }).sort({ createdAt: 1 });

    const payments = await Payment.find({
      customer: customer._id,
      createdBy: req.user._id,
    })
      .populate("order", "_id billNumber createdAt subTotal dueAmount paymentStatus")
      .sort({ paymentDate: -1 });

     let runningBalance =
       Number(customer.openingDue || 0) - Number(customer.openingDuePaid || 0);

    const ordersWithLedger = orders.map((order) => {
    const previousBalance = runningBalance;
    const previousDue = previousBalance > 0 ? previousBalance : 0;
    const previousAdvance = previousBalance < 0 ? Math.abs(previousBalance) : 0;

    const newBill = Number(order.subTotal || 0);
    const paidNow = Number(order.paidAmount || 0);

    const totalPayable = Math.max(newBill + previousDue - previousAdvance, 0);

    runningBalance = previousBalance + newBill - paidNow;

    const balanceAfterOrder = runningBalance;
    const dueAfterOrder = balanceAfterOrder > 0 ? balanceAfterOrder : 0;
    const advanceAfterOrder =
        balanceAfterOrder < 0 ? Math.abs(balanceAfterOrder) : 0;

    return {
        ...order.toObject(),
        ledger: {
        previousDue,
        previousAdvance,
        newBill,
        totalPayable,
        paidNow,
        balanceAfterOrder,
        dueAfterOrder,
        advanceAfterOrder,
        },
    };
    });

    const totalSales = orders.reduce(
      (sum, order) => sum + Number(order.subTotal || 0),
      0
    );

    const totalPaid =
      Number(customer.openingDuePaid || 0) +
      orders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0);

   const currentDue = runningBalance > 0 ? runningBalance : 0;
   const currentAdvance = runningBalance < 0 ? Math.abs(runningBalance) : 0;

    return res.json({
      customer,
      summary: {
        totalOrders: orders.length,
        openingDue: Number(customer.openingDue || 0),
        openingDuePaid: Number(customer.openingDuePaid || 0),
        totalSales,
        totalPaid,
        totalDue: currentDue,
        totalAdvance: currentAdvance,
      },
      orders: ordersWithLedger.reverse(),
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customer details",
      error: error.message,
    });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      {
        ...req.body,
        openingDue:
          req.body.openingDue !== undefined
            ? Number(req.body.openingDue)
            : undefined,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    return res.json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Customer update failed",
      error: error.message,
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    return res.json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Customer delete failed",
      error: error.message,
    });
  }
};

const getOrCreateWalkInCustomer = async () => {
  let customer = await Customer.findOne({ phone: "0000000000" });

  if (!customer) {
    customer = await Customer.create({
      name: "Walk-in Customer",
      phone: "0000000000",
      address: "N/A",
      openingDue: 0,
    });
  }

  return customer._id;
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
