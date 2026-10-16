import { Router } from 'express';
import { z } from 'zod';
import * as bookService from '../services/book.service';
import { authenticate, AuthenticatedRequest, requireStaff, requireAdmin } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

const createBookSchema = z.object({
  title: z.string().min(1, 'Book title is required'),
  isbn: z.string().min(5, 'ISBN is required'),
  description: z.string().min(1, 'Book description is required'),
  publisherName: z.string().optional(),
  publicationYear: z.number().int().optional(),
  edition: z.string().optional(),
  language: z.string().optional(),
  coverImageUrl: z.string().optional(),
  authorNames: z.array(z.string()).min(1, 'At least one author is required'),
  categoryNames: z.array(z.string()).min(1, 'At least one category is required'),
});

// GET /books/categories (list categories)
router.get('/meta/categories', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// GET /books/authors (list authors)
router.get('/meta/authors', async (req, res, next) => {
  try {
    const authors = await prisma.author.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true } } },
    });
    res.json({ success: true, data: authors });
  } catch (err) {
    next(err);
  }
});

// GET /books (search & filter)
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      categoryId,
      authorId,
      publisherId,
      year,
      availableOnly,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await bookService.getBooks({
      search: search as string,
      categoryId: categoryId as string,
      authorId: authorId as string,
      publisherId: publisherId as string,
      publicationYear: year ? parseInt(year as string, 10) : undefined,
      availableOnly: availableOnly === 'true',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 12,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    res.json({ success: true, data: result.items, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /books/:id
router.get('/:id', async (req, res, next) => {
  try {
    const book = await bookService.getBookById(req.params.id);
    res.json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
});

// POST /books (Staff only)
router.post('/', authenticate, requireStaff, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = createBookSchema.parse(req.body);
    const book = await bookService.createBook(validated, req.user!.id);
    res.status(201).json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
});

// PATCH /books/:id (Staff only)
router.patch('/:id', authenticate, requireStaff, async (req: AuthenticatedRequest, res, next) => {
  try {
    const book = await bookService.updateBook(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
});

// DELETE /books/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await bookService.deleteBook(req.params.id, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
