const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return ApiResponse.error(res, `${field} already exists`, 409);
  }

  // Prisma foreign key constraint
  if (err.code === 'P2003') {
    return ApiResponse.error(res, 'Referenced record not found', 400);
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return ApiResponse.error(res, 'Record not found', 404);
  }

  // Prisma validation error
  if (err.code === 'P2000' || err.name === 'PrismaClientValidationError') {
    return ApiResponse.error(res, 'Invalid data provided', 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'Token expired', 401);
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return ApiResponse.error(res, 'Validation failed', 400, errors);
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = config.env === 'production' 
    ? 'Internal server error' 
    : err.message || 'Internal server error';

  return ApiResponse.error(res, message, statusCode);
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res) => {
  return ApiResponse.error(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = {
  errorHandler,
  notFound
};
