const { z } = require('zod');
const ApiResponse = require('../utils/response');

/**
 * Validate request body against Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 */
const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.validatedBody = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return ApiResponse.error(res, 'Validation failed', 400, errors);
      }
      next(error);
    }
  };
};

/**
 * Validate request query parameters against Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 */
const validateQuery = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.parseAsync(req.query);
      req.validatedQuery = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return ApiResponse.error(res, 'Validation failed', 400, errors);
      }
      next(error);
    }
  };
};

/**
 * Validate request params against Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 */
const validateParams = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.parseAsync(req.params);
      req.validatedParams = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return ApiResponse.error(res, 'Validation failed', 400, errors);
      }
      next(error);
    }
  };
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams
};
