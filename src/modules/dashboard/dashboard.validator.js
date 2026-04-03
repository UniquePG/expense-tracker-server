const { z } = require('zod');

const dashboardQuerySchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  groupId: z.number().optional()
}).partial();

module.exports = {
  dashboardQuerySchema
};
