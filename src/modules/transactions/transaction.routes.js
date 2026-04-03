const express = require('express');
const router = express.Router();
const transactionsController = require('./transaction.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody, validateParams, validateQuery } = require('../../middlewares/validate.middleware');
const {
  createTransactionSchema,
  transactionIdSchema,
  addIncomeSchema,
  addExpenseSchema,
  transferSchema,
  updateTransactionSchema,
  listTransactionsSchema
} = require('./transaction.validator');

router.get('/', authenticate, validateQuery(listTransactionsSchema), transactionsController.getTransactions);
router.post('/income', authenticate, validateBody(addIncomeSchema), transactionsController.addIncome);
router.post('/expense', authenticate, validateBody(addExpenseSchema), transactionsController.addExpense);
router.post('/transfer', authenticate, validateBody(transferSchema), transactionsController.transferBetweenAccounts);
router.post('/', authenticate, validateBody(createTransactionSchema), transactionsController.createTransaction);
router.get('/categories', authenticate, transactionsController.getCategories);
router.get('/:id', authenticate, validateParams(transactionIdSchema), transactionsController.getTransactionById);
router.put('/:id', authenticate, validateParams(transactionIdSchema), validateBody(updateTransactionSchema), transactionsController.updateTransaction);
router.delete('/:id', authenticate, validateParams(transactionIdSchema), transactionsController.deleteTransaction);

module.exports = router;
