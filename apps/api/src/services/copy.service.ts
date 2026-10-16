import prisma from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from './audit.service';

export interface CreateCopyInput {
  bookId: string;
  accessionNumber: string;
  barcode?: string;
  shelfLocation: string;
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED';
  status?: 'AVAILABLE' | 'RESERVED' | 'ON_LOAN' | 'UNDER_MAINTENANCE' | 'LOST' | 'WITHDRAWN';
}

export const getCopies = async (params: {
  bookId?: string;
  status?: string;
  condition?: string;
  search?: string;
}) => {
  const where: any = {};
  if (params.bookId) where.bookId = params.bookId;
  if (params.status) where.status = params.status;
  if (params.condition) where.condition = params.condition;
  if (params.search) {
    where.OR = [
      { accessionNumber: { contains: params.search } },
      { barcode: { contains: params.search } },
      { shelfLocation: { contains: params.search } },
      { book: { title: { contains: params.search } } },
    ];
  }

  return prisma.bookCopy.findMany({
    where,
    include: {
      book: {
        select: {
          id: true,
          title: true,
          isbn: true,
          coverImageUrl: true,
        },
      },
      loans: {
        where: { status: 'ACTIVE' },
        include: {
          user: { select: { id: true, fullName: true, matricNumber: true } },
        },
      },
    },
    orderBy: { accessionNumber: 'asc' },
  });
};

export const createCopy = async (input: CreateCopyInput, actorId?: string) => {
  const book = await prisma.book.findUnique({ where: { id: input.bookId } });
  if (!book) {
    throw new AppError('Associated book record does not exist.', 404, 'BOOK_NOT_FOUND');
  }

  const existingAccession = await prisma.bookCopy.findUnique({
    where: { accessionNumber: input.accessionNumber.trim().toUpperCase() },
  });
  if (existingAccession) {
    throw new AppError(`A copy with Accession Number ${input.accessionNumber} already exists.`, 409, 'ACCESSION_EXISTS');
  }

  if (input.barcode) {
    const existingBarcode = await prisma.bookCopy.findUnique({
      where: { barcode: input.barcode.trim() },
    });
    if (existingBarcode) {
      throw new AppError(`A copy with Barcode ${input.barcode} already exists.`, 409, 'BARCODE_EXISTS');
    }
  }

  const copy = await prisma.bookCopy.create({
    data: {
      bookId: input.bookId,
      accessionNumber: input.accessionNumber.trim().toUpperCase(),
      barcode: input.barcode?.trim(),
      shelfLocation: input.shelfLocation.trim(),
      condition: input.condition || 'GOOD',
      status: input.status || 'AVAILABLE',
      acquisitionDate: new Date(),
    },
    include: { book: true },
  });

  await recordAuditLog({
    actorId,
    action: 'COPY_ADDED',
    entityType: 'BookCopy',
    entityId: copy.id,
    newValues: { accessionNumber: copy.accessionNumber, bookTitle: book.title },
  });

  return copy;
};

export const updateCopy = async (
  id: string,
  input: Partial<CreateCopyInput>,
  actorId?: string
) => {
  const existing = await prisma.bookCopy.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Physical copy not found.', 404, 'NOT_FOUND');
  }

  // Prevent changing status if copy is currently on active loan
  if (input.status && input.status !== existing.status) {
    if (existing.status === 'ON_LOAN' && input.status !== 'ON_LOAN') {
      throw new AppError('Cannot manually change status while book copy is on active loan. Use return workflow.', 400, 'COPY_ON_LOAN');
    }
  }

  const updated = await prisma.bookCopy.update({
    where: { id },
    data: {
      accessionNumber: input.accessionNumber?.trim().toUpperCase(),
      barcode: input.barcode?.trim(),
      shelfLocation: input.shelfLocation?.trim(),
      condition: input.condition,
      status: input.status,
    },
    include: { book: true },
  });

  await recordAuditLog({
    actorId,
    action: 'COPY_UPDATED',
    entityType: 'BookCopy',
    entityId: id,
    oldValues: existing,
    newValues: updated,
  });

  return updated;
};

export const deleteCopy = async (id: string, actorId?: string) => {
  const existing = await prisma.bookCopy.findUnique({
    where: { id },
    include: {
      loans: { where: { status: 'ACTIVE' } },
    },
  });

  if (!existing) {
    throw new AppError('Physical copy not found.', 404, 'NOT_FOUND');
  }

  if (existing.loans.length > 0) {
    throw new AppError('Cannot delete copy that is currently loaned to a student.', 400, 'COPY_ON_LOAN');
  }

  await prisma.bookCopy.delete({ where: { id } });

  await recordAuditLog({
    actorId,
    action: 'COPY_DELETED',
    entityType: 'BookCopy',
    entityId: id,
    oldValues: { accessionNumber: existing.accessionNumber },
  });

  return { message: 'Physical copy deleted successfully.' };
};
