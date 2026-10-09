import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import {
  ExternalLink,
  ShieldCheck,
  Clock,
  Layers,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface ExplorerRecord {
  recordId: string;
  title: string;
  type: string;
  sha256: string;
  status: string;
  mode: string;
  txDigest: string | null;
  objectId: string | null;
  anchoredAt: string;
  explorerUrl: string | null;
  objectExplorerUrl: string | null;
}

export const BlockchainExplorer: React.FC = () => {
  const [records, setRecords] = useState<ExplorerRecord[]>([]);
  const [stats, setStats] = useState<any>({ totalRecords: 0, confirmedAnchors: 0, pendingAnchors: 0 });
  const [network, setNetwork] = useState<string>('testnet');
  const [anchorMode, setAnchorMode] = useState<string>('simulated');
  const [packageId, setPackageId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchExplorerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/blockchain/explorer');
      setRecords(res.data.records || []);
      setStats(res.data.stats || {});
      setNetwork(res.data.network || 'testnet');
      setAnchorMode(res.data.anchorMode || 'simulated');
      setPackageId(res.data.packageId || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch blockchain ledger state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplorerData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-teal-400" />
            Sui Ledger Blockchain Explorer
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tamper-proof on-chain verification proofs and cryptographic record digests.
          </p>
        </div>

        <button
          onClick={fetchExplorerData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Network & Proof Status Banner */}
      <div className="p-5 bg-navy-900 border border-slate-800 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Network</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-sm font-bold text-white capitalize">Sui {network}</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Anchoring Mode</span>
          <p className="text-sm font-bold text-teal-300 capitalize mt-1">
            {anchorMode === 'testnet' ? 'On-Chain Move Contract' : 'Cryptographic Proof (Simulated)'}
          </p>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Anchored Records</span>
          <p className="text-sm font-bold text-white mt-1">
            {stats.confirmedAnchors} / {stats.totalRecords}
          </p>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Package ID</span>
          <p className="text-xs font-mono text-slate-300 truncate mt-1">
            {packageId ? `${packageId.substring(0, 16)}...` : 'Not Configured (Demo Mode)'}
          </p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-navy-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            Anchored Record Digests ({records.length})
          </h2>
          <span className="text-xs text-slate-400">Strictly hashes only on-chain (Rule 7)</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Querying Sui ledger state...</div>
        ) : error ? (
          <div className="p-6 text-red-300 text-sm">{error}</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No medical records found in ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/70 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Record / Type</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">SHA-256 Digest</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Anchor Status</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Sui Tx / Object</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Anchored At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {records.map((rec) => (
                  <tr key={rec.recordId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{rec.title}</p>
                      <span className="text-[10px] text-teal-400 uppercase font-mono">
                        {rec.type.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                        <span>{rec.sha256.substring(0, 16)}...</span>
                        <button
                          onClick={() => copyToClipboard(rec.sha256, rec.recordId)}
                          title="Copy Full SHA-256 Hash"
                          className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
                        >
                          {copiedHash === rec.recordId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {rec.status === 'CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          CONFIRMED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          {rec.status}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      {rec.txDigest ? (
                        rec.explorerUrl ? (
                          <a
                            href={rec.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-400 hover:underline flex items-center gap-1"
                          >
                            <span>{rec.txDigest.substring(0, 12)}...</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">{rec.txDigest.substring(0, 12)}...</span>
                        )
                      ) : (
                        <span className="text-slate-600">Pending anchor</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {rec.anchoredAt ? new Date(rec.anchoredAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
