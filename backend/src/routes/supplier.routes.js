const express = require("express");

const {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createSupplierPayment,
  createSupplierTransaction,
  createSupplierStockPurchase,
  getSupplierLedger,
} = require("../controllers/supplier.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getSuppliers).post(createSupplier);
router.get("/:id/ledger", getSupplierLedger);
router.post("/:id/transactions", createSupplierTransaction);
router.post("/:id/payments", createSupplierPayment);
router.post("/:id/stock-purchases", createSupplierStockPurchase);
router.route("/:id").put(updateSupplier).delete(deleteSupplier);

module.exports = router;
