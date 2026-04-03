const { z } = require('zod');

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  currency: z.string().optional()
});

const userIdSchema = z.object({
  id: z.number('Invalid user ID')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

module.exports = {
  updateProfileSchema,
  userIdSchema,
  changePasswordSchema
};
