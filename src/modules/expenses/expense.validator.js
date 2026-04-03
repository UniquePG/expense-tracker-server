const { z } = require('zod');

const SplitType = z.enum(['EQUAL', 'PERCENTAGE', 'EXACT', 'SHARES']);
const ExpenseType = z.enum(['PERSONAL', 'GROUP']);

const participantSchema = z.object({
  userId: z.number().optional(),
  contactId: z.number().optional(),
  amount: z.coerce.number().positive().optional(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  shares: z.coerce.number().int().positive().optional()
}).refine((value) => value.userId || value.contactId, {
  message: 'Either userId or contactId is required for participant'
}).refine((value) => !(value.userId && value.contactId), {
  message: 'Participant cannot have both userId and contactId'
});

const createExpenseSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const payload = { ...value };
  if (!payload.participants && Array.isArray(payload.splits)) {
    payload.participants = payload.splits;
  }

  return payload;
}, z.object({
  description: z.string().min(1).max(255),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default('INR'),
  expenseDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  image: z.string().url().optional(),
  categoryId: z.number().optional(),
  groupId: z.number().optional(),
  accountId: z.number().optional(),
  paidById: z.number().optional(),
  expenseType: ExpenseType.optional(),
  splitType: SplitType,
  participants: z.array(participantSchema).min(1, 'At least one participant is required')
}));

const updateExpenseSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const payload = { ...value };
  if (!payload.participants && Array.isArray(payload.splits)) {
    payload.participants = payload.splits;
  }

  return payload;
}, z.object({
  description: z.string().min(1).max(255).optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
  expenseDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  image: z.string().url().nullable().optional(),
  categoryId: z.number().nullable().optional(),
  splitType: SplitType.optional(),
  participants: z.array(participantSchema).min(1).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required to update expense'
}));

const expenseIdSchema = z.object({
  id: z.number()
});

const listExpensesSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  expenseType: ExpenseType.optional(),
  groupId: z.number().optional(),
  categoryId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paidByMe: z.string().optional(),
  owedByMe: z.string().optional(),
  search: z.string().optional()
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdSchema,
  listExpensesSchema,
  SplitType,
  ExpenseType
};
