const { z } = require('zod');

const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().max(500).optional(),
  image: z.string().url().optional(),
  memberIds: z.array(z.number()).optional()
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  image: z.string().url().nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional()
});

const groupIdSchema = z.object({
  id: z.string('Invalid group ID')
});

const groupMemberIdSchema = z.object({
  id: z.number('Invalid group ID'),
  memberId: z.number('Invalid member ID')
});

const addMemberSchema = z.object({
  userId: z.number('Invalid user ID').optional(),
  contactId: z.number('Invalid contact ID').optional()
}).refine((value) => value.userId || value.contactId, {
  message: 'Either userId or contactId is required'
}).refine((value) => !(value.userId && value.contactId), {
  message: 'Provide either userId or contactId, not both'
});

const settleGroupSchema = z.object({
  groupId: z.number('Invalid group ID').optional() // handled by path param usually, but good for validation
}).passthrough();

const toggleMemberAdminSchema = z.object({
  isAdmin: z.boolean()
});

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  groupIdSchema,
  groupMemberIdSchema,
  addMemberSchema,
  settleGroupSchema,
  toggleMemberAdminSchema
};
