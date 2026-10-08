import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Shield, User as UserIcon, LogOut, Activity } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-navy-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-xl">
            <Shield className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">MediChain-AI</h1>
            <p className="text-xs text-slate-400">Patient-Controlled Records</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-300 bg-navy-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <UserIcon className="w-4 h-4 text-teal-400" />
            <span>{user?.email}</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-teal-900/60 text-teal-300 border border-teal-600/40 ml-1">
              {user?.role}
            </span>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-950/40 text-red-300 border border-red-800/40 hover:bg-red-900/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="bg-amber-950/40 border border-amber-600/30 rounded-2xl p-4 text-amber-200 text-sm flex items-start gap-3">
          <Activity className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Portfolio MVP Notice</p>
            <p className="text-amber-200/90 text-xs mt-0.5">
              MediChain-AI is a patient-controlled medical records portfolio MVP. It is NOT a medical device,
              diagnostic system, or compliant healthcare platform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-navy-900 p-6 rounded-2xl border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-1">Authenticated Session</h2>
            <p className="text-xs text-slate-400 mb-4">Restored securely from central API session</p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <dt className="text-slate-400">User ID</dt>
                <dd className="font-mono text-slate-200">{user?.id}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <dt className="text-slate-400">Assigned Role</dt>
                <dd className="text-teal-300 font-semibold">{user?.role}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-slate-400">Verification Status</dt>
                <dd className="text-slate-200">{user?.isVerified ? 'Verified' : 'Pending Review'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-navy-900 p-6 rounded-2xl border border-slate-800 md:col-span-2">
            <h2 className="text-base font-semibold text-white mb-1">Foundation Active</h2>
            <p className="text-xs text-slate-400 mb-4">
              Checkpoint 10 routing, authorization context, and 401 interceptor active.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Welcome, <span className="text-teal-300 font-semibold">{user?.firstName || user?.email}</span>.
              The frontend is connected to the backend via the centralized API client without hardcoded host addresses.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
