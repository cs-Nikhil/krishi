const app = require("./app");
const connectDB = require("./config/db");
const http = require("http");
const mongoose = require("mongoose");
const { startDueNotificationScheduler, stopDueNotificationScheduler } = require("./services/notificationScheduler");

const port = Number(process.env.PORT) || 5000;
const server = http.createServer(app);
let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Closing API server...`);
  stopDueNotificationScheduler();

  if (server.listening) {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    return;
  }

  await mongoose.disconnect();
  process.exit(0);
};

server.on("error", async (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
    console.error(
      "Close the other backend terminal using this port, or change PORT in backend/.env."
    );
  } else {
    console.error("API server failed to start");
    console.error(error.message);
  }

  await mongoose.disconnect();
  process.exit(1);
});

connectDB()
  .then((connection) => {
    console.log(`MongoDB connected: ${connection.host}`);
    startDueNotificationScheduler();
    server.listen(port, "0.0.0.0", () => {
      console.log(`API server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
