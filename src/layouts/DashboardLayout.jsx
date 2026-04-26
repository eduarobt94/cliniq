import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../pages/Dashboard/Sidebar';
import { TopBar } from '../pages/Dashboard/TopBar';
import { NewAppointmentModal } from '../pages/Dashboard/NewAppointmentModal';
import { InviteMemberModal } from '../pages/Dashboard/InviteMemberModal';
import { useAuth } from '../context/AuthContext';

export function DashboardLayout() {
  const { clinic } = useAuth();

  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [inviteOpen,   setInviteOpen]   = useState(false);
  // modalConfig: { open: bool, defaultDate: string|null }
  const [modalConfig,  setModalConfig]  = useState({ open: false, defaultDate: null });

  const openMobileMenu = useCallback(() => setMobileOpen(true), []);

  // Pages can call openModal({ date: 'YYYY-MM-DD' }) to pre-fill the date
  const openModal  = useCallback((config = {}) =>
    setModalConfig({ open: true, defaultDate: config?.date ?? null }), []);
  const closeModal = useCallback(() =>
    setModalConfig((c) => ({ ...c, open: false })), []);

  const openInvite  = useCallback(() => setInviteOpen(true),  []);
  const closeInvite = useCallback(() => setInviteOpen(false), []);

  return (
    <div className="min-h-screen bg-[var(--cq-surface-2)] text-[var(--cq-fg)] flex">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          onMobileMenu={openMobileMenu}
          onNewAppointment={openModal}
        />
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <Outlet context={{ openModal, openInvite }} />
        </main>
      </div>

      <NewAppointmentModal
        open={modalConfig.open}
        onClose={closeModal}
        clinicId={clinic?.id}
        defaultDate={modalConfig.defaultDate}
      />
      <InviteMemberModal
        open={inviteOpen}
        onClose={closeInvite}
        clinicId={clinic?.id}
      />
    </div>
  );
}
