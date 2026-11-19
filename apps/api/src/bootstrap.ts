import bcrypt from 'bcryptjs';
import prisma from './db/prisma';
import { ensureDefaultSettings } from './services/setting.service';

const INITIAL_ADMIN_EMAIL = 'admin@nsuk.edu.ng';
const INITIAL_ADMIN_MEMBERSHIP = 'NSUK-ADM-001';

const categories = [
  { name: 'Computer Science', description: 'Algorithms, Software Engineering, Networks, AI' },
  { name: 'Software Engineering', description: 'System Design, Architecture, DevOps, Clean Code' },
  { name: 'Mathematics & Statistics', description: 'Calculus, Linear Algebra, Probability, Numerical Analysis' },
  { name: 'Natural Sciences', description: 'Physics, Chemistry, Biochemistry, Biology' },
  { name: 'Engineering & Technology', description: 'Electrical, Computer and Mechanical Engineering' },
  { name: 'Law & Jurisprudence', description: 'Constitutional Law, Nigerian Legal System, Commercial Law' },
  { name: 'Social & Management Sciences', description: 'Economics, Accounting, Business Administration' },
  { name: 'General Academic Studies', description: 'GST Courses, Use of English, African History & Philosophy' },
];

const catalogueBooks = [
  { title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '9780385474542', category: 'Fiction', publisher: 'Anchor Books', year: 1994 },
  { title: 'Half of a Yellow Sun', author: 'Chimamanda Ngozi Adichie', isbn: '9781400095209', category: 'Historical Fiction', publisher: 'Anchor Books', year: 2007 },
  { title: 'Purple Hibiscus', author: 'Chimamanda Ngozi Adichie', isbn: '9781616202415', category: 'Fiction', publisher: 'Algonquin Books', year: 2012 },
  { title: 'The Alchemist', author: 'Paulo Coelho', isbn: '9780061122415', category: 'Fiction', publisher: 'HarperOne', year: 2006 },
  { title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', isbn: '9781612681139', category: 'Finance', publisher: 'Plata Publishing', year: 2017 },
  { title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292', category: 'Self-Help', publisher: 'Avery', year: 2018 },
  { title: 'Think and Grow Rich', author: 'Napoleon Hill', isbn: '9781585424337', category: 'Personal Development', publisher: 'TarcherPerigee', year: 2005 },
  { title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', isbn: '9781982137274', category: 'Self-Help', publisher: 'Simon & Schuster', year: 2020 },
  { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', category: 'Computer Science', publisher: 'Prentice Hall', year: 2008 },
  { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen et al.', isbn: '9780262046305', category: 'Computer Science', publisher: 'MIT Press', year: 2022 },
  { title: 'Computer Networking: A Top-Down Approach', author: 'James F. Kurose, Keith W. Ross', isbn: '9780136681557', category: 'Networking', publisher: 'Pearson', year: 2021 },
  { title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell, Peter Norvig', isbn: '9780134610993', category: 'Artificial Intelligence', publisher: 'Pearson', year: 2021 },
  { title: 'The Pragmatic Programmer', author: 'David Thomas, Andrew Hunt', isbn: '9780135957059', category: 'Software Engineering', publisher: 'Addison-Wesley', year: 2019 },
  { title: 'Database System Concepts', author: 'Abraham Silberschatz et al.', isbn: '9780078022159', category: 'Database Management', publisher: 'McGraw-Hill', year: 2019 },
  { title: 'Operating System Concepts', author: 'Abraham Silberschatz et al.', isbn: '9781119800361', category: 'Operating Systems', publisher: 'Wiley', year: 2021 },
  { title: 'The Origin of Species', author: 'Charles Darwin', isbn: '9781509827695', category: 'Science', publisher: "Macmillan Collector's Library", year: 2016 },
  { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', category: 'Science', publisher: 'Bantam', year: 1998 },
  { title: 'Start With Why', author: 'Simon Sinek', isbn: '9781591846444', category: 'Business', publisher: 'Portfolio', year: 2009 },
];

async function bootstrap() {
  await ensureDefaultSettings();

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  for (const book of catalogueBooks) {
    await prisma.book.upsert({
      where: { isbn: book.isbn },
      update: {},
      create: {
        title: book.title,
        isbn: book.isbn,
        description: `Catalogue record for ${book.title} by ${book.author}.`,
        publicationYear: book.year,
        publisher: {
          connectOrCreate: {
            where: { name: book.publisher },
            create: { name: book.publisher },
          },
        },
        authors: {
          create: {
            author: {
              connectOrCreate: {
                where: { name: book.author },
                create: { name: book.author },
              },
            },
          },
        },
        categories: {
          create: {
            category: {
              connectOrCreate: {
                where: { name: book.category },
                create: { name: book.category },
              },
            },
          },
        },
      },
    });
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (existingAdmin) {
    console.log('LIBNEXA bootstrap complete; existing administrator and data were preserved.');
    return;
  }

  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!initialPassword) {
    console.warn('INITIAL_ADMIN_PASSWORD is not set; initial administrator creation is deferred.');
    return;
  }

  const emailConflict = await prisma.user.findUnique({ where: { email: INITIAL_ADMIN_EMAIL } });
  if (emailConflict) {
    throw new Error(`${INITIAL_ADMIN_EMAIL} is already assigned to a non-administrator account.`);
  }

  const membershipConflict = await prisma.user.findUnique({
    where: { membershipNumber: INITIAL_ADMIN_MEMBERSHIP },
  });
  if (membershipConflict) {
    throw new Error(`${INITIAL_ADMIN_MEMBERSHIP} is already assigned to another account.`);
  }

  const passwordHash = await bcrypt.hash(initialPassword, 10);
  await prisma.user.create({
    data: {
      fullName: 'System Administrator',
      email: INITIAL_ADMIN_EMAIL,
      passwordHash,
      membershipNumber: INITIAL_ADMIN_MEMBERSHIP,
      department: 'University Library Management',
      faculty: 'University Administration',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      notificationPref: {
        create: { emailEnabled: true, pushEnabled: true, reminderEnabled: true },
      },
    },
  });

  console.log(`LIBNEXA bootstrap created the initial administrator: ${INITIAL_ADMIN_EMAIL}.`);
}

bootstrap()
  .catch((error) => {
    console.error('[BOOTSTRAP ERROR]', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
