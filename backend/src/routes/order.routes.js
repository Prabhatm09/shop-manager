const express = require("express");

const {
  createOrder,
  getOrders,
  quickSale,
  getOrderById,
  getOrdersByCustomer,
  getReturnReminders,
  markOrderReturned,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
} = require("../controllers/order.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.route("/").post(createOrder).get(getOrders);
router.get("/customer/:customerId", getOrdersByCustomer);
router.get("/returns/reminders", getReturnReminders);

router.patch("/:id/mark-returned", markOrderReturned);
router.patch("/:id/status", updateOrderStatus);
router.post("/quick-sale", quickSale);

router
  .route("/:id")
  .get(getOrderById)
  .put(updateOrder)
  .delete(deleteOrder);

module.exports = router;