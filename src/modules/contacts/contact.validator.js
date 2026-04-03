const { z } = require('zod');

const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().min(10, 'Phone must be at least 10 characters').optional().nullable()
}).refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone must be provided' }
);

const updateContactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10).optional().nullable()
}).partial();

const contactIdSchema = z.object({
  id: z.number()
});

module.exports = {
  createContactSchema,
  updateContactSchema,
  contactIdSchema
};
