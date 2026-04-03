const express = require('express');
const router = express.Router();
const settlementsController = require('./settlement.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../../middlewares/validate.middleware');
const { createSettlementSchema, settlementIdSchema } = require('./settlement.validator');

/**
 * @swagger
 * tags:
 *   name: Settlements
 *   description: Payment settlements
 */

router.post('/', authenticate, validateBody(createSettlementSchema), settlementsController.createSettlement);
router.get('/', authenticate, settlementsController.getUserSettlements);
router.get('/:id', authenticate, validateParams(settlementIdSchema), settlementsController.getSettlementById);
router.put('/:id', authenticate, validateParams(settlementIdSchema), settlementsController.updateSettlement);
router.delete('/:id', authenticate, validateParams(settlementIdSchema), settlementsController.deleteSettlement);
router.post('/:id/confirm', authenticate, validateParams(settlementIdSchema), settlementsController.confirmSettlement);
router.post('/:id/reject', authenticate, validateParams(settlementIdSchema), settlementsController.rejectSettlement);
router.post('/:id/cancel', authenticate, validateParams(settlementIdSchema), settlementsController.cancelSettlement);
router.post('/:id/remind', authenticate, validateParams(settlementIdSchema), settlementsController.remindSettlement);

module.exports = router;
