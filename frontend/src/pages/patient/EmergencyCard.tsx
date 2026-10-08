import { useAuth } from '../../context/AuthContext.js';
import { AlertTriangle, Shield, QrCode, HeartPulse } from 'lucide-react';

export const EmergencyCard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Emergency Health Card</h1>
        <p className="text-sm text-slate-400 mt-1">
          Minimal allow-listed emergency data for first responders. Full medical history is never exposed.
        </p>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-300">Privacy Safeguard</p>
          <p className="text-amber-200/90 mt-0.5">
            Emergency QR cards only permit access to explicit emergency allow-listed fields (allergies,
            blood type, emergency contacts). Medical documents remain client-encrypted with AES-256-GCM.
          </p>
        </div>
      </div>

      {/* Virtual Emergency Card */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-850 to-teal-950 border border-teal-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-500/20 rounded-xl text-red-400 border border-red-500/30">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-white">EMERGENCY ID</h2>
              <p className="text-[10px] text-teal-300 font-mono">MediChain-AI Vault</p>
            </div>
          </div>
          <div className="p-2 bg-navy-950/80 rounded-xl border border-slate-700">
            <QrCode className="w-8 h-8 text-slate-300" />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Patient</span>
            <p className="text-base font-bold text-white">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">User Identifier</span>
              <span className="font-mono text-slate-200">{user?.id?.substring(0, 12)}...</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Account Role</span>
              <span className="text-teal-300 font-semibold">{user?.role}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Allergies (Allow-listed)</span>
              <span className="text-slate-300 font-medium">None Recorded</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Blood Group</span>
              <span className="text-slate-300 font-medium">Not Specified</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-teal-500/20 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            Cryptographically Anchored
          </span>
          <span className="font-mono text-[10px]">Expiring Token</span>
        </div>
      </div>
    </div>
  );
};
