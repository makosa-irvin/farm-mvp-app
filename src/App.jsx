import { useRef, useState } from 'react';
import { TABS } from './constants.js';
import { useFarmData } from './hooks/useFarmData.js';
import { useConfirmDialog } from './hooks/useConfirmDialog.js';
import Header from './layout/Header.jsx';
import MainContent from './layout/MainContent.jsx';
import Toast from './components/Toast.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import MobileQuickActions from './components/MobileQuickActions.jsx';
import OfflineStatus from './components/OfflineStatus.jsx';
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx';

// App root owns navigation and global feedback state. Farm data remains local-
// first so the core recording workflows continue to work without internet.
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = (message) => { setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3800); };
  const { confirm, dialogProps } = useConfirmDialog();
  const farm = useFarmData(showToast, confirm);
  return (
    <div className="farm-app min-h-screen pb-16">
      <Header tabs={TABS} activeTab={tab} onSelectTab={setTab} />
      <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 flex justify-end"><OfflineStatus /></div>
      <MainContent tab={tab} farm={farm} setTab={setTab} />
      <MobileQuickActions onNavigate={setTab} />
      <Toast message={toast} />
      <ConfirmDialog {...dialogProps} />
      <PWAInstallPrompt />
    </div>
  );
}
