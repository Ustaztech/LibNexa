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

async function bootstrap() {
  await ensureDefaultSettings();

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
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
