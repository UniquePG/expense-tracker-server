const { z } = require('zod');

const positiveAmount = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .positive('Amount must be greater than 0');

const optionalDateTime = z
  .string()
  .datetime('Invalid datetime format')
  .optional();

const createTransactionSchema = z.object({
  accountId: z.number(),
  amount: positiveAmount,
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.number().nullable().optional(),
  incomeSource: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
  transactionDate: optionalDateTime
});

const transactionIdSchema = z.object({
  id: z.number()
});

const addIncomeSchema = z.object({
  accountId: z.number(),
  amount: positiveAmount,
  categoryId: z.number().nullable().optional(),
  incomeSource: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
  transactionDate: optionalDateTime
});

const addExpenseSchema = z.object({
  accountId: z.number().optional(),
  amount: positiveAmount,
  categoryId: z.number().nullable().optional(),
  description: z.string().max(255).optional(),
  transactionDate: optionalDateTime
});

const transferSchema = z.object({
  fromAccountId: z.number(),
  toAccountId: z.number(),
  amount: positiveAmount,
  description: z.string().max(255).optional(),
  transactionDate: optionalDateTime
});

const updateTransactionSchema = z.object({
  description: z.string().max(255).optional(),
  categoryId: z.number().nullable().optional(),
  transactionDate: optionalDateTime,
  incomeSource: z.string().max(100).optional(),
  amount: positiveAmount.optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required to update transaction'
});

const listTransactionsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  accountId: z.number().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'SETTLEMENT_OUT', 'SETTLEMENT_IN']).optional(),
  categoryId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().max(255).optional()
});

module.exports = {
  createTransactionSchema,
  transactionIdSchema,
  addIncomeSchema,
  addExpenseSchema,
  transferSchema,
  updateTransactionSchema,
  listTransactionsSchema
};
