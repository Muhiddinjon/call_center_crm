'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Shield,
  User,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import type { UserResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    isAdmin: false,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      isAdmin: false,
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (user: UserResponse) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      fullName: user.fullName || '',
      isAdmin: user.isAdmin,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      if (editingUser) {
        // Update existing user
        const response = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: formData.fullName,
            password: formData.password || undefined,
            isAdmin: formData.isAdmin,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Xatolik yuz berdi');
        }
      } else {
        // Create new user
        if (!formData.password) {
          throw new Error('Parol kiritilishi shart');
        }

        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Xatolik yuz berdi');
        }
      }

      setShowModal(false);
      fetchUsers();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserResponse) => {
    if (!confirm(`${user.fullName || user.username}ni o'chirishni xohlaysizmi?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleToggleActive = async (user: UserResponse) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Toggle active error:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Foydalanuvchilar</h1>
          <p className="text-gray-600">Call center xodimlari</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Yangi foydalanuvchi
        </button>
      </div>

      {/* Users table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
                <th>Login</th>
                <th>Rol</th>
                <th>Holat</th>
                <th>Oxirgi kirish</th>
                <th>Yaratilgan</th>
                <th className="text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Foydalanuvchilar yo'q
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          user.isAdmin ? 'bg-purple-100' : 'bg-blue-100'
                        )}>
                          {user.isAdmin ? (
                            <Shield className="w-5 h-5 text-purple-600" />
                          ) : (
                            <User className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <span className="font-medium">{user.fullName || user.username}</span>
                      </div>
                    </td>
                    <td className="text-gray-600">{user.username}</td>
                    <td>
                      <span className={cn(
                        'badge',
                        user.isAdmin ? 'badge-purple' : 'badge-blue'
                      )}>
                        {user.isAdmin ? 'Admin' : 'Operator'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={cn(
                          'badge cursor-pointer',
                          user.isActive ? 'badge-green' : 'badge-red'
                        )}
                      >
                        {user.isActive ? 'Faol' : 'Nofaol'}
                      </button>
                    </td>
                    <td className="text-gray-600">
                      {user.lastLogin
                        ? format(new Date(user.lastLogin), 'dd.MM.yyyy HH:mm')
                        : '-'}
                    </td>
                    <td className="text-gray-600">
                      {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                          title="Tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">
                {editingUser ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="form-label">Login</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="form-input"
                  placeholder="username"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="form-label">
                  Parol {editingUser && <span className="text-gray-400">(bo'sh qoldiring o'zgarmaslik uchun)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="form-input"
                  placeholder="********"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="form-label">To'liq ism</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="form-input"
                  placeholder="Ism Familiya"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="isAdmin" className="text-sm text-gray-700">
                  Administrator huquqlari
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
