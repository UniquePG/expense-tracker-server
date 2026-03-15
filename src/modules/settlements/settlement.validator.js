const { z } = require('zod');

const createSettlementSchema = z.object({
  toUserId: z.string().uuid('Invalid user ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(500).optional(),
  splitIds: z.array(z.string().uuid()).optional()
});

const settlementIdSchema = z.object({
  id: z.string().uuid()
});

module.exports = {
  createSettlementSchema,
  settlementIdSchema
};
