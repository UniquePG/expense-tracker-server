const categoriesService = require('./category.service');
const ApiResponse = require('../../utils/response');

class CategoriesController {
  async getAllCategories(req, res, next) {
    try {
      const categories = await categoriesService.getAllCategories(req.user.id);
      return ApiResponse.success(res, 'Categories retrieved', { categories });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const category = await categoriesService.createCategory(req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Category created', { category }, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const category = await categoriesService.updateCategory(
        req.validatedParams.id,
        req.user.id,
        req.validatedBody
      );
      return ApiResponse.success(res, 'Category updated', { category });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      await categoriesService.deleteCategory(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Category deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoriesController();
