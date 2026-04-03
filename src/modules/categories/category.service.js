const prisma = require('../../config/database');
const logger = require('../../utils/logger');

class CategoriesService {
  async getAllCategories(userId) {
    const categories = await prisma.category.findMany({
      // where: {
      //   OR: [
      //     // { isDefault: true },
      //     { userId }
      //   ]
      // },
      orderBy: [
        // { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });

    return categories;
  }

  async createCategory(userId, categoryData) {
    const category = await prisma.category.create({
      data: {
        ...categoryData,
        userId
      }
    });

    logger.info(`Category created: ${category.id} by ${userId}`);
    return category;
  }

  async updateCategory(categoryId, userId, updateData) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
        isDefault: false
      }
    });

    if (!category) {
      throw { statusCode: 404, message: 'Category not found or cannot edit default' };
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: updateData
    });

    logger.info(`Category updated: ${categoryId}`);
    return updated;
  }

  async deleteCategory(categoryId, userId) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
        isDefault: false
      }
    });

    if (!category) {
      throw { statusCode: 404, message: 'Category not found or cannot delete default' };
    }

    const expenseCount = await prisma.expense.count({
      where: { categoryId }
    });

    if (expenseCount > 0) {
      throw { statusCode: 400, message: 'Cannot delete category with expenses' };
    }

    await prisma.category.delete({
      where: { id: categoryId }
    });

    logger.info(`Category deleted: ${categoryId}`);
  }
}

module.exports = new CategoriesService();
