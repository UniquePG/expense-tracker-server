const prisma = require('../../config/database');
const logger = require('../../utils/logger');

class ContactService {
  /**
   * Create a contact (for non-app users)
   * According to api_doc:
   * Fields: name, email, phone
   * Table: contacts
   */
  async createContact(userId, contactData) {
    const { name, email, phone } = contactData;

    // Check if contact already exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        ownerId: userId,
        OR: [
          { email: email || '' },
          { phone: phone || '' }
        ]
      }
    });

    if (existingContact) {
      throw { statusCode: 400, message: 'Contact with this email or phone already exists' };
    }

    const contact = await prisma.contact.create({
      data: {
        ownerId: userId,
        name,
        email: email || null,
        phone: phone || null
      }
    });

    logger.info(`Contact created: ${contact.id} for user ${userId}`);
    return contact;
  }

  /**
   * Get all contacts for a user
   */
  async getContacts(userId) {
    const contacts = await prisma.contact.findMany({
      where: { ownerId: userId },
      orderBy: { name: 'asc' },
      include: {
        groupMembers: {
          include: {
            group: true
          }
        }
      }
    });

    return contacts;
  }

  /**
   * Get contact by ID
   */
  async getContactById(contactId, userId) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        ownerId: userId
      },
      include: {
        groupMembers: {
          include: {
            group: true
          }
        },
        expenseSplits: {
          include: {
            expense: true
          }
        }
      }
    });

    if (!contact) {
      throw { statusCode: 404, message: 'Contact not found' };
    }

    return contact;
  }

  /**
   * Update contact
   */
  async updateContact(contactId, userId, updateData) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        ownerId: userId
      }
    });

    if (!contact) {
      throw { statusCode: 404, message: 'Contact not found' };
    }

    // Check if updated email or phone conflicts with existing contact
    if (updateData.email || updateData.phone) {
      const conflictingContact = await prisma.contact.findFirst({
        where: {
          ownerId: userId,
          NOT: { id: contactId },
          OR: [
            { email: updateData.email || '' },
            { phone: updateData.phone || '' }
          ]
        }
      });

      if (conflictingContact) {
        throw { statusCode: 400, message: 'Another contact with this email or phone exists' };
      }
    }

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
      include: {
        groupMembers: {
          include: {
            group: true
          }
        }
      }
    });

    logger.info(`Contact updated: ${contactId}`);
    return updated;
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId, userId) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        ownerId: userId
      }
    });

    if (!contact) {
      throw { statusCode: 404, message: 'Contact not found' };
    }

    // Check if contact is used in any groups
    const groupMemberCount = await prisma.groupMember.count({
      where: { contactId }
    });

    if (groupMemberCount > 0) {
      throw {
        statusCode: 400,
        message: 'Cannot delete contact that is a member of groups'
      };
    }

    await prisma.contact.delete({
      where: { id: contactId }
    });

    logger.info(`Contact deleted: ${contactId}`);
  }

  /**
   * Search contacts
   */
  async searchContacts(userId, query) {
    const contacts = await prisma.contact.findMany({
      where: {
        ownerId: userId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } }
        ]
      },
      orderBy: { name: 'asc' }
    });

    return contacts;
  }

  /**
   * Link contact to a registered app user
   */
  async linkContactToUser(contactId, userId, linkedUserId) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        ownerId: userId
      }
    });

    if (!contact) {
      throw { statusCode: 404, message: 'Contact not found' };
    }

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: { linkedUserId }
    });

    logger.info(`Contact linked: ${contactId} to user ${linkedUserId}`);
    return updated;
  }
}

module.exports = new ContactService();
