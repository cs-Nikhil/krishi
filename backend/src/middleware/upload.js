const multer = require("multer");
const httpError = require("../utils/httpError");

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf"
]);

const maxUploadBytes = (Number(process.env.MAX_UPLOAD_MB) || 15) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadBytes,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(httpError(400, "Only JPG, PNG, and PDF bill uploads are allowed", {
        billFile: "Unsupported file type"
      }));
    }

    return callback(null, true);
  }
});

module.exports = upload;
