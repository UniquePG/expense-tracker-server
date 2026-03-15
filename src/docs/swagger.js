const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config/env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Splitwise Clone API',
      version: '1.0.0',
      description: 'Personal Finance + Bill Splitting Application API',
      contact: {
        name: 'API Support',
        email: 'support@splitwise-clone.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    './src/modules/**/*.routes.js',
    './src/modules/**/*.validator.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
