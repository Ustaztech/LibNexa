import React, { useState } from 'react';
import { BorrowingRequest } from '../../types';
import { Clock, CheckCircle2, XCircle, AlertCircle, Bookmark, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';

interface StudentRequestsViewProps {
  requests: BorrowingRequest[];
  onRefresh: () => void;
}

export const StudentRequestsView: React.FC<StudentRequestsViewProps> = ({ requests }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = requests.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const getStatusBadge = (status: BorrowingRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Under Librarian Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Approved • Ready for Pickup
          </span>
        );
      case 'COLLECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Collected (Active Loan)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-500/10 text-gray-500 border border-gray-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-brand-dark dark:text-white">
            Borrowing Requests Tracking
          </h2>
          <p className="text-xs text-brand-mutedText dark:text-white/60">
            Real-time status updates of your submitted borrowing requests
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-white dark:bg-white/5 p-1 rounded-xl border border-brand-navy/10 dark:border-white/10 text-xs font-semibold">
          {['ALL', 'PENDING', 'APPROVED', 'COLLECTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === st
                  ? 'bg-brand-royal text-white shadow-sm'
                  : 'text-brand-mutedText dark:text-white/60 hover:text-brand-dark'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-brand-navy/40 border border-brand-navy/5 dark:border-white/10 shadow-card">
          <Bookmark className="w-12 h-12 text-brand-royal/30 dark:text-brand-cyan/30 mx-auto mb-3" />
          <h3 className="font-heading font-bold text-base text-brand-dark dark:text-white">
            No Requests Found
          </h3>
          <p className="text-xs text-brand-mutedText dark:text-white/60 mt-1 max-w-sm mx-auto">
            You do not have any requests under status "{filterStatus}". Browse the catalog to borrow resources.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isApproved = req.status === 'APPROVED';
            return (
              <div
                key={req.id}
                className={`p-5 rounded-2xl bg-white dark:bg-brand-navy/60 border shadow-card transition-all ${
                  isApproved
                    ? 'border-emerald-400/50 bg-emerald-50/15 dark:bg-emerald-950/20'
                    : 'border-brand-navy/5 dark:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white">
                      {req.book?.title}
                    </h3>
                    <p className="text-xs text-brand-mutedText dark:text-white/60 mt-0.5">
                      Requested on {new Date(req.requestedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {req.book?.shelfLocation && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-brand-royal dark:text-brand-cyan mt-1">
                        <MapPin className="w-3 h-3" />
                        Shelf: {req.book.shelfLocation}
                      </div>
                    )}
                  </div>

                  <div>{getStatusBadge(req.status)}</div>
                </div>

                {/* Approved Collection Alert */}
                {isApproved && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Collection Ready at Reader Services Desk</p>
                      <p className="mt-0.5 opacity-90 leading-relaxed">
                        Please present your NSUK Student ID card to Mallam Yakubu or Mrs. Adeyemi at the circulation counter to pick up your physical copy.
                        {req.collectionDeadline && (
                          <span className="block mt-1 font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                            Deadline to collect: {new Date(req.collectionDeadline).toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejected Reason Alert */}
                {req.status === 'REJECTED' && req.rejectionReason && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-900 dark:text-rose-200">
                    <p className="font-bold">Reason for Rejection:</p>
                    <p className="mt-0.5 opacity-90">{req.rejectionReason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
