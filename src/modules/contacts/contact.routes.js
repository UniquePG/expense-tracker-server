const express = require('express');
const router = express.Router();
const contactController = require('./contact.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../../middlewares/validate.middleware');
const { createContactSchema, updateContactSchema, contactIdSchema } = require('./contact.validator');
const { z } = require('zod');

/**
 * Contact Routes
 * All routes require authentication
 * Contacts are for non-app users (e.g., friends not yet registered)
 */

// Create contact
router.post('/', authenticate, validateBody(createContactSchema), contactController.createContact);

// Get all contacts
router.get('/', authenticate, contactController.getContacts);

// Search contacts
router.get('/search', authenticate, contactController.searchContacts);

// Get contact by ID
router.get('/:id', authenticate, validateParams(contactIdSchema), contactController.getContactById);

// Link contact to registered user
const linkContactSchema = z.object({
  linkedUserId: z.number()
});
router.post('/:id/link', authenticate, validateParams(contactIdSchema), validateBody(linkContactSchema), contactController.linkContactToUser);

// Update contact
router.put('/:id', authenticate, validateParams(contactIdSchema), validateBody(updateContactSchema), contactController.updateContact);

// Delete contact
router.delete('/:id', authenticate, validateParams(contactIdSchema), contactController.deleteContact);

module.exports = router;
