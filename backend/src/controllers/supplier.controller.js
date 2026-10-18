const Supplier = require("../models/Supplier");
const SupplierTransaction = require("../models/SupplierTransaction");
const SupplierPayment = require("../models/SupplierPayment");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const normalizeOpeningBalance = (openingBalance) => {
  const amount = Number(openingBalance || 0);

  return Number.isFinite(amount) ? amount : NaN;
};

const getSupplierSummaries = async (userId) => {
  const [suppliers, transactions, payments] = await Promise.all([
    Supplier.find({ createdBy: userId, isActive: true }).sort({ createdAt: -1 }),
    SupplierTransaction.find({ createdBy: userId }).sort({ createdAt: -1 }),
    SupplierPayment.find({ createdBy: userId }).sort({ paymentDate: -1 }),
  ]);

  const transactionBySupplier = new Map();
  const paymentBySupplier = new Map();

  transactions.forEach((transaction) => {
    const key = transaction.supplier.toString();
    transactionBySupplier.set(
      key,
      Number(transactionBySupplier.get(key) || 0) +
        Number(transaction.amount || 0)
    );
  });

  payments.forEach((payment) => {
    const key = payment.supplier.toString();
    paymentBySupplier.set(
      key,
      Number(paymentBySupplier.get(key) || 0) + Number(payment.amount || 0)
    );
  });

  return suppliers.map((supplier) => {
    const totalSupplied = Number(transactionBySupplier.get(supplier._id.toString()) || 0);
    const totalPaid = Number(paymentBySupplier.get(supplier._id.toString()) || 0);
    const openingBalance = Number(supplier.openingBalance || 0);
    const totalPayable = openingBalance + totalSupplied;

    return {
      ...supplier.toObject(),
      summary: {
        openingBalance,
        totalSupplied,
        totalPayable,
        totalPaid,
        dueAmount: Math.max(totalPayable - totalPaid, 0),
        advanceAmount: Math.max(totalPaid - totalPayable, 0),
      },
    };
  });
};

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await getSupplierSummaries(req.user._id);

    return res.json({
      count: suppliers.length,
      suppliers,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch suppliers",
      error: error.message,
    });
  }
};

const createSupplier = async (req, res) => {
  try {
    const {
      name,
      phone = "",
      address = "",
      notes = "",
      openingBalance = 0,
      openingBalanceDate,
    } = req.body;
    const finalOpeningBalance = normalizeOpeningBalance(openingBalance);

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Supplier name is required",
      });
    }

    if (!Number.isFinite(finalOpeningBalance) || finalOpeningBalance < 0) {
      return res.status(400).json({
        message: "Opening balance cannot be negative",
      });
    }

    const supplier = await Supplier.create({
      name,
      phone,
      address,
      notes,
      openingBalance: finalOpeningBalance,
      openingBalanceDate:
        finalOpeningBalance > 0 ? openingBalanceDate || new Date() : null,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Supplier created successfully",
      supplier,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Supplier creation failed",
      error: error.message,
    });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const hasOpeningBalanceUpdate = req.body.openingBalance !== undefined;
    const finalOpeningBalance = hasOpeningBalanceUpdate
      ? normalizeOpeningBalance(req.body.openingBalance)
      : null;

    if (
      hasOpeningBalanceUpdate &&
      (!Number.isFinite(finalOpeningBalance) || finalOpeningBalance < 0)
    ) {
      return res.status(400).json({
        message: "Opening balance cannot be negative",
      });
    }

    const updatePayload = {
      name: req.body.name,
      phone: req.body.phone,
      address: req.body.address,
      notes: req.body.notes,
    };

    if (hasOpeningBalanceUpdate) {
      updatePayload.openingBalance = finalOpeningBalance;
      updatePayload.openingBalanceDate =
        finalOpeningBalance > 0
          ? req.body.openingBalanceDate || new Date()
          : null;
    }

    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      updatePayload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    return res.json({
      message: "Supplier updated successfully",
      supplier,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Supplier update failed",
      error: error.message,
    });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      { isActive: false },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    return res.json({
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Supplier delete failed",
      error: error.message,
    });
  }
};

const createSupplierPayment = async (req, res) => {
  try {
    const { amount, paymentMode = "cash", paymentDate, notes = "" } = req.body;
    const paymentAmount = Number(amount);

    if (!isFiniteNumber(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        message: "Payment amount must be greater than 0",
      });
    }

    const supplier = await Supplier.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      isActive: true,
    });

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    const payment = await SupplierPayment.create({
      supplier: supplier._id,
      supplierName: supplier.name,
      amount: paymentAmount,
      paymentMode,
      paymentDate: paymentDate || new Date(),
      notes,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Supplier payment saved successfully",
      payment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Supplier payment failed",
      error: error.message,
    });
  }
};

const createSupplierTransaction = async (req, res) => {
  try {
    const {
      productName,
      quantity,
      unit,
      supplierRate,
      amount,
      transactionDate,
      paidAmount = 0,
      paymentMode = "cash",
      notes = "",
    } = req.body;

    const finalQuantity = Number(quantity);
    const finalSupplierRate = Number(supplierRate);
    const finalAmount =
      amount !== undefined && amount !== ""
        ? Number(amount)
        : finalQuantity * finalSupplierRate;
    const finalPaidAmount = Number(paidAmount || 0);

    if (!productName?.trim()) {
      return res.status(400).json({
        message: "Material name is required",
      });
    }

    if (!isFiniteNumber(finalQuantity) || finalQuantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0",
      });
    }

    if (!unit?.trim()) {
      return res.status(400).json({
        message: "Unit is required",
      });
    }

    if (!isFiniteNumber(finalSupplierRate) || finalSupplierRate <= 0) {
      return res.status(400).json({
        message: "Supplier rate must be greater than 0",
      });
    }

    if (!isFiniteNumber(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        message: "Total amount must be greater than 0",
      });
    }

    if (!isFiniteNumber(finalPaidAmount) || finalPaidAmount < 0) {
      return res.status(400).json({
        message: "Paid amount cannot be negative",
      });
    }

    if (finalPaidAmount > finalAmount) {
      return res.status(400).json({
        message: "Paid amount cannot be greater than total amount",
      });
    }

    const supplier = await Supplier.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      isActive: true,
    });

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    const finalDate = transactionDate || new Date();

    const transaction = await SupplierTransaction.create({
      supplier: supplier._id,
      supplierName: supplier.name,
      product: null,
      productName,
      type: "material_purchase",
      transactionDate: finalDate,
      quantity: finalQuantity,
      unit,
      conversionToBase: 1,
      baseQuantity: finalQuantity,
      supplierRate: finalSupplierRate,
      amount: finalAmount,
      notes,
      createdBy: req.user._id,
    });

    let payment = null;

    if (finalPaidAmount > 0) {
      payment = await SupplierPayment.create({
        supplier: supplier._id,
        supplierName: supplier.name,
        amount: finalPaidAmount,
        paymentMode,
        paymentDate: finalDate,
        notes: notes || `Payment against ${productName}`,
        createdBy: req.user._id,
      });
    }

    return res.status(201).json({
      message: "Supplier material entry saved successfully",
      transaction,
      payment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Supplier material entry failed",
      error: error.message,
    });
  }
};

const createSupplierStockPurchase = async (req, res) => {
  try {
    const {
      productId,
      quantity,
      unit,
      conversionToBase = 1,
      supplierRate,
      paidAmount = 0,
      paymentMode = "cash",
      transactionDate,
      notes = "",
    } = req.body;

    const purchaseQuantity = Number(quantity);
    const finalConversionToBase = Number(conversionToBase || 1);
    const finalSupplierRate = Number(supplierRate);
    const finalPaidAmount = Number(paidAmount || 0);

    if (!productId) {
      return res.status(400).json({
        message: "Product is required",
      });
    }

    if (!isFiniteNumber(purchaseQuantity) || purchaseQuantity <= 0) {
      return res.status(400).json({
        message: "Purchase quantity must be greater than 0",
      });
    }

    if (!isFiniteNumber(finalConversionToBase) || finalConversionToBase <= 0) {
      return res.status(400).json({
        message: "Stock unit value must be greater than 0",
      });
    }

    if (!isFiniteNumber(finalSupplierRate) || finalSupplierRate <= 0) {
      return res.status(400).json({
        message: "Supplier rate must be greater than 0",
      });
    }

    if (!isFiniteNumber(finalPaidAmount) || finalPaidAmount < 0) {
      return res.status(400).json({
        message: "Paid amount cannot be negative",
      });
    }

    if (finalPaidAmount > purchaseQuantity * finalSupplierRate) {
      return res.status(400).json({
        message: "Paid amount cannot be greater than purchase amount",
      });
    }

    const [supplier, product] = await Promise.all([
      Supplier.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
        isActive: true,
      }),
      Product.findOne({
        _id: productId,
        createdBy: req.user._id,
        isActive: true,
      }),
    ]);

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const baseQuantity = purchaseQuantity * finalConversionToBase;
    const previousStock = Number(product.currentStock || 0);
    const newStock = previousStock + baseQuantity;

    product.currentStock = newStock;
    await product.save();

    const transaction = await SupplierTransaction.create({
      supplier: supplier._id,
      supplierName: supplier.name,
      product: product._id,
      productName: product.name,
      type: "stock_purchase",
      transactionDate: transactionDate || new Date(),
      quantity: purchaseQuantity,
      unit: unit || product.unit,
      conversionToBase: finalConversionToBase,
      baseQuantity,
      supplierRate: finalSupplierRate,
      amount: purchaseQuantity * finalSupplierRate,
      notes,
      createdBy: req.user._id,
    });

    let payment = null;
    if (finalPaidAmount > 0) {
      payment = await SupplierPayment.create({
        supplier: supplier._id,
        supplierName: supplier.name,
        amount: finalPaidAmount,
        paymentMode,
        paymentDate: transactionDate || new Date(),
        notes: notes || `Payment against ${product.name}`,
        createdBy: req.user._id,
      });
    }

    await StockMovement.create({
      product: product._id,
      productName: product.name,
      type: "stock_in",
      quantity: baseQuantity,
      previousStock,
      newStock,
      reason: `Supplier purchase from ${supplier.name}`,
      referenceType: "manual",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Supplier stock purchase saved successfully",
      transaction,
      payment,
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Supplier stock purchase failed",
      error: error.message,
    });
  }
};

const getSupplierLedger = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    const [transactions, payments] = await Promise.all([
      SupplierTransaction.find({
        supplier: supplier._id,
        createdBy: req.user._id,
      })
        .populate("product", "name unit subCategory")
        .populate("order", "billNumber createdAt")
        .sort({ transactionDate: -1, createdAt: -1 }),
      SupplierPayment.find({
        supplier: supplier._id,
        createdBy: req.user._id,
      }).sort({ paymentDate: -1 }),
    ]);

    const totalSupplied = transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0
    );
    const totalPaid = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );
    const openingBalance = Number(supplier.openingBalance || 0);
    const totalPayable = openingBalance + totalSupplied;

    return res.json({
      supplier,
      summary: {
        openingBalance,
        totalSupplied,
        totalPayable,
        totalPaid,
        dueAmount: Math.max(totalPayable - totalPaid, 0),
        advanceAmount: Math.max(totalPaid - totalPayable, 0),
      },
      transactions,
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch supplier ledger",
      error: error.message,
    });
  }
};

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createSupplierPayment,
  createSupplierTransaction,
  createSupplierStockPurchase,
  getSupplierLedger,
};
