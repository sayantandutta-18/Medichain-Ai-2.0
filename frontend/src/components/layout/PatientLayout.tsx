import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Shield,
  LayoutDashboard,
  FileText,
  Upload,
  UserCheck,
  History,
  AlertCircle,
  Calendar,
  Pill,
  CreditCard,
  LogOut,
  Menu,
  X,
  Clock,
  Activity,
  Layers,
  Target,
  Mic,
  KeyRound,
} from 'lucide-react';
import { NotificationBell } from '../common/NotificationBell.js';
import { VoiceAssistantModal } from '../common/VoiceAssistantModal.js';

export const PatientLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/records', label: 'My Records', icon: FileText },
    { to: '/timeline', label: 'Medical Timeline', icon: Clock },
    { to: '/analytics', label: 'Health Analytics', icon: Activity },
    { to: '/goals', label: 'Health Goals', icon: Target },
    { to: '/explorer', label: 'Blockchain Explorer', icon: Layers },
    { to: '/upload', label: 'Upload Document', icon: Upload },
    { to: '/requests', label: 'Access Requests', icon: UserCheck },
    { to: '/activity', label: 'Activity Feed', icon: History },
    { to: '/audit', label: 'Privacy & Audit Log', icon: Shield },
    { to: '/emergency', label: 'Emergency Card', icon: CreditCard },
    { to: '/appointments', label: 'Appointments', icon: Calendar },
    { to: '/medications', label: 'Medications', icon: Pill },
    { to: '/security', label: 'Security & Webhooks', icon: KeyRound },
  ];

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-navy-900 border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-xl">
            <Shield className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide">MediChain-AI</h1>
            <p className="text-[11px] text-teal-400/90 font-mono">Patient Portal</p>
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
                      ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30 font-semibold'
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

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800 bg-navy-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 text-xs font-bold">
                {user?.firstName ? user.firstName[0].toUpperCase() : 'P'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">Role: {user?.role}</p>
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
          <Shield className="w-6 h-6 text-teal-400" />
          <span className="font-bold text-white text-base">MediChain-AI</span>
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
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
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
              handleLinkClick();
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
        {/* Medical disclaimer header banner */}
        <div className="bg-amber-950/50 border-b border-amber-600/30 px-6 py-2 text-amber-200 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>Portfolio MVP:</strong> Patient-controlled medical records MVP. Not a medical device or diagnostic platform.
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setVoiceAssistantOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Open AI Voice Assistant (Preview & Safe Confirmation)"
            >
              <Mic className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Voice Assistant</span>
            </button>
            <NotificationBell />
          </div>
        </div>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Voice AI Assistant Modal */}
      <VoiceAssistantModal
        isOpen={voiceAssistantOpen}
        onClose={() => setVoiceAssistantOpen(false)}
      />
    </div>
  );
};
