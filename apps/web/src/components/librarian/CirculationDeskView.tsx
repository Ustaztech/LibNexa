import React, { useState } from 'react';
import { BorrowingRequest, Loan, Renewal } from '../../types';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  User,
  Barcode,
  X,
  Send,
  FileCheck,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface CirculationDeskViewProps {
  requests: BorrowingRequest[];
  loans: Loan[];
  renewals: Renewal[];
  onRefresh: () => void;
}

export const CirculationDeskView: React.FC<CirculationDeskViewProps> = ({
  requests,
  loans,
  renewals,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'RETURNS' | 'RENEWALS' | 'OVERDUE'>('REQUESTS');

  // Rejection modal
  const [rejectingRequest, setRejectingRequest] = useState<BorrowingRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Maximum borrowing quota reached.');

  // Return Processing Modal
  const [processingReturnLoan, setProcessingReturnLoan] = useState<Loan | null>(null);
  const [returnCondition, setReturnCondition] = useState<'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED'>('GOOD');
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Search filter
  const [deskSearch, setDeskSearch] = useState('');

  // Counts
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const overdueLoans = loans.filter((l) => {
    return l.status === 'ACTIVE' && new Date(l.dueAt) < new Date();
  });
  const pendingRenewals = renewals.filter((rn) => rn.status === 'PENDING');

  // Handle Approve Request
  const handleApproveRequest = async (requestId: string) => {
    try {
      await api.reviewBorrowRequest(requestId, 'APPROVE');
      showToast({
        type: 'success',
        title: 'Borrow Request Approved',
        message: 'A physical copy has been assigned. 48-hour collection window is active.',
      });
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Approval Failed', message: err.message });
    }
  };

  // Handle Reject Request
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;
    try {
      await api.reviewBorrowRequest(rejectingRequest.id, 'REJECT', rejectionReason);
      showToast({ type: 'info', title: 'Request Rejected', message: 'Student notified with reason.' });
      setRejectingRequest(null);
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Rejection Failed', message: err.message });
    }
  };

  // Handle Confirm Collection (Handing over book to student)
  const handleConfirmCollection = async (requestId: string) => {
    try {
      await api.confirmCollection(requestId);
      showToast({
        type: 'success',
        title: 'Collection Confirmed',
        message: 'Book officially issued to student. Active loan record created for 14 days.',
      });
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Collection Failed', message: err.message });
    }
  };

  // Handle Process Book Return
  const handleProcessReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingReturnLoan) return;

    setIsSubmittingReturn(true);
    try {
      const res = await api.processReturn(processingReturnLoan.id, returnCondition, returnNotes);
      showToast({
        type: 'success',
        title: 'Return Processed Successfully',
        message: res.data?.message || 'Loan closed and copy returned to circulation.',
      });
      setProcessingReturnLoan(null);
      setReturnNotes('');
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Return Processing Failed', message: err.message });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Handle Renewal Review
  const handleReviewRenewal = async (renewalId: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      await api.reviewRenewal(renewalId, decision);
      showToast({
        type: decision === 'APPROVE' ? 'success' : 'info',
        title: decision === 'APPROVE' ? 'Renewal Approved' : 'Renewal Rejected',
        message: decision === 'APPROVE' ? 'Loan extended by 7 days.' : 'Student notified.',
      });
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Review Failed', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Counters Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('REQUESTS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-card ${
            activeTab === 'REQUESTS'
              ? 'bg-brand-royal text-white border-brand-royal'
              : 'bg-white dark:bg-brand-navy/60 border-brand-navy/5 dark:border-white/10 hover:border-brand-royal'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">Pending Requests</span>
            <Inbox className="w-4 h-4 opacity-75" />
          </div>
          <p className="text-2xl font-heading font-extrabold mt-1">{pendingRequests.length}</p>
          <span className="text-[11px] opacity-75 mt-0.5 block">{approvedRequests.length} ready for collection</span>
        </div>

        <div
          onClick={() => setActiveTab('RETURNS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-card ${
            activeTab === 'RETURNS'
              ? 'bg-brand-teal text-white border-brand-teal'
              : 'bg-white dark:bg-brand-navy/60 border-brand-navy/5 dark:border-white/10 hover:border-brand-teal'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">Active Loans</span>
            <Barcode className="w-4 h-4 opacity-75" />
          </div>
          <p className="text-2xl font-heading font-extrabold mt-1">{activeLoans.length}</p>
          <span className="text-[11px] opacity-75 mt-0.5 block">Process returns & check condition</span>
        </div>

        <div
          onClick={() => setActiveTab('RENEWALS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-card ${
            activeTab === 'RENEWALS'
              ? 'bg-brand-navy text-white border-brand-navy'
              : 'bg-white dark:bg-brand-navy/60 border-brand-navy/5 dark:border-white/10 hover:border-brand-navy'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">Renewal Requests</span>
            <RotateCcw className="w-4 h-4 opacity-75" />
          </div>
          <p className="text-2xl font-heading font-extrabold mt-1">{pendingRenewals.length}</p>
          <span className="text-[11px] opacity-75 mt-0.5 block">Extension evaluations</span>
        </div>

        <div
          onClick={() => setActiveTab('OVERDUE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-card ${
            activeTab === 'OVERDUE'
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-white dark:bg-brand-navy/60 border-brand-navy/5 dark:border-white/10 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">Overdue Items</span>
            <AlertTriangle className="w-4 h-4 opacity-75" />
          </div>
          <p className="text-2xl font-heading font-extrabold mt-1">{overdueLoans.length}</p>
          <span className="text-[11px] opacity-75 mt-0.5 block">Late returns watchlist</span>
        </div>
      </div>

      {/* Circulation Desk Tabs & Search */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-brand-navy/10 dark:border-white/10">
        <div className="flex items-center gap-1 bg-white dark:bg-white/5 p-1 rounded-xl border border-brand-navy/10 dark:border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'REQUESTS' ? 'bg-brand-royal text-white shadow-sm' : 'text-brand-mutedText dark:text-white/60'
            }`}
          >
            Borrow Requests ({pendingRequests.length + approvedRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('RETURNS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'RETURNS' ? 'bg-brand-teal text-white shadow-sm' : 'text-brand-mutedText dark:text-white/60'
            }`}
          >
            Return Desk & Active Loans ({activeLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('RENEWALS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'RENEWALS' ? 'bg-brand-navy text-white shadow-sm' : 'text-brand-mutedText dark:text-white/60'
            }`}
          >
            Renewals ({pendingRenewals.length})
          </button>
          <button
            onClick={() => setActiveTab('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'OVERDUE' ? 'bg-rose-600 text-white shadow-sm' : 'text-brand-mutedText dark:text-white/60'
            }`}
          >
            Overdue Radar ({overdueLoans.length})
          </button>
        </div>

        {/* Desk Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-brand-mutedText absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={deskSearch}
            onChange={(e) => setDeskSearch(e.target.value)}
            placeholder="Search student, book, matric..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* TAB 1: BORROW REQUESTS */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white">
              Student Requests Requiring Librarian Action
            </h3>
            <span className="text-xs text-brand-mutedText dark:text-white/50">
              Review quotas, approve copy assignment, and confirm physical collections
            </span>
          </div>

          {[...pendingRequests, ...approvedRequests].length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-white/5 border border-brand-navy/5 text-xs text-brand-mutedText">
              No borrowing requests currently waiting for review or collection.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-brand-navy/60 shadow-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-bg dark:bg-white/5 text-brand-mutedText dark:text-white/70 font-semibold border-b border-brand-navy/10 dark:border-white/10">
                  <tr>
                    <th className="p-3">Student Details</th>
                    <th className="p-3">Requested Title</th>
                    <th className="p-3">Requested At</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Librarian Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-navy/5 dark:divide-white/5">
                  {[...pendingRequests, ...approvedRequests].map((req) => (
                    <tr key={req.id} className="hover:bg-brand-bg/40 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-brand-dark dark:text-white">{req.user?.fullName}</div>
                        <div className="text-[11px] font-mono text-brand-royal dark:text-brand-cyan">
                          {req.user?.matricNumber || req.user?.email}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-brand-dark dark:text-white line-clamp-1">{req.book?.title}</div>
                        <div className="text-[11px] text-brand-mutedText dark:text-white/50 font-mono">
                          Shelf: {req.book?.shelfLocation || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3 text-brand-mutedText dark:text-white/60">
                        {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        {req.status === 'PENDING' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            PENDING REVIEW
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            APPROVED (WAITING PICKUP)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingRequest(req)}
                              className="px-3 py-1 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 font-semibold text-xs border border-rose-600/20 transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleConfirmCollection(req.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Hand Over & Activate Loan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RETURN DESK */}
      {activeTab === 'RETURNS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white">
              Reader Services Book Return Counter
            </h3>
            <span className="text-xs text-brand-mutedText dark:text-white/50">
              Inspect physical copy condition and return into library circulation
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-brand-navy/60 shadow-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg dark:bg-white/5 text-brand-mutedText dark:text-white/70 font-semibold border-b border-brand-navy/10 dark:border-white/10">
                <tr>
                  <th className="p-3">Accession / Barcode</th>
                  <th className="p-3">Book Title</th>
                  <th className="p-3">Borrower (Student)</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-navy/5 dark:divide-white/5">
                {activeLoans.map((loan) => {
                  const isLate = new Date(loan.dueAt) < new Date();
                  return (
                    <tr key={loan.id} className="hover:bg-brand-bg/40 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-brand-royal dark:text-brand-cyan">
                        {loan.bookCopy?.accessionNumber}
                      </td>
                      <td className="p-3 font-medium text-brand-dark dark:text-white max-w-xs truncate">
                        {loan.bookCopy?.book?.title}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-brand-dark dark:text-white">{loan.user?.fullName}</div>
                        <div className="text-[11px] font-mono text-brand-mutedText">{loan.user?.matricNumber}</div>
                      </td>
                      <td className="p-3">
                        <span className={`font-semibold ${isLate ? 'text-rose-500 font-bold' : 'text-brand-dark dark:text-white'}`}>
                          {new Date(loan.dueAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setProcessingReturnLoan(loan)}
                          className="px-3.5 py-1.5 rounded-xl bg-brand-teal hover:bg-brand-teal/80 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Process Return
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RENEWALS */}
      {activeTab === 'RENEWALS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white">
              Student Loan Extension Requests
            </h3>
            <span className="text-xs text-brand-mutedText dark:text-white/50">
              Grant standard 7-day extensions or reject if book has reservations
            </span>
          </div>

          {pendingRenewals.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-white/5 border border-brand-navy/5 text-xs text-brand-mutedText">
              No pending loan renewal requests.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRenewals.map((rn) => (
                <div
                  key={rn.id}
                  className="p-4 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 dark:border-white/10 shadow-card flex items-center justify-between flex-wrap gap-3"
                >
                  <div>
                    <h4 className="font-bold text-sm text-brand-dark dark:text-white">
                      {rn.loan?.bookCopy?.book?.title || 'Borrowed Book'}
                    </h4>
                    <p className="text-xs text-brand-mutedText dark:text-white/60">
                      Requested by <span className="font-semibold">{rn.requestedBy?.fullName}</span> ({rn.requestedBy?.matricNumber})
                    </p>
                    {rn.reason && (
                      <p className="text-xs italic text-brand-darkText/80 dark:text-white/70 mt-1">
                        "{rn.reason}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewRenewal(rn.id, 'APPROVE')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                    >
                      Approve (+7 Days)
                    </button>
                    <button
                      onClick={() => handleReviewRenewal(rn.id, 'REJECT')}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600/10 text-rose-600 hover:bg-rose-600/20 font-bold text-xs border border-rose-600/20"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OVERDUE RADAR */}
      {activeTab === 'OVERDUE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-rose-600 dark:text-rose-400">
              Overdue Borrowed Items & Reminders Radar
            </h3>
            <span className="text-xs text-brand-mutedText dark:text-white/50">
              Students past the standard 14-day return due date
            </span>
          </div>

          {overdueLoans.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-white/5 border border-brand-navy/5 text-xs text-emerald-600 font-semibold">
              Excellent! No overdue books in the library circulation currently.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-rose-200 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/20 shadow-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-100/40 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-semibold">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Contact (Email / Phone)</th>
                    <th className="p-3">Book & Accession</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Days Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-200/50 dark:divide-rose-900/30">
                  {overdueLoans.map((l) => {
                    const daysLate = Math.ceil((Date.now() - new Date(l.dueAt).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={l.id} className="hover:bg-rose-100/20">
                        <td className="p-3 font-bold text-brand-dark dark:text-white">
                          {l.user?.fullName}
                          <div className="text-[11px] font-mono text-brand-mutedText">{l.user?.matricNumber}</div>
                        </td>
                        <td className="p-3 text-brand-mutedText dark:text-white/70">
                          <div>{l.user?.email}</div>
                          <div className="text-[11px]">{l.user?.phone || 'No phone'}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-brand-dark dark:text-white">{l.bookCopy?.book?.title}</div>
                          <div className="text-[11px] font-mono text-brand-royal dark:text-brand-cyan">
                            Acc: {l.bookCopy?.accessionNumber}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-rose-600">
                          {new Date(l.dueAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                            {daysLate} Days Overdue
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Return Processing Modal */}
      {processingReturnLoan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-dark/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-brand-navy rounded-3xl border border-brand-navy/10 dark:border-white/15 shadow-elevated p-6 text-brand-dark dark:text-white animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setProcessingReturnLoan(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-brand-mutedText dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-brand-teal/15 flex items-center justify-center text-brand-teal mb-3">
              <RotateCcw className="w-5 h-5" />
            </div>

            <h3 className="font-heading font-bold text-lg">Process Physical Return</h3>
            <p className="text-xs text-brand-mutedText dark:text-white/70 mt-1">
              Returning copy <span className="font-mono font-bold text-brand-teal">{processingReturnLoan.bookCopy?.accessionNumber}</span> ({processingReturnLoan.bookCopy?.book?.title})
            </p>

            <form onSubmit={handleProcessReturnSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Inspected Physical Condition</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['NEW', 'GOOD', 'FAIR', 'DAMAGED'] as const).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setReturnCondition(cond)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        returnCondition === cond
                          ? 'bg-brand-teal text-white border-brand-teal shadow'
                          : 'bg-brand-bg dark:bg-white/5 border-brand-navy/10 dark:border-white/10 text-brand-mutedText'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Circulation Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Returned in excellent condition at circulation desk."
                  className="w-full p-3 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs text-brand-mutedText dark:text-white/70 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" />
                <span>
                  Returning this book will automatically trigger the reservation queue and reserve it for the next waiting student if any.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProcessingReturnLoan(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-mutedText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="px-5 py-2 rounded-xl bg-brand-teal text-white text-xs font-bold shadow-md hover:bg-brand-teal/90 disabled:opacity-50"
                >
                  {isSubmittingReturn ? 'Processing...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-dark/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-brand-navy rounded-3xl border border-brand-navy/10 dark:border-white/15 shadow-elevated p-6 text-brand-dark dark:text-white animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setRejectingRequest(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-brand-mutedText hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-bold text-lg text-rose-600">Reject Borrowing Request</h3>
            <p className="text-xs text-brand-mutedText dark:text-white/70 mt-1">
              Please specify the institutional reason for declining {rejectingRequest.user?.fullName}'s request.
            </p>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Reason for Rejection</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-mutedText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
