const express = require('express');
const router = express.Router();
const splitsController = require('./split.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Splits
 *   description: Bill splitting and balance management
 */

router.get('/balances', authenticate, splitsController.getUserBalances);
router.get('/balances/simplified', authenticate, splitsController.getSimplifiedBalances);
router.get('/group/:groupId', authenticate, splitsController.getGroupBalances);
router.get('/expense/:expenseId', authenticate, splitsController.getExpenseSplits);

module.exports = router;
