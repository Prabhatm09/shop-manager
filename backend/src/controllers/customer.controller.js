const Customer = require("../models/Customer");

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

    return res.json({ customer });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customer",
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