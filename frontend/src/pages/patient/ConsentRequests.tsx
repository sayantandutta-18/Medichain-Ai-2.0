import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client.js';
import { AccessRequest, PopulatedUser } from '../../types/records.js';
import { ConsentBadge } from '../../components/common/Badge.js';
import { CardSkeleton } from '../../components/common/Skeleton.js';
import {
  CheckCircle2,
  XCircle,
  Ban,
  FileDown,
  AlertCircle,
  Clock,
  FileQuestion,
  User,
} from 'lucide-react';

export const ConsentRequests: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/access-requests');
      setRequests(res.data.requests || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to retrieve access requests. Please check your connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiClient.post(`/access-requests/${id}/approve`);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiClient.post(`/access-requests/${id}/reject`);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevoke = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiClient.post(`/access-requests/${id}/revoke`);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to revoke consent');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadReceipt = async (id: string) => {
    try {
      const res = await apiClient.get(`/access-requests/${id}/receipt`);
      const receiptData = JSON.stringify(res.data.receipt || res.data, null, 2);
      const blob = new Blob([receiptData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `consent-receipt-${id}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download consent receipt');
    }
  };

  const getDoctorName = (doc: PopulatedUser | string) => {
    if (typeof doc === 'object' && doc !== null) {
      if (doc.firstName) return `Dr. ${doc.firstName} ${doc.lastName || ''}`;
      return doc.email || 'Practitioner';
    }
    return 'Dr. Practitioner';
  };

  const getDoctorEmail = (doc: PopulatedUser | string) => {
    if (typeof doc === 'object' && doc !== null) {
      return doc.email || '';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Access & Consent Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Patient-governed authorization: approve, reject, or immediately revoke clinician record access.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4">
            <FileQuestion className="w-10 h-10 text-teal-400" />
          </div>
          <h3 className="text-base font-bold text-white">No access requests</h3>
          <p className="text-sm text-slate-400 max-w-sm mt-1">
            When clinicians request access to your health records, their requests will appear here
            with full purpose disclosures for your explicit consent.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-navy-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {getDoctorName(req.doctorId)}
                      </h3>
                      <p className="text-xs text-slate-400">{getDoctorEmail(req.doctorId)}</p>
                    </div>
                  </div>
                  <ConsentBadge status={req.status} />
                </div>

                <div className="bg-navy-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Stated Clinical Purpose:</span>
                    <p className="text-slate-200 mt-0.5">{req.purpose}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Expires: {new Date(req.expiresAt).toLocaleString()}</span>
                    </div>
                    <span className="font-mono text-teal-400 font-medium">Scope: {req.scope}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons based on status */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                {req.status === 'PENDING' && (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      disabled={actionLoadingId === req._id}
                      onClick={() => handleApprove(req._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Access
                    </button>
                    <button
                      disabled={actionLoadingId === req._id}
                      onClick={() => handleReject(req._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}

                {req.status === 'APPROVED' && (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      disabled={actionLoadingId === req._id}
                      onClick={() => handleRevoke(req._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Ban className="w-4 h-4" />
                      Revoke Consent
                    </button>
                    <button
                      onClick={() => handleDownloadReceipt(req._id)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-navy-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                      <FileDown className="w-4 h-4 text-teal-400" />
                      Receipt
                    </button>
                  </div>
                )}

                {(req.status === 'REJECTED' || req.status === 'REVOKED') && (
                  <div className="flex justify-end w-full">
                    <button
                      onClick={() => handleDownloadReceipt(req._id)}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-navy-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-teal-400" />
                      Download Audit Receipt
                    </button>
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
