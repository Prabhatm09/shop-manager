const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");

const createProduct = async (req, res) => {
  try {
    const {
     name,
    category,
    subCategory,
    unit,
    pricePerUnit,
    currentStock,
    lowStockAlert,
    description,
    saleUnits,
    quickQuantities,
    } = req.body;

    if (!name || !category || !subCategory || !unit || pricePerUnit === undefined) {
        return res.status(400).json({
            message: "Name, category, sub category, unit and price are required",
        });
     }

    const openingStock = Number(currentStock || 0);

    const product = await Product.create({
        name,
        category,
        subCategory, // ✅ this was missing
        unit,
        pricePerUnit: Number(pricePerUnit),
        currentStock: Number(currentStock || 0),
        lowStockAlert: Number(lowStockAlert || 10),
        description: description || "",
        saleUnits: saleUnits || [],
        quickQuantities: quickQuantities || [],
        createdBy: req.user._id,
    });

    if (openingStock > 0) {
      await StockMovement.create({
        product: product._id,
        productName: product.name,
        type: "stock_in",
        quantity: openingStock,
        previousStock: 0,
        newStock: openingStock,
        reason: "Opening stock",
        referenceType: "manual",
        createdBy: req.user._id,
      });
    }

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Product creation failed",
      error: error.message,
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({
      createdBy: req.user._id,
      isActive: true,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      createdBy: req.user._id,
      isActive: true,
      $expr: {
        $lte: ["$currentStock", "$lowStockAlert"],
      },
    }).sort({ currentStock: 1 });

    return res.json({
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch low stock products",
      error: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json({ product });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const allowedFields = {
      name: req.body.name,
      category: req.body.category,
      subCategory: req.body.subCategory,
      unit: req.body.unit,
      pricePerUnit:
        req.body.pricePerUnit !== undefined
          ? Number(req.body.pricePerUnit)
          : undefined,
      lowStockAlert:
        req.body.lowStockAlert !== undefined
          ? Number(req.body.lowStockAlert)
          : undefined,
      description: req.body.description,
      saleUnits: req.body.saleUnits,
      quickQuantities: req.body.quickQuantities,
      isActive: req.body.isActive,
    };

    Object.keys(allowedFields).forEach((key) => {
      if (allowedFields[key] === undefined) {
        delete allowedFields[key];
      }
    });

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      allowedFields,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Product update failed",
      error: error.message,
    });
  }
};

const addStock = async (req, res) => {
  try {
    const { quantity, reason = "Stock added" } = req.body;

    const addQuantity = Number(quantity);

    if (!addQuantity || addQuantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0",
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + addQuantity;

    product.currentStock = newStock;
    await product.save();

    await StockMovement.create({
      product: product._id,
      productName: product.name,
      type: "stock_in",
      quantity: addQuantity,
      previousStock,
      newStock,
      reason,
      referenceType: "manual",
      createdBy: req.user._id,
    });

    return res.json({
      message: "Stock added successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Add stock failed",
      error: error.message,
    });
  }
};

const adjustStock = async (req, res) => {
  try {
    const { newStock, reason = "Manual stock adjustment" } = req.body;

    const finalStock = Number(newStock);

    if (finalStock < 0) {
      return res.status(400).json({
        message: "Stock cannot be negative",
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const previousStock = product.currentStock;
    const difference = Math.abs(finalStock - previousStock);

    product.currentStock = finalStock;
    await product.save();

    await StockMovement.create({
      product: product._id,
      productName: product.name,
      type: "adjustment",
      quantity: difference,
      previousStock,
      newStock: finalStock,
      reason,
      referenceType: "manual",
      createdBy: req.user._id,
    });

    return res.json({
      message: "Stock adjusted successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Adjust stock failed",
      error: error.message,
    });
  }
};

const getProductStockMovements = async (req, res) => {
  try {
    const movements = await StockMovement.find({
      product: req.params.id,
      createdBy: req.user._id,
    }).sort({ createdAt: -1 });

    return res.json({
      count: movements.length,
      movements,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch stock history",
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json({
      message: "Product archived successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Product archive failed",
      error: error.message,
    });
  }
};

const permanentlyDeleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await StockMovement.deleteMany({
      product: product._id,
      createdBy: req.user._id,
    });

    return res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Product delete failed",
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getLowStockProducts,
  getProductById,
  updateProduct,
  addStock,
  adjustStock,
  getProductStockMovements,
  deleteProduct,
  permanentlyDeleteProduct,
};
