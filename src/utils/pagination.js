/**
 * Pagination helper utilities
 */

class PaginationHelper {
  /**
   * Get pagination parameters from request
   * @param {Object} query - Request query parameters
   * @returns {Object} Pagination parameters
   */
  static getPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Create pagination metadata
   * @param {number} totalItems - Total number of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @returns {Object} Pagination metadata
   */
  static createPaginationMeta(totalItems, page, limit) {
    const totalPages = Math.ceil(totalItems / limit);

    return {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  /**
   * Create Prisma pagination args
   * @param {Object} query - Request query parameters
   * @returns {Object} Prisma skip and take parameters
   */
  static getPrismaPagination(query) {
    const { skip, limit } = this.getPaginationParams(query);
    return {
      skip,
      take: limit
    };
  }

  /**
   * Create cursor-based pagination for large datasets
   * @param {string} cursor - Cursor ID
   * @param {number} limit - Items per page
   * @returns {Object} Prisma cursor pagination args
   */
  static getCursorPagination(cursor, limit = 10) {
    const take = Math.min(100, Math.max(1, limit));

    if (!cursor) {
      return { take };
    }

    return {
      take,
      skip: 1, // Skip the cursor item
      cursor: {
        id: cursor
      }
    };
  }
}

module.exports = PaginationHelper;
