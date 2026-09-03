'use client';

import { useEffect, useState } from 'react';
import {
  getAllEmployees,
  addEmployee,
  editEmployee,
  deactivateEmployeeAction,
  reactivateEmployeeAction,
  resetPasswordAction,
} from '@/app/actions/employee-actions';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog';
import {
  Users,
  UserPlus,
  Edit2,
  Lock,
  UserCheck,
  UserX,
  Search,
  X,
  Key,
} from 'lucide-react';
import type { EmployeePublic, UserRole } from '@/lib/types';

export default function EmployeesPage() {
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();
  const [employees, setEmployees] = useState<EmployeePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeePublic | null>(null);
  const [resettingEmp, setResettingEmp] = useState<EmployeePublic | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields for Add
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [tempPassword, setTempPassword] = useState('');

  // Form fields for Edit
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('EMPLOYEE');
  const [editStartDate, setEditStartDate] = useState('');

  // Form field for Password Reset
  const [newPassword, setNewPassword] = useState('');

  const loadEmployees = async () => {
    setLoading(true);
    const res = await getAllEmployees();
    if (res.success && res.data) {
      setEmployees(res.data);
    } else {
      showToast('error', res.error || 'Failed to load employees.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !tempPassword) {
      showToast('error', 'All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addEmployee({
        name: name.trim(),
        email: email.trim(),
        role,
        startDate,
        temporaryPassword: tempPassword,
      });

      if (res.success && res.data) {
        showToast('success', 'Employee added successfully!');
        setEmployees((prev) => [...prev, res.data!]);
        setShowAddModal(false);
        setName('');
        setEmail('');
        setTempPassword('');
      } else {
        showToast('error', res.error || 'Failed to add employee.');
      }
    } catch {
      showToast('error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (emp: EmployeePublic) => {
    setEditingEmp(emp);
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditRole(emp.role);
    setEditStartDate(emp.startDate);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;

    setSubmitting(true);
    try {
      const res = await editEmployee(editingEmp.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        startDate: editStartDate,
      });

      if (res.success && res.data) {
        showToast('success', 'Employee details updated.');
        setEmployees((prev) =>
          prev.map((e) => (e.id === editingEmp.id ? res.data! : e))
        );
        setEditingEmp(null);
      } else {
        showToast('error', res.error || 'Failed to update employee.');
      }
    } catch {
      showToast('error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingEmp || !newPassword) return;

    setSubmitting(true);
    try {
      const res = await resetPasswordAction(resettingEmp.id, newPassword);
      if (res.success) {
        showToast('success', res.message || 'Password reset successfully.');
        setResettingEmp(null);
        setNewPassword('');
      } else {
        showToast('error', res.error || 'Failed to reset password.');
      }
    } catch {
      showToast('error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (emp: EmployeePublic) => {
    const actionName = emp.active ? 'deactivate' : 'reactivate';
    const ok = await confirm({
      title: `${actionName.toUpperCase()} Employee`,
      message: `Are you sure you want to ${actionName} ${emp.name}? ${
        emp.active ? 'They will no longer be able to log in.' : 'They will regain portal access.'
      }`,
      confirmLabel: actionName === 'deactivate' ? 'Deactivate' : 'Reactivate',
      variant: emp.active ? 'danger' : 'primary',
    });
    if (!ok) return;

    const res = emp.active
      ? await deactivateEmployeeAction(emp.id)
      : await reactivateEmployeeAction(emp.id);

    if (res.success) {
      showToast('success', `Employee ${actionName}d.`);
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, active: !e.active } : e))
      );
    } else {
      showToast('error', res.error || `Failed to ${actionName} employee.`);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && emp.active) ||
      (statusFilter === 'INACTIVE' && !emp.active);
    return matchesSearch && matchesRole && matchesStatus;
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
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage organization staff accounts, roles, and access</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5 text-xs">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === s ? 'bg-[#ec1c24] text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s === 'ALL' ? 'All Status' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5 text-xs">
            {(['ALL', 'ADMIN', 'APPROVER', 'EMPLOYEE'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  roleFilter === r ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm w-full"
          />
        </div>
      </div>

      {/* Employees Table */}
      {filteredEmployees.length === 0 ? (
        <div className="card empty-state py-12">
          <Users className="w-12 h-12 empty-state-icon mx-auto" />
          <p className="mt-2 text-base font-medium text-gray-700">No employees found</p>
          <p className="text-xs text-gray-400">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="table-container shadow-sm">
          <table className="table table-wide">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#ec1c24]/10 text-[#ec1c24] flex items-center justify-center text-xs font-bold shrink-0">
                        {emp.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge text-[10px] ${
                        emp.role === 'ADMIN'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : emp.role === 'APPROVER'
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        emp.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {emp.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-sm text-gray-700">
                    {formatDate(emp.startDate)}
                  </td>
                  <td className="whitespace-nowrap text-xs text-gray-500">
                    {formatDate(emp.createdAt)}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="btn btn-sm btn-outline text-xs"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setResettingEmp(emp)}
                        className="btn btn-sm btn-outline text-xs"
                        title="Reset Password"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(emp)}
                        className={`btn btn-sm text-xs ${
                          emp.active ? 'btn-outline text-red-600 hover:bg-red-50' : 'btn-outline text-green-600 hover:bg-green-50'
                        }`}
                        title={emp.active ? 'Deactivate User' : 'Reactivate User'}
                      >
                        {emp.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Alex Johnson"
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@jedlik.in"
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="select"
                    disabled={submitting}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="APPROVER">Approver</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="label">Temporary Password</label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  minLength={8}
                  className="input"
                  required
                  disabled={submitting}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Employee will be prompted to change this upon initial sign in.
                </p>
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
                  {submitting ? <span className="spinner" /> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmp && (
        <div className="modal-overlay" onClick={() => setEditingEmp(null)}>
          <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Employee</h3>
              <button onClick={() => setEditingEmp(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="label">Full Name</label>
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
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="select"
                    disabled={submitting}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="APPROVER">Approver</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="input"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
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

      {/* Reset Password Modal */}
      {resettingEmp && (
        <div className="modal-overlay" onClick={() => setResettingEmp(null)}>
          <div className="modal max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
              </div>
              <button onClick={() => setResettingEmp(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Set a temporary password for <span className="font-semibold text-gray-800">{resettingEmp.name}</span>.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="label">New Temporary Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  minLength={8}
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingEmp(null)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Reset Password'}
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
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
