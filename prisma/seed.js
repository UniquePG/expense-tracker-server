const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default categories
  const defaultCategories = [
    { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', isDefault: true },
    { name: 'Transportation', icon: '🚗', color: '#4ECDC4', isDefault: true },
    { name: 'Shopping', icon: '🛍️', color: '#45B7D1', isDefault: true },
    { name: 'Entertainment', icon: '🎬', color: '#96CEB4', isDefault: true },
    { name: 'Bills & Utilities', icon: '💡', color: '#FFEAA7', isDefault: true },
    { name: 'Health & Fitness', icon: '💪', color: '#DDA0DD', isDefault: true },
    { name: 'Travel', icon: '✈️', color: '#98D8C8', isDefault: true },
    { name: 'Education', icon: '📚', color: '#F7DC6F', isDefault: true },
    { name: 'Groceries', icon: '🛒', color: '#BB8FCE', isDefault: true },
    { name: 'Rent', icon: '🏠', color: '#85C1E9', isDefault: true },
  ];

  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { 
        id: category.name.toLowerCase().replace(/\s+/g, '-') 
      },
      update: {},
      create: {
        id: category.name.toLowerCase().replace(/\s+/g, '-'),
        ...category
      }
    });
  }

  console.log('✅ Default categories created');

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const demoUsers = [
    {
      email: 'alice@example.com',
      password: hashedPassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      phone: '+1234567890',
      currency: 'USD'
    },
    {
      email: 'bob@example.com',
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'Smith',
      phone: '+1234567891',
      currency: 'USD'
    },
    {
      email: 'charlie@example.com',
      password: hashedPassword,
      firstName: 'Charlie',
      lastName: 'Brown',
      phone: '+1234567892',
      currency: 'USD'
    }
  ];

  for (const userData of demoUsers) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData
    });
  }

  console.log('✅ Demo users created');

  // Create friendships
  const alice = await prisma.user.findUnique({ where: { email: 'alice@example.com' } });
  const bob = await prisma.user.findUnique({ where: { email: 'bob@example.com' } });
  const charlie = await prisma.user.findUnique({ where: { email: 'charlie@example.com' } });

  if (alice && bob) {
    await prisma.friendship.upsert({
      where: {
        requesterId_addresseeId: {
          requesterId: alice.id,
          addresseeId: bob.id
        }
      },
      update: {},
      create: {
        requesterId: alice.id,
        addresseeId: bob.id,
        status: 'ACCEPTED'
      }
    });
  }

  if (alice && charlie) {
    await prisma.friendship.upsert({
      where: {
        requesterId_addresseeId: {
          requesterId: alice.id,
          addresseeId: charlie.id
        }
      },
      update: {},
      create: {
        requesterId: alice.id,
        addresseeId: charlie.id,
        status: 'ACCEPTED'
      }
    });
  }

  console.log('✅ Friendships created');

  // Create a demo group
  if (alice && bob && charlie) {
    const group = await prisma.group.upsert({
      where: { id: 'demo-trip' },
      update: {},
      create: {
        id: 'demo-trip',
        name: 'Weekend Trip',
        description: 'Weekend getaway expenses',
        createdBy: alice.id
      }
    });

    // Add members to group
    const members = [alice.id, bob.id, charlie.id];
    for (const userId of members) {
      await prisma.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: userId
          }
        },
        update: {},
        create: {
          groupId: group.id,
          userId: userId,
          isAdmin: userId === alice.id
        }
      });
    }

    console.log('✅ Demo group created with members');
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
