import { Pill, AlertCircle, Clock } from 'lucide-react';

export const Medications: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Medications & Prescriptions</h1>
        <p className="text-sm text-slate-400 mt-1">
          Patient-logged medication tracking and schedule reminders.
        </p>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-300">Non-Prescription Safety Notice</p>
          <p className="text-amber-200/90 mt-0.5">
            This module is for personal schedule tracking only. MediChain-AI does NOT prescribe medications,
            suggest dosages, or replace professional clinician advice. Always consult your licensed healthcare
            provider.
          </p>
        </div>
      </div>

      <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
        <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4">
          <Pill className="w-10 h-10 text-teal-400" />
        </div>
        <h2 className="text-base font-bold text-white">No active medications logged</h2>
        <p className="text-sm text-slate-400 max-w-sm mt-1 mb-4">
          Upload a prescription document to view verified clinician attachments or record your schedule
          in Checkpoint 14.
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          Scheduled Medication Tracker in Advanced Features
        </span>
      </div>
    </div>
  );
};
