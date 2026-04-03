const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter for image uploads
const imageFileFilter = (req, file, cb) => {
  // Allowed mimes
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      {
        statusCode: 400,
        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed',
      },
      false
    );
  }
};

// File filter for documents
const documentFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      {
        statusCode: 400,
        message: 'Invalid file type. Only PDF and Office documents are allowed',
      },
      false
    );
  }
};

// Image upload middleware
const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Document upload middleware
const uploadDocument = multer({
  storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Multiple files upload middleware
const uploadMultiple = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
});

/**
 * Error handler middleware for multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds maximum limit (5MB for images, 10MB for documents)';
    } else if (err.code === 'LIMIT_FILES') {
      message = 'Too many files. Maximum 5 files allowed';
    } else if (err.code === 'FILE_TOO_LARGE') {
      message = 'File is too large';
    }

    logger.error(`Multer error: ${message}`);
    return res.status(400).json({
      success: false,
      message,
      statusCode: 400,
    });
  } else if (err && err.statusCode) {
    logger.error(`Upload validation error: ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
    });
  }

  next(err);
};

module.exports = {
  uploadImage: uploadImage.single('file'),
  uploadMultiple: uploadMultiple.array('files', 5),
  uploadDocument: uploadDocument.single('file'),
  handleUploadError,
};
