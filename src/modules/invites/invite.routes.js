const express = require('express');
const router = express.Router();
const invitesController = require('./invite.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody } = require('../../middlewares/validate.middleware');
const { createInviteSchema } = require('./invite.validator');

router.post('/', authenticate, validateBody(createInviteSchema), invitesController.createInvite);
router.get('/', authenticate, invitesController.getUserInvites);
router.get('/pending', authenticate, invitesController.getPendingInvites);

module.exports = router;
