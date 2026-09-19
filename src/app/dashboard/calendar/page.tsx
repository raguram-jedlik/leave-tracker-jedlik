'use client';

import { useEffect, useState } from 'react';
import {
  getMyLeaveRequests,
  getAllLeaveRequests,
  getMyLeaveBalance,
  submitLeaveRequest,
} from '@/app/actions/leave-actions';
import {
  getPublicHolidaysList,
  getMyRegionalHolidays,
  getAllRegionalHolidays,
  submitRegionalHoliday,
} from '@/app/actions/holiday-actions';
import { useSession } from '@/components/session-provider';
import { useToast } from '@/components/toast-provider';
import { calculateLeaveDays } from '@/lib/date-utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  CalendarPlus,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Globe,
  Sparkles,
  Info,
} from 'lucide-react';
import type {
  LeaveRequest,
  PublicHoliday,
  RegionalHolidayRequest,
  LeaveBalance,
} from '@/lib/types';

interface CalendarEvent {
  id: string;
  label: string;
  type: 'approved' | 'pending' | 'holiday' | 'regional';
  details?: string;
  employeeName?: string;
}

export default function CalendarPage() {
  const user = useSession();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [regionals, setRegionals] = useState<RegionalHolidayRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);

  // Calendar selection state
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);

  // Leave Request Modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formType, setFormType] = useState<'leave' | 'regional'>('leave');
  const [leaveType, setLeaveType] = useState<'PAID' | 'UNPAID'>('PAID');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [regionalDate, setRegionalDate] = useState('');
  const [regionalReason, setRegionalReason] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Day View Modal (if user clicks on a date with events)
  const [activeDayEvents, setActiveDayEvents] = useState<{
    dateStr: string;
    events: CalendarEvent[];
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const isManagement = user.role === 'ADMIN' || user.role === 'APPROVER';
    const [leaveRes, holRes, regRes, balRes] = await Promise.all([
      isManagement ? getAllLeaveRequests() : getMyLeaveRequests(),
      getPublicHolidaysList(),
      isManagement ? getAllRegionalHolidays() : getMyRegionalHolidays(),
      getMyLeaveBalance(),
    ]);

    if (leaveRes.success && leaveRes.data) setLeaveRequests(leaveRes.data);
    if (holRes.success && holRes.data) setPublicHolidays(holRes.data);
    if (regRes.success && regRes.data) setRegionals(regRes.data);
    if (balRes.success && balRes.data) setBalance(balRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user.role]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const isSameDay = startDate !== '' && startDate === todayStr;

  // Build events map
  const eventsMap: Record<string, CalendarEvent[]> = {};

  const addEvent = (dateStr: string, event: CalendarEvent) => {
    if (!eventsMap[dateStr]) eventsMap[dateStr] = [];
    eventsMap[dateStr].push(event);
  };

  // Populate leave requests
  leaveRequests.forEach((req) => {
    if (req.status !== 'APPROVED' && req.status !== 'PENDING') return;
    const start = new Date(req.startDate + 'T00:00:00+05:30');
    const end = new Date(req.endDate + 'T00:00:00+05:30');
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const isManagement = user.role === 'ADMIN' || user.role === 'APPROVER';
      const label = isManagement
        ? `${req.employeeName} (${req.leaveType.charAt(0)})`
        : `${req.leaveType} Leave`;
      addEvent(dateStr, {
        id: req.id,
        label,
        type: req.status === 'APPROVED' ? 'approved' : 'pending',
        details: `${req.reason} (${req.numberOfDays} days)`,
        employeeName: req.employeeName,
      });
      current.setDate(current.getDate() + 1);
    }
  });

  // Populate public holidays
  publicHolidays.forEach((h) => {
    addEvent(h.date, {
      id: h.id,
      label: h.name,
      type: 'holiday',
      details: h.description,
    });
  });

  // Populate regional holidays
  regionals.forEach((r) => {
    if (r.status === 'APPROVED_PAID' || r.status === 'APPROVED_UNPAID' || r.status === 'PENDING') {
      addEvent(r.date, {
        id: r.id,
        label: `${r.holidayName}`,
        type: 'regional',
        details: r.reason,
        employeeName: r.employeeName,
      });
    }
  });

  // Date selection handler
  const handleCellClick = (dateStr: string) => {
    // If it's a past date, open day view if it has events, otherwise ignore
    if (dateStr < todayStr) {
      const events = eventsMap[dateStr];
      if (events && events.length > 0) {
        setActiveDayEvents({ dateStr, events });
      }
      return;
    }

    // Interactive date range selection
    if (!selectionStart || (selectionStart && selectionEnd)) {
      setSelectionStart(dateStr);
      setSelectionEnd(null);
      setStartDate(dateStr);
      setEndDate(dateStr);
      setRegionalDate(dateStr);
      setShowRequestModal(true);
    } else if (selectionStart && !selectionEnd) {
      if (dateStr < selectionStart) {
        setSelectionStart(dateStr);
        setSelectionEnd(selectionStart);
        setStartDate(dateStr);
        setEndDate(selectionStart);
      } else {
        setSelectionEnd(dateStr);
        setEndDate(dateStr);
      }
      setShowRequestModal(true);
    }
  };

  const openManualRequest = () => {
    setSelectionStart(todayStr);
    setSelectionEnd(todayStr);
    setStartDate(todayStr);
    setEndDate(todayStr);
    setRegionalDate(todayStr);
    setFormError('');
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setReason('');
    setHolidayName('');
    setRegionalReason('');
    setFormError('');
  };

  const numberOfDays = startDate && endDate ? calculateLeaveDays(startDate, endDate) : 0;

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!startDate || !endDate || !reason.trim()) {
      setFormError('All fields are required.');
      return;
    }

    if (numberOfDays <= 0) {
      setFormError('End date must be on or after start date.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitLeaveRequest({
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
      });

      if (result.success) {
        showToast('success', result.message || 'Leave request submitted successfully!');
        closeRequestModal();
        loadData();
      } else {
        setFormError(result.error || 'Failed to submit request.');
      }
    } catch {
      setFormError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!holidayName.trim() || !regionalDate || !regionalReason.trim()) {
      setFormError('All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitRegionalHoliday({
        holidayName: holidayName.trim(),
        date: regionalDate,
        reason: regionalReason.trim(),
      });

      if (result.success) {
        showToast('success', result.message || 'Regional holiday request submitted!');
        closeRequestModal();
        loadData();
      } else {
        setFormError(result.error || 'Failed to submit request.');
      }
    } catch {
      setFormError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDateSelected = (dateStr: string) => {
    if (!selectionStart) return false;
    if (selectionStart === dateStr) return true;
    if (selectionEnd === dateStr) return true;
    return false;
  };

  const isDateInRange = (dateStr: string) => {
    if (!selectionStart || !selectionEnd) return false;
    return dateStr > selectionStart && dateStr < selectionEnd;
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">
            Click any upcoming date or date range to request leave directly
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {balance && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-xs text-xs">
              <span className="text-gray-500">Cycle:</span>
              <span className="font-bold text-[#ec1c24]">{balance.currentCycle.label}</span>
              <span className={`font-bold ${balance.cycleSlotUsed ? 'text-amber-600' : 'text-green-600'}`}>
                ({balance.cycleSlotUsed ? '1/1 used' : '0/1 used'})
              </span>
            </div>
          )}
          <button onClick={openManualRequest} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Request Leave
          </button>
        </div>
      </div>

      {/* Interactive Helper Banner */}
      <div className="p-3 mb-4 rounded-xl bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-[#ec1c24]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#ec1c24] shrink-0" />
          <span>
            <strong className="text-gray-900 font-semibold">Tip:</strong> Click on any future calendar cell to quickly apply for leave.
          </span>
        </div>
        {balance?.cycleSlotUsed && (
          <span className="text-amber-700 font-medium shrink-0">
            Paid leave already used in this cycle
          </span>
        )}
      </div>

      {/* Legend & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn btn-outline btn-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 min-w-[170px] text-center">
            {monthName}
          </h2>
          <button onClick={nextMonth} className="btn btn-outline btn-sm">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600">Public Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-600">Regional Holiday</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid shadow-sm">
        {/* Day Headers */}
        {dayNames.map((day) => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}

        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-cell other-month" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const isPast = dateStr < todayStr;
          const isSelected = isDateSelected(dateStr);
          const inRange = isDateInRange(dateStr);
          const events = eventsMap[dateStr] || [];

          return (
            <div
              key={day}
              onClick={() => handleCellClick(dateStr)}
              className={`calendar-cell group ${isPast ? 'disabled' : 'interactive'} ${
                isToday ? 'today' : ''
              } ${isSelected ? 'selected' : ''} ${inRange ? 'in-range' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold ${
                    isToday
                      ? 'text-[#ec1c24] font-bold underline'
                      : isPast
                      ? 'text-gray-400'
                      : 'text-gray-800'
                  }`}
                >
                  {day}
                </span>

                {!isPast && (
                  <span className="text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors" aria-hidden="true">
                    +
                  </span>
                )}
              </div>

              {/* Event Tags */}
              <div className="space-y-1">
                {events.slice(0, 3).map((event, idx) => (
                  <div
                    key={idx}
                    className={`calendar-event ${event.type}`}
                    title={`${event.label}: ${event.details || ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDayEvents({ dateStr, events });
                    }}
                  >
                    {event.label}
                  </div>
                ))}
                {events.length > 3 && (
                  <div
                    className="text-[10px] text-gray-500 font-medium hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDayEvents({ dateStr, events });
                    }}
                  >
                    +{events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Request Leave Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={closeRequestModal}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-[#ec1c24]" />
                <h3 className="text-lg font-semibold text-gray-900">Request Time Off</h3>
              </div>
              <button onClick={closeRequestModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Leave Balance Banner */}
            {balance && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500">Cycle: </span>
                  <span className="font-bold text-gray-900">{balance.currentCycle.label}</span>
                  <span className={`ml-2 font-bold ${balance.cycleSlotUsed ? 'text-amber-600' : 'text-green-600'}`}>
                    {balance.cycleSlotUsed ? '1/1 used' : '0/1 used'}
                  </span>
                </div>
                {balance.cycleSlotUsed && balance.cycleSlotUsedBy && (
                  <span className="text-amber-600 font-medium">
                    Booked {balance.cycleSlotUsedBy.startDate}
                  </span>
                )}
              </div>
            )}

            {/* Toggle Form Type */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setFormType('leave');
                  setFormError('');
                }}
                className={`btn btn-sm flex-1 ${
                  formType === 'leave' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Standard Leave
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('regional');
                  setFormError('');
                }}
                className={`btn btn-sm flex-1 ${
                  formType === 'regional' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Regional / Religious Holiday
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Standard Leave Form */}
            {formType === 'leave' && (
              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <label className="label text-xs">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as 'PAID' | 'UNPAID')}
                    className="select text-sm"
                    disabled={submitting}
                  >
                    <option value="PAID">Paid Leave</option>
                    <option value="UNPAID">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={todayStr}
                      className="input text-sm"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || todayStr}
                      className="input text-sm"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Day preview */}
                {numberOfDays > 0 && (
                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                    <span className="font-semibold text-gray-900">{numberOfDays}</span>
                    <span className="text-gray-600"> calendar day{numberOfDays > 1 ? 's' : ''}</span>
                    {leaveType === 'PAID' && balance?.cycleSlotUsed && (
                      <p className="text-red-600 font-medium mt-1">
                        ⚠ Paid leave already used this cycle (only 1 per cycle allowed)
                      </p>
                    )}
                    {isSameDay && (
                      <p className="text-amber-700 font-medium mt-1">
                        ⚠ This leave starts today. It&apos;s generally best practice to request leave in advance whenever possible so your team and manager can plan around it.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="label text-xs">Reason / Handover Notes</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for requesting leave..."
                    className="textarea text-sm"
                    rows={3}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeRequestModal}
                    className="btn btn-secondary text-xs"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs"
                    disabled={submitting}
                  >
                    {submitting ? <span className="spinner" /> : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}

            {/* Regional Holiday Form */}
            {formType === 'regional' && (
              <form onSubmit={handleRegionalSubmit} className="space-y-4">
                <div>
                  <label className="label text-xs">Holiday Name</label>
                  <input
                    type="text"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="e.g., Onam, Pongal, Eid"
                    className="input text-sm"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="label text-xs">Date</label>
                  <input
                    type="date"
                    value={regionalDate}
                    onChange={(e) => setRegionalDate(e.target.value)}
                    min={todayStr}
                    className="input text-sm"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="label text-xs">Reason</label>
                  <textarea
                    value={regionalReason}
                    onChange={(e) => setRegionalReason(e.target.value)}
                    placeholder="Describe the cultural/religious festival..."
                    className="textarea text-sm"
                    rows={3}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeRequestModal}
                    className="btn btn-secondary text-xs"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs"
                    disabled={submitting}
                  >
                    {submitting ? <span className="spinner" /> : 'Submit Regional Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Day Events View Modal */}
      {activeDayEvents && (
        <div className="modal-overlay" onClick={() => setActiveDayEvents(null)}>
          <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#ec1c24]" />
                <h3 className="text-base font-semibold text-gray-900">
                  {formatDate(activeDayEvents.dateStr)}
                </h3>
              </div>
              <button
                onClick={() => setActiveDayEvents(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto mb-4">
              {activeDayEvents.events.map((ev, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-xs ${
                    ev.type === 'approved'
                      ? 'bg-green-50 border-green-200 text-green-900'
                      : ev.type === 'pending'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : ev.type === 'holiday'
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-purple-50 border-purple-200 text-purple-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">{ev.label}</span>
                    <span className="capitalize text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80">
                      {ev.type}
                    </span>
                  </div>
                  {ev.details && <p className="text-gray-600 mt-0.5">{ev.details}</p>}
                </div>
              ))}
            </div>

            {activeDayEvents.dateStr >= todayStr && (
              <div className="pt-2 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    const d = activeDayEvents.dateStr;
                    setActiveDayEvents(null);
                    setSelectionStart(d);
                    setSelectionEnd(d);
                    setStartDate(d);
                    setEndDate(d);
                    setRegionalDate(d);
                    setShowRequestModal(true);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Request Leave on this Date
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
