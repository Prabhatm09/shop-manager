const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Order = require("../models/Order");

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalProducts = await Product.countDocuments({
      createdBy: userId,
      isActive: true,
    });
    const totalCustomers = await Customer.countDocuments({ createdBy: userId });
    const totalOrders = await Order.countDocuments({ createdBy: userId });
    const customers = await Customer.find({ createdBy: userId }).select(
      "_id openingDue openingDuePaid"
    );

    const openingDuePaid = customers.reduce(
      (sum, customer) => sum + Number(customer.openingDuePaid || 0),
      0
    );

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

    const customerOrderBalances = await Order.aggregate([
      { $match: { createdBy: userId } },
      {
        $group: {
          _id: "$customer",
          balance: {
            $sum: {
              $subtract: ["$subTotal", "$paidAmount"],
            },
          },
        },
      },
    ]);

    const orderBalanceByCustomer = new Map(
      customerOrderBalances.map((entry) => [
        entry._id.toString(),
        Number(entry.balance || 0),
      ])
    );

    const ledgerDueBalance = customers.reduce((sum, customer) => {
      const openingBalance =
        Number(customer.openingDue || 0) - Number(customer.openingDuePaid || 0);
      const orderBalance = orderBalanceByCustomer.get(customer._id.toString()) || 0;
      const runningBalance = openingBalance + orderBalance;

      return sum + Math.max(runningBalance, 0);
    }, 0);

    const lowStockProducts = await Product.find({
      createdBy: userId,
      isActive: true,
      $expr: {
        $lte: ["$currentStock", "$lowStockAlert"],
      },
    })
      .select("name category unit currentStock lowStockAlert")
      .sort({ currentStock: 1 })
      .limit(10);

    const cementStocks = await Product.find({
      createdBy: userId,
      isActive: true,
      category: "building_material",
      subCategory: "cement",
      unit: "bag",
    })
      .select("name currentStock lowStockAlert unit")
      .sort({ name: 1 });

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
      totalPaid: Number(stats.totalPaid || 0) + openingDuePaid,
      totalDueAmount: ledgerDueBalance,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      cementStocks,
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
