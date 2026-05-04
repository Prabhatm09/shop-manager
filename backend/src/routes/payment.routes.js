const express = require("express");

const {
  createPayment,
  getPayments,
  getPaymentsByOrder,
  getPaymentsByCustomer,
} = require("../controllers/payment.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.post("/", createPayment);
router.get("/", getPayments);
router.get("/order/:orderId", getPaymentsByOrder);
router.get("/customer/:customerId", getPaymentsByCustomer);

module.exports = router;