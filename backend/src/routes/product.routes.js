const express = require("express");

const {
  createProduct,
  getProducts,
  getLowStockProducts,
  getProductById,
  updateProduct,
  addStock,
  adjustStock,
  getProductStockMovements,
  deleteProduct,
} = require("../controllers/product.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.route("/").post(createProduct).get(getProducts);

router.get("/low-stock", getLowStockProducts);

router.get("/:id/stock-movements", getProductStockMovements);

router.patch("/:id/add-stock", addStock);

router.patch("/:id/adjust-stock", adjustStock);

router
  .route("/:id")
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;