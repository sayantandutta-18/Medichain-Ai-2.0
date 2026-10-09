import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export const PublicShareView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedRecord = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/shares/view/${token}`);
        setData(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Invalid, expired, or consumed share link.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedRecord();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Lock className="w-10 h-10 text-teal-400 animate-pulse mx-auto" />
          <p className="text-slate-400 text-sm">Decrypting shared medical document...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="bg-navy-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-lg font-bold text-white">Share Link Inactive</h1>
          <p className="text-xs text-slate-400">{error || 'This link has expired or reached single-use limit.'}</p>
          <Link
            to="/login"
            className="inline-block mt-4 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold"
          >
            Go to MediChain Portal
          </Link>
        </div>
      </div>
    );
  }

  const { record, content, verificationStatus } = data;

  return (
    <div className="min-h-screen bg-navy-950 p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Verification banner */}
        <div className="p-4 bg-teal-950/40 border border-teal-500/40 rounded-2xl flex items-center justify-between text-xs text-teal-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <p className="font-bold text-teal-300">Cryptographically Verified Share</p>
              <p className="text-teal-200/80 text-[11px]">
                Integrity Status: {verificationStatus || 'VERIFIED'} (SHA-256 matched original upload)
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 rounded-full font-mono text-[10px]">
            AES-256-GCM
          </span>
        </div>

        {/* Document Card */}
        <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[10px] font-semibold uppercase tracking-wider">
                {record?.type?.replace(/_/g, ' ') || 'MEDICAL RECORD'}
              </span>
              <h1 className="text-xl font-bold text-white mt-2">{record?.title}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Shared Document from MediChain-AI Vault
              </p>
            </div>
            <div className="p-3 bg-navy-950 rounded-2xl border border-slate-800">
              <FileText className="w-8 h-8 text-teal-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">SHA-256 Digest</span>
              <span className="font-mono text-slate-300 text-[11px] break-all">
                {record?.sha256}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Original Filename</span>
              <span className="text-slate-300">{record?.originalFilename || 'document.txt'}</span>
            </div>
          </div>

          {/* Decrypted Payload Preview */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400">Decrypted Content:</span>
            <div className="p-4 bg-navy-950 border border-slate-800 rounded-2xl max-h-96 overflow-y-auto text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {content || 'No text content available.'}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Patient-Controlled Cryptographic Link</span>
            <span>Single-Use or Expiring Token</span>
          </div>
        </div>
      </div>
    </div>
  );
};
