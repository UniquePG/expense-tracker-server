# Splitwise Clone Backend

A production-grade backend API for Personal Finance + Bill Splitting application.

## Features

- **Authentication**: JWT-based with refresh tokens
- **User Management**: Profile, search, statistics
- **Friends System**: Friend requests, accept/reject
- **Groups**: Create groups, manage members, shared expenses
- **Expenses**: Track personal and group expenses
- **Bill Splitting**: Equal, Percentage, Exact, Shares
- **Settlements**: Record payments, track debts
- **Categories**: Expense categorization
- **Notifications**: Activity notifications
- **Analytics**: Spending insights
- **Invites**: Invite non-registered users

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npx prisma migrate dev

# Seed database
npm run prisma:seed

# Start server
npm run dev
```

## API Documentation

Once server is running, visit: `http://localhost:3000/api-docs`

## Project Structure

```
src/
├── config/           # Configuration files
├── modules/          # Feature modules
│   ├── auth/        # Authentication
│   ├── users/       # User management
│   ├── friends/     # Friend system
│   ├── groups/      # Group management
│   ├── expenses/    # Expense tracking
│   ├── splits/      # Bill splitting
│   ├── settlements/ # Payment settlements
│   ├── categories/  # Expense categories
│   ├── notifications/# Notifications
│   ├── invites/     # User invites
│   └── analytics/   # Analytics & reports
├── middlewares/     # Express middlewares
├── utils/           # Utility functions
├── docs/            # Swagger documentation
├── app.js           # Express app setup
└── server.js        # Server entry point
```

## Tech Stack

- Node.js 18+
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Zod Validation
- Swagger/OpenAPI

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database
- `npm run prisma:studio` - Open Prisma Studio

## License

MIT
