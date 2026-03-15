const express = require('express');
const router = express.Router();
const groupsController = require('./groups.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../../middlewares/validate.middleware');
const {
  createGroupSchema,
  updateGroupSchema,
  groupIdSchema,
  addMemberSchema,
  settleGroupSchema
} = require('./groups.validator');

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group management
 */

router.get('/', authenticate, groupsController.getUserGroups);
router.post('/', authenticate, validateBody(createGroupSchema), groupsController.createGroup);
router.get('/:id', authenticate, validateParams(groupIdSchema), groupsController.getGroupById);
router.put('/:id', authenticate, validateParams(groupIdSchema), validateBody(updateGroupSchema), groupsController.updateGroup);
router.delete('/:id', authenticate, validateParams(groupIdSchema), groupsController.deleteGroup);

// Members
router.get('/:id/members', authenticate, validateParams(groupIdSchema), groupsController.getGroupMembers);
router.post('/:id/members', authenticate, validateParams(groupIdSchema), validateBody(addMemberSchema), groupsController.addMember);
router.delete('/:id/members/:userId', authenticate, validateParams(groupIdSchema), groupsController.removeMemberById);

// Group expenses
router.get('/:id/expenses', authenticate, validateParams(groupIdSchema), groupsController.getGroupExpenses);

// Group balances
router.get('/:id/balances', authenticate, validateParams(groupIdSchema), groupsController.getGroupBalances);

// Group settle
router.post('/:id/settle', authenticate, validateParams(groupIdSchema), groupsController.settleGroup);

module.exports = router;
