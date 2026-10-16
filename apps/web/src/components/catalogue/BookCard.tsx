import React from 'react';
import { Book as BookType } from '../../types';
import { BookOpen, MapPin, CheckCircle2, Clock, Users, ArrowRight } from 'lucide-react';

interface BookCardProps {
  book: BookType;
  onSelect: (book: BookType) => void;
  onRequestBorrow: (book: BookType) => void;
  onReserve: (book: BookType) => void;
  isStudent: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onRequestBorrow,
  onReserve,
  isStudent,
}) => {
  const isAvailable = book.availableCopies > 0;
  const authorNames = Array.isArray(book.authors)
    ? book.authors.map((a) => (typeof a === 'string' ? a : a.name)).join(', ')
    : 'Unknown Author';

  const categoryNames = Array.isArray(book.categories)
    ? book.categories.map((c) => (typeof c === 'string' ? c : c.name))
    : [];

  return (
    <div
      onClick={() => onSelect(book)}
      className="group relative bg-white dark:bg-brand-navy/60 rounded-2xl border border-brand-navy/5 dark:border-white/10 shadow-card hover:shadow-elevated transition-all duration-300 flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1"
    >
      {/* Top Banner / Cover */}
      <div className="relative h-48 w-full bg-gradient-to-br from-brand-navy to-brand-royal overflow-hidden">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <BookOpen className="w-12 h-12 text-white/30 mb-2" />
            <p className="text-xs text-white/60 font-medium px-4 line-clamp-2">{book.title}</p>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Availability Badge */}
        <div className="absolute top-3 right-3">
          {isAvailable ? (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/90 text-white backdrop-blur-md shadow flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {book.availableCopies} Available
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/90 text-white backdrop-blur-md shadow flex items-center gap-1">
              <Clock className="w-3 h-3" />
              All On Loan
            </span>
          )}
        </div>

        {/* Shelf location badge */}
        {book.shelfLocation && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white/90 text-[11px] font-mono border border-white/10">
            <MapPin className="w-3 h-3 text-brand-cyan" />
            {book.shelfLocation}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Categories */}
          <div className="flex flex-wrap gap-1 mb-2">
            {categoryNames.slice(0, 2).map((cat, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-brand-royal/10 text-brand-royal dark:bg-white/10 dark:text-brand-cyan"
              >
                {cat}
              </span>
            ))}
            {categoryNames.length > 2 && (
              <span className="text-[10px] text-brand-mutedText">+{categoryNames.length - 2}</span>
            )}
          </div>

          <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white line-clamp-2 group-hover:text-brand-royal dark:group-hover:text-brand-cyan transition-colors">
            {book.title}
          </h3>

          <p className="text-xs text-brand-mutedText dark:text-white/60 mt-1 line-clamp-1">
            by {authorNames}
          </p>

          <p className="text-xs text-brand-darkText/80 dark:text-white/70 mt-2 line-clamp-2 leading-relaxed">
            {book.description}
          </p>
        </div>

        {/* Bottom Metadata & Action */}
        <div className="pt-4 mt-3 border-t border-brand-navy/5 dark:border-white/10 flex items-center justify-between gap-2">
          <div className="text-[11px] text-brand-mutedText dark:text-white/50 font-mono">
            <span>ISBN: {book.isbn.substring(0, 13)}</span>
          </div>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {isAvailable ? (
              <button
                onClick={() => onRequestBorrow(book)}
                className="px-3 py-1.5 rounded-xl bg-brand-navy hover:bg-brand-royal text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1 group/btn"
              >
                <span>Borrow</span>
                <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                onClick={() => onReserve(book)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
              >
                <Users className="w-3 h-3" />
                <span>Reserve ({book.activeReservations || 0})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
