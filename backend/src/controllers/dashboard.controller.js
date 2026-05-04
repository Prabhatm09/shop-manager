const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Order = require("../models/Order");

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalProducts = await Product.countDocuments({ createdBy: userId });
    const totalCustomers = await Customer.countDocuments({ createdBy: userId });
    const totalOrders = await Order.countDocuments({ createdBy: userId });

    const orderStats = await Order.aggregate([
      { $match: { createdBy: userId } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$subTotal" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },
        },
      },
    ]);

    const lowStockProducts = await Product.find({
      createdBy: userId,
      $expr: {
        $lte: ["$currentStock", "$lowStockAlert"],
      },
    })
      .select("name category unit currentStock lowStockAlert")
      .sort({ currentStock: 1 })
      .limit(10);

    const stats = orderStats[0] || {
      totalSales: 0,
      totalPaid: 0,
      totalDue: 0,
    };

    return res.json({
      totalProducts,
      totalCustomers,
      totalOrders,
      totalSales: stats.totalSales,
      totalPaid: stats.totalPaid,
      totalDueAmount: stats.totalDue,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
};