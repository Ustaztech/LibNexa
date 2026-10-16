import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { Users, UserPlus, Search, CheckCircle2, Ban, X, Mail, Phone, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const AdminUsersView: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Librarian Modal state
  const [showAddLibrarian, setShowAddLibrarian] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [membershipNumber, setMembershipNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmittingLibrarian, setIsSubmittingLibrarian] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers({
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        search: search || undefined,
      });
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to load users',
        message: err.message || 'Could not fetch user accounts from database.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, search]);

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.updateUserStatus(user.id, { accountStatus: nextStatus });
      showToast({
        type: 'info',
        title: 'Status Updated',
        message: `${user.fullName} is now ${nextStatus}.`,
      });
      fetchUsers();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Could not update user', message: err.message });
    }
  };

  const handleCreateLibrarian = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLibrarian(true);
    try {
      await api.createLibrarian({
        fullName,
        email,
        password,
        membershipNumber: membershipNumber || undefined,
        phone: phone || undefined,
      });
      showToast({
        type: 'success',
        title: 'Librarian Appointed',
        message: `${fullName} has been registered with circulation staff privileges.`,
      });
      setShowAddLibrarian(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setMembershipNumber('');
      setPhone('');
      fetchUsers();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to create staff account', message: err.message });
    } finally {
      setIsSubmittingLibrarian(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-brand-dark dark:text-white">
            User Accounts & Staff Directory
          </h2>
          <p className="text-xs text-brand-mutedText dark:text-white/60">
            Supervise registered student memberships, librarians, circulation roles, and account statuses
          </p>
        </div>

        <button
          onClick={() => setShowAddLibrarian(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Register New Librarian
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-white dark:bg-white/5 p-1 rounded-xl border border-brand-navy/10 dark:border-white/10 text-xs font-semibold">
          {['ALL', 'STUDENT', 'LIBRARIAN', 'ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                roleFilter === r
                  ? 'bg-brand-royal text-white shadow-sm'
                  : 'text-brand-mutedText dark:text-white/60 hover:text-brand-dark'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : `${r}s`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-brand-mutedText absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, matric..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-brand-mutedText">Loading user accounts...</div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-brand-navy/40 border border-brand-navy/10 text-xs text-brand-mutedText">
          No registered users found matching the filter criteria.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-brand-navy/60 shadow-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-bg dark:bg-white/5 text-brand-mutedText dark:text-white/70 font-semibold border-b border-brand-navy/10 dark:border-white/10">
              <tr>
                <th className="p-3">User & Contact</th>
                <th className="p-3">Identifier / Department</th>
                <th className="p-3">System Role</th>
                <th className="p-3">Account Status</th>
                <th className="p-3 text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-navy/5 dark:divide-white/5">
              {users.map((u) => {
                const isSuspended = u.accountStatus === 'SUSPENDED';

                return (
                  <tr key={u.id} className="hover:bg-brand-bg/40 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-brand-dark dark:text-white">{u.fullName}</div>
                      <div className="text-[11px] text-brand-mutedText dark:text-white/60">{u.email}</div>
                    </td>
                    <td className="p-3">
                      {u.matricNumber ? (
                        <div className="font-mono text-brand-royal dark:text-brand-cyan font-semibold">
                          {u.matricNumber}
                        </div>
                      ) : u.membershipNumber ? (
                        <div className="font-mono text-brand-gold font-semibold">
                          {u.membershipNumber}
                        </div>
                      ) : (
                        <div className="text-brand-mutedText">N/A</div>
                      )}
                      <div className="text-[11px] text-brand-mutedText">{u.department || 'NSUK'}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                            : u.role === 'LIBRARIAN'
                            ? 'bg-brand-teal/15 text-brand-teal border border-brand-teal/20'
                            : 'bg-blue-500/15 text-blue-500 border border-blue-500/20'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {isSuspended ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/20">
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                            isSuspended
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {isSuspended ? 'Reactivate' : 'Suspend Access'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Librarian Modal */}
      {showAddLibrarian && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-dark/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-brand-navy rounded-3xl border border-brand-navy/10 dark:border-white/15 shadow-elevated p-6 text-brand-dark dark:text-white animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddLibrarian(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-brand-mutedText hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-bold text-lg">Appoint University Librarian</h3>
            <p className="text-xs text-brand-mutedText dark:text-white/70 mt-1">
              Create official staff credentials with Reader Services & Circulation privileges
            </p>

            <form onSubmit={handleCreateLibrarian} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mallam Haruna Danjuma"
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Official University Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="h.danjuma@nsuk.edu.ng"
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Staff Membership Number</label>
                <input
                  type="text"
                  value={membershipNumber}
                  onChange={(e) => setMembershipNumber(e.target.value)}
                  placeholder="NSUK-LIB-003"
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLibrarian(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-mutedText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLibrarian}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  {isSubmittingLibrarian ? 'Creating...' : 'Grant Privileges'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
