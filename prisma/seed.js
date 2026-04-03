const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ============================================================
  // SYSTEM CATEGORIES (isSystem=true, userId=null)
  // Per API docs §5: system categories are global, not per-user.
  // Per schema: userId=null means system-default.
  // ============================================================
  const systemCategories = [
    { name: "Food & Dining",     icon: "icon", color: "#FF6B6B", isSystem: true },
    { name: "Groceries",         icon: "icon", color: "#4ECDC4", isSystem: true },
    { name: "Transportation",    icon: "icon", color: "#45B7D1", isSystem: true },
    { name: "Entertainment",     icon: "icon", color: "#96CEB4", isSystem: true },
    { name: "Bills & Utilities", icon: "icon", color: "#FFEAA7", isSystem: true },
    { name: "Shopping",          icon: "icon", color: "#DDA0DD", isSystem: true },
    { name: "Health & Medical",  icon: "icon", color: "#98FB98", isSystem: true },
    { name: "Travel",            icon: "icon", color: "#87CEEB", isSystem: true },
    { name: "Rent & Housing",    icon: "icon", color: "#F0E68C", isSystem: true },
    { name: "Personal Care",     icon: "icon", color: "#FFB6C1", isSystem: true },
    { name: "Education",         icon: "icon", color: "#20B2AA", isSystem: true },
    { name: "Business",          icon: "icon", color: "#778899", isSystem: true },
    { name: "Investment",        icon: "icon", color: "#3CB371", isSystem: true },
    { name: "Gifts",             icon: "icon", color: "#FF69B4", isSystem: true },
    { name: "Others",            icon: "icon", color: "#808080", isSystem: true },
  ];

  const createdCategories = {};
  for (const cat of systemCategories) {
    const created = await prisma.category.create({ data: cat });
    createdCategories[cat.name] = created;
  }
  console.log("✅ System categories created");

  // ============================================================
  // USERS
  // Per API docs §1.1: bcrypt salt rounds = 12 in production,
  // using 10 here for seed speed. Password: Test@123
  // isEmailVerified = true so all test users can log in.
  // ============================================================
  const password = await bcrypt.hash("Test@123", 10);

  const alice = await prisma.user.upsert({
    where: { email: "alice@gmail.com" },
    update: {},
    create: {
      email:           "alice@gmail.com",
      firstName:       "Alice",
      lastName:        "Johnson",
      phone:           "+911111111111",
      password,
      currency:        "INR",
      isEmailVerified: true,
      isActive:        true,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@gmail.com" },
    update: {},
    create: {
      email:           "bob@gmail.com",
      firstName:       "Bob",
      lastName:        "Smith",
      phone:           "+912222222222",
      password,
      currency:        "INR",
      isEmailVerified: true,
      isActive:        true,
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: "charlie@gmail.com" },
    update: {},
    create: {
      email:           "charlie@gmail.com",
      firstName:       "Charlie",
      lastName:        "Brown",
      phone:           "+913333333333",
      password,
      currency:        "INR",
      isEmailVerified: true,
      isActive:        true,
    },
  });

  const diana = await prisma.user.upsert({
    where: { email: "diana@gmail.com" },
    update: {},
    create: {
      email:           "diana@gmail.com",
      firstName:       "Diana",
      lastName:        "Prince",
      phone:           "+914444444444",
      password,
      currency:        "INR",
      isEmailVerified: true,
      isActive:        true,
    },
  });

  console.log("✅ Users created (alice, bob, charlie, diana) | password: Test@123");

  // ============================================================
  // REFRESH TOKENS (simulate logged-in sessions)
  // Per schema: token=UUID, expiresAt = now + 30 days
  // ============================================================
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.createMany({
    data: [
      { token: uuidv4(), userId: alice.id,   expiresAt: thirtyDaysFromNow },
      { token: uuidv4(), userId: bob.id,     expiresAt: thirtyDaysFromNow },
      { token: uuidv4(), userId: charlie.id, expiresAt: thirtyDaysFromNow },
      { token: uuidv4(), userId: diana.id,   expiresAt: thirtyDaysFromNow },
    ],
  });
  console.log("✅ Refresh tokens created");

  // ============================================================
  // FRIENDSHIPS
  // Per schema: status enum = PENDING | ACCEPTED | REJECTED | BLOCKED
  // Alice ↔ Bob: ACCEPTED
  // Alice ↔ Charlie: ACCEPTED
  // Alice ↔ Diana: ACCEPTED
  // Bob ↔ Charlie: ACCEPTED
  // Bob ↔ Diana: PENDING (to test pending requests screen)
  // ============================================================
  await prisma.friendship.createMany({
    data: [
      { requesterId: alice.id,   addresseeId: bob.id,     status: "ACCEPTED" },
      { requesterId: alice.id,   addresseeId: charlie.id, status: "ACCEPTED" },
      { requesterId: alice.id,   addresseeId: diana.id,   status: "ACCEPTED" },
      { requesterId: bob.id,     addresseeId: charlie.id, status: "ACCEPTED" },
      { requesterId: bob.id,     addresseeId: diana.id,   status: "PENDING"  },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Friendships created");

  // ============================================================
  // CONTACTS (non-app users)
  // Per API docs §9: contacts are owned by a user, linkedUserId=null
  // until they join the app.
  // ============================================================
  const amit = await prisma.contact.create({
    data: {
      ownerId: alice.id,
      name:    "Amit Sharma",
      phone:   "+915555555555",
      email:   "amit@personal.com",
    },
  });

  const priya = await prisma.contact.create({
    data: {
      ownerId: bob.id,
      name:    "Priya Patel",
      phone:   "+916666666666",
    },
  });
  console.log("✅ Contacts created (Amit owned by Alice, Priya owned by Bob)");

  // ============================================================
  // ACCOUNTS
  // Per API docs §3: balance is the opening balance.
  // Per API docs §3.1: also create an opening balance AccountTransaction.
  // Per schema: AccountType = CASH | BANK | CREDIT_CARD | WALLET | UPI
  // ============================================================

  // Alice accounts
  const aliceBank = await prisma.account.create({
    data: { userId: alice.id, name: "Alice HDFC Savings", type: "BANK",  balance: 50000, currency: "INR" },
  });
  const aliceUPI = await prisma.account.create({
    data: { userId: alice.id, name: "Alice GPay",          type: "UPI",  balance: 12500, currency: "INR" },
  });
  const aliceCash = await prisma.account.create({
    data: { userId: alice.id, name: "Alice Cash Wallet",   type: "CASH", balance: 5000,  currency: "INR" },
  });

  // Bob accounts
  const bobBank = await prisma.account.create({
    data: { userId: bob.id, name: "Bob SBI Account",   type: "BANK",   balance: 35000, currency: "INR" },
  });
  const bobWallet = await prisma.account.create({
    data: { userId: bob.id, name: "Bob PhonePe",       type: "WALLET", balance: 8000,  currency: "INR" },
  });

  // Charlie accounts
  const charlieBank = await prisma.account.create({
    data: { userId: charlie.id, name: "Charlie Axis Bank", type: "BANK", balance: 22000, currency: "INR" },
  });
  const charlieCash = await prisma.account.create({
    data: { userId: charlie.id, name: "Charlie Cash",      type: "CASH", balance: 3000,  currency: "INR" },
  });

  // Diana accounts
  const dianaBank = await prisma.account.create({
    data: { userId: diana.id, name: "Diana ICICI Bank", type: "BANK", balance: 75000, currency: "INR" },
  });
  const dianaCC = await prisma.account.create({
    data: { userId: diana.id, name: "Diana Credit Card", type: "CREDIT_CARD", balance: -15000, currency: "INR" },
  });

  console.log("✅ Accounts created");

  // ============================================================
  // OPENING BALANCE ACCOUNT TRANSACTIONS
  // Per API docs §3.1: INSERT account_transactions type=INCOME for
  // positive opening balance, type=EXPENSE for negative (credit card debt).
  // ============================================================
  const openingBalanceTxns = [
    { userId: alice.id,   accountId: aliceBank.id,   type: "INCOME",  amount: 50000,  description: "Opening balance" },
    { userId: alice.id,   accountId: aliceUPI.id,    type: "INCOME",  amount: 12500,  description: "Opening balance" },
    { userId: alice.id,   accountId: aliceCash.id,   type: "INCOME",  amount: 5000,   description: "Opening balance" },
    { userId: bob.id,     accountId: bobBank.id,     type: "INCOME",  amount: 35000,  description: "Opening balance" },
    { userId: bob.id,     accountId: bobWallet.id,   type: "INCOME",  amount: 8000,   description: "Opening balance" },
    { userId: charlie.id, accountId: charlieBank.id, type: "INCOME",  amount: 22000,  description: "Opening balance" },
    { userId: charlie.id, accountId: charlieCash.id, type: "INCOME",  amount: 3000,   description: "Opening balance" },
    { userId: diana.id,   accountId: dianaBank.id,   type: "INCOME",  amount: 75000,  description: "Opening balance" },
    { userId: diana.id,   accountId: dianaCC.id,     type: "EXPENSE", amount: 15000,  description: "Opening balance — existing credit card debt" },
  ];

  await prisma.accountTransaction.createMany({ data: openingBalanceTxns });
  console.log("✅ Opening balance transactions created");

  // ============================================================
  // INCOME TRANSACTIONS (for analytics/dashboard testing)
  // Per API docs §4.1: type=INCOME, updates account balance.
  // ============================================================
  const marchSalaryAlice = await prisma.accountTransaction.create({
    data: {
      userId:          alice.id,
      accountId:       aliceBank.id,
      type:            "INCOME",
      amount:          150000,
      incomeSource:    "Salary",
      description:     "March 2026 salary",
      transactionDate: new Date("2026-03-01T10:00:00Z"),
    },
  });
  await prisma.account.update({
    where: { id: aliceBank.id },
    data:  { balance: { increment: 150000 } },
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          bob.id,
      accountId:       bobBank.id,
      type:            "INCOME",
      amount:          95000,
      incomeSource:    "Salary",
      description:     "March 2026 salary",
      transactionDate: new Date("2026-03-01T09:00:00Z"),
    },
  });
  await prisma.account.update({
    where: { id: bobBank.id },
    data:  { balance: { increment: 95000 } },
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          alice.id,
      accountId:       aliceBank.id,
      type:            "INCOME",
      amount:          25000,
      incomeSource:    "Freelance",
      description:     "Website design project payment",
      transactionDate: new Date("2026-03-10T14:00:00Z"),
    },
  });
  await prisma.account.update({
    where: { id: aliceBank.id },
    data:  { balance: { increment: 25000 } },
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          charlie.id,
      accountId:       charlieBank.id,
      type:            "INCOME",
      amount:          80000,
      incomeSource:    "Salary",
      description:     "March 2026 salary",
      transactionDate: new Date("2026-03-01T09:30:00Z"),
    },
  });
  await prisma.account.update({
    where: { id: charlieBank.id },
    data:  { balance: { increment: 80000 } },
  });

  console.log("✅ Income transactions created");

  // ============================================================
  // TRANSFER TRANSACTION (Alice Bank → Alice GPay)
  // Per API docs §4.2: two account_transactions (EXPENSE out, INCOME in),
  // both account balances updated atomically.
  // ============================================================
  await prisma.accountTransaction.create({
    data: {
      userId:          alice.id,
      accountId:       aliceBank.id,
      type:            "EXPENSE",
      amount:          10000,
      description:     "Transfer out: Top up GPay",
      toAccountId:     aliceUPI.id,
      transactionDate: new Date("2026-03-05T11:00:00Z"),
    },
  });
  await prisma.accountTransaction.create({
    data: {
      userId:          alice.id,
      accountId:       aliceUPI.id,
      type:            "INCOME",
      amount:          10000,
      description:     "Transfer in from Alice HDFC Savings",
      toAccountId:     aliceBank.id,
      transactionDate: new Date("2026-03-05T11:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: aliceBank.id }, data: { balance: { decrement: 10000 } } });
  await prisma.account.update({ where: { id: aliceUPI.id  }, data: { balance: { increment: 10000 } } });
  console.log("✅ Transfer transaction created");

  // ============================================================
  // GROUPS
  // Per API docs §10.1: creator is auto-added as admin member.
  // Per schema: GroupStatus = ACTIVE | ARCHIVED | DELETED
  // ============================================================
  const goaGroup = await prisma.group.create({
    data: {
      name:        "Goa Weekend Trip",
      description: "March 2026 Goa trip expenses",
      createdBy:   alice.id,
      status:      "ACTIVE",
    },
  });

  const flatGroup = await prisma.group.create({
    data: {
      name:        "Koramangala Flat",
      description: "Monthly shared apartment expenses",
      createdBy:   bob.id,
      status:      "ACTIVE",
    },
  });

  console.log("✅ Groups created");

  // ============================================================
  // GROUP MEMBERS
  // Per API docs §10.1: creator is added as admin.
  // Per schema: MemberStatus = ACTIVE | LEFT | REMOVED
  // Either userId OR contactId, not both.
  // ============================================================

  // Goa Trip: Alice (admin), Bob, Charlie, Amit (contact)
  await prisma.groupMember.createMany({
    data: [
      { groupId: goaGroup.id, userId:    alice.id,   isAdmin: true,  status: "ACTIVE" },
      { groupId: goaGroup.id, userId:    bob.id,     isAdmin: false, status: "ACTIVE" },
      { groupId: goaGroup.id, userId:    charlie.id, isAdmin: false, status: "ACTIVE" },
      { groupId: goaGroup.id, contactId: amit.id,    isAdmin: false, status: "ACTIVE" },
    ],
  });

  // Flat: Bob (admin), Alice, Charlie, Diana
  await prisma.groupMember.createMany({
    data: [
      { groupId: flatGroup.id, userId: bob.id,     isAdmin: true,  status: "ACTIVE" },
      { groupId: flatGroup.id, userId: alice.id,   isAdmin: false, status: "ACTIVE" },
      { groupId: flatGroup.id, userId: charlie.id, isAdmin: false, status: "ACTIVE" },
      { groupId: flatGroup.id, userId: diana.id,   isAdmin: false, status: "ACTIVE" },
    ],
  });
  console.log("✅ Group members added");

  // ============================================================
  // USER-CREATED CUSTOM CATEGORY (for Alice)
  // Per API docs §5.2: isSystem=false, userId=me
  // ============================================================
  const aliceCustomCat = await prisma.category.create({
    data: {
      name:     "Goa Miscellaneous",
      icon:     "🏖️",
      color:    "#FFA07A",
      userId:   alice.id,
      isSystem: false,
    },
  });
  console.log("✅ Custom category created for Alice");

  // ============================================================
  // EXPENSES
  //
  // Per API docs §6 & schema:
  //  - expenseType: PERSONAL or GROUP
  //  - splitType: EQUAL | PERCENTAGE | EXACT | SHARES
  //  - payer split: isPayer=true, isSettled=true
  //  - other splits: isPayer=false, isSettled=false
  //  - EQUAL split: amount = ROUND(total / count, 2), remainder to payer
  //  - If accountId linked: create AccountTransaction type=EXPENSE + deduct balance
  //
  // Expense 1: Hotel Booking (GROUP, EQUAL, 4 people — Alice, Bob, Charlie, Amit)
  //   total=4800, per person=1200 (4800/4=1200 exact)
  //   Alice paid → Alice split isSettled=true
  // ============================================================
  const hotelExpense = await prisma.expense.create({
    data: {
      description: "Hotel Booking - Goa",
      amount:      4800,
      currency:    "INR",
      splitType:   "EQUAL",
      expenseType: "GROUP",
      paidById:    alice.id,
      groupId:     goaGroup.id,
      categoryId:  createdCategories["Travel"].id,
      notes:       "Hotel stay for 2 nights at Baga Beach resort",
      expenseDate: new Date("2026-03-15T12:00:00Z"),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: hotelExpense.id, userId:    alice.id,   amount: 1200, isPayer: true,  isSettled: true,  settledAt: new Date("2026-03-15T12:00:00Z") },
      { expenseId: hotelExpense.id, userId:    bob.id,     amount: 1200, isPayer: false, isSettled: false },
      { expenseId: hotelExpense.id, userId:    charlie.id, amount: 1200, isPayer: false, isSettled: false },
      { expenseId: hotelExpense.id, contactId: amit.id,    amount: 1200, isPayer: false, isSettled: false },
    ],
  });

  // AccountTransaction for Alice paying hotel (linked to account)
  await prisma.accountTransaction.create({
    data: {
      userId:          alice.id,
      accountId:       aliceUPI.id,
      type:            "EXPENSE",
      amount:          4800,
      description:     "Hotel Booking - Goa",
      expenseId:       hotelExpense.id,
      categoryId:      createdCategories["Travel"].id,
      transactionDate: new Date("2026-03-15T12:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: aliceUPI.id }, data: { balance: { decrement: 4800 } } });

  // ============================================================
  // Expense 2: Dinner at restaurant (GROUP, EQUAL, 3 people — Alice, Bob, Charlie)
  //   total=2400, per person=800
  //   Bob paid
  // ============================================================
  const dinnerExpense = await prisma.expense.create({
    data: {
      description: "Dinner at Barbeque Nation",
      amount:      2400,
      currency:    "INR",
      splitType:   "EQUAL",
      expenseType: "GROUP",
      paidById:    bob.id,
      groupId:     goaGroup.id,
      categoryId:  createdCategories["Food & Dining"].id,
      expenseDate: new Date("2026-03-15T21:00:00Z"),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: dinnerExpense.id, userId: bob.id,     amount: 800, isPayer: true,  isSettled: true,  settledAt: new Date("2026-03-15T21:00:00Z") },
      { expenseId: dinnerExpense.id, userId: alice.id,   amount: 800, isPayer: false, isSettled: false },
      { expenseId: dinnerExpense.id, userId: charlie.id, amount: 800, isPayer: false, isSettled: false },
    ],
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          bob.id,
      accountId:       bobWallet.id,
      type:            "EXPENSE",
      amount:          2400,
      description:     "Dinner at Barbeque Nation",
      expenseId:       dinnerExpense.id,
      categoryId:      createdCategories["Food & Dining"].id,
      transactionDate: new Date("2026-03-15T21:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: bobWallet.id }, data: { balance: { decrement: 2400 } } });

  // ============================================================
  // Expense 3: Cab to airport (GROUP, PERCENTAGE split)
  //   total=1200, Alice=50% (600), Bob=30% (360), Charlie=20% (240)
  //   Charlie paid
  // ============================================================
  const cabExpense = await prisma.expense.create({
    data: {
      description: "Cab to Airport - Goa departure",
      amount:      1200,
      currency:    "INR",
      splitType:   "PERCENTAGE",
      expenseType: "GROUP",
      paidById:    charlie.id,
      groupId:     goaGroup.id,
      categoryId:  createdCategories["Transportation"].id,
      expenseDate: new Date("2026-03-17T07:00:00Z"),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: cabExpense.id, userId: charlie.id, amount: 240, percentage: 20, isPayer: true,  isSettled: true,  settledAt: new Date("2026-03-17T07:00:00Z") },
      { expenseId: cabExpense.id, userId: alice.id,   amount: 600, percentage: 50, isPayer: false, isSettled: false },
      { expenseId: cabExpense.id, userId: bob.id,     amount: 360, percentage: 30, isPayer: false, isSettled: false },
    ],
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          charlie.id,
      accountId:       charlieBank.id,
      type:            "EXPENSE",
      amount:          1200,
      description:     "Cab to Airport - Goa departure",
      expenseId:       cabExpense.id,
      categoryId:      createdCategories["Transportation"].id,
      transactionDate: new Date("2026-03-17T07:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: charlieBank.id }, data: { balance: { decrement: 1200 } } });

  // ============================================================
  // Expense 4: Flat rent (GROUP, EXACT split)
  //   total=40000, Alice=12000, Bob=10000, Charlie=10000, Diana=8000
  //   Bob paid (he collects rent)
  // ============================================================
  const rentExpense = await prisma.expense.create({
    data: {
      description: "March Rent - Koramangala Flat",
      amount:      40000,
      currency:    "INR",
      splitType:   "EXACT",
      expenseType: "GROUP",
      paidById:    bob.id,
      groupId:     flatGroup.id,
      categoryId:  createdCategories["Rent & Housing"].id,
      expenseDate: new Date("2026-03-01T09:00:00Z"),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: rentExpense.id, userId: bob.id,     amount: 10000, isPayer: true,  isSettled: true,  settledAt: new Date("2026-03-01T09:00:00Z") },
      { expenseId: rentExpense.id, userId: alice.id,   amount: 12000, isPayer: false, isSettled: false },
      { expenseId: rentExpense.id, userId: charlie.id, amount: 10000, isPayer: false, isSettled: false },
      { expenseId: rentExpense.id, userId: diana.id,   amount: 8000,  isPayer: false, isSettled: false },
    ],
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          bob.id,
      accountId:       bobBank.id,
      type:            "EXPENSE",
      amount:          40000,
      description:     "March Rent - Koramangala Flat",
      expenseId:       rentExpense.id,
      categoryId:      createdCategories["Rent & Housing"].id,
      transactionDate: new Date("2026-03-01T09:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: bobBank.id }, data: { balance: { decrement: 40000 } } });

  // ============================================================
  // Expense 5: Grocery shopping (GROUP, SHARES split)
  //   total=3000, Alice=2 shares (1500), Charlie=1 share (750), Diana=1 share (750)
  //   Alice paid (from flat group)
  // ============================================================
  const groceryExpense = await prisma.expense.create({
    data: {
      description: "Monthly grocery run",
      amount:      3000,
      currency:    "INR",
      splitType:   "SHARES",
      expenseType: "GROUP",
      paidById:    alice.id,
      groupId:     flatGroup.id,
      categoryId:  createdCategories["Groceries"].id,
      expenseDate: new Date("2026-03-10T17:00:00Z"),
    },
  });

  // totalShares=4: Alice=2, Charlie=1, Diana=1
  // Alice=ROUND(3000*2/4,2)=1500, Charlie=750, Diana=750
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: groceryExpense.id, userId: alice.id,   amount: 1500, shares: 2, isPayer: true,  isSettled: true,  settledAt: new Date("2026-03-10T17:00:00Z") },
      { expenseId: groceryExpense.id, userId: charlie.id, amount: 750,  shares: 1, isPayer: false, isSettled: false },
      { expenseId: groceryExpense.id, userId: diana.id,   amount: 750,  shares: 1, isPayer: false, isSettled: false },
    ],
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          alice.id,
      accountId:       aliceCash.id,
      type:            "EXPENSE",
      amount:          3000,
      description:     "Monthly grocery run",
      expenseId:       groceryExpense.id,
      categoryId:      createdCategories["Groceries"].id,
      transactionDate: new Date("2026-03-10T17:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: aliceCash.id }, data: { balance: { decrement: 3000 } } });

  // ============================================================
  // Expense 6: PERSONAL expense (Alice buys a course — no split)
  //   Per API docs §6: expenseType=PERSONAL, single participant = payer
  // ============================================================
  const courseExpense = await prisma.expense.create({
    data: {
      description: "Udemy React Native Course",
      amount:      1999,
      currency:    "INR",
      splitType:   "EQUAL",
      expenseType: "PERSONAL",
      paidById:    alice.id,
      categoryId:  createdCategories["Education"].id,
      expenseDate: new Date("2026-03-12T20:00:00Z"),
    },
  });

  await prisma.expenseSplit.create({
    data: { expenseId: courseExpense.id, userId: alice.id, amount: 1999, isPayer: true, isSettled: true, settledAt: new Date("2026-03-12T20:00:00Z") },
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          alice.id,
      accountId:       aliceBank.id,
      type:            "EXPENSE",
      amount:          1999,
      description:     "Udemy React Native Course",
      expenseId:       courseExpense.id,
      categoryId:      createdCategories["Education"].id,
      transactionDate: new Date("2026-03-12T20:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: aliceBank.id }, data: { balance: { decrement: 1999 } } });

  // ============================================================
  // Expense 7: PERSONAL expense (Bob — gym membership)
  // ============================================================
  const gymExpense = await prisma.expense.create({
    data: {
      description: "Gym Membership - March",
      amount:      2500,
      currency:    "INR",
      splitType:   "EQUAL",
      expenseType: "PERSONAL",
      paidById:    bob.id,
      categoryId:  createdCategories["Health & Medical"].id,
      expenseDate: new Date("2026-03-02T08:00:00Z"),
    },
  });

  await prisma.expenseSplit.create({
    data: { expenseId: gymExpense.id, userId: bob.id, amount: 2500, isPayer: true, isSettled: true, settledAt: new Date("2026-03-02T08:00:00Z") },
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          bob.id,
      accountId:       bobBank.id,
      type:            "EXPENSE",
      amount:          2500,
      description:     "Gym Membership - March",
      expenseId:       gymExpense.id,
      categoryId:      createdCategories["Health & Medical"].id,
      transactionDate: new Date("2026-03-02T08:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: bobBank.id }, data: { balance: { decrement: 2500 } } });

  // ============================================================
  // Expense 8: Alice paid electricity bill for flat (PERSONAL for now,
  // used for a bilateral friend split between Alice and Diana)
  // ============================================================
  const electricityExpense = await prisma.expense.create({
    data: {
      description: "Electricity Bill - March",
      amount:      2600,
      currency:    "INR",
      splitType:   "EQUAL",
      expenseType: "PERSONAL",
      paidById:    alice.id,
      categoryId:  createdCategories["Bills & Utilities"].id,
      expenseDate: new Date("2026-03-08T11:00:00Z"),
    },
  });

  // Split between Alice and Diana only (personal bilateral split)
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: electricityExpense.id, userId: alice.id, amount: 1300, isPayer: true,  isSettled: true,  settledAt: new Date("2026-03-08T11:00:00Z") },
      { expenseId: electricityExpense.id, userId: diana.id, amount: 1300, isPayer: false, isSettled: false },
    ],
  });

  await prisma.accountTransaction.create({
    data: {
      userId:          alice.id,
      accountId:       aliceBank.id,
      type:            "EXPENSE",
      amount:          2600,
      description:     "Electricity Bill - March",
      expenseId:       electricityExpense.id,
      categoryId:      createdCategories["Bills & Utilities"].id,
      transactionDate: new Date("2026-03-08T11:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: aliceBank.id }, data: { balance: { decrement: 2600 } } });

  console.log("✅ Expenses and splits created (hotel, dinner, cab, rent, groceries, personal x3)");

  // ============================================================
  // EXPENSE COMMENTS
  // Per API docs §6.7: user must be a participant
  // ============================================================
  await prisma.expenseComment.createMany({
    data: [
      { expenseId: hotelExpense.id,  userId: bob.id,     text: "Great hotel! I'll pay you back soon Alice 🙏" },
      { expenseId: hotelExpense.id,  userId: charlie.id, text: "Paid my share in cash to Alice already" },
      { expenseId: dinnerExpense.id, userId: alice.id,   text: "Amazing food! 🍖" },
      { expenseId: rentExpense.id,   userId: diana.id,   text: "Will pay my share via UPI by end of week" },
      { expenseId: rentExpense.id,   userId: alice.id,   text: "Ok sounds good!" },
    ],
  });
  console.log("✅ Expense comments created");

  // ============================================================
  // SETTLEMENT (CONFIRMED)
  // Per API docs §11: Bob settles ₹800 to Alice for the dinner split.
  // Flow: PENDING → CONFIRMED → splits marked isSettled=true
  // Per schema: SettlementSplit links settlement to the expense splits cleared.
  // AccountTransactions: SETTLEMENT_OUT for Bob, SETTLEMENT_IN for Alice.
  // ============================================================

  // Fetch Bob's unsettled dinner split
  const bobDinnerSplit = await prisma.expenseSplit.findFirst({
    where: { expenseId: dinnerExpense.id, userId: bob.id },
  });

  const settlement1 = await prisma.settlement.create({
    data: {
      fromUserId:     bob.id,
      toUserId:       alice.id,
      amount:         800,
      currency:       "INR",
      status:         "CONFIRMED",
      method:         "UPI",
      utrReference:   "UPI202603200001",
      notes:          "Dinner payment",
      settlementDate: new Date("2026-03-18T10:00:00Z"),
      confirmedAt:    new Date("2026-03-18T10:30:00Z"),
    },
  });

  await prisma.settlementSplit.create({
    data: {
      settlementId:   settlement1.id,
      expenseSplitId: bobDinnerSplit.id,
      amountCleared:  800,
    },
  });

  // Mark the split as settled
  await prisma.expenseSplit.update({
    where: { id: bobDinnerSplit.id },
    data:  { isSettled: true, settledAt: new Date("2026-03-18T10:30:00Z") },
  });

  // Account transactions for the confirmed settlement
  await prisma.accountTransaction.create({
    data: {
      userId:          bob.id,
      accountId:       bobWallet.id,
      type:            "SETTLEMENT_OUT",
      amount:          800,
      description:     "Settlement paid to Alice Johnson",
      settlementId:    settlement1.id,
      transactionDate: new Date("2026-03-18T10:00:00Z"),
    },
  });
  await prisma.account.update({ where: { id: bobWallet.id }, data: { balance: { decrement: 800 } } });

  await prisma.accountTransaction.create({
    data: {
      userId:          alice.id,
      accountId:       aliceUPI.id,
      type:            "SETTLEMENT_IN",
      amount:          800,
      description:     "Settlement received from Bob Smith",
      settlementId:    settlement1.id,
      transactionDate: new Date("2026-03-18T10:30:00Z"),
    },
  });
  await prisma.account.update({ where: { id: aliceUPI.id }, data: { balance: { increment: 800 } } });

  // ============================================================
  // SETTLEMENT (PENDING)
  // Per API docs §11: Charlie initiates payment for hotel split to Alice.
  // Status=PENDING — waiting for Alice to confirm. Splits NOT yet settled.
  // ============================================================
  const charlieHotelSplit = await prisma.expenseSplit.findFirst({
    where: { expenseId: hotelExpense.id, userId: charlie.id },
  });

  const settlement2 = await prisma.settlement.create({
    data: {
      fromUserId:     charlie.id,
      toUserId:       alice.id,
      amount:         1200,
      currency:       "INR",
      status:         "PENDING",
      method:         "BANK_TRANSFER",
      utrReference:   "NEFT202603200042",
      notes:          "Hotel payment",
      settlementDate: new Date("2026-03-20T09:00:00Z"),
    },
  });

  await prisma.settlementSplit.create({
    data: {
      settlementId:   settlement2.id,
      expenseSplitId: charlieHotelSplit.id,
      amountCleared:  1200,
    },
  });

  console.log("✅ Settlements created (1 CONFIRMED, 1 PENDING)");

  // ============================================================
  // BUDGETS
  // Per API docs §12.1: MONTHLY budget, startDate = 1st of month.
  // categoryId=null = overall spending budget.
  // Per schema: BudgetPeriod = WEEKLY | MONTHLY | YEARLY
  // ============================================================
  await prisma.budget.createMany({
    data: [
      {
        userId:     alice.id,
        name:       "Monthly Food Budget",
        amount:     5000,
        periodType: "MONTHLY",
        startDate:  new Date("2026-03-01"),
        currency:   "INR",
        categoryId: createdCategories["Food & Dining"].id,
        alertAt50:  true,
        alertAt80:  true,
        alertAt100: true,
        isActive:   true,
      },
      {
        userId:     alice.id,
        name:       "March Overall Spending",
        amount:     50000,
        periodType: "MONTHLY",
        startDate:  new Date("2026-03-01"),
        currency:   "INR",
        categoryId: null,         // overall budget
        alertAt50:  true,
        alertAt80:  true,
        alertAt100: true,
        isActive:   true,
      },
      {
        userId:     bob.id,
        name:       "Monthly Transport Budget",
        amount:     3000,
        periodType: "MONTHLY",
        startDate:  new Date("2026-03-01"),
        currency:   "INR",
        categoryId: createdCategories["Transportation"].id,
        alertAt50:  false,
        alertAt80:  true,
        alertAt100: true,
        isActive:   true,
      },
      {
        userId:     charlie.id,
        name:       "Travel Fund",
        amount:     20000,
        periodType: "YEARLY",
        startDate:  new Date("2026-01-01"),
        currency:   "INR",
        categoryId: createdCategories["Travel"].id,
        alertAt50:  true,
        alertAt80:  true,
        alertAt100: true,
        isActive:   true,
      },
    ],
  });
  console.log("✅ Budgets created");

  // ============================================================
  // INVITES
  // Per API docs §13: invite non-app users to join.
  // status=PENDING, expiresAt = now + 7 days
  // ============================================================
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.invite.createMany({
    data: [
      {
        email:        "rahul@example.com",
        invitedById:  alice.id,
        status:       "PENDING",
        expiresAt:    sevenDaysFromNow,
      },
      {
        phone:        "+917777777777",
        invitedById:  bob.id,
        status:       "PENDING",
        expiresAt:    sevenDaysFromNow,
      },
    ],
  });
  console.log("✅ Invites created");

  // ============================================================
  // NOTIFICATIONS
  // Per API docs §14 & schema: NotificationType enum covers all event types.
  // entityType / entityId enable deep-linking in app.
  // ============================================================
  await prisma.notification.createMany({
    data: [
      // Bob gets notified: Alice added hotel expense
      {
        userId:     bob.id,
        senderId:   alice.id,
        type:       "SPLIT_ASSIGNED",
        title:      "New expense added",
        message:    "Alice added \"Hotel Booking - Goa\" ₹1200 with you",
        entityType: "expense",
        entityId:   hotelExpense.id,
        metadata:   { amount: 1200, currency: "INR" },
        isRead:     false,
      },
      // Charlie gets notified: Alice added hotel expense
      {
        userId:     charlie.id,
        senderId:   alice.id,
        type:       "SPLIT_ASSIGNED",
        title:      "New expense added",
        message:    "Alice added \"Hotel Booking - Goa\" ₹1200 with you",
        entityType: "expense",
        entityId:   hotelExpense.id,
        metadata:   { amount: 1200, currency: "INR" },
        isRead:     true,
      },
      // Alice gets notified: Bob added dinner expense
      {
        userId:     alice.id,
        senderId:   bob.id,
        type:       "SPLIT_ASSIGNED",
        title:      "New expense added",
        message:    "Bob added \"Dinner at Barbeque Nation\" ₹800 with you",
        entityType: "expense",
        entityId:   dinnerExpense.id,
        metadata:   { amount: 800, currency: "INR" },
        isRead:     true,
      },
      // Alice: Bob confirmed settlement
      {
        userId:     alice.id,
        senderId:   bob.id,
        type:       "SETTLEMENT_CONFIRMED",
        title:      "Payment confirmed",
        message:    "Bob confirmed your payment of ₹800",
        entityType: "settlement",
        entityId:   settlement1.id,
        metadata:   { amount: 800, currency: "INR", method: "UPI" },
        isRead:     false,
      },
      // Alice: Charlie sent settlement (PENDING — needs confirmation)
      {
        userId:     alice.id,
        senderId:   charlie.id,
        type:       "SETTLEMENT_RECEIVED",
        title:      "Payment received",
        message:    "Charlie has sent ₹1200 — please confirm receipt",
        entityType: "settlement",
        entityId:   settlement2.id,
        metadata:   { amount: 1200, currency: "INR", method: "BANK_TRANSFER" },
        isRead:     false,
      },
      // Bob: pending friend request from Diana
      {
        userId:     bob.id,
        senderId:   diana.id,
        type:       "FRIEND_REQUEST",
        title:      "Friend request",
        message:    "Diana Prince sent you a friend request",
        entityType: "friend",
        entityId:   diana.id,
        isRead:     false,
      },
      // Diana: added to flat group
      {
        userId:     diana.id,
        senderId:   bob.id,
        type:       "GROUP_INVITE",
        title:      "Added to group",
        message:    "Bob added you to \"Koramangala Flat\"",
        entityType: "group",
        entityId:   flatGroup.id,
        isRead:     true,
      },
      // Alice: 80% budget alert for food
      {
        userId:     alice.id,
        senderId:   null,
        type:       "BUDGET_ALERT_80",
        title:      "Budget Alert",
        message:    "You've used 80% of your Monthly Food Budget (₹4000 of ₹5000)",
        entityType: "budget",
        metadata:   { percentUsed: 80, budgetName: "Monthly Food Budget" },
        isRead:     false,
      },
    ],
  });
  console.log("✅ Notifications created");

  // ============================================================
  // SEED SUMMARY
  // ============================================================
  console.log("\n🎉 Seed completed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 TEST ACCOUNTS (all passwords: Test@123)");
  console.log("   alice@gmail.com   — Alice Johnson  (admin of Goa Trip)");
  console.log("   bob@gmail.com     — Bob Smith      (admin of Koramangala Flat)");
  console.log("   charlie@gmail.com — Charlie Brown");
  console.log("   diana@gmail.com   — Diana Prince   (has pending friend request from Bob)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 WHAT'S SEEDED");
  console.log("   15 system categories + 1 custom (Alice)");
  console.log("   4 users, 2 contacts (Amit, Priya)");
  console.log("   9 accounts across 4 users");
  console.log("   2 groups: Goa Weekend Trip, Koramangala Flat");
  console.log("   8 expenses (hotel, dinner, cab, rent, groceries, 2 personal, electricity)");
  console.log("   Split types covered: EQUAL, PERCENTAGE, EXACT, SHARES");
  console.log("   1 CONFIRMED settlement (Bob → Alice ₹800)");
  console.log("   1 PENDING settlement  (Charlie → Alice ₹1200)");
  console.log("   4 budgets (monthly food, overall, transport, yearly travel)");
  console.log("   2 pending invites");
  console.log("   8 notifications (various types)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💰 OUTSTANDING BALANCES (unsettled)");
  console.log("   Bob owes Alice: ₹1200 (hotel) + ₹600 (cab) - ₹800 (settled dinner) = net owes");
  console.log("   Charlie owes Alice: ₹1200 (hotel) — PENDING settlement sent");
  console.log("   Charlie owes Bob: ₹800 (dinner)");
  console.log("   Diana owes Alice: ₹1300 (electricity)");
  console.log("   Alice owes Charlie: ₹600 (cab)");
  console.log("   Alice owes Bob: ₹12000 (rent)");
  console.log("   Charlie owes Bob: ₹10000 (rent)");
  console.log("   Diana owes Bob: ₹8000 (rent)");
  console.log("   Alice owes Bob: ₹800 (dinner — already settled via settlement1)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });