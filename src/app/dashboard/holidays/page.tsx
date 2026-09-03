'use client';

import { useEffect, useState } from 'react';
import {
  getPublicHolidaysList,
  addPublicHoliday,
  editPublicHoliday,
  removePublicHoliday,
} from '@/app/actions/holiday-actions';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog';
import {
  Star,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Search,
  X,
} from 'lucide-react';
import type { PublicHoliday } from '@/lib/types';

export default function PublicHolidaysPage() {
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const loadHolidays = async () => {
    setLoading(true);
    const res = await getPublicHolidaysList();
    if (res.success && res.data) {
      setHolidays(res.data);
    } else {
      showToast('error', res.error || 'Failed to load public holidays.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      showToast('error', 'Holiday name and date are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addPublicHoliday({
        name: name.trim(),
        date,
        description: description.trim(),
      });

      if (res.success && res.data) {
        showToast('success', 'Public holiday added.');
        setHolidays((prev) =>
          [...prev, res.data!].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
        );
        setShowAddModal(false);
        setName('');
        setDate('');
        setDescription('');
      } else {
        showToast('error', res.error || 'Failed to add public holiday.');
      }
    } catch {
      showToast('error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (h: PublicHoliday) => {
    setEditingHoliday(h);
    setEditName(h.name);
    setEditDate(h.date);
    setEditDescription(h.description || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;

    setSubmitting(true);
    try {
      const res = await editPublicHoliday(editingHoliday.id, {
        name: editName.trim(),
        date: editDate,
        description: editDescription.trim(),
      });

      if (res.success && res.data) {
        showToast('success', 'Public holiday updated.');
        setHolidays((prev) =>
          prev
            .map((h) => (h.id === editingHoliday.id ? res.data! : h))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        );
        setEditingHoliday(null);
      } else {
        showToast('error', res.error || 'Failed to update public holiday.');
      }
    } catch {
      showToast('error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (h: PublicHoliday) => {
    const ok = await confirm({
      title: 'Delete Public Holiday',
      message: `Are you sure you want to remove "${h.name}" (${formatDate(h.date)})?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await removePublicHoliday(h.id);
    if (res.success) {
      showToast('success', 'Holiday deleted.');
      setHolidays((prev) => prev.filter((item) => item.id !== h.id));
    } else {
      showToast('error', res.error || 'Failed to delete holiday.');
    }
  };

  const filteredHolidays = holidays.filter((h) => {
    return (
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.description && h.description.toLowerCase().includes(search.toLowerCase())) ||
      h.date.includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Public Holidays</h1>
          <p className="page-subtitle">Configure official company non-working calendar days</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Public Holiday
        </button>
      </div>

      {/* Search and count bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{holidays.length}</span> official holiday(s) configured
        </p>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search holiday name, date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm w-full"
          />
        </div>
      </div>

      {/* Holidays List / Table */}
      {filteredHolidays.length === 0 ? (
        <div className="card empty-state py-12">
          <Calendar className="w-12 h-12 empty-state-icon mx-auto" />
          <p className="mt-2 text-base font-medium text-gray-700">No public holidays found</p>
          <p className="text-xs text-gray-400">Click "Add Public Holiday" to establish the company schedule.</p>
        </div>
      ) : (
        <div className="table-container shadow-sm">
          <table className="table table-wide">
            <thead>
              <tr>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Day</th>
                <th>Description</th>
                <th>Created By</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHolidays.map((h) => {
                const dayName = new Date(h.date + 'T00:00:00+05:30').toLocaleDateString('en-IN', {
                  weekday: 'long',
                });
                return (
                  <tr key={h.id} className="hover:bg-gray-50/80 transition-colors">
                    <td>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span className="font-semibold text-gray-900">{h.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap font-medium text-gray-900 text-sm">
                      {formatDate(h.date)}
                    </td>
                    <td className="text-sm text-gray-600">{dayName}</td>
                    <td className="max-w-[280px]">
                      <p className="truncate text-sm text-gray-600" title={h.description || ''}>
                        {h.description || '—'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-xs text-gray-500">
                      {h.createdBy || 'Admin'}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(h)}
                          className="btn btn-sm btn-outline text-xs"
                          title="Edit Holiday"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(h)}
                          className="btn btn-sm btn-outline text-red-600 hover:bg-red-50 text-xs"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Public Holiday</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="label">Holiday Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Independence Day"
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="label">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details or scope..."
                  className="textarea text-sm"
                  rows={2}
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Holiday Modal */}
      {editingHoliday && (
        <div className="modal-overlay" onClick={() => setEditingHoliday(null)}>
          <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Public Holiday</h3>
              <button onClick={() => setEditingHoliday(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="label">Holiday Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="textarea text-sm"
                  rows={2}
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHoliday(null)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
