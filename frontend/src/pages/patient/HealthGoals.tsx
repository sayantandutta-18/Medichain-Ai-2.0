import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import {
  Target,
  Plus,
  X,
  TrendingUp,
  Clock,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface GoalProgressItem {
  id: string;
  metricType: string;
  initialValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  progressPct: number;
  startDate: string;
  targetDate: string;
  daysRemaining: number;
  status: 'IN_PROGRESS' | 'ACHIEVED' | 'MISSED';
  notes?: string;
}

const DEFAULT_UNITS: Record<string, string> = {
  BLOOD_PRESSURE: 'mmHg',
  HEART_RATE: 'bpm',
  GLUCOSE: 'mg/dL',
  CHOLESTEROL: 'mg/dL',
  WEIGHT: 'kg',
  TEMPERATURE: '°C',
};

export const HealthGoals: React.FC = () => {
  const [goals, setGoals] = useState<GoalProgressItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create Goal Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [metricType, setMetricType] = useState<string>('HEART_RATE');
  const [targetValue, setTargetValue] = useState<string>('');
  const [initialValue, setInitialValue] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/goals/progress');
      setGoals(res.data.progress || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load health goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue || !targetDate) {
      alert('Please fill target value and target date');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/goals', {
        metricType,
        targetValue: parseFloat(targetValue),
        initialValue: initialValue ? parseFloat(initialValue) : undefined,
        unit: DEFAULT_UNITS[metricType] || 'units',
        targetDate: new Date(targetDate).toISOString(),
        notes,
      });

      setShowModal(false);
      setTargetValue('');
      setInitialValue('');
      setNotes('');
      await fetchGoals();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create health goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm('Delete this health goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      await fetchGoals();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete goal');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-teal-400" />
            Health Goals & Milestone Tracking
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Set target health milestones and track dynamic progress computed against verified vitals.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-teal-950/40 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Set New Goal
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Goals List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Calculating health milestone progress...
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4">
            <Target className="w-10 h-10 text-teal-400" />
          </div>
          <h2 className="text-base font-bold text-white">No active health goals</h2>
          <p className="text-sm text-slate-400 max-w-sm mt-1 mb-4">
            Set target goals for resting heart rate, blood pressure, weight, or glucose to track dynamic improvements.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((g) => (
            <div
              key={g.id}
              className="bg-navy-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-400" />
                      {g.metricType.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Target: {g.targetValue} {g.unit}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      g.status === 'ACHIEVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : g.status === 'MISSED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    }`}
                  >
                    {g.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Progress</span>
                    <span className="font-bold text-white font-mono">{g.progressPct}%</span>
                  </div>
                  <div className="w-full bg-navy-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        g.status === 'ACHIEVED'
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-teal-500 to-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, g.progressPct))}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-navy-950 p-3 rounded-xl border border-slate-850 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Start</span>
                    <span className="font-semibold text-slate-300 font-mono">
                      {g.initialValue} {g.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-teal-400 uppercase block">Current</span>
                    <span className="font-bold text-teal-300 font-mono">
                      {g.currentValue} {g.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Goal</span>
                    <span className="font-semibold text-white font-mono">
                      {g.targetValue} {g.unit}
                    </span>
                  </div>
                </div>

                {g.notes && (
                  <p className="text-xs text-slate-400 italic">"{g.notes}"</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {g.daysRemaining} day(s) remaining
                </span>
                <button
                  onClick={() => handleDeleteGoal(g.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Delete Goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Set Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-400" />
                Set New Health Milestone
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Health Metric Type
                </label>
                <select
                  value={metricType}
                  onChange={(e) => setMetricType(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="HEART_RATE">Resting Heart Rate (bpm)</option>
                  <option value="BLOOD_PRESSURE">Blood Pressure (mmHg)</option>
                  <option value="GLUCOSE">Blood Glucose (mg/dL)</option>
                  <option value="CHOLESTEROL">Cholesterol (mg/dL)</option>
                  <option value="WEIGHT">Body Weight (kg)</option>
                  <option value="TEMPERATURE">Body Temperature (°C)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Initial Baseline (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Auto-detected from vitals"
                    value={initialValue}
                    onChange={(e) => setInitialValue(e.target.value)}
                    className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Target Goal Value ({DEFAULT_UNITS[metricType]})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 70"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Personal Notes / Strategy
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 30 minutes daily brisk walking, reduced sodium intake"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Set Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
