const cloudinary = require('../config/cloudinary');
const logger = require('./logger');
const fs = require('fs');

class CloudinaryService {
  /**
   * Upload a file to Cloudinary
   * @param {string} filePath - Path to the file to upload
   * @param {string} folder - Folder path in Cloudinary (e.g., 'splitwise/avatars')
   * @param {string} fileName - Optional custom file name
   * @returns {Promise<Object>} Upload result with secure_url
   */
  async uploadFile(filePath, folder = 'splitwise', fileName = null) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const options = {
        folder,
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
      };

      // Add custom public ID if provided
      if (fileName) {
        options.public_id = fileName;
      }

      const result = await cloudinary.uploader.upload(filePath, options);

      logger.info(`File uploaded to Cloudinary: ${result.public_id}`);
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      logger.error(`Cloudinary upload failed: ${error.message}`);
      throw {
        statusCode: 400,
        message: 'Failed to upload file to Cloudinary',
        error: error.message,
      };
    }
  }

  /**
   * Upload a file from base64 data
   * @param {string} base64Data - Base64 encoded file data
   * @param {string} folder - Folder path in Cloudinary
   * @param {string} fileName - Custom file name
   * @returns {Promise<Object>} Upload result
   */
  async uploadBase64(base64Data, folder = 'splitwise', fileName) {
    try {
      const options = {
        folder,
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
      };

      if (fileName) {
        options.public_id = fileName;
      }

      const result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${base64Data}`,
        options
      );

      logger.info(`Base64 file uploaded to Cloudinary: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      logger.error(`Cloudinary base64 upload failed: ${error.message}`);
      throw {
        statusCode: 400,
        message: 'Failed to upload file to Cloudinary',
        error: error.message,
      };
    }
  }

  /**
   * Delete a file from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        logger.info(`File deleted from Cloudinary: ${publicId}`);
        return { success: true, message: 'File deleted successfully' };
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (error) {
      logger.error(`Cloudinary delete failed: ${error.message}`);
      throw {
        statusCode: 400,
        message: 'Failed to delete file from Cloudinary',
        error: error.message,
      };
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param {string} url - Cloudinary URL
   * @returns {string} Public ID
   */
  extractPublicId(url) {
    try {
      const matches = url.match(/\/v\d+\/(.+)\.\w{3,4}$/);
      return matches ? matches[1] : null;
    } catch (error) {
      logger.error(`Failed to extract public ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate Cloudinary URL with transformations
   * @param {string} publicId - Public ID
   * @param {Object} transformations - Transformation options
   * @returns {string} Transformed URL
   */
  getTransformedUrl(publicId, transformations = {}) {
    const defaultTransformations = {
      width: 200,
      height: 200,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
    };

    const merged = { ...defaultTransformations, ...transformations };

    try {
      const url = cloudinary.url(publicId, merged);
      return url;
    } catch (error) {
      logger.error(`Failed to generate transformed URL: ${error.message}`);
      return null;
    }
  }

  /**
   * Get file metadata from Cloudinary
   * @param {string} publicId - Public ID
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      logger.error(`Failed to get file metadata: ${error.message}`);
      throw {
        statusCode: 404,
        message: 'File not found on Cloudinary',
      };
    }
  }
}

module.exports = new CloudinaryService();
