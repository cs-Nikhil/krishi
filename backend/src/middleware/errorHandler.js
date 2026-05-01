const multer = require("multer");

const duplicateKeyDetails = (error) => {
  return Object.keys(error.keyPattern || error.keyValue || {}).reduce((details, field) => {
    details[field] = `${field} already exists`;
    return details;
  }, {});
};

const mongooseValidationDetails = (error) => {
  return Object.entries(error.errors || {}).reduce((details, [field, fieldError]) => {
    details[field] = fieldError.message;
    return details;
  }, {});
};

const normalizeError = (err) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return {
        status: 413,
        message: "Uploaded file is too large",
        errors: { billFile: "File size exceeds the upload limit" }
      };
    }

    return {
      status: 400,
      message: "Upload failed",
      errors: { billFile: err.message }
    };
  }

  if (err?.code === 11000) {
    return {
      status: 409,
      message: "Duplicate record",
      errors: duplicateKeyDetails(err)
    };
  }

  if (err?.name === "ValidationError") {
    return {
      status: 400,
      message: "Validation failed",
      errors: mongooseValidationDetails(err)
    };
  }

  if (err?.name === "CastError") {
    return {
      status: 400,
      message: "Invalid identifier",
      errors: { [err.path || "id"]: "Invalid value" }
    };
  }

  return {
    status: err.status || 500,
    message: err.message || "Internal server error",
    errors: err.details || null
  };
};

const errorHandler = (err, req, res, next) => {
  const { status, message, errors } = normalizeError(err);

  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message,
    data: null,
    errors
  });
};

module.exports = errorHandler;
