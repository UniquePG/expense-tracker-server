const express = require('express');
const router = express.Router();
const friendsController = require('./friends.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody } = require('../../middlewares/validate.middleware');
const {
  sendRequestSchema,
  sendRequestByEmailSchema
} = require('./friends.validator');

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Friend management
 */

/**
 * @swagger
 * /friends:
 *   get:
 *     summary: Get all friends
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Friends retrieved
 */
router.get('/', authenticate, friendsController.getFriends);

/**
 * @swagger
 * /friends/balances:
 *   get:
 *     summary: Get balances with all friends
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Friend balances retrieved
 */
router.get('/balances', authenticate, friendsController.getFriendBalances);

/**
 * @swagger
 * /friends/requests:
 *   get:
 *     summary: Get friend requests (incoming and outgoing)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Friend requests retrieved
 */
router.get('/requests', authenticate, friendsController.getFriendRequests);

/**
 * @swagger
 * /friends/pending:
 *   get:
 *     summary: Get pending (incoming) friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending requests retrieved
 */
router.get('/pending', authenticate, friendsController.getPendingRequests);

/**
 * @swagger
 * /friends/sent:
 *   get:
 *     summary: Get sent friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sent requests retrieved
 */
router.get('/sent', authenticate, friendsController.getSentRequests);

/**
 * @swagger
 * /friends/request:
 *   post:
 *     summary: Send a friend request (by email)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Friend request sent
 *       404:
 *         description: User not found with this email
 *       409:
 *         description: Request already pending or already friends
 */
router.post('/request', authenticate, validateBody(sendRequestByEmailSchema), friendsController.sendRequestByEmail);

/**
 * @swagger
 * /friends/requests/{requestId}/accept:
 *   post:
 *     summary: Accept a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request accepted
 */
router.post('/requests/:requestId/accept', authenticate, friendsController.acceptRequest);

/**
 * @swagger
 * /friends/requests/{requestId}/reject:
 *   post:
 *     summary: Reject a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request rejected
 */
router.post('/requests/:requestId/reject', authenticate, friendsController.rejectRequest);
router.post('/:friendId/block', authenticate, friendsController.blockFriendById);

/**
 * @swagger
 * /friends/{friendId}:
 *   get:
 *     summary: Get friend details
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend details retrieved
 */
router.get('/:friendId', authenticate, friendsController.getFriendDetails);

/**
 * @swagger
 * /friends/{friendId}:
 *   delete:
 *     summary: Remove a friend
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend removed successfully
 */
router.delete('/:friendId', authenticate, friendsController.removeFriendById);

module.exports = router;
