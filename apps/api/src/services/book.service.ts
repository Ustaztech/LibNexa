import prisma from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from './audit.service';

export interface BookFilterParams {
  search?: string;
  categoryId?: string;
  authorId?: string;
  publisherId?: string;
  publicationYear?: number;
  availableOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'newest' | 'year';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateBookInput {
  title: string;
  isbn: string;
  description: string;
  publisherName?: string;
  publicationYear?: number;
  edition?: string;
  language?: string;
  coverImageUrl?: string;
  authorNames: string[];
  categoryNames: string[];
}

export const getBooks = async (params: BookFilterParams) => {
  const {
    search,
    categoryId,
    authorId,
    publisherId,
    publicationYear,
    availableOnly,
    page = 1,
    limit = 12,
    sortBy = 'newest',
    sortOrder = 'desc',
  } = params;

  const where: any = {};

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term } },
      { isbn: { contains: term } },
      { description: { contains: term } },
      {
        authors: {
          some: {
            author: { name: { contains: term } },
          },
        },
      },
      {
        categories: {
          some: {
            category: { name: { contains: term } },
          },
        },
      },
    ];
  }

  if (categoryId) {
    where.categories = { some: { categoryId } };
  }

  if (authorId) {
    where.authors = { some: { authorId } };
  }

  if (publisherId) {
    where.publisherId = publisherId;
  }

  if (publicationYear) {
    where.publicationYear = publicationYear;
  }

  if (availableOnly) {
    where.copies = {
      some: { status: 'AVAILABLE' },
    };
  }

  let orderBy: any = { createdAt: 'desc' };
  if (sortBy === 'title') {
    orderBy = { title: sortOrder };
  } else if (sortBy === 'year') {
    orderBy = { publicationYear: sortOrder };
  } else if (sortBy === 'newest') {
    orderBy = { createdAt: sortOrder };
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, rawBooks] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        publisher: true,
        authors: { include: { author: true } },
        categories: { include: { category: true } },
        copies: {
          select: {
            id: true,
            status: true,
            shelfLocation: true,
            condition: true,
          },
        },
        _count: {
          select: {
            borrowingRequests: true,
            reservations: { where: { status: { in: ['PENDING', 'QUEUED', 'READY_FOR_COLLECTION'] } } },
          },
        },
      },
    }),
  ]);

  const books = rawBooks.map(b => {
    const totalCopies = b.copies.length;
    const availableCopies = b.copies.filter(c => c.status === 'AVAILABLE').length;
    const borrowedCopies = b.copies.filter(c => c.status === 'ON_LOAN').length;
    const reservedCopies = b.copies.filter(c => c.status === 'RESERVED').length;
    const primaryShelf = b.copies[0]?.shelfLocation || 'Main Library Stacks';

    return {
      id: b.id,
      title: b.title,
      isbn: b.isbn,
      description: b.description,
      publicationYear: b.publicationYear,
      edition: b.edition,
      language: b.language,
      coverImageUrl: b.coverImageUrl,
      publisher: b.publisher?.name || 'Academic Press',
      authors: b.authors.map(a => a.author.name),
      categories: b.categories.map(c => c.category.name),
      shelfLocation: primaryShelf,
      totalCopies,
      availableCopies,
      borrowedCopies,
      reservedCopies,
      activeReservations: b._count.reservations,
      createdAt: b.createdAt,
    };
  });

  return {
    items: books,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

export const getBookById = async (id: string) => {
  const b = await prisma.book.findUnique({
    where: { id },
    include: {
      publisher: true,
      authors: { include: { author: true } },
      categories: { include: { category: true } },
      copies: {
        orderBy: { accessionNumber: 'asc' },
      },
      reservations: {
        where: { status: { in: ['PENDING', 'QUEUED', 'READY_FOR_COLLECTION'] } },
        include: { user: { select: { id: true, fullName: true, matricNumber: true } } },
        orderBy: { queuePosition: 'asc' },
      },
    },
  });

  if (!b) {
    throw new AppError('Book record not found.', 404, 'NOT_FOUND');
  }

  const totalCopies = b.copies.length;
  const availableCopies = b.copies.filter(c => c.status === 'AVAILABLE').length;
  const borrowedCopies = b.copies.filter(c => c.status === 'ON_LOAN').length;
  const reservedCopies = b.copies.filter(c => c.status === 'RESERVED').length;

  return {
    id: b.id,
    title: b.title,
    isbn: b.isbn,
    description: b.description,
    publicationYear: b.publicationYear,
    edition: b.edition,
    language: b.language,
    coverImageUrl: b.coverImageUrl,
    publisher: b.publisher,
    authors: b.authors.map(a => a.author),
    categories: b.categories.map(c => c.category),
    totalCopies,
    availableCopies,
    borrowedCopies,
    reservedCopies,
    copies: b.copies,
    reservations: b.reservations,
    createdAt: b.createdAt,
  };
};

export const createBook = async (input: CreateBookInput, actorId?: string) => {
  const existing = await prisma.book.findUnique({
    where: { isbn: input.isbn.trim() },
  });
  if (existing) {
    throw new AppError(`A book with ISBN ${input.isbn} already exists in the catalogue.`, 409, 'ISBN_EXISTS');
  }

  // Find or create publisher
  let publisherId: string | undefined = undefined;
  if (input.publisherName && input.publisherName.trim()) {
    const pub = await prisma.publisher.upsert({
      where: { name: input.publisherName.trim() },
      update: {},
      create: { name: input.publisherName.trim() },
    });
    publisherId = pub.id;
  }

  // Create Book record
  const book = await prisma.book.create({
    data: {
      title: input.title.trim(),
      isbn: input.isbn.trim(),
      description: input.description.trim(),
      publisherId,
      publicationYear: input.publicationYear,
      edition: input.edition?.trim(),
      language: input.language?.trim() || 'English',
      coverImageUrl: input.coverImageUrl?.trim(),
    },
  });

  // Connect Authors
  for (const authorName of input.authorNames) {
    if (!authorName.trim()) continue;
    const author = await prisma.author.upsert({
      where: { name: authorName.trim() },
      update: {},
      create: { name: authorName.trim() },
    });
    await prisma.bookAuthor.create({
      data: {
        bookId: book.id,
        authorId: author.id,
      },
    });
  }

  // Connect Categories
  for (const categoryName of input.categoryNames) {
    if (!categoryName.trim()) continue;
    const category = await prisma.category.upsert({
      where: { name: categoryName.trim() },
      update: {},
      create: { name: categoryName.trim() },
    });
    await prisma.bookCategory.create({
      data: {
        bookId: book.id,
        categoryId: category.id,
      },
    });
  }

  await recordAuditLog({
    actorId,
    action: 'BOOK_CREATED',
    entityType: 'Book',
    entityId: book.id,
    newValues: { title: book.title, isbn: book.isbn },
  });

  return getBookById(book.id);
};

export const updateBook = async (
  id: string,
  input: Partial<CreateBookInput>,
  actorId?: string
) => {
  const existing = await prisma.book.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Book not found.', 404, 'NOT_FOUND');
  }

  let publisherId = existing.publisherId;
  if (input.publisherName !== undefined) {
    if (input.publisherName && input.publisherName.trim()) {
      const pub = await prisma.publisher.upsert({
        where: { name: input.publisherName.trim() },
        update: {},
        create: { name: input.publisherName.trim() },
      });
      publisherId = pub.id;
    } else {
      publisherId = null;
    }
  }

  const updated = await prisma.book.update({
    where: { id },
    data: {
      title: input.title !== undefined ? input.title.trim() : undefined,
      isbn: input.isbn !== undefined ? input.isbn.trim() : undefined,
      description: input.description !== undefined ? input.description.trim() : undefined,
      publisherId,
      publicationYear: input.publicationYear,
      edition: input.edition,
      language: input.language,
      coverImageUrl: input.coverImageUrl,
    },
  });

  if (input.authorNames) {
    await prisma.bookAuthor.deleteMany({ where: { bookId: id } });
    for (const name of input.authorNames) {
      if (!name.trim()) continue;
      const author = await prisma.author.upsert({
        where: { name: name.trim() },
        update: {},
        create: { name: name.trim() },
      });
      await prisma.bookAuthor.create({
        data: { bookId: id, authorId: author.id },
      });
    }
  }

  if (input.categoryNames) {
    await prisma.bookCategory.deleteMany({ where: { bookId: id } });
    for (const name of input.categoryNames) {
      if (!name.trim()) continue;
      const category = await prisma.category.upsert({
        where: { name: name.trim() },
        update: {},
        create: { name: name.trim() },
      });
      await prisma.bookCategory.create({
        data: { bookId: id, categoryId: category.id },
      });
    }
  }

  await recordAuditLog({
    actorId,
    action: 'BOOK_UPDATED',
    entityType: 'Book',
    entityId: id,
    oldValues: { title: existing.title, isbn: existing.isbn },
    newValues: { title: updated.title, isbn: updated.isbn },
  });

  return getBookById(id);
};

export const deleteBook = async (id: string, actorId?: string) => {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      copies: {
        include: {
          loans: { where: { status: 'ACTIVE' } },
        },
      },
    },
  });

  if (!book) {
    throw new AppError('Book not found.', 404, 'NOT_FOUND');
  }

  const hasActiveLoans = book.copies.some(c => c.loans.length > 0);
  if (hasActiveLoans) {
    throw new AppError('Cannot delete book with active physical loans.', 400, 'ACTIVE_LOANS_EXIST');
  }

  await prisma.book.delete({ where: { id } });

  await recordAuditLog({
    actorId,
    action: 'BOOK_DELETED',
    entityType: 'Book',
    entityId: id,
    oldValues: { title: book.title, isbn: book.isbn },
  });

  return { message: 'Book deleted successfully from catalogue.' };
};
