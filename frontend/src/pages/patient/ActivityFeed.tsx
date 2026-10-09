import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import {
  History,
  Shield,
  Key,
  UserCheck,
  AlertCircle,
  Clock,
  FileText,
  Lock,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'SECURITY_AUDIT' | 'CONSENT_REQUEST';
  action: string;
  role?: string;
  timestamp: string;
  details: string;
  hash?: string;
  scope?: string;
}

export const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/activity/feed');
      setActivities(res.data.activities || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to retrieve activity feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes('RECORD')) return <FileText className="w-4 h-4 text-teal-400" />;
    if (action.includes('CONSENT') || action.includes('ACCESS')) return <UserCheck className="w-4 h-4 text-emerald-400" />;
    if (action.includes('OFFLINE') || action.includes('COMMITMENT')) return <Lock className="w-4 h-4 text-indigo-400" />;
    return <Shield className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-teal-400" />
          Patient Activity & Security Event Feed
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Cryptographically authenticated, tamper-evident feed of every access request and security event.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading authenticated activity events...
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4">
            <Shield className="w-10 h-10 text-teal-400" />
          </div>
          <h2 className="text-base font-bold text-white">No activity logged yet</h2>
          <p className="text-sm text-slate-400 max-w-sm mt-1">
            As records are accessed, shared, or consented to, every action is hashed and recorded here in real-time.
          </p>
        </div>
      ) : (
        <div className="relative border-l border-slate-800 ml-4 space-y-6 py-2">
          {activities.map((act) => (
            <div key={act.id} className="relative pl-6">
              {/* Timeline marker */}
              <div className="absolute -left-3 top-1.5 w-6 h-6 rounded-full bg-navy-950 border border-slate-700 flex items-center justify-center">
                {getActionIcon(act.action)}
              </div>

              <div className="bg-navy-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                      {act.type}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(act.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{act.details}</p>

                {act.hash && (
                  <div className="pt-2 border-t border-slate-850 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Key className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="text-slate-500">Hash:</span>
                    <span className="truncate max-w-xs">{act.hash}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
