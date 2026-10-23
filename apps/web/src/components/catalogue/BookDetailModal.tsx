import React, { useState, useEffect } from 'react';
import { Book as BookType } from '../../types';
import { X, BookOpen, MapPin, Calendar, Hash, Bookmark, CheckCircle2, Clock, ShieldCheck, AlertCircle, Users, Bell, Mail, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

interface BookDetailModalProps {
  book: BookType | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestBorrow: (book: BookType) => void;
  onReserve: (book: BookType) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  isOpen,
  onClose,
  onRequestBorrow,
  onReserve,
}) => {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    if (isOpen && book) {
      api.getBookSubscriptionStatus(book.id)
        .then((res) => {
          if (res.success && res.data) {
            setIsSubscribed(res.data.isSubscribed);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  const handleToggleSubscription = async () => {
    if (!book) return;
    setLoadingSub(true);
    try {
      if (isSubscribed) {
        await api.unsubscribeFromBookAvailability(book.id);
        setIsSubscribed(false);
        showToast({
          type: 'info',
          title: 'Unsubscribed',
          message: `You will no longer receive availability emails for "${book.title}".`,
        });
      } else {
        await api.subscribeToBookAvailability(book.id);
        setIsSubscribed(true);
        showToast({
          type: 'success',
          title: 'Subscribed to Email Alerts',
          message: `We will automatically email you as soon as "${book.title}" is available!`,
        });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Subscription Error', message: err.message });
    } finally {
      setLoadingSub(false);
    }
  };

  const handleBroadcastArrival = async () => {
    if (!book) return;
    setIsBroadcasting(true);
    try {
      const res = await api.broadcastNewBookArrival(book.id);
      showToast({
        type: 'success',
        title: 'New Book Email Dispatched',
        message: res.message || `Notified active library members about "${book.title}".`,
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Dispatch Failed', message: err.message });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const isAvailable = book.availableCopies > 0;
  const authorNames = Array.isArray(book.authors)
    ? book.authors.map((a) => (typeof a === 'string' ? a : a.name)).join(', ')
    : 'Unknown Author';

  const categoryNames = Array.isArray(book.categories)
    ? book.categories.map((c) => (typeof c === 'string' ? c : c.name))
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-dark/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-brand-navy rounded-3xl border border-brand-navy/10 dark:border-white/15 shadow-elevated overflow-hidden text-brand-dark dark:text-white animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-brand-navy via-[#0c3975] to-brand-royal text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap gap-2 mb-2">
            {categoryNames.map((cat, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-teal/30 text-brand-cyan border border-brand-teal/40"
              >
                {cat}
              </span>
            ))}
            {book.edition && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                {book.edition}
              </span>
            )}
          </div>

          <h2 className="font-heading font-extrabold text-2xl tracking-tight leading-snug">{book.title}</h2>
          <p className="text-sm text-white/80 mt-1">by {authorNames}</p>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-brand-bg dark:bg-white/5 border border-brand-navy/5 dark:border-white/5">
              <span className="text-[10px] text-brand-mutedText dark:text-white/50 uppercase tracking-wider font-semibold">
                Available Copies
              </span>
              <p className="text-xl font-heading font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {book.availableCopies} <span className="text-xs font-normal text-brand-mutedText">/ {book.totalCopies}</span>
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-brand-bg dark:bg-white/5 border border-brand-navy/5 dark:border-white/5">
              <span className="text-[10px] text-brand-mutedText dark:text-white/50 uppercase tracking-wider font-semibold">
                Shelf Location
              </span>
              <p className="text-xs font-mono font-bold text-brand-royal dark:text-brand-cyan mt-1 truncate">
                {book.shelfLocation || 'Main Stacks'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-brand-bg dark:bg-white/5 border border-brand-navy/5 dark:border-white/5">
              <span className="text-[10px] text-brand-mutedText dark:text-white/50 uppercase tracking-wider font-semibold">
                Publication
              </span>
              <p className="text-xs font-bold text-brand-dark dark:text-white mt-1">
                {book.publicationYear || '2023'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-brand-bg dark:bg-white/5 border border-brand-navy/5 dark:border-white/5">
              <span className="text-[10px] text-brand-mutedText dark:text-white/50 uppercase tracking-wider font-semibold">
                Waitlist Queue
              </span>
              <p className="text-xl font-heading font-bold text-amber-500 mt-0.5">
                {book.activeReservations || 0}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-bold text-brand-mutedText dark:text-white/60 mb-2">
              Book Overview & Synopsis
            </h4>
            <p className="text-sm text-brand-darkText dark:text-white/80 leading-relaxed bg-brand-bg/50 dark:bg-white/5 p-4 rounded-2xl border border-brand-navy/5 dark:border-white/5">
              {book.description}
            </p>
          </div>

          {/* Metadata details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-brand-bg/30 dark:bg-white/5 p-4 rounded-2xl border border-brand-navy/5 dark:border-white/5 font-mono">
            <div>
              <span className="text-brand-mutedText dark:text-white/50">ISBN-13:</span>{' '}
              <span className="font-semibold text-brand-dark dark:text-white">{book.isbn}</span>
            </div>
            <div>
              <span className="text-brand-mutedText dark:text-white/50">Publisher:</span>{' '}
              <span className="font-semibold text-brand-dark dark:text-white">
                {typeof book.publisher === 'string' ? book.publisher : book.publisher?.name || 'Academic Press'}
              </span>
            </div>
            <div>
              <span className="text-brand-mutedText dark:text-white/50">Language:</span>{' '}
              <span className="font-semibold text-brand-dark dark:text-white">{book.language || 'English'}</span>
            </div>
            <div>
              <span className="text-brand-mutedText dark:text-white/50">Loan Policy:</span>{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">14 Days Standard</span>
            </div>
          </div>

          {/* Physical Copies Breakdown */}
          {book.copies && book.copies.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider font-bold text-brand-mutedText dark:text-white/60 mb-2">
                Physical Inventory Copies ({book.copies.length})
              </h4>
              <div className="overflow-x-auto rounded-xl border border-brand-navy/10 dark:border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-bg dark:bg-white/10 text-brand-mutedText dark:text-white/70 font-semibold border-b border-brand-navy/10 dark:border-white/10">
                    <tr>
                      <th className="p-2.5">Accession No.</th>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5">Condition</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-navy/5 dark:divide-white/5">
                    {book.copies.map((copy) => (
                      <tr key={copy.id} className="hover:bg-brand-bg/50 dark:hover:bg-white/5">
                        <td className="p-2.5 font-mono font-medium">{copy.accessionNumber}</td>
                        <td className="p-2.5 text-brand-mutedText dark:text-white/70">{copy.shelfLocation}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {copy.condition}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              copy.status === 'AVAILABLE'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : copy.status === 'ON_LOAN'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                            }`}
                          >
                            {copy.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Borrowing Rules Callout */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-brand-royal/10 border border-blue-200 dark:border-brand-royal/30 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-royal dark:text-brand-cyan flex-shrink-0 mt-0.5" />
            <div className="text-brand-darkText dark:text-white/80 leading-relaxed">
              <p className="font-semibold text-brand-royal dark:text-brand-cyan mb-0.5">
                NSUK Borrowing Guidelines
              </p>
              Students can hold up to 3 books concurrently for a standard 14-day loan period. Upon librarian approval, books must be collected within 48 hours at the Reader Services desk.
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-brand-bg dark:bg-white/5 border-t border-brand-navy/10 dark:border-white/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-mutedText dark:text-white/70 hover:text-brand-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Staff Broadcast Action */}
            {(role === 'LIBRARIAN' || role === 'ADMIN') && (
              <button
                type="button"
                onClick={handleBroadcastArrival}
                disabled={isBroadcasting}
                className="px-3.5 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Send automated new arrival email alert to all active library members"
              >
                {isBroadcasting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                ) : (
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                )}
                {isBroadcasting ? 'Broadcasting...' : 'Broadcast Email'}
              </button>
            )}

            {isAvailable ? (
              <button
                onClick={() => {
                  onRequestBorrow(book);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal hover:opacity-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Borrow Request
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Notify Me When Available Button */}
                <button
                  type="button"
                  onClick={handleToggleSubscription}
                  disabled={loadingSub}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                    isSubscribed
                      ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-600/25'
                      : 'bg-white dark:bg-white/10 border-brand-navy/15 dark:border-white/15 text-brand-dark dark:text-white hover:bg-brand-bg dark:hover:bg-white/20'
                  }`}
                  title={isSubscribed ? 'Click to unsubscribe from email alerts' : 'Receive an email notification when a copy is available'}
                >
                  {loadingSub ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-teal" />
                  ) : isSubscribed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 text-brand-teal" />
                  )}
                  {isSubscribed ? 'Subscribed to Alerts' : 'Email Me When Available'}
                </button>

                <button
                  onClick={() => {
                    onReserve(book);
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Join Waitlist / Reserve
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
