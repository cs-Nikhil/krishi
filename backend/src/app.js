require("dotenv").config();

const cors = require("cors");
const compression = require("compression");
const express = require("express");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const morgan = require("morgan");
const attachAuditLogger = require("./middleware/auditLogger");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const { apiLimiter } = require("./middleware/rateLimiters");
const auditRoutes = require("./routes/audit.routes");
const authRoutes = require("./routes/auth.routes");
const billRoutes = require("./routes/bills.routes");
const customerRoutes = require("./routes/customers.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const mobileRoutes = require("./routes/mobile.routes");
const notificationRoutes = require("./routes/notifications.routes");
const paymentRoutes = require("./routes/payments.routes");
const reportRoutes = require("./routes/reports.routes");
const userRoutes = require("./routes/users.routes");
const { sendSuccess } = require("./utils/apiResponse");

const app = express();

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(mongoSanitize({ replaceWith: "_" }));
app.use(morgan("dev"));
app.use(attachAuditLogger);

app.get("/api/health", (req, res) => {
  sendSuccess(res, {
    message: "Krishi Credit API is healthy",
    data: { status: "ok", service: "krishi-credit-api" }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/mobile", apiLimiter, mobileRoutes);
app.use("/api/customers", apiLimiter, customerRoutes);
app.use("/api/bills", apiLimiter, billRoutes);
app.use("/api/payments", apiLimiter, paymentRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/reports", apiLimiter, reportRoutes);
app.use("/api/audit-logs", apiLimiter, auditRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
