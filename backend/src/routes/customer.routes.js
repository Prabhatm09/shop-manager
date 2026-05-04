const express = require("express");

const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customer.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.route("/").post(createCustomer).get(getCustomers);

router
  .route("/:id")
  .get(getCustomerById)
  .put(updateCustomer)
  .delete(deleteCustomer);

module.exports = router;