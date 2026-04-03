const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

const categoryIdSchema = z.object({
  id: z.number()
});

module.exports = {
  createCategorySchema,
  categoryIdSchema
};
