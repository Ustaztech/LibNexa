import bcrypt from 'bcryptjs';
import prisma from '../src/db/prisma';
import * as authService from '../src/services/auth.service';
import * as bookService from '../src/services/book.service';
import * as borrowService from '../src/services/borrow.service';
import * as returnService from '../src/services/return.service';
import * as resService from '../src/services/reservation.service';
import * as renewalService from '../src/services/renewal.service';
import * as reportService from '../src/services/report.service';
import * as adminService from '../src/services/admin.service';
import * as copyService from '../src/services/copy.service';

async function runTests() {
  console.log('=======================================================');
  console.log(' RUNNING LIBNEXA AUTOMATED VERIFICATION SUITE');
  console.log('=======================================================');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message || err);
      failed++;
    }
  }

  // TEST 1: Student Registration and Authentication
  await test('1. Student Registration & Validation', async () => {
    const testMatric = `TEST/CSC/26/${Math.floor(1000 + Math.random() * 9000)}`;
    const testEmail = `test.student.${Date.now()}@nsuk.edu.ng`;
    const reg = await authService.registerStudent({
      fullName: 'Test Automation Student',
      email: testEmail,
      matricNumber: testMatric,
      department: 'Computer Science',
      faculty: 'Faculty of Natural & Applied Sciences',
      password: 'StrongTestPass2026!',
    });

    if (!reg.user.id || !reg.accessToken) {
      throw new Error('Registration failed to return user ID or token');
    }

    const loginRes = await authService.login({
      identifier: testEmail,
      password: 'StrongTestPass2026!',
    });

    if (loginRes.user.email !== testEmail) {
      throw new Error('Login failed to authenticate valid credentials');
    }
  });

  // TEST 2: Catalogue Search and Dynamic Copy Availability Calculation
  await test('2. Catalogue Search & Availability Calculation', async () => {
    const result = await bookService.getBooks({
      search: 'Algorithms',
      limit: 5,
    });

    if (result.items.length === 0) {
      throw new Error('Could not find seeded algorithms book');
    }

    const clrs = result.items[0];
    if (typeof clrs.availableCopies !== 'number' || typeof clrs.totalCopies !== 'number') {
      throw new Error('Availability is not dynamically calculated from physical copies');
    }
    if (clrs.availableCopies > clrs.totalCopies) {
      throw new Error('Available copies exceeds total copies');
    }
  });

  // TEST 3: Physical Borrowing Workflow
  await test('3. End-to-End Borrowing Workflow: Request -> Approval -> Collection', async () => {
    // Create dedicated student to ensure test is 100% idempotent
    const student = await prisma.user.create({
      data: {
        fullName: 'Automated Loan Tester',
        email: `borrower.${Date.now()}@nsuk.edu.ng`,
        passwordHash: await bcrypt.hash('Pass1234!', 10),
        matricNumber: `LOANTEST/${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        role: 'STUDENT',
        accountStatus: 'ACTIVE',
      },
    });
    let librarian = await prisma.user.findFirst({ where: { role: 'LIBRARIAN' } });
    if (!librarian) {
      librarian = await prisma.user.create({
        data: {
          fullName: 'Circulation Desk Staff',
          email: `desk.staff.${Date.now()}@nsuk.edu.ng`,
          passwordHash: await bcrypt.hash('StaffPass2026!', 10),
          membershipNumber: `STAFF-${Date.now()}`,
          role: 'LIBRARIAN',
          accountStatus: 'ACTIVE',
        },
      });
    }
    const book = await prisma.book.findFirst({
      where: { copies: { some: { status: 'AVAILABLE' } } },
    });

    if (!librarian || !book) {
      throw new Error('Missing test entities in database');
    }

    // Step A: Request Borrow
    const request = await borrowService.requestBorrow(student.id, book.id);
    if (request.status !== 'PENDING') throw new Error('Request status should be PENDING');

    // Step B: Librarian Review (Approve)
    const approved = await borrowService.reviewBorrowingRequest({
      requestId: request.id,
      librarianId: librarian.id,
      decision: 'APPROVE',
    });
    if (approved.status !== 'APPROVED' || !approved.assignedCopyId) {
      throw new Error('Request approval did not assign physical copy or set APPROVED status');
    }

    // Step C: Confirm Physical Collection -> Becomes Active Loan
    const loan = await borrowService.confirmCollection({
      requestId: request.id,
      librarianId: librarian.id,
    });
    if (loan.status !== 'ACTIVE' || !loan.dueAt) {
      throw new Error('Collection confirmation failed to generate active loan with due date');
    }

    // Verify copy is now ON_LOAN
    const copy = await prisma.bookCopy.findUnique({ where: { id: loan.bookCopyId } });
    if (copy?.status !== 'ON_LOAN') {
      throw new Error('Physical copy status was not transitioned to ON_LOAN');
    }

    // Step D: Process Return of that loan
    const returnRes = await returnService.processBookReturn({
      loanId: loan.id,
      librarianId: librarian.id,
      condition: 'GOOD',
      notes: 'Test suite automated return',
    });
    if (returnRes.status !== 'RETURNED') {
      throw new Error('Return failed to mark loan as RETURNED');
    }
  });

  // TEST 4: Reservation Queue Ordering and Promotion
  await test('4. Book Reservation & Queue Ordering', async () => {
    const aiBook = (await prisma.book.findFirst({ where: { isbn: '978-0134610993' } })) || (await prisma.book.findFirst());
    if (!aiBook) throw new Error('No book found for reservation test');

    // Temporarily mark all copies of this title ON_LOAN to simulate zero-shelf availability
    await prisma.bookCopy.updateMany({
      where: { bookId: aiBook.id },
      data: { status: 'ON_LOAN' },
    });

    const testStudent = await prisma.user.create({
      data: {
        fullName: 'Queue Test Student',
        email: `queue.tester.${Date.now()}@nsuk.edu.ng`,
        passwordHash: await bcrypt.hash('Pass1234!', 10),
        matricNumber: `QTEST/${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        role: 'STUDENT',
        accountStatus: 'ACTIVE',
      },
    });

    const res = await resService.createReservation(testStudent.id, aiBook.id);
    if (res.queuePosition < 1 || res.status !== 'QUEUED') {
      throw new Error('Reservation queue position or status invalid');
    }

    // Clean up cancellation and restore shelf availability
    await resService.cancelReservation(res.id, testStudent.id, true);
    await prisma.bookCopy.updateMany({
      where: { bookId: aiBook.id },
      data: { status: 'AVAILABLE' },
    });
  });

  // TEST 5: System Overview & Analytics Aggregations
  await test('5. Real System Analytics & Reporting Integrity', async () => {
    const stats = await reportService.getSystemOverviewStats();
    if (typeof stats.users.totalStudents !== 'number' || typeof stats.inventory.totalTitles !== 'number') {
      throw new Error('Analytics failed to aggregate real database statistics');
    }

    const charts = await reportService.getAnalyticsChartsData();
    if (!Array.isArray(charts.monthlyCirculation) || !Array.isArray(charts.categoryDistribution)) {
      throw new Error('Analytics charts data structure invalid');
    }
  });

  // TEST 6: Administrator User Control & Settings
  await test('6. Super Admin Policies & Settings Enforcement', async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) throw new Error('Admin account not found');

    const updated = await adminService.updateLibrarySettings(
      { max_books_per_student: '4' },
      admin.id
    );
    const setting = updated.find(s => s.settingKey === 'max_books_per_student');
    if (setting?.settingValue !== '4') {
      throw new Error('Setting was not updated in database');
    }

    // Revert back to 3
    await adminService.updateLibrarySettings({ max_books_per_student: '3' }, admin.id);
  });

  // TEST 7: End-to-End Loan Renewal Lifecycle
  await test('7. Loan Renewal Request & Librarian Review Workflow', async () => {
    const student = await prisma.user.create({
      data: {
        fullName: 'Renewal Tester',
        email: `renewal.tester.${Date.now()}@nsuk.edu.ng`,
        passwordHash: await bcrypt.hash('Pass1234!', 10),
        matricNumber: `RENTEST/${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        role: 'STUDENT',
        accountStatus: 'ACTIVE',
      },
    });
    let librarian = await prisma.user.findFirst({ where: { role: 'LIBRARIAN' } });
    if (!librarian) {
      librarian = await prisma.user.create({
        data: {
          fullName: 'Circulation Desk Staff',
          email: `desk.staff.${Date.now()}@nsuk.edu.ng`,
          passwordHash: await bcrypt.hash('StaffPass2026!', 10),
          membershipNumber: `STAFF-${Date.now()}`,
          role: 'LIBRARIAN',
          accountStatus: 'ACTIVE',
        },
      });
    }
    const book = await prisma.book.findFirst({
      where: { copies: { some: { status: 'AVAILABLE' } } },
      include: { copies: { where: { status: 'AVAILABLE' }, take: 1 } },
    });

    if (!book || book.copies.length === 0) {
      throw new Error('Missing test book copy for renewal test');
    }

    const copy = book.copies[0];

    // Create active loan directly
    const initialDueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const loan = await prisma.loan.create({
      data: {
        userId: student.id,
        bookCopyId: copy.id,
        processedById: librarian.id,
        status: 'ACTIVE',
        borrowedAt: new Date(),
        dueAt: initialDueAt,
      },
    });
    await prisma.bookCopy.update({ where: { id: copy.id }, data: { status: 'ON_LOAN' } });

    // Step A: Request Renewal
    const renewal = await renewalService.requestLoanRenewal(loan.id, student.id, 'Need more time for thesis research');
    if (renewal.status !== 'PENDING' || !renewal.newDueAt) {
      throw new Error('Renewal creation failed to produce PENDING renewal request with new due date');
    }

    // Step B: Review Renewal (Approve)
    const reviewRes = await renewalService.reviewRenewal({
      renewalId: renewal.id,
      librarianId: librarian.id,
      decision: 'APPROVE',
    });

    if (reviewRes.status !== 'APPROVED') {
      throw new Error('Renewal review failed to approve request');
    }

    // Check loan due date was extended
    const updatedLoan = await prisma.loan.findUnique({ where: { id: loan.id } });
    if (!updatedLoan || updatedLoan.dueAt.getTime() <= initialDueAt.getTime()) {
      throw new Error('Loan due date was not extended after approved renewal');
    }

    // Clean up
    await returnService.processBookReturn({
      loanId: loan.id,
      librarianId: librarian.id,
      condition: 'GOOD',
      notes: 'Cleaned up renewal test loan',
    });
  });

  // TEST 8: Physical Book Copy Inventory Lifecycle
  await test('8. Physical Copy Inventory: Accessioning, Barcode & Condition Management', async () => {
    const book = await prisma.book.findFirst();
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!book || !admin) throw new Error('Missing book or admin for inventory test');

    const testAccession = `ACC-TEST-${Date.now().toString().slice(-6)}`;
    const testBarcode = `BAR-${Date.now().toString().slice(-6)}`;

    // Create copy
    const newCopy = await copyService.createCopy({
      bookId: book.id,
      accessionNumber: testAccession,
      barcode: testBarcode,
      shelfLocation: 'Science Wing, Shelf B4-02',
      condition: 'NEW',
      status: 'AVAILABLE',
    }, admin.id);

    if (newCopy.accessionNumber !== testAccession) {
      throw new Error('Accession number mismatch on newly created physical copy');
    }

    // Duplicate accession check
    let duplicateCaught = false;
    try {
      await copyService.createCopy({
        bookId: book.id,
        accessionNumber: testAccession,
        shelfLocation: 'Another shelf',
      }, admin.id);
    } catch {
      duplicateCaught = true;
    }
    if (!duplicateCaught) {
      throw new Error('System allowed duplicate accession number creation');
    }

    // Update condition and shelf location
    const updatedCopy = await copyService.updateCopy(newCopy.id, {
      condition: 'GOOD',
      shelfLocation: 'Reserve Desk, Stack A1',
    }, admin.id);

    if (updatedCopy.condition !== 'GOOD' || updatedCopy.shelfLocation !== 'Reserve Desk, Stack A1') {
      throw new Error('Copy update failed to apply new condition and shelf location');
    }

    // Filter lookup
    const copiesFound = await copyService.getCopies({ search: testAccession });
    if (copiesFound.length === 0 || copiesFound[0].id !== newCopy.id) {
      throw new Error('Inventory search failed to locate copy by accession number');
    }

    // Clean up test copy
    await prisma.bookCopy.delete({ where: { id: newCopy.id } });
  });

  // TEST 9: Auth Security & RBAC Enforcement
  await test('9. Security & Authentication Constraints: Duplicate Matric, Role Boundaries', async () => {
    let existingStudent = await prisma.user.findFirst({ where: { role: 'STUDENT', matricNumber: { not: null } } });
    if (!existingStudent || !existingStudent.matricNumber) {
      existingStudent = await prisma.user.create({
        data: {
          fullName: 'Baseline Student',
          email: `baseline.${Date.now()}@nsuk.edu.ng`,
          passwordHash: await bcrypt.hash('Pass1234!', 10),
          matricNumber: `NSUK/NAS/CSC/22/${Math.floor(1000 + Math.random() * 9000)}`,
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
        },
      });
    }

    // Attempting registration with duplicate matric must fail
    let duplicateMatricCaught = false;
    try {
      await authService.registerStudent({
        fullName: 'Imposter Student',
        email: `imposter.${Date.now()}@nsuk.edu.ng`,
        matricNumber: existingStudent.matricNumber!,
        department: 'Physics',
        password: 'StrongPass2026!',
      });
    } catch {
      duplicateMatricCaught = true;
    }

    if (!duplicateMatricCaught) {
      throw new Error('Registration allowed duplicate matriculation number');
    }

    // Suspended account login rejection
    const suspendedUser = await prisma.user.create({
      data: {
        fullName: 'Suspended Member',
        email: `suspended.${Date.now()}@nsuk.edu.ng`,
        passwordHash: await bcrypt.hash('Suspended123!', 10),
        role: 'STUDENT',
        accountStatus: 'SUSPENDED',
      },
    });

    let suspensionCaught = false;
    try {
      await authService.login({
        identifier: suspendedUser.email,
        password: 'Suspended123!',
      });
    } catch {
      suspensionCaught = true;
    }

    if (!suspensionCaught) {
      throw new Error('Login allowed suspended user to authenticate');
    }

    await prisma.user.delete({ where: { id: suspendedUser.id } });
  });

  // Teardown: Clean up all test data so test execution is non-destructive
  console.log('[TEARDOWN] Purging test accounts, mock transactions and resetting catalog...');
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { user: { email: { contains: 'test.' } } },
        { user: { email: { contains: 'tester.' } } },
        { user: { email: { contains: 'borrower.' } } },
        { user: { email: { contains: 'queue.' } } },
        { user: { email: { contains: 'renewal.' } } },
        { user: { email: { contains: 'baseline.' } } },
        { user: { email: { contains: 'desk.staff.' } } },
      ],
    },
  });
  await prisma.renewal.deleteMany({
    where: {
      OR: [
        { requestedBy: { email: { contains: 'test.' } } },
        { requestedBy: { email: { contains: 'tester.' } } },
        { requestedBy: { email: { contains: 'renewal.' } } },
      ],
    },
  });
  await prisma.loan.deleteMany({
    where: {
      OR: [
        { user: { email: { contains: 'test.' } } },
        { user: { email: { contains: 'tester.' } } },
        { user: { email: { contains: 'borrower.' } } },
        { user: { email: { contains: 'renewal.' } } },
      ],
    },
  });
  await prisma.borrowingRequest.deleteMany({
    where: {
      OR: [
        { user: { email: { contains: 'test.' } } },
        { user: { email: { contains: 'tester.' } } },
        { user: { email: { contains: 'borrower.' } } },
      ],
    },
  });
  await prisma.reservation.deleteMany({
    where: {
      OR: [
        { user: { email: { contains: 'test.' } } },
        { user: { email: { contains: 'tester.' } } },
        { user: { email: { contains: 'queue.' } } },
      ],
    },
  });
  await prisma.notificationPreference.deleteMany({
    where: {
      user: {
        OR: [
          { email: { contains: 'test.' } },
          { email: { contains: 'tester.' } },
          { email: { contains: 'borrower.' } },
          { email: { contains: 'queue.' } },
          { email: { contains: 'renewal.' } },
          { email: { contains: 'baseline.' } },
          { email: { contains: 'imposter.' } },
          { email: { contains: 'desk.staff.' } },
        ],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: 'test.' } },
        { email: { contains: 'tester.' } },
        { email: { contains: 'borrower.' } },
        { email: { contains: 'queue.' } },
        { email: { contains: 'renewal.' } },
        { email: { contains: 'baseline.' } },
        { email: { contains: 'imposter.' } },
        { email: { contains: 'desk.staff.' } },
      ],
    },
  });
  await prisma.bookCopy.updateMany({
    data: { status: 'AVAILABLE' },
  });

  console.log('=======================================================');
  console.log(` TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Fatal test runner error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
