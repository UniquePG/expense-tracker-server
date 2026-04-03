const { PrismaClient } = require('@prisma/client');
const config = require('./env');

// Prisma client instance with logging in development
const prisma = new PrismaClient({
  log: config.env === 'development'
    ? [
      // 'query', 
      // 'info', 
      // 'warn', 
      'error'
    ]
    : ['error'],
});

// Connection handling
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('👋 Database disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('👋 Database disconnected');
  process.exit(0);
});

module.exports = prisma;
