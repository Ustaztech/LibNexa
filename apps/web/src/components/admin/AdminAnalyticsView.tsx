import React, { useState, useEffect } from 'react';
import { SystemOverviewStats, AnalyticsChartsData } from '../../types';
import { BarChart3, Download, TrendingUp, BookOpen, Layers, Users, Clock, AlertTriangle, FileSpreadsheet, FileCode, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { downloadCSV, downloadJSON } from '../../utils/exportHelpers';
import { useToast } from '../../context/ToastContext';

export const AdminAnalyticsView: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<SystemOverviewStats | null>(null);
  const [charts, setCharts] = useState<AnalyticsChartsData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, chartsRes] = await Promise.all([
        api.getOverviewStats(),
        api.getAnalyticsCharts(),
      ]);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (chartsRes.success && chartsRes.data) setCharts(chartsRes.data);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Analytics Load Failed',
        message: err.message || 'Could not fetch analytics from database.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = async (type: 'INVENTORY' | 'CIRCULATION' | 'OVERDUE' | 'AUDIT') => {
    setIsExporting(true);
    try {
      const res = await api.exportReport(type);
      if (res.success && res.data?.records && res.data.records.length > 0) {
        downloadCSV(`libnexa_${type.toLowerCase()}_report`, res.data.records);
        showToast({ type: 'success', title: 'Export Generated', message: `Downloaded ${type} CSV report.` });
      } else {
        showToast({ type: 'info', title: 'No Data to Export', message: `No active records found for ${type}.` });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Export Failed', message: err.message || 'Could not generate report export.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = async (type: 'INVENTORY' | 'CIRCULATION') => {
    try {
      const res = await api.exportReport(type);
      if (res.success && res.data) {
        downloadJSON(`libnexa_${type.toLowerCase()}_dump`, res.data);
        showToast({ type: 'success', title: 'JSON Export Complete' });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Export Failed', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-brand-dark dark:text-white">
            Library Circulation Analytics & Reports
          </h2>
          <p className="text-xs text-brand-mutedText dark:text-white/60">
            Real-time borrowing metrics, inventory distribution, popular titles, and exportable data
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportCSV('INVENTORY')}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs font-semibold text-brand-dark dark:text-white hover:border-brand-royal transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            Export Inventory CSV
          </button>
          <button
            onClick={() => handleExportCSV('CIRCULATION')}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs font-semibold text-brand-dark dark:text-white hover:border-brand-royal transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-teal" />
            Export Circulation CSV
          </button>
          <button
            onClick={() => handleExportJSON('CIRCULATION')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs font-semibold text-brand-dark dark:text-white hover:border-brand-royal transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileCode className="w-3.5 h-3.5 text-brand-cyan" />
            JSON Dump
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-brand-mutedText">Loading system analytics...</div>
      ) : (
        <>
          {/* Primary KPI Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 dark:border-white/10 shadow-card">
                <span className="text-[10px] font-semibold text-brand-mutedText dark:text-white/50 uppercase tracking-wider block">
                  Total Catalog Titles
                </span>
                <p className="text-2xl font-heading font-extrabold text-brand-royal dark:text-brand-cyan mt-1">
                  {stats.inventory.totalTitles}
                </p>
                <span className="text-[11px] text-brand-mutedText dark:text-white/50 mt-0.5 block">
                  {stats.inventory.totalCopies} physical copies
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 dark:border-white/10 shadow-card">
                <span className="text-[10px] font-semibold text-brand-mutedText dark:text-white/50 uppercase tracking-wider block">
                  Active Loans
                </span>
                <p className="text-2xl font-heading font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  {stats.circulation.activeLoans}
                </p>
                <span className="text-[11px] text-brand-mutedText dark:text-white/50 mt-0.5 block">
                  {stats.inventory.availableCopies} available on shelf
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 dark:border-white/10 shadow-card">
                <span className="text-[10px] font-semibold text-brand-mutedText dark:text-white/50 uppercase tracking-wider block">
                  Overdue Items
                </span>
                <p className="text-2xl font-heading font-extrabold text-rose-500 mt-1">
                  {stats.circulation.overdueLoans}
                </p>
                <span className="text-[11px] text-brand-mutedText dark:text-white/50 mt-0.5 block">
                  Requires return action
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 dark:border-white/10 shadow-card">
                <span className="text-[10px] font-semibold text-brand-mutedText dark:text-white/50 uppercase tracking-wider block">
                  Registered Students
                </span>
                <p className="text-2xl font-heading font-extrabold text-brand-gold mt-1">
                  {stats.users.totalStudents}
                </p>
                <span className="text-[11px] text-brand-mutedText dark:text-white/50 mt-0.5 block">
                  {stats.users.totalLibrarians} circulation staff
                </span>
              </div>
            </div>
          )}

          {/* Visual Charts & Breakdowns */}
          {charts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Most Borrowed Titles */}
              <div className="p-5 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 dark:border-white/10 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-teal" />
                    Most In-Demand Titles
                  </h3>
                  <span className="text-[11px] text-brand-mutedText dark:text-white/50">Circulation Count</span>
                </div>

                {charts.mostBorrowed.length === 0 ? (
                  <div className="py-6 text-center text-xs text-brand-mutedText">No loan records yet.</div>
                ) : (
                  <div className="space-y-3">
                    {charts.mostBorrowed.map((b, idx) => {
                      const max = charts.mostBorrowed[0]?.count || 1;
                      const pct = Math.round((b.count / max) * 100);

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-brand-dark dark:text-white truncate max-w-[240px]">
                              {idx + 1}. {b.title}
                            </span>
                            <span className="font-bold text-brand-royal dark:text-brand-cyan">{b.count} loans</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-brand-bg dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-royal to-brand-teal transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subject Category Distribution */}
              <div className="p-5 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 dark:border-white/10 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm text-brand-dark dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-royal dark:text-brand-cyan" />
                    Collection by Academic Discipline
                  </h3>
                  <span className="text-[11px] text-brand-mutedText dark:text-white/50">Titles</span>
                </div>

                {charts.categoryDistribution.length === 0 ? (
                  <div className="py-6 text-center text-xs text-brand-mutedText">No categories registered.</div>
                ) : (
                  <div className="space-y-3">
                    {charts.categoryDistribution.map((c, idx) => {
                      const totalTitles = charts.categoryDistribution.reduce((acc, curr) => acc + curr.count, 0) || 1;
                      const pct = Math.round((c.count / totalTitles) * 100);

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-brand-dark dark:text-white">{c.name}</span>
                            <span className="text-brand-mutedText dark:text-white/60">
                              {c.count} titles ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-brand-bg dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-gold transition-all duration-500"
                              style={{ width: `${Math.max(pct, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
