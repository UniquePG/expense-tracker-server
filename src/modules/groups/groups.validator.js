const { z } = require('zod');

const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().max(500).optional(),
  image: z.string().url().optional(),
  memberIds: z.array(z.string().uuid()).optional()
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  image: z.string().url().optional()
});

const groupIdSchema = z.object({
  id: z.string().uuid('Invalid group ID')
});

const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID')
});

const settleGroupSchema = z.object({
  groupId: z.string().uuid('Invalid group ID').optional() // handled by path param usually, but good for validation
}).passthrough();

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  groupIdSchema,
  addMemberSchema,
  settleGroupSchema
};
