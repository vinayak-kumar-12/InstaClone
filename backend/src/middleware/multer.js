const multer = require("multer");

// Configure memory storage to store files as buffers
const storage = multer.memoryStorage();

// File filter to validate that the uploaded file is an image
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."), false);
  }
};

// Initialize multer middleware with storage, size limits, and filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

module.exports = upload;
