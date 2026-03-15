const express = require('express');
const router = express.Router();
const transactionsController = require('./transaction.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../../middlewares/validate.middleware');
const { createTransactionSchema, transactionIdSchema } = require('./transaction.validator');

router.get('/', authenticate, transactionsController.getTransactions);
router.post('/', authenticate, validateBody(createTransactionSchema), transactionsController.createTransaction);
router.get('/categories', authenticate, transactionsController.getCategories);
router.get('/:id', authenticate, validateParams(transactionIdSchema), transactionsController.getTransactionById);
router.put('/:id', authenticate, validateParams(transactionIdSchema), transactionsController.updateTransaction);
router.delete('/:id', authenticate, validateParams(transactionIdSchema), transactionsController.deleteTransaction);

module.exports = router;
