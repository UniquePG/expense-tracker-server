const express = require('express');
const router = express.Router();
const expensesController = require('./expense.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody, validateParams, validateQuery } = require('../../middlewares/validate.middleware');
const {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdSchema,
  listExpensesSchema
} = require('./expense.validator');

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Expense management and splitting
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SplitEntry:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *           description: Required for EXACT split type
 *         percentage:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Required for PERCENTAGE split type
 *         shares:
 *           type: integer
 *           description: Required for SHARES split type
 *
 *     CreateExpenseRequest:
 *       type: object
 *       required:
 *         - description
 *         - amount
 *         - paidById
 *         - splitType
 *         - splits
 *       properties:
 *         description:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           example: Dinner at restaurant
 *         amount:
 *           type: number
 *           minimum: 0.01
 *           example: 100.00
 *         currency:
 *           type: string
 *           minLength: 3
 *           maxLength: 3
 *           default: USD
 *           example: USD
 *         expenseDate:
 *           type: string
 *           format: date-time
 *           example: '2024-01-15T19:00:00.000Z'
 *         notes:
 *           type: string
 *           maxLength: 1000
 *         image:
 *           type: string
 *           format: uri
 *         categoryId:
 *           type: string
 *           format: uuid
 *         groupId:
 *           type: string
 *           format: uuid
 *         paidById:
 *           type: string
 *           format: uuid
 *         splitType:
 *           type: string
 *           enum: [EQUAL, PERCENTAGE, EXACT, SHARES]
 *           example: EQUAL
 *         splits:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/SplitEntry'
 *
 *     UpdateExpenseRequest:
 *       type: object
 *       properties:
 *         description:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         currency:
 *           type: string
 *           minLength: 3
 *           maxLength: 3
 *         expenseDate:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 *           maxLength: 1000
 *         image:
 *           type: string
 *           format: uri
 *         categoryId:
 *           type: string
 *           format: uuid
 *
 *     ExpenseSplit:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *         percentage:
 *           type: number
 *           nullable: true
 *         shares:
 *           type: integer
 *           nullable: true
 *         isSettled:
 *           type: boolean
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             email:
 *               type: string
 *             avatar:
 *               type: string
 *               nullable: true
 *
 *     Expense:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         expenseDate:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 *           nullable: true
 *         image:
 *           type: string
 *           nullable: true
 *         splitType:
 *           type: string
 *           enum: [EQUAL, PERCENTAGE, EXACT, SHARES]
 *         expenseType:
 *           type: string
 *           enum: [PERSONAL, GROUP]
 *         paidBy:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             avatar:
 *               type: string
 *               nullable: true
 *         category:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *         group:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *         splits:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ExpenseSplit'
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     ExpenseSummary:
 *       type: object
 *       properties:
 *         totalPaid:
 *           type: number
 *           example: 500.00
 *         totalExpenses:
 *           type: integer
 *           example: 12
 *         totalOwedToUser:
 *           type: number
 *           example: 150.00
 *         totalUserOwes:
 *           type: number
 *           example: 75.00
 *         netBalance:
 *           type: number
 *           example: 75.00
 */

/**
 * @swagger
 * /expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExpenseRequest'
 *           examples:
 *             equal_split:
 *               summary: Equal split example
 *               value:
 *                 description: Dinner at restaurant
 *                 amount: 120.00
 *                 currency: USD
 *                 paidById: "uuid-of-payer"
 *                 splitType: EQUAL
 *                 splits:
 *                   - userId: "uuid-user-1"
 *                   - userId: "uuid-user-2"
 *                   - userId: "uuid-user-3"
 *             percentage_split:
 *               summary: Percentage split example
 *               value:
 *                 description: Hotel booking
 *                 amount: 200.00
 *                 paidById: "uuid-of-payer"
 *                 splitType: PERCENTAGE
 *                 splits:
 *                   - userId: "uuid-user-1"
 *                     percentage: 60
 *                   - userId: "uuid-user-2"
 *                     percentage: 40
 *     responses:
 *       201:
 *         description: Expense created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     expense:
 *                       $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Validation error or split amounts don't add up
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, validateBody(createExpenseSchema), expensesController.createExpense);

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: Get all expenses for the authenticated user
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter expenses by group
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter expenses by category
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter expenses from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter expenses until this date
 *     responses:
 *       200:
 *         description: Expenses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Expense'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, validateQuery(listExpensesSchema), expensesController.getExpenses);

/**
 * @swagger
 * /expenses/summary:
 *   get:
 *     summary: Get expense summary for the authenticated user
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expense summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       $ref: '#/components/schemas/ExpenseSummary'
 *       401:
 *         description: Unauthorized
 */
router.get('/summary', authenticate, expensesController.getExpenseSummary);

/**
 * @swagger
 * /expenses/{id}:
 *   get:
 *     summary: Get a specific expense by ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Expense ID
 *     responses:
 *       200:
 *         description: Expense retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     expense:
 *                       $ref: '#/components/schemas/Expense'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not a participant of the expense
 *       404:
 *         description: Expense not found
 */
router.get('/:id', authenticate, validateParams(expenseIdSchema), expensesController.getExpenseById);

/**
 * @swagger
 * /expenses/{id}:
 *   put:
 *     summary: Update an expense (only payer can update)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Expense ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateExpenseRequest'
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     expense:
 *                       $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only the payer can update this expense
 *       404:
 *         description: Expense not found
 */
router.put('/:id', authenticate, validateParams(expenseIdSchema), validateBody(updateExpenseSchema), expensesController.updateExpense);

/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     summary: Delete an expense (only payer can delete)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Expense ID
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only the payer can delete this expense
 *       400:
 *         description: Cannot delete expense with settled splits
 *       404:
 *         description: Expense not found
 */
router.delete('/:id', authenticate, validateParams(expenseIdSchema), expensesController.deleteExpense);

/**
 * @swagger
 * /expenses/{id}/split:
 *   post:
 *     summary: Create a split expense within a group
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Group ID to create the expense in
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExpenseRequest'
 *           example:
 *             description: Group dinner
 *             amount: 150.00
 *             currency: USD
 *             paidById: "uuid-of-payer"
 *             splitType: EQUAL
 *             splits:
 *               - userId: "uuid-user-1"
 *               - userId: "uuid-user-2"
 *               - userId: "uuid-user-3"
 *     responses:
 *       201:
 *         description: Split expense created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     expense:
 *                       $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Validation error or split amounts don't add up
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
router.post('/:id/split', authenticate, validateParams(expenseIdSchema), validateBody(createExpenseSchema), expensesController.splitExpense);
router.post('/:id/receipt', authenticate, validateParams(expenseIdSchema), expensesController.uploadReceipt);
router.put('/:id/split', authenticate, validateParams(expenseIdSchema), expensesController.updateSplit);
router.get('/:id/comments', authenticate, validateParams(expenseIdSchema), expensesController.getComments);
router.post('/:id/comments', authenticate, validateParams(expenseIdSchema), expensesController.addComment);

module.exports = router;
