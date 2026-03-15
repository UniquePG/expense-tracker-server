const express = require('express');
const router = express.Router();
const notificationsController = require('./notification.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody } = require('../../middlewares/validate.middleware');
const { markReadSchema } = require('./notification.validator');

router.get('/', authenticate, notificationsController.getUserNotifications);
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);
router.post('/mark-read', authenticate, validateBody(markReadSchema), notificationsController.markAsRead);
router.post('/:id/read', authenticate, notificationsController.markSingleAsRead);
router.post('/read-all', authenticate, notificationsController.markAllAsRead);
router.delete('/:id', authenticate, notificationsController.deleteNotification);
router.get('/settings', authenticate, notificationsController.getSettings);
router.put('/settings', authenticate, notificationsController.updateSettings);

module.exports = router;
