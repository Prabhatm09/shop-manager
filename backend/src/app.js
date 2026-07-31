const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const customerRoutes = require("./routes/customer.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");
const supplierRoutes = require("./routes/supplier.routes");

const app = express();
const defaultFrontendOrigins = ["https://shop-manager-alpha.vercel.app"];
const allowedOrigins = [
  ...defaultFrontendOrigins,
  ...(process.env.FRONTEND_URL || "").split(","),
]
  .map((origin) => origin.trim())
  .filter(Boolean);
const isLocalDevOrigin = (origin = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || isLocalDevOrigin(origin) || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Shop backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/suppliers", supplierRoutes);

module.exports = app;
