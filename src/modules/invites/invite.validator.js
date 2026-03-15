const { z } = require('zod');

const createInviteSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  expenseId: z.string().uuid().optional()
});

const respondInviteSchema = z.object({
  action: z.enum(['accept', 'decline'])
});

module.exports = {
  createInviteSchema,
  respondInviteSchema
};
