const rateLimit = require("express-rate-limit");

const buildRateLimitResponse = (message) => ({
  success: false,
  message,
  data: null,
  errors: {
    rateLimit: message
  }
});

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(buildRateLimitResponse(message));
    }
  });

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again after 15 minutes."
});

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many API requests. Please slow down and try again shortly."
});

const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many upload requests. Please try again later."
});

module.exports = { apiLimiter, loginLimiter, uploadLimiter };
