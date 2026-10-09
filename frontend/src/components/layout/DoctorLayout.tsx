import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Stethoscope,
  LayoutDashboard,
  UserCheck,
  UserPlus,
  History,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Menu,
  X,
  Layers,
} from 'lucide-react';
import { NotificationBell } from '../common/NotificationBell.js';

export const DoctorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/doctor', label: 'Doctor Dashboard', icon: LayoutDashboard, end: true },
    { to: '/doctor/requests', label: 'My Access Requests', icon: UserCheck },
    { to: '/doctor/request-access', label: 'Request Patient Access', icon: UserPlus },
    { to: '/doctor/explorer', label: 'Blockchain Explorer', icon: Layers },
    { to: '/doctor/audit', label: 'Practitioner Audit Log', icon: History },
  ];

  const verificationStatus =
    user?.verificationStatus || (user?.isVerified ? 'VERIFIED' : 'PENDING');

  const renderVerificationBanner = () => {
    switch (verificationStatus) {
      case 'VERIFIED':
        return (
          <div className="bg-emerald-950/60 border-b border-emerald-600/40 px-6 py-2.5 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Practitioner Verified:</strong> Medical license credential status is active.
              Backend enforces consent policy on every clinical document query.
            </span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="bg-rose-950/60 border-b border-rose-600/40 px-6 py-2.5 text-rose-200 text-xs flex items-center gap-2.5">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Verification Status: REJECTED.</strong> Credential verification was declined.
              Clinical actions are strictly restricted.
            </span>
          </div>
        );
      case 'PENDING':
      default:
        return (
          <div className="bg-amber-950/60 border-b border-amber-600/40 px-6 py-2.5 text-amber-200 text-xs flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Verification Status: PENDING REVIEW.</strong> Credential review is underway.
              Access to patient records is strictly gated by patient-approved consent grants.
            </span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-navy-900 border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
            <Stethoscope className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide">MediChain-AI</h1>
            <p className="text-[11px] text-indigo-400 font-mono">Clinical Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Doctor profile footer */}
        <div className="p-4 border-t border-slate-800 bg-navy-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xs font-bold">
                {user?.firstName ? user.firstName[0].toUpperCase() : 'Dr'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {user?.firstName ? `Dr. ${user.firstName} ${user.lastName || ''}` : user?.email}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">Role: DOCTOR</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-navy-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="w-6 h-6 text-indigo-400" />
          <span className="font-bold text-white text-base">MediChain-AI Clinician</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-900 border-b border-slate-800 p-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
            className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-950/40 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Verification Status Banner */}
        {renderVerificationBanner()}

        {/* Mandatory Medical Disclaimer Banner */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2 text-slate-400 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>Clinical Safety Protocol:</strong> MediChain-AI is a portfolio MVP. It is NOT a
              medical device or diagnostic platform. All authorizations are enforced server-side.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
          </div>
        </div>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
