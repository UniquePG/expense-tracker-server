const { z } = require('zod');

const createSettlementSchema = z.object({
  toUserId: z.number('Invalid user ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(500).optional(),
  splitIds: z.array(z.number()).optional()
});

const settlementIdSchema = z.object({
  id: z.number()
});

module.exports = {
  createSettlementSchema,
  settlementIdSchema
};
