import React, { useState } from 'react';
import { BookOpen, Lock, Mail, User, School, CheckCircle2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Sign In state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student Registration state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [faculty, setFaculty] = useState('Faculty of Natural & Applied Sciences');
  const [regPassword, setRegPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(identifier, password);
    } catch {
      // toast shown in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await register({
        fullName,
        email,
        matricNumber,
        department,
        faculty,
        password: regPassword,
      });
    } catch {
      // toast shown in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white dark:bg-brand-navy rounded-3xl border border-brand-navy/10 dark:border-white/10 shadow-elevated overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left Brand Panel */}
        <div className="lg:col-span-5 mesh-gradient-header p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shadow-md">
                <BookOpen className="w-7 h-7 text-brand-cyan" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-extrabold text-2xl tracking-tight">
                    LIB<span className="text-brand-cyan">NEXA</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand-gold text-brand-dark rounded">
                    NSUK
                  </span>
                </div>
                <p className="text-[11px] text-white/70">Nasarawa State University, Keffi</p>
              </div>
            </div>

            <div className="space-y-4 my-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-brand-cyan">
                <Sparkles className="w-3.5 h-3.5" />
                Digital Circulation & Catalog System
              </span>

              <h1 className="font-heading font-extrabold text-2xl sm:text-3xl leading-snug">
                University Library Management Portal
              </h1>

              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Secure access for students, reader services librarians, and university administrators. Authenticate with your institutional credentials to manage loans, reservations, and inventory.
              </p>
            </div>
          </div>

          {/* Institutional Highlights */}
          <div className="relative z-10 pt-6 border-t border-white/15 space-y-2 text-xs text-white/75">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-cyan flex-shrink-0" />
              <span>Strict Role-Based Access Control (RBAC)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Real-time copy availability & shelf tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-gold flex-shrink-0" />
              <span>Standard 14-day borrowing & waitlist queue</span>
            </div>
          </div>

          {/* Decorative Background Artwork */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
            <BookOpen className="w-72 h-72 text-white" />
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Header Tabs */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-2xl text-brand-dark dark:text-white">
                    {mode === 'LOGIN' ? 'Sign In to Your Account' : 'Student Account Registration'}
                  </h2>
                  <p className="text-xs text-brand-mutedText dark:text-white/60 mt-1">
                    {mode === 'LOGIN'
                      ? 'Enter your university email or matriculation number'
                      : 'Register your NSUK student library membership profile'}
                  </p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 bg-brand-bg dark:bg-white/5 p-1 rounded-2xl border border-brand-navy/10 dark:border-white/10 mt-5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className={`py-2 rounded-xl transition-all ${
                    mode === 'LOGIN'
                      ? 'bg-brand-royal text-white shadow-sm'
                      : 'text-brand-mutedText dark:text-white/60 hover:text-brand-dark'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('REGISTER')}
                  className={`py-2 rounded-xl transition-all ${
                    mode === 'REGISTER'
                      ? 'bg-brand-royal text-white shadow-sm'
                      : 'text-brand-mutedText dark:text-white/60 hover:text-brand-dark'
                  }`}
                >
                  Student Registration
                </button>
              </div>
            </div>

            {/* SIGN IN FORM */}
            {mode === 'LOGIN' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1.5">
                    Email Address or Matriculation Number
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-brand-mutedText absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. matric@nsuk.edu.ng or matric number"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs text-brand-dark dark:text-white focus:outline-none focus:border-brand-royal dark:focus:border-brand-cyan transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-brand-mutedText absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs text-brand-dark dark:text-white focus:outline-none focus:border-brand-royal dark:focus:border-brand-cyan transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal hover:opacity-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* STUDENT REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-brand-mutedText absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ibrahim Abubakar Musa"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none focus:border-brand-royal dark:focus:border-brand-cyan"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                      University Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-brand-mutedText absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="matric@nsuk.edu.ng"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none focus:border-brand-royal dark:focus:border-brand-cyan"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                      Matriculation Number
                    </label>
                    <div className="relative">
                      <School className="w-4 h-4 text-brand-mutedText absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={matricNumber}
                        onChange={(e) => setMatricNumber(e.target.value)}
                        placeholder="NSUK/NAS/CSC/22/0142"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs font-mono focus:outline-none focus:border-brand-royal dark:focus:border-brand-cyan"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                      Faculty
                    </label>
                    <input
                      type="text"
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                    Password (Min 8 Characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-brand-mutedText absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-brand-bg dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none focus:border-brand-royal dark:focus:border-brand-cyan"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal hover:opacity-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating Profile...' : 'Complete Student Registration'}</span>
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-brand-navy/5 dark:border-white/10 text-center text-xs text-brand-mutedText dark:text-white/50">
              LIBNEXA Digital Library System • Nasarawa State University, Keffi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
