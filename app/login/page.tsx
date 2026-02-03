'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones, User, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Xatolik yuz berdi');
        return;
      }

      // Redirect to appropriate page based on role
      if (data.user.isAdmin) {
        router.push('/admin');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch {
      setError('Server bilan bog\'lanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-10 text-center text-white">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
              <Headphones className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold">Call Center CRM</h1>
            <p className="text-white/80 mt-2">Tizimga kirish</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="form-label">Login</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Loginni kiriting"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Parol</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Parolni kiriting"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Kirish...
                </>
              ) : (
                'Kirish'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/60 text-sm mt-6">
          Call Center CRM v2.0 - Next.js
        </p>
      </div>
    </div>
  );
}
