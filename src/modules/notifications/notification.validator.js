const { z } = require('zod');

const markReadSchema = z.object({
  notificationIds: z.array(z.number()).optional()
});

module.exports = {
  markReadSchema
};
