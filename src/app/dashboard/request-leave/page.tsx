'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitLeaveRequest, getMyLeaveBalance } from '@/app/actions/leave-actions';
import { submitRegionalHoliday } from '@/app/actions/holiday-actions';
import { calculateLeaveDays } from '@/lib/date-utils';
import { useToast } from '@/components/toast-provider';
import { CalendarPlus, AlertCircle } from 'lucide-react';
import type { LeaveBalance } from '@/lib/types';

export default function RequestLeavePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState<'leave' | 'regional'>('leave');

  // Leave form
  const [leaveType, setLeaveType] = useState<'PAID' | 'UNPAID'>('PAID');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Regional form
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');

  useEffect(() => {
    getMyLeaveBalance().then((res) => {
      if (res.success && res.data) setBalance(res.data);
    });
  }, []);

  const numberOfDays = startDate && endDate ? calculateLeaveDays(startDate, endDate) : 0;

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate || !reason.trim()) {
      setError('All fields are required.');
      return;
    }

    if (numberOfDays <= 0) {
      setError('End date must be on or after start date.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitLeaveRequest({
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
      });

      if (result.success) {
        showToast('success', result.message || 'Leave request submitted!');
        router.push('/dashboard/my-leaves');
      } else {
        setError(result.error || 'Failed to submit request.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!holidayName.trim() || !holidayDate || !holidayReason.trim()) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitRegionalHoliday({
        holidayName: holidayName.trim(),
        date: holidayDate,
        reason: holidayReason.trim(),
      });

      if (result.success) {
        showToast('success', result.message || 'Regional holiday request submitted!');
        router.push('/dashboard/my-leaves');
      } else {
        setError(result.error || 'Failed to submit request.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Request Leave</h1>
        <p className="page-subtitle">Submit a new leave or regional holiday request</p>
      </div>

      {/* Cycle Info */}
      {balance && (
        <div className="card mb-6 bg-gradient-to-r from-[#ec1c24]/5 to-transparent border-[#ec1c24]/20">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-[#ec1c24]/10">
              <CalendarPlus className="w-5 h-5 text-[#ec1c24]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Current cycle</p>
              <p className="text-base font-bold text-gray-900">{balance.currentCycle.label}</p>
              <p className={`text-xs mt-0.5 ${balance.cycleSlotUsed ? 'text-amber-600' : 'text-green-600'}`}>
                Paid leave {balance.cycleSlotUsed ? 'already used (1 / 1)' : 'available (0 / 1)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Type Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setFormType('leave'); setError(''); }}
          className={`btn ${formType === 'leave' ? 'btn-primary' : 'btn-outline'}`}
        >
          Leave Request
        </button>
        <button
          onClick={() => { setFormType('regional'); setError(''); }}
          className={`btn ${formType === 'regional' ? 'btn-primary' : 'btn-outline'}`}
        >
          Regional / Religious Holiday
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leave Request Form */}
      {formType === 'leave' && (
        <div className="card max-w-2xl">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Leave Request</h2>
          <form onSubmit={handleLeaveSubmit} className="space-y-4">
            <div>
              <label className="label">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as 'PAID' | 'UNPAID')}
                className="select"
                disabled={loading}
              >
                <option value="PAID">Paid Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  className="input"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  className="input"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Day Calculation */}
            {numberOfDays > 0 && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-sm">
                  <span className="font-semibold text-gray-900">{numberOfDays}</span>
                  <span className="text-gray-600"> calendar day{numberOfDays > 1 ? 's' : ''}</span>
                </p>
                {leaveType === 'PAID' && balance?.cycleSlotUsed && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠ You already have a paid leave in this cycle. Only 1 paid leave per cycle (26th–25th).
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="label">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="textarea"
                placeholder="Provide a reason for your leave request"
                disabled={loading}
                required
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || (leaveType === 'PAID' && balance?.cycleSlotUsed === true)}
              >
                {loading ? <span className="spinner" /> : 'Submit Request'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Regional Holiday Form */}
      {formType === 'regional' && (
        <div className="card max-w-2xl">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Regional / Religious Holiday Request</h2>
          <p className="text-sm text-gray-500 mb-4">
            Request a regional or religious holiday. Management will decide whether to approve it as paid or unpaid.
          </p>
          <form onSubmit={handleRegionalSubmit} className="space-y-4">
            <div>
              <label className="label">Holiday Name</label>
              <input
                type="text"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="input"
                placeholder="e.g., Onam, Pongal, Eid"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                min={today}
                className="input"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="label">Reason</label>
              <textarea
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                className="textarea"
                placeholder="Explain why you would like this holiday"
                disabled={loading}
                required
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Submit Request'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
