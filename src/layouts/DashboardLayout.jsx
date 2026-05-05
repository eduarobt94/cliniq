import { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../pages/Dashboard/Sidebar';
import { TopBar } from '../pages/Dashboard/TopBar';
import { NewAppointmentModal } from '../pages/Dashboard/NewAppointmentModal';
import { InviteMemberModal } from '../pages/Dashboard/InviteMemberModal';
import { AddPatientModal } from '../components/AddPatientModal';
import { useAuth } from '../context/AuthContext';
import { ToastContainer, useToast } from '../components/ui';
import { useNotifications } from '../hooks/useNotifications';

export function DashboardLayout() {
  const { clinic } = useAuth();
  const { toasts, push, dismiss } = useToast();
  const { notifications, unreadCount, markAllRead } = useNotifications(clinic?.id, push);

  const [compact, setCompact] = useState(() => localStorage.getItem('cq_compact_mode') === 'true');

  useEffect(() => {
    const sync = () => setCompact(localStorage.getItem('cq_compact_mode') === 'true');
    window.addEventListener('cq_compact_mode', sync);
    return () => window.removeEventListener('cq_compact_mode', sync);
  }, []);

  const [collapsed,     setCollapsed]     = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [inviteOpen,    setInviteOpen]    = useState(false);
  const [patientOpen,   setPatientOpen]   = useState(false);
  const [modalConfig,   setModalConfig]   = useState({ open: false, defaultDate: null, express: false });

  const openMobileMenu = useCallback(() => setMobileOpen(true), []);

  const openModal        = useCallback((config = {}) =>
    setModalConfig({ open: true, defaultDate: config?.date ?? null, express: false }), []);
  const openModalExpress = useCallback(() =>
    setModalConfig({ open: true, defaultDate: null, express: true }), []);
  const closeModal       = useCallback(() =>
    setModalConfig((c) => ({ ...c, open: false })), []);

  const openInvite      = useCallback(() => setInviteOpen(true),    []);
  const closeInvite     = useCallback(() => setInviteOpen(false),   []);
  const openNewPatient  = useCallback(() => setPatientOpen(true),   []);
  const closeNewPatient = useCallback(() => setPatientOpen(false),  []);

  const handleAppointmentCreated = useCallback(() => {
    push('Turno agendado correctamente.', 'success');
    // Notificar a todas las páginas que escuchan (Agenda, Dashboard) para refetch inmediato
    window.dispatchEvent(new CustomEvent('cq_appointment_created'));
  }, [push]);

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
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllRead}
        />
        <main className={`flex-1 overflow-y-auto transition-[padding] ${compact ? 'p-3 md:p-4' : 'p-5 md:p-8'}`}>
          <Outlet context={{ openModal, openModalExpress, openInvite, openNewPatient, push }} />
        </main>
      </div>

      <NewAppointmentModal
        open={modalConfig.open}
        onClose={closeModal}
        clinicId={clinic?.id}
        defaultDate={modalConfig.defaultDate}
        onSuccess={handleAppointmentCreated}
        express={modalConfig.express}
      />
      <InviteMemberModal
        open={inviteOpen}
        onClose={closeInvite}
        clinicId={clinic?.id}
      />
      <AddPatientModal
        open={patientOpen}
        onClose={closeNewPatient}
        clinicId={clinic?.id}
        push={push}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent('cq_patient_created'));
        }}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
