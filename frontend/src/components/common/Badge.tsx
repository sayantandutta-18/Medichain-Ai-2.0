import React from 'react';
import { ShieldCheck, ShieldAlert, Lock, CheckCircle2, Clock, XCircle, Ban, Cpu } from 'lucide-react';
import { RecordStatus, ConsentStatus, BlockchainStatus } from '../../types/records.js';

export const ConsentBadge: React.FC<{ status: ConsentStatus }> = ({ status }) => {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-600/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Approved
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-600/40">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Pending Review
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/70 text-rose-300 border border-rose-600/40">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          Rejected
        </span>
      );
    case 'REVOKED':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          <Ban className="w-3.5 h-3.5 text-slate-400" />
          Revoked
        </span>
      );
  }
};

export const IntegrityBadge: React.FC<{ status: RecordStatus }> = ({ status }) => {
  switch (status) {
    case 'INTEGRITY_VERIFIED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          SHA-256 Verified
        </span>
      );
    case 'ENCRYPTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-950/80 text-teal-300 border border-teal-500/40">
          <Lock className="w-3.5 h-3.5 text-teal-400" />
          AES-256-GCM Encrypted
        </span>
      );
    case 'INTEGRITY_FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/80 text-rose-300 border border-rose-500/40">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          Tamper Detected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-500/40">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Pending
        </span>
      );
  }
};

export const BlockchainBadge: React.FC<{ status?: BlockchainStatus; txDigest?: string }> = ({
  status = 'NOT_ANCHORED',
  txDigest,
}) => {
  switch (status) {
    case 'ANCHORED':
      return (
        <span
          title={txDigest ? `Sui Tx: ${txDigest}` : 'Anchored on Sui Testnet'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-500/40"
        >
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          Sui Anchored
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-500/40">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Anchor Pending
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/80 text-rose-300 border border-rose-500/40">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          Anchor Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          Off-chain Only
        </span>
      );
  }
};
