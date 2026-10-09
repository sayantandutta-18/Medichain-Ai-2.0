import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import {
  Shield,
  Smartphone,
  Laptop,
  Tablet,
  Radio,
  Trash2,
  Send,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface SessionItem {
  sessionId: string;
  deviceType: string;
  userAgent?: string;
  ip: string;
  lastActive: string;
  revoked: boolean;
  createdAt: string;
}

interface WebhookItem {
  id: string;
  url: string;
  maskedSecret: string;
  events: string[];
  active: boolean;
  lastDeliveredAt?: string;
  createdAt: string;
}

export const SecuritySettings: React.FC = () => {
  // Sessions State
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  // Webhooks State
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState<boolean>(true);
  const [newUrl, setNewUrl] = useState<string>('');
  const [creatingWebhook, setCreatingWebhook] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await api.get('/auth/sessions');
      setSessions(res.data.sessions || []);
    } catch (err: any) {
      console.error('Failed to load user sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      setLoadingWebhooks(true);
      const res = await api.get('/webhooks');
      setWebhooks(res.data.subscriptions || []);
    } catch (err: any) {
      console.error('Failed to load webhooks', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchWebhooks();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId);
      setError(null);
      await api.post(`/auth/sessions/${sessionId}/revoke`);
      setMessage('Device session revoked successfully.');
      await fetchSessions();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      setError(null);
      await api.post('/auth/sessions/revoke-all');
      setMessage('All active sessions have been remotely terminated.');
      await fetchSessions();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to revoke sessions');
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newUrl.startsWith('http')) {
      setError('Please provide a valid HTTPS/HTTP webhook URL.');
      return;
    }

    try {
      setCreatingWebhook(true);
      setError(null);
      await api.post('/webhooks', {
        url: newUrl,
        events: ['RECORD_CREATED', 'CONSENT_APPROVED', 'PRESCRIPTION_ISSUED'],
      });
      setNewUrl('');
      setMessage('Webhook endpoint registered with HMAC-SHA256 signature key.');
      await fetchWebhooks();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to register webhook');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleTestWebhook = async (subId: string) => {
    try {
      setTestingId(subId);
      setError(null);
      setTestResult(null);
      const res = await api.post(`/webhooks/${subId}/test`);
      setTestResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to dispatch test webhook');
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteWebhook = async (subId: string) => {
    try {
      setError(null);
      await api.delete(`/webhooks/${subId}`);
      setMessage('Webhook subscription deleted.');
      await fetchWebhooks();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete webhook');
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    const lower = deviceType.toLowerCase();
    if (lower.includes('mobile')) return <Smartphone className="w-5 h-5 text-teal-400" />;
    if (lower.includes('tablet')) return <Tablet className="w-5 h-5 text-teal-400" />;
    return <Laptop className="w-5 h-5 text-teal-400" />;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-teal-400" />
          Security, Sessions & Webhooks
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Manage authenticated device sessions, multi-device revocation, and encrypted medical event webhooks.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl text-xs text-teal-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Feature 26: Active Device Sessions */}
      <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Laptop className="w-5 h-5 text-teal-400" />
              Active Device Sessions (Feature 26)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and remotely terminate active authentication sessions across your devices
            </p>
          </div>
          <button
            type="button"
            onClick={handleRevokeAllSessions}
            className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Lock className="w-3.5 h-3.5" />
            Revoke All Sessions
          </button>
        </div>

        {loadingSessions ? (
          <div className="text-center py-6 text-xs text-slate-500">Loading active sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">No active sessions found.</div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.sessionId}
                className="p-4 bg-navy-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-slate-850 rounded-xl border border-slate-700 mt-0.5">
                    {getDeviceIcon(s.deviceType)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{s.deviceType} Session</span>
                      {s.revoked ? (
                        <span className="text-[10px] px-2 py-0.5 bg-red-950 text-red-300 border border-red-600/40 rounded font-mono font-bold">
                          Revoked
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-600/40 rounded font-mono font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                      {s.userAgent || 'Standard Browser'}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 mt-1">
                      <span>IP: {s.ip}</span>
                      <span>•</span>
                      <span>Last active: {new Date(s.lastActive).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {!s.revoked && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(s.sessionId)}
                    disabled={revokingSessionId === s.sessionId}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors shrink-0"
                  >
                    {revokingSessionId === s.sessionId ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature 24: Medical Event Webhooks */}
      <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            Medical Event Webhooks (Feature 24)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deliver real-time signed webhook notifications with HMAC-SHA256 headers for health events
          </p>
        </div>

        {/* Add Webhook Form */}
        <form onSubmit={handleCreateWebhook} className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://your-health-service.org/api/webhook"
            className="flex-1 bg-navy-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={creatingWebhook || !newUrl}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Webhook Endpoint
          </button>
        </form>

        {loadingWebhooks ? (
          <div className="text-center py-6 text-xs text-slate-500">Loading webhooks...</div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">No registered webhook subscriptions.</div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((w) => (
              <div
                key={w.id}
                className="p-4 bg-navy-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white truncate max-w-sm">
                      {w.url}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-600/40 rounded font-mono">
                      HMAC-SHA256
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>Secret: {w.maskedSecret}</span>
                    <span>•</span>
                    <span>Events: {w.events.join(', ')}</span>
                  </div>
                  {w.lastDeliveredAt && (
                    <p className="text-[10px] text-teal-400 font-mono">
                      Last delivered: {new Date(w.lastDeliveredAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTestWebhook(w.id)}
                    disabled={testingId === w.id}
                    className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{testingId === w.id ? 'Sending...' : 'Test Ping'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWebhook(w.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                    title="Delete Webhook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Test Result Inspection Box */}
        {testResult && (
          <div className="p-4 bg-navy-950 border border-indigo-500/40 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Webhook Test Dispatch Succeeded
              </span>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <pre className="p-3 bg-navy-900 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
