'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions/auth-actions';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const result = await loginAction(email, password);

      if (result.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:p-4 bg-[#0a0a0a]">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 opacity-[0.08] pointer-events-none"
           style={{
             backgroundImage: 'linear-gradient(rgba(236,28,36,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(236,28,36,0.18) 1px, transparent 1px)',
             backgroundSize: '40px 40px',
           }}
           aria-hidden="true" />

      <div className="relative w-full max-w-md">
        {/* Red Glow Effect (subtle, kept for desktop) */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20 hidden sm:block pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(236,28,36,0.4), transparent 70%)' }}
             aria-hidden="true" />

        {/* Login Card */}
        <div className="relative bg-[#141414] sm:bg-white/5 sm:backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-6 sm:mb-8">
            <img
              src="/jedlik-logo.jpg"
              alt="Jedlik"
              className="mx-auto h-16 sm:h-20 w-auto"
            />
            <p className="text-[10px] sm:text-xs text-gray-400 tracking-[0.15em] uppercase mt-3">
              Employee Leave Portal
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-5 sm:mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#ec1c24] focus:ring-1 focus:ring-[#ec1c24]/30 transition-colors"
                placeholder="your.email@company.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#ec1c24] focus:ring-1 focus:ring-[#ec1c24]/30 transition-colors"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#ec1c24] hover:bg-[#b91c1c] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[2.75rem]"
            >
              {loading ? (
                <div className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-600 mt-5 sm:mt-6">
            Internal employee portal — Authorized access only
          </p>
        </div>
      </div>
    </div>
  );
}
