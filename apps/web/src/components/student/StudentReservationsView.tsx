import React, { useState, useEffect } from 'react';
import { Reservation, BookAvailabilitySubscription } from '../../types';
import { Users, Clock, CheckCircle2, X, Sparkles, MapPin, Bell, Mail, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface StudentReservationsViewProps {
  reservations: Reservation[];
  onRefresh: () => void;
}

export const StudentReservationsView: React.FC<StudentReservationsViewProps> = ({
  reservations,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'RESERVATIONS' | 'SUBSCRIPTIONS'>('RESERVATIONS');
  const [subscriptions, setSubscriptions] = useState<BookAvailabilitySubscription[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const fetchSubscriptions = () => {
    setLoadingSubs(true);
    api.getUserBookSubscriptions()
      .then((res) => {
        if (res.success && res.data) setSubscriptions(res.data);
      })
      .catch(() => {})
      .finally(() => setLoadingSubs(false));
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCancelReservation = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to cancel your reservation for "${title}"?`)) return;

    try {
      await api.cancelReservation(id);
      showToast({ type: 'info', title: 'Reservation Cancelled' });
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Could not cancel reservation', message: err.message });
    }
  };

  const handleUnsubscribe = async (bookId: string, title: string) => {
    try {
      await api.unsubscribeFromBookAvailability(bookId);
      showToast({ type: 'info', title: 'Unsubscribed', message: `Email alert removed for "${title}".` });
      fetchSubscriptions();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-brand-dark dark:text-white">
            Waitlists & Availability Email Alerts
          </h2>
          <p className="text-xs text-brand-mutedText dark:text-white/60">
            Track queued physical reservations and automated email notifications when books become available
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('RESERVATIONS')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'RESERVATIONS'
                ? 'bg-brand-royal text-white shadow-sm'
                : 'text-brand-mutedText hover:text-brand-dark dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Waitlist Queue ({reservations.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('SUBSCRIPTIONS');
              fetchSubscriptions();
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'SUBSCRIPTIONS'
                ? 'bg-brand-royal text-white shadow-sm'
                : 'text-brand-mutedText hover:text-brand-dark dark:hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Email Alerts ({subscriptions.length})
          </button>
        </div>
      </div>

      {activeTab === 'RESERVATIONS' ? (
        reservations.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-brand-navy/40 border border-brand-navy/5 dark:border-white/10 shadow-card">
            <Sparkles className="w-12 h-12 text-brand-royal/30 dark:text-brand-cyan/30 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-base text-brand-dark dark:text-white">
              No Active Reservations
            </h3>
            <p className="text-xs text-brand-mutedText dark:text-white/60 mt-1 max-w-sm mx-auto">
              When all physical copies of a book are on loan, you can join the queue by clicking "Reserve" on the catalog page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reservations.map((res) => {
              const isReady = res.status === 'READY_FOR_COLLECTION';

              return (
                <div
                  key={res.id}
                  className={`p-5 rounded-2xl bg-white dark:bg-brand-navy/60 border shadow-card flex flex-col justify-between ${
                    isReady
                      ? 'border-emerald-400/50 bg-emerald-50/15 dark:bg-emerald-950/20'
                      : 'border-brand-navy/5 dark:border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Queue Position #{res.queuePosition || 1}
                        </span>
                        <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white mt-2 line-clamp-1">
                          {res.book?.title}
                        </h3>
                        <p className="text-xs text-brand-mutedText dark:text-white/60">
                          Reserved on {new Date(res.reservedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isReady
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {res.status}
                      </span>
                    </div>

                    {isReady && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-900 dark:text-emerald-200">
                        <p className="font-bold">Book Has Been Returned and Held For You!</p>
                        <p className="mt-0.5">
                          Copy accession number:{' '}
                          <span className="font-mono font-semibold">
                            {res.assignedCopy?.accessionNumber || 'Assigned Copy'}
                          </span>
                          . Please collect within 48 hours. An automated email was sent to your inbox.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-brand-navy/5 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-brand-mutedText dark:text-white/50">
                      Queue priority active
                    </span>
                    <button
                      onClick={() => handleCancelReservation(res.id, res.book?.title || 'Book')}
                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold transition-colors"
                    >
                      Cancel Reservation
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        subscriptions.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-brand-navy/40 border border-brand-navy/5 dark:border-white/10 shadow-card">
            <Bell className="w-12 h-12 text-brand-royal/30 dark:text-brand-cyan/30 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-base text-brand-dark dark:text-white">
              No Book Availability Subscriptions
            </h3>
            <p className="text-xs text-brand-mutedText dark:text-white/60 mt-1 max-w-sm mx-auto">
              When a book is out of stock, click "Email Me When Available" in the book details to receive an instant automated email alert when copies are returned.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-5 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/5 dark:border-white/10 shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                        <Mail className="w-3 h-3" />
                        Email Alert Active
                      </span>
                      <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white mt-2 line-clamp-1">
                        {sub.book?.title}
                      </h3>
                      <p className="text-xs text-brand-mutedText dark:text-white/60">
                        ISBN: <span className="font-mono">{sub.book?.isbn}</span> • Subscribed on {new Date(sub.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-brand-mutedText dark:text-white/70">
                    You will receive an automated email notification as soon as physical copies of this book are added or returned to the library stacks.
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-brand-navy/5 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Monitoring catalogue...
                  </span>
                  <button
                    onClick={() => handleUnsubscribe(sub.bookId, sub.book?.title || 'Book')}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Unsubscribe
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
