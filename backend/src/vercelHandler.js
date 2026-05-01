const app = require("./app");
const connectDB = require("./config/db");

const sendInitializationError = (res, error) => {
  const body = {
    success: false,
    message: "API initialization failed",
    data: null,
    errors: process.env.NODE_ENV === "production" ? null : { server: error.message }
  };

  res.statusCode = 500;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const handler = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Failed to initialize serverless API request");
    console.error(error);
    return sendInitializationError(res, error);
  }
};

module.exports = handler;
