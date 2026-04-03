const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const swaggerSpecs = require('./docs/swagger');
const { errorHandler, notFound } = require('./middlewares/error.middleware.js');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./modules/auth/auth.routes.js');
const userRoutes = require('./modules/users/user.routes.js');
const friendRoutes = require('./modules/friends/friends.routes.js');
const groupRoutes = require('./modules/groups/groups.routes.js');
const expenseRoutes = require('./modules/expenses/expense.routes.js');
const splitRoutes = require('./modules/splits/split.routes.js');
const settlementRoutes = require('./modules/settlements/settlement.routes.js');
const categoryRoutes = require('./modules/categories/category.routes.js');
const notificationRoutes = require('./modules/notifications/notification.routes.js');
const inviteRoutes = require('./modules/invites/invite.routes.js');
const budgetRoutes = require('./modules/budgets/budget.routes.js');
const analyticsRoutes = require('./modules/analytics/analytics.routes.js');
const transactionRoutes = require('./modules/transactions/transaction.routes.js');
const accountRoutes = require('./modules/accounts/account.routes.js');
const contactRoutes = require('./modules/contacts/contact.routes.js');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes.js');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  }
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Splitwise Clone API'
}));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/friends', friendRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/splits', splitRoutes);
app.use('/api/v1/settlements', settlementRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/invites', inviteRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
