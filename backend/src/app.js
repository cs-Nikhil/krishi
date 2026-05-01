const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

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

app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

app.use(helmet());
app.use(compression());

const configuredOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...(process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : [])
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  try {
    const hostname = new URL(origin).hostname;

    if (hostname.endsWith(".vercel.app")) {
      return true;
    }

    if (hostname.endsWith(".netlify.app")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(mongoSanitize({ replaceWith: "_" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(attachAuditLogger);

app.get("/", (req, res) => {
  res.send("Krishi Credit backend running");
});

app.get("/api/health", (req, res) => {
  sendSuccess(res, {
    message: "Krishi Credit API is healthy",
    data: {
      status: "ok",
      service: "krishi-credit-api"
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/mobile", apiLimiter, mobileRoutes);
app.use("/api/customers", apiLimiter, customerRoutes);
app.use("/api/bills", apiLimiter, billRoutes);
app.use("/api/payments", apiLimiter, paymentRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/reports", apiLimiter, reportRoutes);
app.use("/api/audit-logs", apiLimiter, auditRoutes);
app.use("/api/dashboard", apiLimiter, dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
