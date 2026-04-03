const { z } = require('zod');

const sendRequestSchema = z.object({
  addresseeId: z.number()
});

const sendRequestByEmailSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().min(8, 'Invalid phone number').max(20).optional()
}).refine((value) => value.email || value.phone, {
  message: 'Either email or phone is required'
});

const respondRequestSchema = z.object({
  friendshipId: z.number(),
  action: z.enum(['accept', 'reject'])
});

const removeFriendSchema = z.object({
  friendId: z.number()
});

module.exports = {
  sendRequestSchema,
  sendRequestByEmailSchema,
  respondRequestSchema,
  removeFriendSchema
};
