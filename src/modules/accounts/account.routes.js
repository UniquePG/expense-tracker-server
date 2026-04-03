const express = require('express');
const router = express.Router();
const accountController = require('./account.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../../middlewares/validate.middleware');
const { createAccountSchema, updateAccountSchema, accountIdSchema, adjustBalanceSchema } = require('./account.validator');

/**
 * Account Routes
 * All routes require authentication
 */

// Create account
router.post('/', authenticate, validateBody(createAccountSchema), accountController.createAccount);

// Get all accounts
router.get('/', authenticate, accountController.getAccounts);

// Get total balance
router.get('/balance/total', authenticate, accountController.getTotalBalance);

// Get account by ID
router.get('/:id', authenticate, validateParams(accountIdSchema), accountController.getAccountById);

// Get account balance
router.get('/:id/balance', authenticate, validateParams(accountIdSchema), accountController.getAccountBalance);

// Update account
router.put('/:id', authenticate, validateParams(accountIdSchema), validateBody(updateAccountSchema), accountController.updateAccount);

// Delete account
router.delete('/:id', authenticate, validateParams(accountIdSchema), accountController.deleteAccount);

// Adjust account balance
router.post('/:id/adjust', authenticate, validateParams(accountIdSchema), validateBody(adjustBalanceSchema), accountController.adjustBalance);

module.exports = router;
