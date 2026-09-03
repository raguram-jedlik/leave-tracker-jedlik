'use client';

import { useEffect, useState } from 'react';
import { getSettingsList, updateSettingAction } from '@/app/actions/report-actions';
import { useToast } from '@/components/toast-provider';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import type { Setting } from '@/lib/types';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Form states
  const [monthlyEntitlement, setMonthlyEntitlement] = useState('1.5');
  const [carryForwardEnabled, setCarryForwardEnabled] = useState('false');
  const [maxCarryForward, setMaxCarryForward] = useState('5');

  const loadSettings = async () => {
    setLoading(true);
    const res = await getSettingsList();
    if (res.success && res.data) {
      setSettings(res.data);
      res.data.forEach((s) => {
        if (s.key === 'monthly_entitlement') setMonthlyEntitlement(s.value);
        if (s.key === 'carry_forward_enabled') setCarryForwardEnabled(s.value);
        if (s.key === 'max_carry_forward') setMaxCarryForward(s.value);
      });
    } else {
      showToast('error', res.error || 'Failed to load settings.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSetting = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      const res = await updateSettingAction(key, value);
      if (res.success) {
        showToast('success', `${key.replace(/_/g, ' ')} updated successfully.`);
      } else {
        showToast('error', res.error || 'Failed to update setting.');
      }
    } catch {
      showToast('error', 'An unexpected error occurred.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Policy & Settings</h1>
        <p className="page-subtitle">Configure organization leave policies, monthly accrual rates, and roll-over rules</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Monthly Entitlement */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[#ec1c24]/10 text-[#ec1c24] shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Monthly Paid Leave Accrual</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Number of paid leave days credited to each employee's account per completed month of service.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={monthlyEntitlement}
                onChange={(e) => setMonthlyEntitlement(e.target.value)}
                className="input pr-12 font-semibold text-gray-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                days / mo
              </span>
            </div>
            <button
              onClick={() => handleSaveSetting('monthly_entitlement', monthlyEntitlement)}
              disabled={savingKey === 'monthly_entitlement'}
              className="btn btn-primary"
            >
              {savingKey === 'monthly_entitlement' ? (
                <span className="spinner" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Accrual
                </>
              )}
            </button>
          </div>
        </div>

        {/* Carry Forward Policy */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Annual Carry-Forward Rule</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Enable or restrict the roll-over of unused paid leave balance to the next financial/calendar year.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="carry_forward"
                  checked={carryForwardEnabled === 'true'}
                  onChange={() => {
                    setCarryForwardEnabled('true');
                    handleSaveSetting('carry_forward_enabled', 'true');
                  }}
                  className="w-4 h-4 text-[#ec1c24] focus:ring-[#ec1c24]"
                />
                <span className="text-sm font-medium text-gray-800">Enabled</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="carry_forward"
                  checked={carryForwardEnabled === 'false'}
                  onChange={() => {
                    setCarryForwardEnabled('false');
                    handleSaveSetting('carry_forward_enabled', 'false');
                  }}
                  className="w-4 h-4 text-[#ec1c24] focus:ring-[#ec1c24]"
                />
                <span className="text-sm font-medium text-gray-800">Disabled (Lapses at year end)</span>
              </label>
            </div>

            {carryForwardEnabled === 'true' && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mt-3">
                <label className="label text-xs font-semibold text-gray-700 mb-1">Maximum Carry-Forward Cap</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="30"
                      value={maxCarryForward}
                      onChange={(e) => setMaxCarryForward(e.target.value)}
                      className="input pr-12 font-semibold text-gray-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                      max days
                    </span>
                  </div>
                  <button
                    onClick={() => handleSaveSetting('max_carry_forward', maxCarryForward)}
                    disabled={savingKey === 'max_carry_forward'}
                    className="btn btn-primary"
                  >
                    {savingKey === 'max_carry_forward' ? (
                      <span className="spinner" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Update Cap
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Important Notes on Calculation:</p>
            <p>
              Leave calculation runs dynamically using employee start date and completed service months. Any changes to monthly entitlement will immediately adjust balance projections for all staff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
