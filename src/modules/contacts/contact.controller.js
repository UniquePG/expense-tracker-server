const contactService = require('./contact.service');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');

class ContactController {
  /**
   * Create Contact (for non-app users)
   * POST /contacts
   */
  async createContact(req, res, next) {
    try {
      const contact = await contactService.createContact(req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Contact created successfully', { contact }, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all contacts
   * GET /contacts
   */
  async getContacts(req, res, next) {
    try {
      const contacts = await contactService.getContacts(req.user.id);
      return ApiResponse.success(res, 'Contacts retrieved successfully', { contacts });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contact by ID
   * GET /contacts/:id
   */
  async getContactById(req, res, next) {
    try {
      const contact = await contactService.getContactById(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Contact retrieved successfully', { contact });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update contact
   * PUT /contacts/:id
   */
  async updateContact(req, res, next) {
    try {
      const contact = await contactService.updateContact(req.validatedParams.id, req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Contact updated successfully', { contact });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete contact
   * DELETE /contacts/:id
   */
  async deleteContact(req, res, next) {
    try {
      await contactService.deleteContact(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Contact deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search contacts
   * GET /contacts/search
   */
  async searchContacts(req, res, next) {
    try {
      const query = req.query.q || req.query.query || '';
      
      if (!query || query.trim().length === 0) {
        return ApiResponse.error(res, 'Search query required', 400);
      }

      const contacts = await contactService.searchContacts(req.user.id, query);
      return ApiResponse.success(res, 'Contacts found', { contacts, count: contacts.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Link contact to registered user
   * POST /contacts/:id/link
   */
  async linkContactToUser(req, res, next) {
    try {
      const linkedUserId = req.validatedBody.linkedUserId;
      const contact = await contactService.linkContactToUser(
        req.validatedParams.id,
        req.user.id,
        linkedUserId
      );
      return ApiResponse.success(res, 'Contact linked successfully', { contact });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactController();
