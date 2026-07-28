const express = require("express");

const {
  createPayment,
  getPayments,
  getPaymentsByOrder,
  getPaymentsByCustomer,
  collectCustomerPayment,
} = require("../controllers/payment.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.post("/", createPayment);
router.get("/", getPayments);
router.get("/order/:orderId", getPaymentsByOrder);
router.post("/customer/:customerId/collect", collectCustomerPayment);
router.get("/customer/:customerId", getPaymentsByCustomer);

module.exports = router;