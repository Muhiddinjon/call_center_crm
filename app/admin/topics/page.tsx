'use client';

import { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  GripVertical,
} from 'lucide-react';
import type { Topic } from '@/lib/types';

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/admin/topics');
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      }
    } catch (error) {
      console.error('Fetch topics error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleAdd = async () => {
    if (!newTopicName.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTopicName.trim() }),
      });

      if (response.ok) {
        setNewTopicName('');
        setIsAdding(false);
        fetchTopics();
      }
    } catch (error) {
      console.error('Add topic error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditName('');
        fetchTopics();
      }
    } catch (error) {
      console.error('Update topic error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (topic: Topic) => {
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !topic.isActive }),
      });

      if (response.ok) {
        fetchTopics();
      }
    } catch (error) {
      console.error('Toggle topic error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu mavzuni o\'chirishni xohlaysizmi?')) return;

    try {
      const response = await fetch(`/api/admin/topics/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTopics();
      }
    } catch (error) {
      console.error('Delete topic error:', error);
    }
  };

  const startEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setEditName(topic.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Murojaat turlari</h1>
          <p className="text-gray-500">Qo'ng'iroq mavzularini boshqaring</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Yangi mavzu
          </button>
        )}
      </div>

      {/* Add new topic form */}
      {isAdding && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Mavzu nomini kiriting..."
              className="form-input flex-1"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newTopicName.trim()}
              className="btn btn-primary px-4"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewTopicName('');
              }}
              className="btn btn-secondary px-4"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Topics list */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Mavzular mavjud emas</p>
          </div>
        ) : (
          <div className="divide-y">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50"
              >
                <GripVertical className="w-5 h-5 text-gray-300 cursor-move" />

                {editingId === topic.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="form-input flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(topic.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <button
                      onClick={() => handleUpdate(topic.id)}
                      disabled={saving || !editName.trim()}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <span
                        className={
                          topic.isActive ? 'text-gray-800' : 'text-gray-400 line-through'
                        }
                      >
                        {topic.name}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleActive(topic)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        topic.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {topic.isActive ? 'Faol' : 'Nofaol'}
                    </button>

                    <button
                      onClick={() => startEdit(topic)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(topic.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
