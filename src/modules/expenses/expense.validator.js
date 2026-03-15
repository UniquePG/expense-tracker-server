const { z } = require('zod');

const SplitType = z.enum(['EQUAL', 'PERCENTAGE', 'EXACT', 'SHARES']);

const splitEntrySchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
  shares: z.number().positive().int().optional()
});

const createExpenseSchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  expenseDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  image: z.string().url().optional(),
  categoryId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  paidById: z.string().uuid(),
  splitType: SplitType,
  splits: z.array(splitEntrySchema).min(1, 'At least one split required')
});

const updateExpenseSchema = z.object({
  description: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  expenseDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  image: z.string().url().optional(),
  categoryId: z.string().uuid().optional()
});

const expenseIdSchema = z.object({
  id: z.string().uuid()
});

const listExpensesSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  groupId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdSchema,
  listExpensesSchema,
  SplitType
};
