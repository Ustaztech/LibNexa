import prisma from '../db/prisma';

export const getSystemOverviewStats = async () => {
  const [
    totalStudents,
    totalLibrarians,
    totalBooks,
    totalCopies,
    availableCopies,
    borrowedCopies,
    pendingRequests,
    activeReservations,
    activeLoans,
    overdueLoans,
    returnedLoans,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'LIBRARIAN' } }),
    prisma.book.count(),
    prisma.bookCopy.count(),
    prisma.bookCopy.count({ where: { status: 'AVAILABLE' } }),
    prisma.bookCopy.count({ where: { status: 'ON_LOAN' } }),
    prisma.borrowingRequest.count({ where: { status: 'PENDING' } }),
    prisma.reservation.count({ where: { status: { in: ['PENDING', 'QUEUED', 'READY_FOR_COLLECTION'] } } }),
    prisma.loan.count({ where: { status: 'ACTIVE' } }),
    prisma.loan.count({
      where: {
        status: 'ACTIVE',
        dueAt: { lt: new Date() },
      },
    }),
    prisma.loan.count({ where: { status: 'RETURNED' } }),
  ]);

  return {
    users: {
      totalStudents,
      totalLibrarians,
      totalMembers: totalStudents + totalLibrarians,
    },
    inventory: {
      totalTitles: totalBooks,
      totalCopies,
      availableCopies,
      borrowedCopies,
      maintenanceCopies: totalCopies - (availableCopies + borrowedCopies),
    },
    circulation: {
      pendingRequests,
      activeLoans,
      overdueLoans,
      activeReservations,
      completedReturns: returnedLoans,
    },
  };
};

export const getAnalyticsChartsData = async () => {
  // 1. Most Borrowed Books
  const loansWithBooks = await prisma.loan.findMany({
    select: {
      bookCopy: {
        select: {
          book: { select: { id: true, title: true, isbn: true } },
        },
      },
    },
  });

  const bookBorrowCounts = new Map<string, { title: string; count: number }>();
  for (const l of loansWithBooks) {
    const b = l.bookCopy.book;
    const current = bookBorrowCounts.get(b.id) || { title: b.title, count: 0 };
    current.count += 1;
    bookBorrowCounts.set(b.id, current);
  }

  const mostBorrowed = Array.from(bookBorrowCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // 2. Category Distribution
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { books: true } },
    },
  });

  const categoryDistribution = categories.map(c => ({
    name: c.name,
    count: c._count.books,
  }));

  // 3. Monthly Circulation (last 6 months)
  const now = new Date();
  const monthlyData: Array<{ month: string; borrowed: number; returned: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthName = d.toLocaleString('en-US', { month: 'short' });

    const borrowed = await prisma.loan.count({
      where: {
        borrowedAt: { gte: d, lt: nextMonth },
      },
    });

    const returned = await prisma.loan.count({
      where: {
        returnedAt: { gte: d, lt: nextMonth },
      },
    });

    monthlyData.push({ month: monthName, borrowed, returned });
  }

  // 4. Overdue status breakdown
  const activeLoans = await prisma.loan.findMany({
    where: { status: 'ACTIVE' },
    select: { dueAt: true },
  });

  let onTimeCount = 0;
  let overdue1to7Count = 0;
  let overdue7PlusCount = 0;

  for (const l of activeLoans) {
    const diffDays = Math.ceil((now.getTime() - l.dueAt.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      onTimeCount++;
    } else if (diffDays <= 7) {
      overdue1to7Count++;
    } else {
      overdue7PlusCount++;
    }
  }

  return {
    mostBorrowed,
    categoryDistribution,
    monthlyCirculation: monthlyData,
    overdueBreakdown: [
      { name: 'Within Due Date', count: onTimeCount },
      { name: 'Overdue (1-7 Days)', count: overdue1to7Count },
      { name: 'Overdue (>7 Days)', count: overdue7PlusCount },
    ],
  };
};

export const exportReportData = async (reportType: string) => {
  const generatedAt = new Date().toISOString();

  switch (reportType) {
    case 'INVENTORY': {
      const copies = await prisma.bookCopy.findMany({
        include: { book: { select: { title: true, isbn: true } } },
        orderBy: { accessionNumber: 'asc' },
      });
      return {
        title: 'Library Physical Book Inventory Report',
        generatedAt,
        records: copies.map(c => ({
          accessionNumber: c.accessionNumber,
          title: c.book.title,
          isbn: c.book.isbn,
          shelfLocation: c.shelfLocation,
          condition: c.condition,
          status: c.status,
        })),
      };
    }

    case 'CIRCULATION': {
      const loans = await prisma.loan.findMany({
        include: {
          bookCopy: { include: { book: true } },
          user: { select: { fullName: true, matricNumber: true } },
        },
        orderBy: { borrowedAt: 'desc' },
      });
      return {
        title: 'Book Circulation & Loans Master Report',
        generatedAt,
        records: loans.map(l => ({
          loanId: l.id,
          bookTitle: l.bookCopy.book.title,
          accessionNumber: l.bookCopy.accessionNumber,
          borrower: l.user.fullName,
          matricNumber: l.user.matricNumber || 'N/A',
          borrowedAt: l.borrowedAt.toISOString().split('T')[0],
          dueAt: l.dueAt.toISOString().split('T')[0],
          returnedAt: l.returnedAt ? l.returnedAt.toISOString().split('T')[0] : 'Not Returned',
          status: l.status,
        })),
      };
    }

    case 'OVERDUE': {
      const overdues = await prisma.loan.findMany({
        where: {
          status: 'ACTIVE',
          dueAt: { lt: new Date() },
        },
        include: {
          bookCopy: { include: { book: true } },
          user: { select: { fullName: true, email: true, phone: true, matricNumber: true } },
        },
        orderBy: { dueAt: 'asc' },
      });
      return {
        title: 'Overdue Books & Delinquency Report',
        generatedAt,
        records: overdues.map(l => ({
          studentName: l.user.fullName,
          matricNumber: l.user.matricNumber || 'N/A',
          email: l.user.email,
          phone: l.user.phone || 'N/A',
          bookTitle: l.bookCopy.book.title,
          accessionNumber: l.bookCopy.accessionNumber,
          dueDate: l.dueAt.toISOString().split('T')[0],
          daysOverdue: Math.ceil((Date.now() - l.dueAt.getTime()) / (1000 * 60 * 60 * 24)),
        })),
      };
    }

    case 'RESERVATIONS': {
      const reservations = await prisma.reservation.findMany({
        where: { status: { in: ['PENDING', 'QUEUED', 'READY_FOR_COLLECTION'] } },
        include: {
          book: true,
          user: { select: { fullName: true, matricNumber: true } },
        },
        orderBy: { queuePosition: 'asc' },
      });
      return {
        title: 'Active Book Reservations Queue Report',
        generatedAt,
        records: reservations.map(r => ({
          queuePosition: r.queuePosition,
          bookTitle: r.book.title,
          isbn: r.book.isbn,
          studentName: r.user.fullName,
          matricNumber: r.user.matricNumber || 'N/A',
          status: r.status,
          reservedAt: r.reservedAt.toISOString().split('T')[0],
          collectionExpires: r.expiresAt ? r.expiresAt.toISOString().split('T')[0] : 'Pending Copy',
        })),
      };
    }

    default:
      return {
        title: 'General Library Summary Report',
        generatedAt,
        stats: await getSystemOverviewStats(),
      };
  }
};
