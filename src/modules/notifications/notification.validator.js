const { z } = require('zod');

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional()
});

module.exports = {
  markReadSchema
};
