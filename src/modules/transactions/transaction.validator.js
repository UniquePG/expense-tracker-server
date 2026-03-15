const { z } = require('zod');

const createTransactionSchema = z.object({
  description: z.string().min(1, 'Description is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional().default('USD'),
  type: z.enum(['income', 'expense']).optional().default('expense'),
  categoryId: z.string().uuid('Invalid category ID'),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional()
});

const transactionIdSchema = z.object({
  id: z.string().uuid('Invalid transaction ID')
});

module.exports = {
  createTransactionSchema,
  transactionIdSchema
};
