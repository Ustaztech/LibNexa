import React, { useState } from 'react';
import { Loan } from '../../types';
import { Clock, AlertTriangle, CheckCircle2, RotateCw, BookOpen, Calendar, HelpCircle, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface StudentLoansViewProps {
  loans: Loan[];
  onRefresh: () => void;
}

export const StudentLoansView: React.FC<StudentLoansViewProps> = ({ loans, onRefresh }) => {
  const { showToast } = useToast();
  const [selectedLoanForRenewal, setSelectedLoanForRenewal] = useState<Loan | null>(null);
  const [renewalReason, setRenewalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RETURNED'>('ACTIVE');

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
  const returnedLoans = loans.filter((l) => l.status === 'RETURNED');

  const displayedLoans = activeTab === 'ACTIVE' ? activeLoans : returnedLoans;

  const handleRequestRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForRenewal) return;

    setIsSubmitting(true);
    try {
      await api.requestRenewal(selectedLoanForRenewal.id, renewalReason);
      showToast({
        type: 'success',
        title: 'Renewal Requested',
        message: 'Your renewal request has been submitted for librarian review (+7 days upon approval).',
      });
      setSelectedLoanForRenewal(null);
      setRenewalReason('');
      onRefresh();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Renewal Failed',
        message: err.message || 'Could not request renewal. Maximum renewals or overdue policy limit reached.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDaysRemaining = (dueAtStr: string) => {
    const dueAt = new Date(dueAtStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((dueAt - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-brand-dark dark:text-white">
            My Borrowed Materials & Loans
          </h2>
          <p className="text-xs text-brand-mutedText dark:text-white/60">
            Track return due dates, monitor standard 14-day loan cycles, and request extensions
          </p>
        </div>

        <div className="flex bg-white dark:bg-white/5 p-1 rounded-xl border border-brand-navy/10 dark:border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-brand-royal text-white shadow-sm'
                : 'text-brand-mutedText dark:text-white/60 hover:text-brand-dark'
            }`}
          >
            Active Loans ({activeLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('RETURNED')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'RETURNED'
                ? 'bg-brand-royal text-white shadow-sm'
                : 'text-brand-mutedText dark:text-white/60 hover:text-brand-dark'
            }`}
          >
            Loan History ({returnedLoans.length})
          </button>
        </div>
      </div>

      {/* Loans Grid / Cards */}
      {displayedLoans.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-brand-navy/40 border border-brand-navy/5 dark:border-white/10 shadow-card">
          <BookOpen className="w-12 h-12 text-brand-royal/30 dark:text-brand-cyan/30 mx-auto mb-3" />
          <h3 className="font-heading font-bold text-base text-brand-dark dark:text-white">
            {activeTab === 'ACTIVE' ? 'No Active Loans' : 'No Returned Loans Yet'}
          </h3>
          <p className="text-xs text-brand-mutedText dark:text-white/60 mt-1 max-w-sm mx-auto">
            {activeTab === 'ACTIVE'
              ? 'You do not have any borrowed books in your possession currently. Explore the catalog to request materials.'
              : 'Your past completed and returned book records will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedLoans.map((loan) => {
            const daysRemaining = calculateDaysRemaining(loan.dueAt);
            const isOverdue = daysRemaining < 0;
            const bookTitle = loan.bookCopy?.book?.title || 'Library Resource';
            const accession = loan.bookCopy?.accessionNumber || 'N/A';
            const shelfLocation = loan.bookCopy?.shelfLocation || 'Main Stacks';

            return (
              <div
                key={loan.id}
                className={`p-5 rounded-2xl bg-white dark:bg-brand-navy/60 border shadow-card transition-all flex flex-col justify-between ${
                  isOverdue
                    ? 'border-rose-400/50 bg-rose-50/20 dark:bg-rose-950/20'
                    : 'border-brand-navy/5 dark:border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-royal/10 dark:bg-white/10 text-brand-royal dark:text-brand-cyan font-bold">
                        {accession}
                      </span>
                      <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white mt-1.5 line-clamp-1">
                        {bookTitle}
                      </h3>
                      <p className="text-xs text-brand-mutedText dark:text-white/60">
                        Shelf: {shelfLocation}
                      </p>
                    </div>

                    {/* Status Chip */}
                    <div>
                      {loan.status === 'RETURNED' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Returned
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue ({Math.abs(daysRemaining)}d late)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {daysRemaining} Day{daysRemaining === 1 ? '' : 's'} Left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dates timeline */}
                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-brand-bg/50 dark:bg-white/5 text-[11px]">
                    <div>
                      <span className="text-brand-mutedText dark:text-white/50 block">Borrowed On:</span>
                      <span className="font-medium text-brand-dark dark:text-white">
                        {new Date(loan.borrowedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-brand-mutedText dark:text-white/50 block">Due By:</span>
                      <span className={`font-bold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-brand-dark dark:text-white'}`}>
                        {new Date(loan.dueAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {loan.status === 'ACTIVE' && (
                  <div className="pt-4 mt-3 border-t border-brand-navy/5 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-brand-mutedText dark:text-white/50">
                      Standard loan cycle
                    </span>
                    <button
                      onClick={() => setSelectedLoanForRenewal(loan)}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-navy hover:bg-brand-royal text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Request 7-Day Renewal
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Renewal Request Modal */}
      {selectedLoanForRenewal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-dark/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-brand-navy rounded-3xl border border-brand-navy/10 dark:border-white/15 shadow-elevated p-6 text-brand-dark dark:text-white animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedLoanForRenewal(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-brand-mutedText dark:text-white/60 hover:text-brand-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-brand-royal/10 dark:bg-brand-cyan/20 flex items-center justify-center text-brand-royal dark:text-brand-cyan mb-3">
              <RotateCw className="w-5 h-5" />
            </div>

            <h3 className="font-heading font-bold text-lg">Loan Extension Request</h3>
            <p className="text-xs text-brand-mutedText dark:text-white/70 mt-1">
              Apply for an additional 7 days on{' '}
              <span className="font-semibold text-brand-dark dark:text-white">
                {selectedLoanForRenewal.bookCopy?.book?.title}
              </span>
            </p>

            <form onSubmit={handleRequestRenewal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1.5">
                  Academic Reason / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={renewalReason}
                  onChange={(e) => setRenewalReason(e.target.value)}
                  placeholder="e.g. Completing final project chapter research..."
                  className="w-full p-3 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none focus:border-brand-royal dark:focus:border-brand-cyan"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-brand-royal/10 border border-blue-200 dark:border-brand-royal/20 text-xs text-brand-darkText dark:text-white/80">
                <p className="font-semibold text-brand-royal dark:text-brand-cyan mb-0.5">Policy Notice</p>
                Each loan is eligible for a maximum of 2 renewals, provided no other student has placed an active reservation on this book.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLoanForRenewal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-mutedText dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
