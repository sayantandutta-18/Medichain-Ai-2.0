import { Calendar, Clock } from 'lucide-react';

export const Appointments: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Appointments & Consultations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Schedule and manage verified clinician consultations with cryptographic booking locks.
          </p>
        </div>
      </div>

      <div className="bg-navy-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
        <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl mb-4">
          <Calendar className="w-10 h-10 text-teal-400" />
        </div>
        <h2 className="text-base font-bold text-white">No scheduled appointments</h2>
        <p className="text-sm text-slate-400 max-w-sm mt-1 mb-4">
          You currently have no active appointments booked with verified clinicians. Conflict-free
          booking slots are scheduled for Checkpoint 14.
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          Real booking endpoints active in Advanced Phase
        </span>
      </div>
    </div>
  );
};
