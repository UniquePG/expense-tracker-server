const { z } = require('zod');

const createBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required').max(100),
  amount: z.string().or(z.number()).refine(val => !isNaN(parseFloat(val)), 'Amount must be a valid number'),
  categoryId: z.number().optional(),
  periodType: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().datetime().optional(),
  alertAt50: z.boolean().optional().default(true),
  alertAt80: z.boolean().optional().default(true),
  alertAt100: z.boolean().optional().default(true)
});

const updateBudgetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.string().or(z.number()).optional(),
  periodType: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  alertAt50: z.boolean().optional(),
  alertAt80: z.boolean().optional(),
  alertAt100: z.boolean().optional()
});

module.exports = {
  createBudgetSchema,
  updateBudgetSchema
};
