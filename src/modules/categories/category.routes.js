const express = require('express');
const router = express.Router();
const categoriesController = require('./category.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../../middlewares/validate.middleware');
const { createCategorySchema, categoryIdSchema } = require('./category.validator');

router.get('/', authenticate, categoriesController.getAllCategories);
router.post('/', authenticate, validateBody(createCategorySchema), categoriesController.createCategory);
router.put('/:id', authenticate, validateParams(categoryIdSchema), validateBody(createCategorySchema), categoriesController.updateCategory);
router.delete('/:id', authenticate, validateParams(categoryIdSchema), categoriesController.deleteCategory);

module.exports = router;
