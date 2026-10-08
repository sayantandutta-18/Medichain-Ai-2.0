import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client.js';
import { AuditLog } from '../../types/records.js';
import { TableRowSkeleton } from '../../components/common/Skeleton.js';
import {
  History,
  Shield,
  FileText,
  UserCheck,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';

export const DoctorAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/audit/me');
      setLogs(res.data.logs || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to retrieve audit trail. Please retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes('RECORD')) return <FileText className="w-4 h-4 text-indigo-400" />;
    if (action.includes('ACCESS')) return <UserCheck className="w-4 h-4 text-emerald-400" />;
    if (action.includes('AI')) return <Sparkles className="w-4 h-4 text-purple-400" />;
    return <Lock className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Practitioner Clinical Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete immutable log of all access requests, record views, and clinical actions performed.
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-navy-800 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Audit Trail
        </button>
      </div>

      <div className="bg-navy-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shrink-0">
          <Shield className="w-6 h-6 text-indigo-400" />
        </div>
        <div className="space-y-1 text-xs">
          <h2 className="text-sm font-bold text-white">Non-Repudiation Compliance</h2>
          <p className="text-slate-300 leading-relaxed">
            All clinical record views require verified patient consent and are sealed into the
            cryptographic hash chain. Unauthorized attempts generate auditable denial records.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-navy-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-navy-950/60 text-slate-400 uppercase font-medium">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Patient ID</th>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Hash Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <History className="w-8 h-8 text-slate-600 mb-2" />
                      <p className="text-sm text-slate-300 font-medium">No clinical activity recorded yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-300 font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="font-semibold text-white">{log.action}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                      {log.targetId ? `${log.targetId.substring(0, 12)}...` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap truncate max-w-[120px]">
                      {log.requestId}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-400 truncate max-w-[160px]">
                      {log.hash ? `${log.hash.substring(0, 16)}...` : 'genesis'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
