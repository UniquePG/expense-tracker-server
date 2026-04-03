const express = require('express');
const router = express.Router();
const budgetController = require('./budget.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody } = require('../../middlewares/validate.middleware');
const { createBudgetSchema, updateBudgetSchema } = require('./budget.validator');

/**
 * Create a new budget
 * POST /budgets
 */
router.post('/', authenticate, validateBody(createBudgetSchema), budgetController.createBudget);

/**
 * Get all budgets
 * GET /budgets
 */
router.get('/', authenticate, budgetController.getBudgets);

/**
 * Get budget progress
 * GET /budgets/:id/progress
 */
router.get('/:id/progress', authenticate, budgetController.getBudgetProgress);

/**
 * Update budget
 * PUT /budgets/:id
 */
router.put('/:id', authenticate, validateBody(updateBudgetSchema), budgetController.updateBudget);

/**
 * Delete budget
 * DELETE /budgets/:id
 */
router.delete('/:id', authenticate, budgetController.deleteBudget);

module.exports = router;
