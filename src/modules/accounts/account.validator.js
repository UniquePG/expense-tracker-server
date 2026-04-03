const { z } = require('zod');

const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'WALLET', 'UPI']),
  currency: z.string().length(3).default('INR'),
  balance: z.coerce.number().optional().default(0)
});

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'WALLET', 'UPI']).optional()
}).partial();

const accountIdSchema = z.object({
  id: z.number()
});

const adjustBalanceSchema = z.object({
  newBalance: z.coerce.number(),
  note: z.string().max(255).optional()
});

module.exports = {
  createAccountSchema,
  updateAccountSchema,
  accountIdSchema,
  adjustBalanceSchema
};
