import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import {
  Activity,
  Heart,
  Droplet,
  Scale,
  Thermometer,
  Plus,
  TrendingUp,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface MetricSummaryItem {
  type: string;
  count: number;
  latest: {
    value: number;
    secondaryValue?: number;
    unit: string;
    recordedAt: string;
  };
  min: number;
  max: number;
  average: number;
}

interface MetricLog {
  _id: string;
  type: string;
  value: number;
  secondaryValue?: number;
  unit: string;
  recordedAt: string;
  notes?: string;
}

export const HealthAnalytics: React.FC = () => {
  const [summary, setSummary] = useState<MetricSummaryItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<MetricLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [formType, setFormType] = useState<string>('BLOOD_PRESSURE');
  const [formValue, setFormValue] = useState<string>('');
  const [formSecondaryValue, setFormSecondaryValue] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, logsRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/metrics?limit=15'),
      ]);
      setSummary(sumRes.data.metrics || []);
      setRecentLogs(logsRes.data.metrics || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load health analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleCreateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      const payload: any = {
        type: formType,
        value: Number(formValue),
        notes: formNotes || undefined,
      };

      if (formType === 'BLOOD_PRESSURE') {
        payload.unit = 'mmHg';
        payload.secondaryValue = Number(formSecondaryValue);
      } else if (formType === 'HEART_RATE') {
        payload.unit = 'bpm';
      } else if (formType === 'GLUCOSE') {
        payload.unit = 'mg/dL';
      } else if (formType === 'WEIGHT') {
        payload.unit = 'kg';
      } else if (formType === 'TEMPERATURE') {
        payload.unit = '°C';
      }

      await api.post('/analytics/metrics', payload);
      setShowLogModal(false);
      setFormValue('');
      setFormSecondaryValue('');
      setFormNotes('');
      await fetchAnalytics();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record health metric');
    } finally {
      setFormSubmitting(false);
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'BLOOD_PRESSURE':
        return <Activity className="w-5 h-5 text-rose-400" />;
      case 'HEART_RATE':
        return <Heart className="w-5 h-5 text-red-400" />;
      case 'GLUCOSE':
        return <Droplet className="w-5 h-5 text-amber-400" />;
      case 'WEIGHT':
        return <Scale className="w-5 h-5 text-blue-400" />;
      case 'TEMPERATURE':
        return <Thermometer className="w-5 h-5 text-orange-400" />;
      default:
        return <TrendingUp className="w-5 h-5 text-teal-400" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-teal-400" />
            Health Analytics & Vitals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track vital signs and review purely objective statistical summaries from your recorded logs.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-teal-900/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Vital</span>
        </button>
      </div>

      {/* Mandatory Non-Diagnostic Advisory */}
      <div className="p-4 bg-amber-950/40 border border-amber-600/30 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Advisory:</strong> Health Analytics provides patient self-tracking calculations (minimum,
          maximum, and mathematical mean) derived strictly from your entered data. It is not an automated diagnosis
          or clinical monitoring system.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Calculating vitals summary...</div>
      ) : summary.length === 0 ? (
        <div className="p-8 text-center bg-navy-900 border border-slate-800 rounded-3xl space-y-2">
          <Activity className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No vitals logged yet</h3>
          <p className="text-xs text-slate-500">Click &quot;Record Vital&quot; above to log your first health reading.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {summary.map((item) => (
            <div
              key={item.type}
              className="p-5 bg-navy-900 border border-slate-800 rounded-2xl shadow-sm space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {item.type.replace(/_/g, ' ')}
                </span>
                <div className="p-2 bg-slate-800/80 rounded-xl">{getMetricIcon(item.type)}</div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {item.type === 'BLOOD_PRESSURE' && item.latest.secondaryValue
                      ? `${item.latest.value}/${item.latest.secondaryValue}`
                      : item.latest.value}
                  </span>
                  <span className="text-xs text-teal-400 font-mono">{item.latest.unit}</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Last recorded: {new Date(item.latest.recordedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Min</span>
                  <span className="font-semibold text-slate-300">{item.min}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Avg</span>
                  <span className="font-semibold text-slate-300">{item.average}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Max</span>
                  <span className="font-semibold text-slate-300">{item.max}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log History Table */}
      <div className="bg-navy-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            Recent Vital History ({recentLogs.length})
          </h2>
        </div>

        {recentLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No logs to display.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Metric</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Reading</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Notes</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      {getMetricIcon(log.type)}
                      <span>{log.type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-300">
                      {log.type === 'BLOOD_PRESSURE' && log.secondaryValue
                        ? `${log.value}/${log.secondaryValue} ${log.unit}`
                        : `${log.value} ${log.unit}`}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{log.notes || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(log.recordedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to log vital */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Record Vital Sign</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMetric} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Metric Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="BLOOD_PRESSURE">Blood Pressure (Systolic/Diastolic)</option>
                  <option value="HEART_RATE">Heart Rate (bpm)</option>
                  <option value="GLUCOSE">Blood Glucose (mg/dL)</option>
                  <option value="WEIGHT">Weight (kg)</option>
                  <option value="TEMPERATURE">Temperature (°C)</option>
                </select>
              </div>

              {formType === 'BLOOD_PRESSURE' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Systolic (mmHg)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 120"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Diastolic (mmHg)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 80"
                      value={formSecondaryValue}
                      onChange={(e) => setFormSecondaryValue(e.target.value)}
                      className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-400 mb-1">Value</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 72"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Morning resting measurement"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
                >
                  {formSubmitting ? 'Saving...' : 'Save Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
