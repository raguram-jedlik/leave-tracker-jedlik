'use client';

import { useEffect, useState } from 'react';
import { getAuditLogEntries } from '@/app/actions/report-actions';
import { useToast } from '@/components/toast-provider';
import {
  ScrollText,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  RefreshCw,
} from 'lucide-react';
import type { AuditLogEntry } from '@/lib/types';

export default function AuditLogPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const loadLogs = async () => {
    setLoading(true);
    const res = await getAuditLogEntries(100);
    if (res.success && res.data) {
      setLogs(res.data);
    } else {
      showToast('error', res.error || 'Failed to load audit logs.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const actionTypes = Array.from(new Set(logs.map((l) => l.action))).sort();

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesSearch =
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()));
    return matchesAction && matchesSearch;
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
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Security and compliance trail for administrative and portal events</p>
        </div>
        <button onClick={loadLogs} className="btn btn-outline self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
          Refresh Log
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
          <label htmlFor="action-filter" className="text-xs text-gray-500 font-medium shrink-0">
            Filter Action:
          </label>
          <select
            id="action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:border-[#ec1c24] focus:ring-1 focus:ring-[#ec1c24]/30 w-full sm:w-auto"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            {actionTypes.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by user, action, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm w-full"
          />
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="card empty-state py-12">
          <ScrollText className="w-12 h-12 empty-state-icon mx-auto" />
          <p className="mt-2 text-base font-medium text-gray-700">No audit events found</p>
          <p className="text-xs text-gray-400">Events will appear here as users perform portal operations.</p>
        </div>
      ) : (
        <div className="table-container shadow-sm">
          <table className="table table-wide">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((entry, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="whitespace-nowrap text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatTimestamp(entry.timestamp)}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-semibold text-gray-900 text-sm">{entry.userName || 'System'}</span>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono whitespace-nowrap ${
                        entry.action.includes('APPROVED')
                          ? 'bg-green-100 text-green-800'
                          : entry.action.includes('REJECTED')
                          ? 'bg-red-100 text-red-800'
                          : entry.action.includes('ADDED') || entry.action.includes('CREATED')
                          ? 'bg-blue-100 text-blue-800'
                          : entry.action.includes('PASSWORD')
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="text-sm text-gray-700 max-w-[260px] sm:max-w-[400px]">
                    <span className="line-clamp-2 sm:line-clamp-none" title={entry.details}>
                      {entry.details || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return timestamp;
  }
}
