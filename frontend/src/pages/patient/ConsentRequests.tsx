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
  Users,
  Plus,
  X,
  Trash2,
} from 'lucide-react';

interface CaregiverItem {
  _id: string;
  caregiverId: any;
  patientId: any;
  scopes: string[];
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
}

export const ConsentRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'CAREGIVERS'>('REQUESTS');
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Caregiver Proxy State
  const [myCaregivers, setMyCaregivers] = useState<CaregiverItem[]>([]);
  const [proxyFor, setProxyFor] = useState<CaregiverItem[]>([]);
  const [caregiverLoading, setCaregiverLoading] = useState<boolean>(false);
  const [showGrantModal, setShowGrantModal] = useState<boolean>(false);
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  const [grantDurationDays, setGrantDurationDays] = useState<number>(30);
  const [grantScopes, setGrantScopes] = useState<string[]>(['RECORDS_VIEW']);
  const [grantSubmitting, setGrantSubmitting] = useState<boolean>(false);

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

  const fetchCaregivers = async () => {
    setCaregiverLoading(true);
    try {
      const res = await apiClient.get('/proxy/caregivers');
      setMyCaregivers(res.data.myCaregivers || []);
      setProxyFor(res.data.proxyFor || []);
    } catch {
      // ignore
    } finally {
      setCaregiverLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchCaregivers();
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

  const handleRevokeCaregiver = async (id: string) => {
    if (!window.confirm('Revoke caregiver access for this user?')) return;
    try {
      await apiClient.post(`/proxy/${id}/revoke`);
      await fetchCaregivers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to revoke caregiver proxy');
    }
  };

  const handleGrantProxy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caregiverEmail) return;

    try {
      setGrantSubmitting(true);
      await apiClient.post('/proxy/grant', {
        caregiverEmail,
        scopes: grantScopes,
        durationDays: grantDurationDays,
      });

      setShowGrantModal(false);
      setCaregiverEmail('');
      await fetchCaregivers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to grant caregiver proxy');
    } finally {
      setGrantSubmitting(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Access & Consent Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Patient-governed authorization: approve clinician requests or delegate caregiver proxy access.
          </p>
        </div>

        {activeTab === 'CAREGIVERS' && (
          <button
            onClick={() => setShowGrantModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-teal-950/40 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Designate Caregiver Proxy
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('REQUESTS')}
          className={`pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'REQUESTS' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Clinician Access Requests ({requests.length})
          {activeTab === 'REQUESTS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('CAREGIVERS')}
          className={`pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'CAREGIVERS' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Caregiver & Proxy Delegation ({myCaregivers.length})
          {activeTab === 'CAREGIVERS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: Requests List */}
      {activeTab === 'REQUESTS' && (
        <>
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
        </>
      )}

      {/* Tab 2: Feature 15: Caregiver & Proxy Delegation */}
      {activeTab === 'CAREGIVERS' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-white mb-3">Authorized Caregiver Proxies</h2>
            {caregiverLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading caregivers...</div>
            ) : myCaregivers.length === 0 ? (
              <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl mb-3">
                  <Users className="w-8 h-8 text-teal-400" />
                </div>
                <h3 className="text-base font-bold text-white">No designated caregiver proxies</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                  Delegate trusted family members or caregivers to access your records or emergency profile during emergencies.
                </p>
                <button
                  onClick={() => setShowGrantModal(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Designate Caregiver
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myCaregivers.map((cg) => {
                  const caregiverUser = typeof cg.caregiverId === 'object' ? cg.caregiverId : null;
                  return (
                    <div
                      key={cg._id}
                      className="bg-navy-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {caregiverUser
                                  ? `${caregiverUser.firstName || ''} ${caregiverUser.lastName || ''}`.trim() || caregiverUser.email
                                  : 'Authorized Caregiver'}
                              </p>
                              <p className="text-xs text-slate-400">{caregiverUser?.email}</p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              cg.revoked
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {cg.revoked ? 'REVOKED' : 'ACTIVE'}
                          </span>
                        </div>

                        <div className="bg-navy-950 p-3 rounded-xl border border-slate-850 text-xs space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-500">Scopes:</span>
                            <span className="font-mono text-teal-300">{cg.scopes.join(', ')}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-500">Expires:</span>
                            <span>{new Date(cg.expiresAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {!cg.revoked && (
                        <div className="pt-2 border-t border-slate-800 flex justify-end">
                          <button
                            onClick={() => handleRevokeCaregiver(cg._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke Proxy
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Proxy For Section */}
          {proxyFor.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <h2 className="text-base font-bold text-white mb-3">Patients You Are Caregiver For</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proxyFor.map((cg) => {
                  const pat = typeof cg.patientId === 'object' ? cg.patientId : null;
                  return (
                    <div
                      key={cg._id}
                      className="bg-navy-900 border border-teal-500/30 rounded-2xl p-5 shadow-lg space-y-2"
                    >
                      <p className="text-sm font-bold text-white">
                        {pat ? `${pat.firstName || ''} ${pat.lastName || ''}`.trim() || pat.email : 'Patient'}
                      </p>
                      <p className="text-xs text-slate-400">{pat?.email}</p>
                      <div className="text-[11px] text-teal-300 font-mono">
                        Scopes Granted: {cg.scopes.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grant Caregiver Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                Designate Caregiver Proxy
              </h2>
              <button
                onClick={() => setShowGrantModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantProxy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Caregiver Account Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="caregiver@example.com"
                  value={caregiverEmail}
                  onChange={(e) => setCaregiverEmail(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Access Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={grantDurationDays}
                  onChange={(e) => setGrantDurationDays(parseInt(e.target.value) || 30)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Access Scopes
                </label>
                <div className="space-y-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={grantScopes.includes('RECORDS_VIEW')}
                      onChange={(e) => {
                        if (e.target.checked) setGrantScopes([...grantScopes, 'RECORDS_VIEW']);
                        else setGrantScopes(grantScopes.filter((s) => s !== 'RECORDS_VIEW'));
                      }}
                      className="rounded border-slate-700 bg-navy-950 text-teal-500"
                    />
                    <span>View Medical Records (`RECORDS_VIEW`)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={grantScopes.includes('EMERGENCY_VIEW')}
                      onChange={(e) => {
                        if (e.target.checked) setGrantScopes([...grantScopes, 'EMERGENCY_VIEW']);
                        else setGrantScopes(grantScopes.filter((s) => s !== 'EMERGENCY_VIEW'));
                      }}
                      className="rounded border-slate-700 bg-navy-950 text-teal-500"
                    />
                    <span>View Emergency Health Card (`EMERGENCY_VIEW`)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={grantSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {grantSubmitting ? 'Granting...' : 'Authorize Proxy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
