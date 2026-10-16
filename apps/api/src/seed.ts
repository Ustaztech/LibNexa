import bcrypt from 'bcryptjs';
import prisma from './db/prisma';
import { ensureDefaultSettings } from './services/setting.service';

/**
 * LIBNEXA NSUK - Clean Database Seeder
 * Builds official System Administrator credentials, initializes settings,
 * configures academic categories & publishers, and cleans out all mock transactions.
 */
async function seed() {
  console.log('=======================================================');
  console.log(' INITIALIZING LIBNEXA PRODUCTION SEED (CLEAN STATE)');
  console.log('=======================================================');

  // 1. Initialize system library policies & settings
  await ensureDefaultSettings();
  console.log('[1/5] System circulation policies & fine rates verified.');

  // 2. Remove all mock transactions, notifications, and demo records
  console.log('[2/5] Purging mock transactions and demo data...');
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.renewal.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.borrowingRequest.deleteMany({});

  // Remove all demo, mock, and test user accounts (retaining only administrators)
  await prisma.notificationPreference.deleteMany({
    where: {
      user: {
        role: { not: 'ADMIN' },
      },
    },
  });
  await prisma.pushDevice.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      role: { not: 'ADMIN' },
    },
  });

  // 3. Build Official System Administrator Account
  console.log('[3/5] Building official System Administrator account...');
  const adminPasswordHash = await bcrypt.hash('Admin@NSUK2026!', 10);

  // Clear any existing unique membershipNumber conflicts prior to upsert
  await prisma.user.updateMany({
    where: {
      membershipNumber: { in: ['NSUK-ADM-001', 'NSUK-ADM-002'] },
    },
    data: { membershipNumber: null },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nsuk.edu.ng' },
    update: {
      fullName: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      membershipNumber: 'NSUK-ADM-001',
      department: 'University Library Management',
      faculty: 'University Administration',
      phone: '+234 803 000 0001',
      mustChangePassword: false,
    },
    create: {
      fullName: 'System Administrator',
      email: 'admin@nsuk.edu.ng',
      passwordHash: adminPasswordHash,
      membershipNumber: 'NSUK-ADM-001',
      department: 'University Library Management',
      faculty: 'University Administration',
      phone: '+234 803 000 0001',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      mustChangePassword: false,
      notificationPref: {
        create: { emailEnabled: true, pushEnabled: true, reminderEnabled: true },
      },
    },
  });

  // Also support the institutional alias admin@libnexa.nsuk.edu.ng with same credentials
  await prisma.user.upsert({
    where: { email: 'admin@libnexa.nsuk.edu.ng' },
    update: {
      fullName: 'System Administrator',
      passwordHash: adminPasswordHash,
      membershipNumber: 'NSUK-ADM-002',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    },
    create: {
      fullName: 'System Administrator',
      email: 'admin@libnexa.nsuk.edu.ng',
      passwordHash: adminPasswordHash,
      membershipNumber: 'NSUK-ADM-002',
      department: 'University Library Management',
      faculty: 'University Administration',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  // 4. Seed Academic Categories & Publishers
  console.log('[4/5] Verifying academic subjects and publishers...');
  const categoryNames = [
    { name: 'Computer Science', description: 'Algorithms, Software Engineering, Networks, AI' },
    { name: 'Software Engineering', description: 'System Design, Architecture, DevOps, Clean Code' },
    { name: 'Mathematics & Statistics', description: 'Calculus, Linear Algebra, Probability, Numerical Analysis' },
    { name: 'Natural Sciences', description: 'Physics, Chemistry, Biochemistry, Biology' },
    { name: 'Engineering & Technology', description: 'Electrical, Computer and Mechanical Engineering' },
    { name: 'Law & Jurisprudence', description: 'Constitutional Law, Nigerian Legal System, Commercial Law' },
    { name: 'Social & Management Sciences', description: 'Economics, Accounting, Business Administration' },
    { name: 'General Academic Studies', description: 'GST Courses, Use of English, African History & Philosophy' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoryNames) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: cat,
    });
    categoryMap.set(c.name, c.id);
  }

  const publisherNames = [
    'MIT Press',
    'Pearson Education',
    'O\'Reilly Media',
    'Oxford University Press',
    'University of Ibadan Press',
    'Addison-Wesley',
    'Cambridge University Press',
    'Heinemann Educational Books (Nigeria)',
  ];

  const pubMap = new Map<string, string>();
  for (const name of publisherNames) {
    const p = await prisma.publisher.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    pubMap.set(p.name, p.id);
  }

  // 5. Seed Core Academic Catalog (All Copies 100% Available on Shelf)
  console.log('[5/5] Initializing catalog with all copies available on shelf...');
  const coreBooks = [
    {
      title: 'Introduction to Algorithms (CLRS)',
      isbn: '978-0262033848',
      description: 'The definitive foundation on modern computer algorithms, data structures, and computational complexity. Comprehensive coverage of dynamic programming, graph algorithms, and greedy methods for university students.',
      publisher: 'MIT Press',
      publicationYear: 2022,
      edition: '4th Edition',
      language: 'English',
      coverImageUrl: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=600&q=80',
      authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
      categories: ['Computer Science', 'Software Engineering'],
      copies: [
        { accession: 'NSUK-LIB-CS-001', shelf: 'Stack A - Shelf 1' },
        { accession: 'NSUK-LIB-CS-002', shelf: 'Stack A - Shelf 1' },
        { accession: 'NSUK-LIB-CS-003', shelf: 'Stack A - Shelf 1' },
      ],
    },
    {
      title: 'Database System Concepts',
      isbn: '978-0078022159',
      description: 'Comprehensive fundamental textbook on database systems, relational algebra, SQL standardisation, concurrency control, transaction recovery, and distributed database architecture.',
      publisher: 'Pearson Education',
      publicationYear: 2020,
      edition: '7th Edition',
      language: 'English',
      coverImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80',
      authors: ['Abraham Silberschatz', 'Henry F. Korth', 'S. Sudarshan'],
      categories: ['Computer Science'],
      copies: [
        { accession: 'NSUK-LIB-CS-004', shelf: 'Stack A - Shelf 2' },
        { accession: 'NSUK-LIB-CS-005', shelf: 'Stack A - Shelf 2' },
      ],
    },
    {
      title: 'Clean Architecture: A Craftsman\'s Guide to Software Structure',
      isbn: '978-0134494166',
      description: 'Universal rules of software architecture. Essential reading for software engineering students exploring SOLID principles, component design, dependency inversion, and scalable decoupled systems.',
      publisher: 'Addison-Wesley',
      publicationYear: 2018,
      edition: '1st Edition',
      language: 'English',
      coverImageUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=600&q=80',
      authors: ['Robert C. Martin'],
      categories: ['Software Engineering', 'Computer Science'],
      copies: [
        { accession: 'NSUK-LIB-SE-001', shelf: 'Stack B - Shelf 1' },
        { accession: 'NSUK-LIB-SE-002', shelf: 'Stack B - Shelf 1' },
      ],
    },
    {
      title: 'Advanced Engineering Mathematics',
      isbn: '978-0470458365',
      description: 'Core mathematics textbook for engineering and physical sciences at NSUK. Covers ordinary differential equations, linear algebra, vector calculus, Fourier analysis, and complex variables.',
      publisher: 'Oxford University Press',
      publicationYear: 2021,
      edition: '10th Edition',
      language: 'English',
      coverImageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80',
      authors: ['Erwin Kreyszig'],
      categories: ['Mathematics & Statistics', 'Engineering & Technology'],
      copies: [
        { accession: 'NSUK-LIB-MTH-001', shelf: 'Stack C - Shelf 3' },
        { accession: 'NSUK-LIB-MTH-002', shelf: 'Stack C - Shelf 3' },
      ],
    },
    {
      title: 'The Nigerian Legal System: Texts and Cases',
      isbn: '978-9781564024',
      description: 'An authoritative overview of Nigerian legal traditions, sources of Nigerian law, customary law, judicial precedent, constitutional developments, and court hierarchies.',
      publisher: 'Heinemann Educational Books (Nigeria)',
      publicationYear: 2019,
      edition: '3rd Edition',
      language: 'English',
      coverImageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80',
      authors: ['Prof. Akintunde Olusegun', 'Dr. Amina Bello'],
      categories: ['Law & Jurisprudence'],
      copies: [
        { accession: 'NSUK-LIB-LAW-001', shelf: 'Stack D - Law Library Row 2' },
      ],
    },
    {
      title: 'University Physics with Modern Physics',
      isbn: '978-0135159552',
      description: 'Comprehensive classical mechanics, thermodynamics, electromagnetism, optics, and introductory quantum mechanics tailored for undergraduate physical science students.',
      publisher: 'Pearson Education',
      publicationYear: 2020,
      edition: '15th Edition',
      language: 'English',
      coverImageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&q=80',
      authors: ['Hugh D. Young', 'Roger A. Freedman'],
      categories: ['Natural Sciences', 'Engineering & Technology'],
      copies: [
        { accession: 'NSUK-LIB-PHY-001', shelf: 'Stack E - Shelf 1' },
        { accession: 'NSUK-LIB-PHY-002', shelf: 'Stack E - Shelf 1' },
      ],
    },
    {
      title: 'Artificial Intelligence: A Modern Approach',
      isbn: '978-0134610993',
      description: 'The standard leading worldwide introduction to artificial intelligence. Covers autonomous search agents, knowledge representation, Bayesian reasoning, deep learning, and ethical AI systems.',
      publisher: 'Pearson Education',
      publicationYear: 2021,
      edition: '4th Edition',
      language: 'English',
      coverImageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80',
      authors: ['Stuart Russell', 'Peter Norvig'],
      categories: ['Computer Science'],
      copies: [
        { accession: 'NSUK-LIB-AI-001', shelf: 'Stack A - Shelf 4' },
      ],
    },
    {
      title: 'Principles of Economics for African Universities',
      isbn: '978-9781219986',
      description: 'Rigorous microeconomics and macroeconomics textbook contextualized with African macroeconomic indicators, central banking monetary policies, fiscal planning, and developing market dynamics.',
      publisher: 'University of Ibadan Press',
      publicationYear: 2020,
      edition: '2nd Edition',
      language: 'English',
      coverImageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80',
      authors: ['Prof. Oluwafemi Olabisi', 'Dr. Ngozi Okon'],
      categories: ['Social & Management Sciences'],
      copies: [
        { accession: 'NSUK-LIB-ECN-001', shelf: 'Stack F - Shelf 2' },
        { accession: 'NSUK-LIB-ECN-002', shelf: 'Stack F - Shelf 2' },
      ],
    },
  ];

  for (const b of coreBooks) {
    const publisherId = pubMap.get(b.publisher);

    const book = await prisma.book.upsert({
      where: { isbn: b.isbn },
      update: {
        title: b.title,
        description: b.description,
        coverImageUrl: b.coverImageUrl,
        publicationYear: b.publicationYear,
        edition: b.edition,
      },
      create: {
        title: b.title,
        isbn: b.isbn,
        description: b.description,
        publisherId,
        publicationYear: b.publicationYear,
        edition: b.edition,
        language: b.language,
        coverImageUrl: b.coverImageUrl,
      },
    });

    // Authors
    for (const authorName of b.authors) {
      const author = await prisma.author.upsert({
        where: { name: authorName },
        update: {},
        create: { name: authorName },
      });
      await prisma.bookAuthor.upsert({
        where: { bookId_authorId: { bookId: book.id, authorId: author.id } },
        update: {},
        create: { bookId: book.id, authorId: author.id },
      });
    }

    // Categories
    for (const catName of b.categories) {
      const categoryId = categoryMap.get(catName);
      if (categoryId) {
        await prisma.bookCategory.upsert({
          where: { bookId_categoryId: { bookId: book.id, categoryId } },
          update: {},
          create: { bookId: book.id, categoryId },
        });
      }
    }

    // Physical copies - all reset to AVAILABLE
    for (const c of b.copies) {
      await prisma.bookCopy.upsert({
        where: { accessionNumber: c.accession },
        update: {
          shelfLocation: c.shelf,
          condition: 'GOOD',
          status: 'AVAILABLE',
        },
        create: {
          bookId: book.id,
          accessionNumber: c.accession,
          barcode: `BC-${c.accession.replace(/-/g, '')}`,
          shelfLocation: c.shelf,
          condition: 'GOOD',
          status: 'AVAILABLE',
          acquisitionDate: new Date(),
        },
      });
    }
  }

  // Reset any other physical copies to AVAILABLE
  await prisma.bookCopy.updateMany({
    data: { status: 'AVAILABLE' },
  });

  // Log clean system initialization audit
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SYSTEM_INITIALIZED_CLEAN',
      entityType: 'System',
      newValues: JSON.stringify({
        status: 'CLEAN_PRODUCTION_READY',
        adminEmail: 'admin@nsuk.edu.ng',
        timestamp: new Date().toISOString(),
      }),
    },
  });

  console.log('=======================================================');
  console.log(' DATABASE SEEDED IN CLEAN STATE SUCCESSFULLY!');
  console.log(' OFFICIAL ADMINISTRATOR CREDENTIALS:');
  console.log('   Email:     admin@nsuk.edu.ng');
  console.log('   Password:  Admin@NSUK2026!');
  console.log('   Role:      ADMIN (Full Privileges)');
  console.log('   Status:    ACTIVE');
  console.log('=======================================================');
}

seed()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
