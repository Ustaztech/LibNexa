import React, { useState, useEffect } from 'react';
import { LibrarySettingItem } from '../../types';
import { Sliders, Save, ShieldAlert, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const AdminPoliciesView: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<LibrarySettingItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
        const map: Record<string, string> = {};
        res.data.forEach((s) => {
          map[s.settingKey] = s.settingValue;
        });
        setFormValues(map);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Load Policies',
        message: err.message || 'Could not fetch system settings from database.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings(formValues);
      showToast({
        type: 'success',
        title: 'Policies Updated',
        message: 'Library borrowing limits and parameters saved successfully across the system.',
      });
      fetchSettings();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Could not save policies',
        message: err.message || 'Verification failed. Keeping existing settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const POLICY_META: Record<string, { label: string; unit: string; description: string }> = {
    max_books_per_student: {
      label: 'Maximum Concurrently Borrowed Books per Student',
      unit: 'Books',
      description: 'Cap on active physical books a student can hold at any given time.',
    },
    standard_loan_duration_days: {
      label: 'Standard Loan Duration',
      unit: 'Days',
      description: 'Default circulation borrow window before an item is flagged overdue.',
    },
    max_concurrent_requests: {
      label: 'Maximum Pending Borrowing Requests',
      unit: 'Requests',
      description: 'Maximum pending requests a student may submit awaiting librarian review.',
    },
    collection_deadline_hours: {
      label: 'Approved Pickup / Collection Deadline',
      unit: 'Hours',
      description: 'Time window granted to a student to collect their approved book from circulation.',
    },
    max_renewals_per_loan: {
      label: 'Maximum Permitted Renewals per Loan',
      unit: 'Extensions',
      description: 'Upper threshold on loan extensions allowed before a physical return is mandated.',
    },
    renewal_extension_days: {
      label: 'Days Granted per Approved Renewal',
      unit: 'Days',
      description: 'Duration appended to original due date upon librarian renewal approval.',
    },
    reservation_collection_hours: {
      label: 'Reserved Book Hold Duration',
      unit: 'Hours',
      description: 'Time an available reserved book is held on the shelf for the queued student.',
    },
    reminder_schedule_days: {
      label: 'Automated Due Date Reminder Schedule',
      unit: 'Days',
      description: 'Comma-separated days before/on due date to trigger automated reminder notifications (e.g. 3,1,0).',
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-brand-dark dark:text-white">
            Library Borrowing Policies & System Rules
          </h2>
          <p className="text-xs text-brand-mutedText dark:text-white/60">
            Enforce institutional constraints across circulation, quota caps, collection timers, and reminders
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2 rounded-xl bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs font-semibold text-brand-mutedText hover:text-brand-dark dark:hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-white/40 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : settings.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-brand-navy/40 border border-brand-navy/10 text-xs text-brand-mutedText">
          No library settings configured in database.
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.map((s) => {
              const meta = POLICY_META[s.settingKey] || {
                label: s.settingKey.replace(/_/g, ' ').toUpperCase(),
                unit: '',
                description: s.description || '',
              };
              const currentVal = formValues[s.settingKey] ?? s.settingValue;

              return (
                <div
                  key={s.id || s.settingKey}
                  className="p-5 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 dark:border-white/10 shadow-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <label className="font-heading font-bold text-sm text-brand-dark dark:text-white leading-snug">
                        {meta.label}
                      </label>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-royal/10 dark:bg-white/10 text-brand-royal dark:text-brand-cyan font-bold whitespace-nowrap">
                        {s.settingKey}
                      </span>
                    </div>
                    <p className="text-xs text-brand-mutedText dark:text-white/60 mt-1.5 leading-relaxed">
                      {meta.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-brand-navy/5 dark:border-white/10 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-brand-mutedText dark:text-white/50">
                      Value ({meta.unit}):
                    </span>
                    <input
                      type="text"
                      required
                      value={currentVal}
                      onChange={(e) => handleChange(s.settingKey, e.target.value)}
                      className="w-32 px-3 py-1.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/15 dark:border-white/15 text-xs font-mono font-bold text-right text-brand-royal dark:text-brand-cyan focus:outline-none focus:border-brand-royal dark:focus:border-brand-cyan"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Bar */}
          <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-brand-navy/95 backdrop-blur-md border border-white/15 shadow-elevated text-white flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-white/80">
              <ShieldAlert className="w-4 h-4 text-brand-cyan flex-shrink-0" />
              <span>Policy changes take effect immediately across all student and staff circulation workflows.</span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal hover:opacity-95 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save All Policies'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
