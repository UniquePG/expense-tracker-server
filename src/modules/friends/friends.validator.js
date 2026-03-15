const { z } = require('zod');

const sendRequestSchema = z.object({
  addresseeId: z.string().uuid('Invalid user ID')
});

const sendRequestByEmailSchema = z.object({
  email: z.string().email('Invalid email address')
});

const respondRequestSchema = z.object({
  friendshipId: z.string().uuid('Invalid friendship ID'),
  action: z.enum(['accept', 'reject'])
});

const removeFriendSchema = z.object({
  friendId: z.string().uuid('Invalid user ID')
});

module.exports = {
  sendRequestSchema,
  sendRequestByEmailSchema,
  respondRequestSchema,
  removeFriendSchema
};
